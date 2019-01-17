var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { transports: ["polling", "websocket"] });
var ActionType = require("./_models/action-type");
var WindAction = require("./_models/action");
var ActionManager = require("./utils/action-manager");
var Player = require("./_models/player");
var Game = require("./_models/game");
var GameState = require("./_models/game-state");
var Client = require("./_models/client");
var ClientName = require("./_models/client-name");
var ClientManager = require("./utils/client-manager");

const clientManager = new ClientManager();
const games = [];
const sockets = [];

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

io.on("connection", function (socket) {
  console.log(`Le nombre de sockets dans le tableau (avant): ${sockets.length}`)
  sockets.push(socket);
  console.log(`Le nombre de sockets dans le tableau (apres): ${sockets.length}`)
  console.log("User connected", socket.client.id);

  // Event to register the client in the server with a name
  // Value of the name must be in ClientName enum
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

  // Event to initialize a new game by giving a name and players' name too
  socket.on("initGame", function (params) {
    let canCreateGame = true;
    games.forEach((game) => {
      if (game.getName() === params.game_name) canCreateGame = false;
    });
    if (!canCreateGame) {
      // A game with the same name already exists
      // TODO - send a proper event with ERROR CODE that can be used in front-end
      socket.emit('fail', { desc: 'Une partie existe déjà avec ce nom' })
      return;
    }


    const players = [];
    const player1 = new Player(params.player1_name);
    const player2 = new Player(params.player2_name);
    players.push(player1);
    players.push(player2);
    const createdGame = new Game(params.game_name, players);
    createdGame.setGameState(GameState.INTERUPTED);
    createdGame.setActionManager(new ActionManager());
    games.push(createdGame);
    // Emit an event to say that the game has been initialized correctly
    socket.emit("initGameReceived");
    io.emit("initGame", createdGame);
  });

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
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
        isAdded = true;
      }
    });
    if (isAdded) {
      socket.emit("updateScoreReceived");
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
   * 1. actionAddedSuccessfully - pour dire que l'action est bien prise en compte
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
        })

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
