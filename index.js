// Import the Express module
var express = require('express');

// Import the 'path' module (packaged with Node.js)
var path = require('path');

// Create a new instance of Express
var app = express();

// Import the fs
var fs = require('fs');
// Import the Werewolf game file.
var agx = require('./werewolf');

//creating server if not exists

var file ="mydb.db";
var exists = fs.existsSync(file);

if(!exists) {
  console.log("Creating DB file.");
  fs.openSync(file, "w");
}

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
  if(!exists) {
    db.run("CREATE TABLE player (player_name TEXT, player_win INT)");
  }
});


// Create a simple Express application
app.use(express.static(path.join(__dirname,'client')));

// Create a Node.js based http server on port 2000
var server = require('http').createServer(app).listen(process.env.PORT || 2000);

// Create a Socket.IO server and attach it to the http server
var io = require('socket.io').listen(server);

// Listen for Socket.IO Connections. Once connected, start the game logic.
io.sockets.on('connection', function (socket) {
    //console.log('client connected');
    agx.initGame(io, socket, db);
});