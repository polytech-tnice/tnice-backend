var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { pingInterval: 500 });
var ActionType = require('./_models/action-type')
var Action = require('./_models/action')
var ActionManager = require('./utils/action-manager')

const actionManager = new ActionManager();

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
    console.log(obj);
    const params = JSON.parse(obj);
    console.log(`[${socket.client.id}] Init game with params`);
    console.log(`[${socket.client.id}] Game name : ${params.game_name}`);
    console.log(`[${socket.client.id}] Player 1 name : ${params.player1_name}`);
    console.log(`[${socket.client.id}] Player 2 name : ${params.player2_name}`);
    socket.emit("initGameReceived");
  });


  // Read actions sent by clients
  socket.on("addWind", function(obj) {
    console.log(`Received addWindEvent from client!`)
    const actionProvided = new Action(ActionType.WIND, obj);
    actionManager.addAction(actionProvided);
    console.log(`Nombre d'actions: ${actionManager.getActions().length}`)
    socket.emit('actionAdded', actionProvided)
  })
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
