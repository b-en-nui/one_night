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
var middleRoles = null;
var troubledQty = 0;
var troubledPlayers = [];

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
            middleRoles = shuffledRoles.slice(shuffledRoles.length-3, shuffledRoles.length);
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
    });

    socket.on('peekRole', function (data) {
        if (data.isMid){
            var peekedCard = middleRoles[data.id];
            socket.emit("peekInfo", {role:peekedCard, isMid:data.isMid});
        }
        else{
            var peekedPlayer = PLAYER_LIST[data.id];
            socket.emit("peekInfo", {player:peekedPlayer, divID:data.divID, isMid:data.isMid});
        }

    });

    socket.on('robRole', function (data) {
        var robbedPlayer = PLAYER_LIST[data.id];
        var robberPlayer = PLAYER_LIST[data.myid];

        var stolenRole = robbedPlayer.role;
        robbedPlayer.role = data.myrole;
        robberPlayer.role = stolenRole;

        PLAYER_LIST[data.id] = robbedPlayer;
        PLAYER_LIST[data.myid] = robberPlayer;

        var tempRobbedRole = shuffledRoles[data.divID];
        shuffledRoles[data.divID] = shuffledRoles[data.mydivID];
        shuffledRoles[data.mydivID] = tempRobbedRole;

        socket.emit("robInfo", {divID:data.divID, mydivID:data.mydivID, role:stolenRole})
    });

    socket.on('troubleRole', function (data) {
        troubledQty++;
        troubledPlayers.push(data);

        if (troubledQty == 2){
            console.log("Switch these folks");
            var troubledPlayer1 = PLAYER_LIST[troubledPlayers[0].id];
            var troubledPlayer2 = PLAYER_LIST[troubledPlayers[1].id];

            var switchedRole = troubledPlayer1.role;
            troubledPlayer1.role = troubledPlayer2.role;
            troubledPlayer2.role = switchedRole;

            PLAYER_LIST[troubledPlayers[0].id] = troubledPlayer1;
            PLAYER_LIST[troubledPlayers[1].id] = troubledPlayer2;

            var tempSwitchedRole = shuffledRoles[troubledPlayers[0].divID];
            shuffledRoles[troubledPlayers[0].divID] = shuffledRoles[troubledPlayers[1].divID];
            shuffledRoles[troubledPlayers[1].divID] = tempSwitchedRole;

            socket.emit("troubleInfo");
        }

        else if (troubledQty > 2){
            console.log("Do nothing");
        }
        

    })
});

// update packets
var frameCount = 0;
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
        //console.log(PLAYER_LIST); //(helpful for debugging)
    }

    
    if (onGame){
        // console.log(PLAYER_LIST); //(helpful for debugging)
        var pack = [];
        var playerCount = 0;
        for (var i in PLAYER_LIST){
            var player = PLAYER_LIST[i];
            player.role = shuffledRoles[playerCount]; //add error handling for not 3-8 players
            pack.push({
                id: player.id,
                name: player.name,
                role: player.role
            })
            playerCount++;
        }
        pack.push(middleRoles);
        for (var i in SOCKET_LIST){
            var socket = SOCKET_LIST[i];
            socket.emit('playerInfo',pack);
        }
        console.log(frameCount);
        frameCount++;
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
