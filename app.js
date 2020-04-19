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
var PLAYER_LIST = {};
var onLobby = true;
var onGame = false;
var shuffledRoles = null;

var roleMatrix = {
    3: ["werewolf","minion","seer","robber","troublemaker","villager"],
    4: ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner"],
    5: ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    6: ["werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    7: ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    8: ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager","villager"]
}

var Player = function(id){
    var self = {
        id:id,
        name:'',
        ready:false,
        role: ''
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
            finalPlayerList = PLAYER_LIST;
            for (var i in SOCKET_LIST){
                var socket = SOCKET_LIST[i];
                socket.emit('redirect','/game');
            }
            shuffledRoles = shuffleArray(roleMatrix[Object.keys(PLAYER_LIST).length]);
            onLobby = false;
            onGame = true;
        }
    })
});

// game code
gameio.on('connection', function (socket) {
    console.log('player joined the game!')

    socket.on('disconnect',function(){
        console.log('player left the game')
    });

    socket.on('defineSocket', function (data) {
        socket.id = data.id;
        SOCKET_LIST[socket.id] = socket;
        var player = Player(socket.id);
        player.name = data.name;
        PLAYER_LIST[socket.id] = player;
    })
});


// update packets

setInterval(function() {
    if (onLobby){
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
    }

    if (onGame){
        console.log(PLAYER_LIST);
        var pack = [];
        var playerCount = 0;
        for (var i in PLAYER_LIST){
            var player = PLAYER_LIST[i];
            player.role = shuffledRoles[playerCount]; //add error handling for not 3-8 players
            console.log(shuffledRoles[playerCount]);
            pack.push({
                id: player.id,
                name: player.name,
                role: player.role
            })
            playerCount++;
        }
        pack.push(shuffledRoles.slice(shuffledRoles.length-3, shuffledRoles.length));
        for (var i in SOCKET_LIST){
            var socket = SOCKET_LIST[i];
            socket.emit('playerInfo',pack);
        }
    }

}, 3000);

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
