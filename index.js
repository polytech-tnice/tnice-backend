var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { transports: ["polling", "websocket"] });
var ActionType = require("./_models/actions/action-type");
var ActionPhaseStep = require('./_models/actions/action-phase-step');
var WindAction = require("./_models/actions/action");
var ActionManager = require("./utils/action-manager");
var Player = require("./_models/player");
var Game = require("./_models/game");
var GameState = require("./_models/game-state");
var Client = require("./_models/client");
var ClientName = require("./_models/client-name");
var ClientManager = require("./utils/client-manager");
var ActionPhaseHelper = require('./utils/action-phase-helper');
var ErrorCode = require("./_models/error-codes");
var SuccessCode = require("./_models/success-codes");

const clientManager = new ClientManager();
const games = [];

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

// Endpoint to have the list of games
app.get("/api/games", (req, res) => {
  console.log('Using api/games endpoint...');
  res.send({ games: games })
});

/**
 * Quand un client se connecte au serveur
 * @param socket - La socket correspondant au client qui vient de se connecter
 */
io.on("connection", function (socket) {
  console.log("User connected", socket.client.id);

  /**
   * Dès qu'un client est connecté au serveur il doit s'authentifier auprès de lui
   * authentification attend un objet en paramètre `authParams` avec les propriétés suivantes :
   *    - `name` {string} : le nom du client (comprit entre `mobileApp`, `webApp` et `game`) 
   * Si le nom est valide, on ajoute ce client à la liste des clients authentifiés
   * @Events envoyés au client émetteur :
   *    - `fail` avec les `code` suivant : 
   *        - `1` le client a déjà été authentifié auparavant (évitons les doublons)
   *        - `2` le paramètre 'name' renseigné est invalide
   *    - `success` avec le code `1` : le client a bien été enregistrée
   */
  socket.on("authentication", function (authParams) {
    console.log("Authentification : ", authParams);
    const clients = clientManager.getClients();
    if (clients.find(aClient => aClient.id === socket.client.id)) {
      socket.emit('fail', {
        code: ErrorCode.CLIENT_ALREADY_REGISTERED,
        desc: 'Client déjà enregistré'
      });
      return;
    }
    if (!authParams.name || Object.values(ClientName).indexOf(authParams.name) === -1) {
      socket.emit('fail', {
        code: ErrorCode.CLIENT_NAME_UNKNOWN,
        desc: 'Nom du client invalide'
      })
      return;
    }

    const client = new Client(socket, authParams.name);
    clientManager.addClient(client);

    socket.emit('success', { code: SuccessCode.AUTH_SUCCESS, desc: 'Authentification complétée' })
  });

  /**
   * Le client `webApp` est le seul à pouvoir créer une partie de t-nice.
   * L'évènement `initGame` attend un objet `gameParams` en paramètre avec les propriétés suivantes :
   *    - `game_name` : le nom de la partie (doit être unique)
   *    - `player1_name` : le nom du joueur 1 
   *    - `player2_name` : le nom du joueur 2
   * Si une partie avec ce nom n'a pas encore été crée, on l'ajoute à la liste des parties et on notifie 
   * tous les clients que la partie a été crée.
   * @Events envoyés au client émetteur :
   *    - `fail` avec le code `3`: la partie existe déjà
   *    - `success` avec le code `2` : l'opération s'est bien passé
   * @Events envoyés à tous les clients connectés :
   *    - `initGame` : la partie a bien été crée
   */
  socket.on("initGame", function (gameParams) {
    let canCreateGame = true;
    games.forEach((game) => {
      if (game.getName() === gameParams.game_name) canCreateGame = false;
    });
    if (!canCreateGame) {
      // A game with the same name already exists
      // TODO - send a proper event with ERROR CODE that can be used in front-end
      socket.emit('fail', { code: ErrorCode.GAME_ALREADY_EXISTING, desc: 'Une partie existe déjà avec ce nom' })
      return;
    }


    const players = [];
    const player1 = new Player(gameParams.player1_name);
    const player2 = new Player(gameParams.player2_name);
    players.push(player1);
    players.push(player2);
    const createdGame = new Game(gameParams.game_name, players);
    createdGame.setActionManager(new ActionManager());
    games.push(createdGame);
    console.log(`Game created by: ${socket.client.id}`)
    // Emit an event to say that the game has been initialized correctly
    socket.emit("success", { code: SuccessCode.INIT_GAME_SUCCESS, desc: 'Partie crée' });
    io.emit("initGame", createdGame);
  });

  /**
   * Le client `webApp` peut lancer la partie une fois qu'elle est crée
   * l'évènement `launchGame` attend en paramètre un objet avec les propriétés suivantes :
   *    - `name` : nom de la partie à lancer
   * L'état de la partie est modifiée pour passer en `IN_PROGRESS`
   * @Events envoyés au client émetteur :
   *    - `fail` avec les codes suivants :
   *          - `4` : la partie n'existe pas 
   *          - `5` : la partie est déjà lancée
   *    - `success` avec le code `3` : la partie a bien été lancée
   * @Events envoyés aux clients de type `game` :
   *    - `gameLaunched` : la partie doit être lancée
   */
  socket.on('launchGame', (launchParams) => {
    const gameName = launchParams.name;
    let canUpdateGame = true;
    let gameData;

    const find = games.find(game => game.getName() === gameName);
    if (!find) {
      socket.emit('fail', { code: ErrorCode.GAME_NOT_EXISTING, desc: "La partie n'existe pas" })
      return;
    }

    games.forEach((game) => {
      if (game.getName() === gameName && game.getGameState() === GameState.IN_PROGRESS) {
        canUpdateGame = false;
        return;
      }

      if (game.getName() === gameName) {
        game.setGameState(GameState.IN_PROGRESS);
        game.setActionPhaseStep(ActionPhaseStep.CREATION); // Set the action phase to CREATION when starting the game...
        gameData = game;
      }
    });
    if (!canUpdateGame) {
      socket.emit('fail', { code: ErrorCode.GAME_ALREADY_IN_PROGRESS, desc: 'Une partie est déjà en cours avec ce nom' })
      return;
    }

    socket.emit('success', { code: SuccessCode.LAUNCH_GAME_SUCCESS, desc: 'Partie correctement lancée', game: gameData })
    clientManager.getClientsOfType(ClientName.GAME).forEach(c => {
      c.getSocket().emit('gameLaunched', { name: gameName });
    })
  })

  /**
   * Quand un client demande de rejoindre une partie il doit envoyer un objet qui a au moins un 
   * champ `name` qui contient le nom de la partie qu'il veut rejoindre.
   * Si le nom est valide (i.e. la partie existe), on ajoute l'ID du client dans un tableau propre a 
   * la partie qu'il veut rejoindre.
   * @Events envoyés au client émetteur :
   *    - `fail` avec le code `4` : la partie n'existe pas
   *    - `success` avec le code `4` : le client a pu rejoindre la partie - on renvoie les infos sur la partie
   */
  socket.on('joinGameEvent', (params) => {
    const gameName = params.name;
    let hasJoined = false;
    games.forEach((game) => {
      if (game.getName() === gameName) {
        game.getConnectedClientIDs().push(socket.client.id);
        socket.emit('joinGameEvent_success', { code: SuccessCode.JOIN_GAME_SUCCESS, desc: 'Le client a bien rejoint la partie', ...params });
        hasJoined = true;
      }
    });

    if (!hasJoined)
      socket.emit('joinGameEvent_fail', { code: ErrorCode.GAME_NOT_EXISTING, desc: "Il n'existe pas de partie avec ce nom" });
  });


  /**
   * Le ou les clients `game` doivent annoncer que le match s'est terminé avec l'évènement `endGame`.
   * Il attend un objet en paramètre avec les propriétés suivantes :
   *    - `game_name` : nom de la partie terminée
   *    - `player1_score` : score final du joueur 1
   *    - `player2_score` : score final du joueur 2
   * Si la partie en question existe on va changer son état à FINISHED et on va mettre à jour
   * le score des deux joueurs. Ensuite un évent est envoyés à tous les clients pour les notifier.
   * @Events envoyés au client émetteur :
   *    - `fail` avec le code `4` : la partie n'existe pas
   *    - `success` avec le code `5` : la partie a bien été arrêté dans le serveur
   * @Events envoyés à tous les clients connectés :
   *    - `endGame` avec comme paramètres ceux envoyés par le client émetteur : 
   *         la partie est terminée
   */
  socket.on("endGame", function (params) {
    console.log(`End of the game`)
    let isAdded = false;
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
        game.setGameState(GameState.FINISHED);
        isAdded = true;
      }
    });
    if (isAdded) {
      socket.emit("success", { code: SuccessCode.END_GAME_SUCCESS, desc: "Partie terminée" });
      io.emit("endGame", params);
    } else {
      socket.emit('fail', { code: ErrorCode.GAME_NOT_EXISTING, desc: "La partie n'existe pas" })
    }
  });

  /**
   * Le ou les clients `game` émettent l'évènement `updateScore` pour mettre à jour le 
   * score des joueurs pour partie donnée. L'évent attend comme paramètre un objet avec les propriétés suivantes :
   *    - `game_name` : nom de la partie,
   *    - `player1_score` : nouveau score du joueur 1,
   *    - `player2_score` : nouveau score du joueur 2
   * La partie si elle existe va être mise à jour avec les nouveaux scores et
   * tous les clients vont être notifiés du changement
   * @Events envoyés au client émetteur :
   *    - `fail` avec le code `4` : la partie n'existe pas
   *    - `success` avec le code `6` : le score a bien été mis à jour
   * @Events envoyés à tous les clients connectés :
   *    - `updateScore` avec comme paramètre le même objet que celui envoyé par l'émetteur  
   */
  socket.on("updateScore", function (params) {
    console.log(`Update score`)
    let isAdded = false;
    let res;
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
        game.status = GameState.INTERUPTED;
        res = game;
        isAdded = true;
      }
    });
    if (isAdded) {
      socket.emit("updateScore_success", { code: SuccessCode.UPDATE_SCORE_SUCCESS, desc: 'Scores de la partie mis à jour', params: {updatedGame: res} });
      io.emit("updateScore", params);
    } else {
      socket.emit('updateScore_fail', { code: ErrorCode.GAME_NOT_EXISTING, desc: "La partie n'existe pas" })
    }

  });


  /**
   * Quand un client envoie un event `addWindEvent` au serveur, il doit donner en parametre un objet.
   * L'objet doit contenir au moins le nom de la partie (`gameName`), la vitesse du vent (`speed`) et
   * la direction du vent (`direction`).
   * Ensuite on fait un nouvel objet WindAction, qui est une action et sera ajoutee a la liste des actions
   * pour la game en question (si elle existe).
   * @Events envoyés au client émetteur :
   *    - `fail` avec le code `4` : la partie n'existe pas
   *    - `success` avec le code `7` : l'action a bien été prise en compte
   * @Events envoyés aux clients `mobileApp` :
   *    - `actionAddedSuccessfully` avec comme paramètre un objet contenant :
   *          - `action` : l'objet WindAction crée
   *          - `creator` : l'id du client qui a crée l'action
   * @Events envoyés aux clients `game` :
   *    - `actionEvent` avec comme paramètre un objet contenant :
   *          - `actionType` : le type d'action (voir: types d'actions)
   *          - `speed` : vitesse du vent
   *          - `direction` : direction du vent
   */
  socket.on("addWindEvent", function (obj) {

    console.log(obj);
    let gameNotFound = true;
    const actionProvided = new WindAction(ActionType.WIND, obj.speed, obj.direction);
    games.forEach((game) => {
      if (game.getName() !== obj.gameName) return;

      if (game.getGameState() === GameState.INTERUPTED) {
        gameNotFound = false;
        game.getActionManager().addAction(actionProvided);
        // Emit the event to all the sockets connected
        clientManager.getClientsOfType(ClientName.MOBILEAPP).forEach(client => {
          client.socket.emit('actionAddedSuccessfully', { action: actionProvided, creator: socket.client.id });
        });
        // Emit event to confirm that event has been added to the client who created the action
        socket.emit('actionHasBeenAdded');
        // Event to confirm the action has been added.
        socket.emit('success', { code: SuccessCode.ACTION_ADDED_SUCCESS, desc: "Action de vent prise en compte" });
        clientManager.getClientsOfType(ClientName.GAME).forEach(client => {
          client.socket.emit('actionEvent', actionProvided.getObject())
        })
      }
    });

    if (gameNotFound) {
      socket.emit('fail', { code: ErrorCode.GAME_NOT_EXISTING, desc: "La partie n'existe pas" })
    }
  });

  // Event quand la socket se déconnecte du serveur
  socket.on('disconnect', function () {
    clientManager.removeClient(socket.client.id)
  });

});

http.listen(3000, function () {
  console.log("listening on *:3000");
});
