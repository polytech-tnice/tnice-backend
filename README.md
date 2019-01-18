# tnice-backend

Backend of the T-Nice project

##### Table of contents

1. [Getting Started](#gettingStarted)
2. [Connection to the server](#connectToServer)
3. [Basic T-Nice Workflow](#tNiceWorkflow)
4. [Error codes](#errorCodes)
5. [Success codes](#successCodes)

## Getting started
<a name="gettingStarted"></a>

```bash
# install dependencies
npm install
npm install -g nodemon

# launch the serv at localhost:3000
nodemon index.js or node index.js
```

## Connection to the server
<a name="connectToServer"></a>

Depends on the langage you are using, you may need to install and configure [socket.io ](https://socket.io/) in your project. If your client is not on the same machine than the server, socket.io will need your ip address or server adress where the client is to reach it (ipaddress:3000).

Then you will be able to listen events from the server with `socket.on` and send ones with `socket.emit` (this may change with the language used, please refers to proper documentation).

## Basic T-Nice workflow
<a name="tNiceWorkflow"></a>

(All the codes shown here will be in `javascript`)

### Event connect

First of all, if your client is correctly configured with socket.io, you will received the event 
`connect` if you are connected to the server. 

```js
socket.on('connect', function() {
  console.log("I'm connected !")
})
```

### Event authentication

Then the server needs to know who the client is and is his type. This event takes a JSON object as param like this:

```js
// authentification event param
{
  name: "mobileApp"
}
```

`name` property must be one of : 

* `"webApp"` : Front application to configure and launch the game (Unique client)
* `"mobileApp"` : Mobile application used by spectators to disrupt the game (Multiple clients)
* `"game"` : T-Nice game

Two events may be sent back to the client after authentification : 

* `clientAlreadyRegistered` : send when the client is already registered in server (avoid duplicates)
* `unknownName` : send when the name given is incorrect

### Event initGame

To launch a T-nice game it is necessary to configure it in first place. It's the purpose of `initGame` event. The event takes a JSON object as param like this :

```js
// initGame param
{
  game_name: "US Open Final",
  player1_name: "Federer",
  player2_name: "Tsonga"
}
```

If the initialization of the game is a success, the client will received the event `initGameReceived`.

Otherwise the event `fail` will be send with a JSON object as param :

```js
// fail event param
{
  desc: "Error message"
}
```

### Event joinGameEvent

When at least one game is saved in the server, a client can join it with the event `joinGameEvent` wich takes a JSON object as param :

```js
// joinGameEvent param
{
  name : "Name of the game to join"
}
```

If the name given doesn't exists or an error occured in the server, the server will send the event `joinGameFailEvent`

### Event endGame

The `endGame` event is used to be emitted by a `game` client to notify the server and the others clients than a game is over. The event takes a JSON Object as param : 

```js
// endGame param
{
  game_name : "Name of the game that ended",
  player1_score : "Score of player 1 at the end of the match",
  player2_score : "Score of player 2 at the end of the match"
}
```

If the game name doesn't exists or an error occured in the server, the client will received the event `fail`.

Otherwise the success event will be `endGameReceived`.

### Event updateScore

The `updateScore` is used to be emitted by a `game` client to notify the server and the others clients an update with the players's scores. The event takes a JSON Object as param :

```js
// updateScore param
{
  game_name: "Name of the game to update",
  player1_score : "New score of player 1",
  player2_score : "New score of player 2"
}
```

If the game name doesn't exists or an error occured in the server, the client will received the event `fail`.

Otherwise the success event will be `updateScoreReceived`.

### Event addWindEvent

The `addWindEvent` is used to be emitted by `mobileApp` clients to disrupt the game with a wind effect. The event takes a JSON object as param :

```js
// addWindEvent param
{
  gameName: "Name of the game to disrupt",
  speed: "Speed of the wind",
  direction: "Direction of the wind (North, South, East or West)"
}
```

The `mobileApp` client which emitted the event will receive the event `actionAddedSuccessfully` if the action have been correctly handle by the server.

Then all the clients of type `game` will received the event `actionEvent` with a JSON object as param containing all the informations about the wind action. 

```js
// actionEvent params
{
  actionType : 1,
  speed : "Speed of the wind",
  direction: "Direction of the wind"
}
```

`actionType` property must be one of : 
* `1` for Wind action
* `2` for unknown one



## Error codes
<a name="errorCodes"></a>

* `1` (CLIENT_ALREADY_REGISTERED) : Send when a client emitted the event `authentication` and he is already registered 
* `2` (CLIENT_NAME_UNKNOWN) : Send when a client name given as param of an event not exist
* `3` (GAME_ALREADY_EXISTING) : Send when a client emitted the event `initGame` but a game with the name given is already registered by the server
* `4` (GAME_NOT_EXISTING) : Send when the name of a game given as param of an event not exist in the server
* `5` (GAME_ALREADY_IN_PROGRESS) : Send when a client try to launch a game which is already in progress
* `6` (CLIENT_ALREADY_IN_GAME) : Send when a client try to join a game where he is already in

## Success codes
<a name="successCodes"></a>

* `1` (AUTH_SUCCESS) : The authentication was successful
* `2` (INIT_GAME_SUCCESS) : The initialization of the game was successful
* `3` (LAUNCH_GAME_SUCCESS) : The game was successfully launched
* `4` (JOIN_GAME_SUCCESS) : The client has successfully joined the game
* `5` (END_GAME_SUCCESS) :  The game ended successfully
* `6` (UPDATE_SCORE_SUCCESS) :  The score was successfully updated
* `7` (ACTION_ADDED_SUCCESS) :  The action was successfully added







