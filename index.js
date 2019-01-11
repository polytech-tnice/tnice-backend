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
    console.log(`[${socket.client.id}] Client ${obj.device} : ${obj.msg}`);
    io.emit("chat message", obj.msg);
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
