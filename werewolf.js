var io;
var gameSocket;
var db;

var roleMatrix = {
    '3': [["werewolf","werewolf","seer","robber","troublemaker","villager"],
        ["werewolf","minion","seer","robber","troublemaker","villager"],
        ["werewolf","werewolf","seer","robber","troublemaker","insomniac"]],
    '4': [["werewolf","werewolf","seer","robber","troublemaker","villager","villager"],
        ["werewolf","werewolf","seer","robber","troublemaker","insomniac","villager"],
        ["werewolf","werewolf","seer","robber","troublemaker","insomniac","drunk"]],
    '5': [["werewolf","werewolf","seer","robber","troublemaker","villager","villager","villager"],
        ["werewolf","werewolf","seer","robber","troublemaker","insomniac","villager","villager"],
        ["werewolf","werewolf","seer","robber","troublemaker","insomniac","drunk","villager"]],
    '6': [["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","villager","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","drunk","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","insomniac","drunk","villager"]],
    '7': [["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","villager","villager","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","drunk","villager","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","drunk","insomnia","villager"]],
    '8': [["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","villager","villager","villager","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","drunk","villager","villager","villager"],
        ["werewolf","werewolf","minion","seer","robber","troublemaker","tanner","drunk","insomnia","villager","villager"]],
}

var voteStore = {};

/**
 * This function is called by app.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket, sdb){
    io = sio;
    gameSocket = socket;
    db=sdb;
    gameSocket.emit('connected', { message: "You are connected!" });

    //common event
    gameSocket.on('findLeader',findLeader);

    // Host Events
    gameSocket.on('hostCreateNewGame', hostCreateNewGame);
    gameSocket.on('hostRoomFull', hostPrepareGame);
    gameSocket.on('hostCountdownFinished', hostStartGame);
    gameSocket.on('updateHST', updateHST);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerRestart', playerRestart);
    gameSocket.on('playerRobbed', playerRobbed);
    gameSocket.on('playersTroubled', playersTroubled);
    gameSocket.on('middleDrunked', middleDrunked);
    gameSocket.on('turnComplete', playerTurnComplete);
    gameSocket.on('voted', processVote);
}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

/**
 * The 'START' button was clicked and 'hostCreateNewGame' event occurred.
 */
function hostCreateNewGame(data) {
    console.log(data)

    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id, maxPlayers: data.playerCount, roleList: shuffle(roleMatrix[data.playerCount][data.chosenRoleSet])});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
};

/*
 * Two players have joined. Alert the host!
 * @param gameId The game ID / room ID
 */
function hostPrepareGame(packet) {
    var sock = this;
    
    for (let [index, val] of packet.players.entries()) {
        packet.players[index].role = packet.roleList[index];
    }

    var data = {
        mySocketId : sock.id,
        gameId : packet.gameId,
        players: packet.players,
        roleList: packet.roleList

    };
    console.log("All Players Present. Preparing game...");
    io.sockets.in(data.gameId).emit('beginNewGame', data);
}

/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game Started.');
    startGame(gameId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function updateHST(winningPlayer) {
    //updating players win count
    console.log('Updating HST with ' + winningPlayer);
    db.all("SELECT * FROM player WHERE player_name=?",winningPlayer, function(err, rows) {
        rows.forEach(function (row) {
            win=row.player_win;
            win++;
            console.log(win);
            db.run("UPDATE player SET player_win = ? WHERE player_name = ?", win, winningPlayer);
            console.log(row.player_name, row.player_win);
        })
    });
    // If the current round exceeds the number of words, send the 'gameOver' event.
    //io.sockets.in(data.gameId).emit('gameOver',data);
}

// function for finding leader
function findLeader()
{
  console.log("finding leader");
    var sock=this;
    var i=0;
    leader={};
    db.all("SELECT * FROM player ORDER BY player_win DESC LIMIT 10",function(err,rows)
    {
      if(rows!=undefined)
      {
        rows.forEach(function (row)
        {
          leader[i]={};
          leader[i]['name']=row.player_name;
          leader[i]['win']=row.player_win;
          console.log(row.player_name);
          console.log(row.player_win);
          i++;
        })
      }
      console.log("found leader");
      sock.emit('showLeader',leader);
    });

}
/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    //console.log('Player ' + data.playerName + 'attempting to join game: ' + data.gameId );

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    console.log(data.gameId)
    var room = gameSocket.adapter.rooms[data.gameId];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);
        db.serialize(function()
            {
                var stmt = " SELECT * FROM player WHERE player_name='"+data.playerName+"';";
                db.get(stmt, function(err, row){
                    if(err) throw err;
                    if(typeof row == "undefined") {
                            db.prepare("INSERT INTO player (player_name,player_win) VALUES(?,?)").run(data.playerName,0).finalize();
                    } else {
                        console.log("row is: ", row);
                    }
                });
            });
        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        sock.emit('errorMessage', {message: "This room does not exist."} );
    }
}


/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    // console.log('Player: ' + data.playerName + ' ready for new game.');

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom', data);
}

/**
 * 
 */
function playerRobbed(data) {
    // Emit who robbed whom to all in the game
    console.log(data);
    io.sockets.in(data.gameId).emit('robInfo', data);
}

/**
 * 
 */
function playersTroubled(data) {
    // Emit who have been troubled to all in the game
    console.log(data);
    io.sockets.in(data.gameId).emit('troubleInfo', data);
}

/**
 * 
 */
function middleDrunked(data) {
    // Emit which middle card got drunked to all in game
    console.log(data);
    io.sockets.in(data.gameId).emit('midDrunkInfo', data);
}

/**
 * 
 * @param {*} gameId 
 */
function playerTurnComplete(data){
    if (data.role == "werewolf"){
        console.log("Minions, go. View werewolves");
        io.sockets.in(data.gameId).emit("turn", {role:"minion"})
    }
    if (data.role == "minion"){
        console.log("Seer, go. Look at another player's card, or two center cards");
        io.sockets.in(data.gameId).emit("turn", {role:"seer"})
    }
    if (data.role == "seer"){
        console.log("Robber, go. Steal another player's card");
        io.sockets.in(data.gameId).emit("turn", {role:"robber"})
    }
    if (data.role == "robber"){
        console.log("Troublemaker, go. Switch two player's cards");
        io.sockets.in(data.gameId).emit("turn", {role:"troublemaker"})
    }
    if (data.role == "troublemaker"){
        console.log("Drunk, go. Take a card from the middle");
        io.sockets.in(data.gameId).emit("turn", {role:"drunk"})
    }
    if (data.role == "drunk"){
        console.log("Insomniac, go. Look at your card.");
        io.sockets.in(data.gameId).emit("turn", {role:"insomniac"})
    }
    if (data.role == "insomniac"){
        console.log("Voting time!");
        io.sockets.in(data.gameId).emit("startVoting")
    }
}

/**
 * 
 * @param {*} data 
 */
function processVote(data){
    // if no votes in votestore correspond to gameID, create new key
    if (!(data.gameId in voteStore)){
        voteStore[data.gameId] = [data.vote];
    }
    else{
        voteStore[data.gameId].push(data.vote);
    }

    // if len array == len in data, process votes
    if (voteStore[data.gameId].length == data.playerCount){
        console.log('Voting done - time to process!');
        var distribution = {},
            max = 0,
            result = [];
    
        voteStore[data.gameId].forEach(function (a) {
            distribution[a] = (distribution[a] || 0) + 1;
            if (distribution[a] > max) {
                max = distribution[a];
                result = [a];
                return;
            }
            if (distribution[a] === max) {
                result.push(a);
            }
        });
        console.log('\nVoting distribution')
        console.log(distribution);
        console.log('\nVoting max')
        console.log(max);
        console.log('\nVoting result')
        console.log(result);

        // send results to all players
        io.sockets.in(data.gameId).emit("voteResults", {distribution: distribution, max: max, result: result});

        // delete voteStore kvp for gameId
        delete voteStore[data.gameId];
    }
}

/* *************************
   *                       *
   *      GAME LOGIC       *
   *                       *
   ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 * @param gameId The room identifier
 */
function startGame(gameId) {
    var data = {};
    console.log(data)
    io.sockets.in(gameId).emit('startGame', data);
    io.sockets.in(gameId).emit('turn', {role:"werewolf"})
}

/*
 * Javascript implementation of Fisher-Yates shuffle algorithm
 * http://stackoverflow.com/questions/2450954/how-to-randomize-a-javascript-array
 */
function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue;
    var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}