var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv);

const lobbyio = io.of('/lobby');
const gameio = io.of('/game');

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.get('/game', function(req, res) {
    res.sendFile(__dirname + '/client/game.html');
});
app.use('/client',express.static(__dirname + '/client/'));

serv.listen(2000);
console.log('Listening on port 2000');

var SOCKET_LIST = {};
var PLAYER_LIST= {};
var onLobby = true;

var Player = function(id){
    var self = {
        id:id,
        name:'',
        ready:false
    }
    return self;
}

lobbyio.on('connection', function (socket) {
    socket.id = Math.random();
    socket.name = '';
    SOCKET_LIST[socket.id] = socket;

    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
    });

    socket.on('setName', function (data) {
        player.name = data.name;
    })

    socket.on('playerReady', function (data){
        player.ready = true;

        var partyReady = true;

        for (var index in PLAYER_LIST) {
            if (PLAYER_LIST[index].ready == false){
                partyReady = false;
            }
        }

        if (partyReady) {
            for (var i in SOCKET_LIST){
                var socket = SOCKET_LIST[i];
                socket.emit('redirect','/game');
            }
            onLobby = false;
        }
    })
});

while (onLobby == true){
    setInterval(function() {
        var pack = [];
        for (var i in PLAYER_LIST){
            var player = PLAYER_LIST[i];
            pack.push({
                id: player.id,
                name: player.name,
                ready: player.ready
            })
        }
        for (var i in SOCKET_LIST){
            var socket = SOCKET_LIST[i];
            socket.emit('playerInfo',pack);
        }
    
        console.log(PLAYER_LIST)
    
    }, 3000);
}



// game code

gameio.on('connection', function (socket) {
    console.log('player joined the game!')

    socket.on('disconnect',function(){
        console.log('player left the game')
    });
});