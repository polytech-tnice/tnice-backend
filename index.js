var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, { pingInterval: 500 });

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", function(socket) {
  console.log("User connected", socket.client.id);
  socket.on("chat message", function(msg, device) {
    console.log(`[${socket.client.id}] Client ${device} : ${msg}`);
    io.emit("chat message", msg);
  });
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});
