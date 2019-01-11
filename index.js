var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { pingInterval: 500 });
var ActionType = require('./_models/action-type')
var WindAction = require('./_models/action')
var ActionManager = require('./utils/action-manager')
var Player = require('./_models/player')
var Game = require('./_models/game')
var GameState = require('./_models/game-state')

//const actionManager = new ActionManager();
const games = [];

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  console.log("User connected", socket.client.id);
  socket.on("chat message", function(obj) {
    console.log(obj);
    const lobj = JSON.parse(obj);
    console.log(`[${socket.client.id}] Client ${lobj.device} : ${lobj.msg}`);
    io.emit("chat message", lobj.msg);
  });

  socket.on("initGame", function(obj) {
    const params = JSON.parse(obj);
    const players = [];
    const player1 = new Player(params.player1_name);
    const player2 = new Player(params.player2_name);
    players.push(player1);
    players.push(player2);
    const createdGame = new Game(params.game_name, players);
    createdGame.setGameState(GameState.IN_PROGRESS);
    createdGame.setActionManager(new ActionManager());
    games.push(createdGame);
    console.log(`Nombre de parties: ${games.length}`)
    socket.emit("initGameReceived");
  });

  socket.on("endGame", function(obj) {
    console.log(`End of the game`)
    const params = JSON.parse(obj);

    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
      }
    });
    socket.emit("endGameReceived");
  });

  socket.on("updateScore", function(obj) {
    console.log(`Update score`)
    const params = JSON.parse(obj);

    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        game.playerOneScore = params.player1_score;
        game.playerTwoScore = params.player2_score;
      }
    });
    socket.emit("updateScoreReceived");
  });


  // Read actions sent by clients
  socket.on("addWind", function(obj) {
    console.log(`Received addWindEvent from client!`)
    const params = JSON.parse(obj);
    const actionProvided = new WindAction(ActionType.WIND, params.speed, params.direction);
    let isAdded = false;
    games.forEach((game) => {
      if (game.getName() === params.game_name) {
        console.log('Game found, add the action with action manager!')
        game.getActionManager().addAction(actionProvided);
        console.log(`Nombre d'actions pour la game ${game.getName()}: ${game.getActionManager().getActions().length}`)
        isAdded = true;
      }
    });
    if (isAdded) {
      console.log('Action added!')
    } else {
      console.log('Error')
    }
  })
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
