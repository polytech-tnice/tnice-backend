var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { pingInterval: 500 });

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  console.log("User connected ", socket.client.id);
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
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
