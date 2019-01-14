var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { transports: ["polling", "websocket"]});
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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

// Endpoint to have the list of games
app.get("/api/games", (req, res) => {
  console.log('Using api/games endpoint...');
  res.send({games: games})
});

io.on("connection", function(socket) {
  console.log("User connected", socket.client.id);
  socket.on("authentification", function(params) {
    const authParams = params;
    console.log("Authentification : ", authParams);
    const clients = clientManager.getClients();
    if (clients.find(aClient => aClient.id === socket.client.id)) return;

    const client = new Client(socket.client.id, authParams);
    clientManager.addClient(client);
  });
  socket.on("chat message", function(obj) {
    console.log(obj);
    const lobj = JSON.parse(obj);
    console.log(`[${socket.client.id}] Client ${lobj.device} : ${lobj.msg}`);
    io.emit("chat message", lobj);
  });

  // Event to initialize a new game by giving a name and players' name too
  socket.on("initGame", function(obj) {
    const params = JSON.parse(obj);
    let canCreateGame = true;
    games.forEach((game) => {
      if (game.getName() === params.game_name) canCreateGame = false;
    });
    if (canCreateGame) {
      const players = [];
      const player1 = new Player(params.player1_name);
      const player2 = new Player(params.player2_name);
      players.push(player1);
      players.push(player2);
      const createdGame = new Game(params.game_name, players);
      createdGame.setGameState(GameState.IN_PROGRESS);
      createdGame.setActionManager(new ActionManager());
      games.push(createdGame);
      // Emit an event to say that the game has been initialized correctly
      socket.emit("initGameReceived");
    } else {
      // A game with the same name already exists
      // TODO - send a proper event with ERROR CODE that can be used in front-end
      socket.emit('fail')
    }
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
  socket.on('joinGameEvent', (obj) => {
    const gameName = obj.name;
    games.forEach((game) => {
      if (game.getName() === gameName) {
        game.getConnectedClientIDs().push(socket.client.id);
        socket.emit('joinGameSuccessEvent', obj);
      }
    });
    socket.emit('joinGameFailEvent');
  });


  // Read actions sent by clients
  socket.on("addWind", function(obj) {
    const params = JSON.parse(obj);
    const actionProvided = new WindAction(ActionType.WIND, params.speed, params.direction);
    let isAdded = false;
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        if (game.getGameState() === GameState.INTERUPTED) {
          game.getActionManager().addAction(actionProvided);
          isAdded = true;
        }
      }
    });
    if (isAdded) {
      socket.emit('success', actionProvided)
    } else {
      socket.emit('fail')
    }
  })
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
