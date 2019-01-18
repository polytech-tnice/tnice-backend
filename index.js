var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { transports: ["polling", "websocket"] });
var ActionType = require("./_models/actions/action-type");
var WindAction = require("./_models/actions/action");
var ActionManager = require("./utils/action-manager");
var Player = require("./_models/player");
var Game = require("./_models/game");
var GameState = require("./_models/game-state");
var Client = require("./_models/client");
var ClientName = require("./_models/client-name");
var ClientManager = require("./utils/client-manager");

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
   * @Events
   *    - `clientAlreadyRegistered` : le client a déjà été authentifié auparavant (évitons les doublons)
   *    - `unknowName` : le paramètre 'name' renseigné est invalide
   */
  socket.on("authentication", function (authParams) {
    console.log("Authentification : ", authParams);
    const clients = clientManager.getClients();
    if (clients.find(aClient => aClient.id === socket.client.id)) {
      socket.emit('clientAlreadyRegistered');
      return;
    }
    if (!authParams.name || Object.values(ClientName).indexOf(authParams.name) === -1) {
      socket.emit('unknownName')
      return;
    }

    const client = new Client(socket, authParams.name);
    clientManager.addClient(client);
  });

  /**
   * Le client `webApp` est le seul à pouvoir créer une partie de t-nice.
   * L'évènement `initGame` attend un objet `gameParams` en paramètre avec les propriétés suivantes :
   *    - `game_name` : le nom de la partie (doit être unique)
   *    - `player1_name` : le nom du joueur 1 
   *    - `player2_name` : le nom du joueur 2
   * Si une partie avec ce nom n'a pas encore été crée, on l'ajoute à la liste des parties et on notifie 
   * tous les clients que la partie a été crée.
   * @Events
   *    - `fail` : envoyé si la partie existe déjà
   *    - `initGameReceived` : prévient le client `webApp` qui a initialisé la partie que l'opération s'est bien passé
   *    - `initGame` : envoyé à tous les clients lorsque la partie a bien été crée
   */
  socket.on("initGame", function (gameParams) {
    let canCreateGame = true;
    games.forEach((game) => {
      if (game.getName() === gameParams.game_name) canCreateGame = false;
    });
    if (!canCreateGame) {
      // A game with the same name already exists
      // TODO - send a proper event with ERROR CODE that can be used in front-end
      socket.emit('fail', { desc: 'Une partie existe déjà avec ce nom' })
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
    socket.emit("initGameReceived");
    io.emit("initGame", createdGame);
  });

  /**
   * Le client `webApp` peut lancer la partie une fois qu'elle est crée
   * l'évènement `launchGame` attend en paramètre un objet avec les propriétés suivantes :
   *    - `name` : nom de la partie à lancer
   * L'état de la partie est modifiée pour passer en `IN_PROGRESS`
   * @Events
   *    - `fail` : peut être envoyé quand la partie n'existe pas ou qu'elle est déjà lancée.
   *                voir la description de l'erreur pour les détails
   *    - `success` : envoyé au client `webApp` pour le notifier que la partie a bien été lancée
   *    - `gameLaunched` : envoyé aux clients `game` pour le prévenir que la partie doit être lancée
   */
  socket.on('launchGame', (launchParams) => {
    const gameName = launchParams.name;
    let canUpdateGame = true;

    const find = games.find(game => game.getName() === gameName);
    if (!find) {
      socket.emit('fail', { desc: "La partie n'existe pas" })
      return;
    }

    games.forEach((game) => {
      if (game.getName() === gameName && game.getGameState() === GameState.IN_PROGRESS) {
        canCreateGame = false;
        return;
      }

      if (game.getName() === gameName) {
        game.setGameState(GameState.IN_PROGRESS);
      }
    });
    if (!canUpdateGame) {
      socket.emit('fail', { desc: 'Une partie est déjà en cours avec ce nom' })
      return;
    }

    socket.emit('success', { desc: 'Partie correctement lancée' })
    clientManager.getClientsOfType(ClientName.GAME).forEach(c => {
      c.getSocket().emit('gameLaunched', { name: gameName });
    })
  })

  /**
   * Quand un client demande de rejoindre une partie il doit envoyer un JSON object qui a au moins un 
   * champ 'name' qui contient le nom de la partie qu'il veut rejoindre.
   * Si le nom est valide (i.e. la partie existe), on ajoute l'ID du client dans un tableau propre a 
   * la partie qu'il veut rejoindre.
   * @Events
   * 1. joinGameSuccessEvent - le client a pu rejoindre la partie - on renvoie les infos sur la partie
   * 2. joinGameFailEvent - le client n'a pas pu rejoindre la partie
   */
  socket.on('joinGameEvent', (params) => {
    const gameName = params.name;
    games.forEach((game) => {
      if (game.getName() === gameName) {
        game.getConnectedClientIDs().push(socket.client.id);
        socket.emit('joinGameSuccessEvent', params);
      }
    });
    socket.emit('joinGameFailEvent');
  });

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
      socket.emit("endGameReceived");
      io.emit("endGame", params);
    } else {
      socket.emit('fail')
    }
  });

  socket.on("updateScore", function (params) {
    console.log(`Update score`)
    let isAdded = false;
    let res;
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
        res = game;
        isAdded = true;
      }
    });
    if (isAdded) {
      socket.emit("updateScoreReceived", res);
      io.emit("updateScore", params);
    } else {
      socket.emit('fail')
    }

  });


  /**
   * Quand un client envoie un event 'addWindEvent' au serveur, il doit donner en parametre un JSON object.
   * Le JSON object doit contenir au moins le nom de la partie (@gameName), la vitesse du vent (@speed) et
   * la direction du vent (@direction).
   * Ensuite on fait un nouvel objet WindAction, qui est une action et sera ajoutee a la liste des actions
   * pour la game en question (si elle existe).
   * @Events
   * 1. actionAddedSuccessfully - pour dire que l'action est bien prise en compte a tous les clients
   * 2. actionHasBeenAdded - pour indiquer au client qui a fait l'event que l'action est bien prise en compte
   */
  socket.on("addWindEvent", function (obj) {

    console.log(obj);
    const actionProvided = new WindAction(ActionType.WIND, obj.speed, obj.direction);
    games.forEach((game) => {
      if (game.getName() !== obj.gameName) return;

      if (game.getGameState() === GameState.INTERUPTED) {
        game.getActionManager().addAction(actionProvided);
        // Emit the event to all the sockets connected
        clientManager.getClientsOfType(ClientName.MOBILEAPP).forEach(client => {
          client.socket.emit('actionAddedSuccessfully', { action: actionProvided, creator: socket.client.id });
        });
        // Event to confirm the action has been added.
        socket.emit('actionHasBeenAdded');
        clientManager.getClientsOfType(ClientName.GAME).forEach(client => {
          client.socket.emit('actionEvent', actionProvided.getObject())
        })
      }
    });
  });

  // Event quand la socket se déconnecte du serveur
  socket.on('disconnect', function () {
    clientManager.removeClient(socket.client.id)
  });

});

http.listen(3000, function () {
  console.log("listening on *:3000");
});
