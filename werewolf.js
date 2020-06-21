var io;
var gameSocket;
var db;

var roleMatrix = {
    '3': ["werewolf","minion","seer","robber","troublemaker","villager"],
    '4': ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner"],
    '5': ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    '6': ["werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    '7': ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
    '8': ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager","villager"]
}
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
    gameSocket.on('hostNextRound', hostNextRound);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
    gameSocket.on('playerRobbed', playerRobbed);
    gameSocket.on('playersTroubled', playersTroubled);
    gameSocket.on('middleDrunked', middleDrunked);
    gameSocket.on('turnComplete', playerTurnComplete);
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
    this.emit('newGameCreated', {gameId: thisGameId, mySocketId: this.id, maxPlayers: data.playerCount, roleList: shuffle(roleMatrix[data.playerCount])});

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
function hostNextRound(data) {
    if(data.round < wordPool.length ){
        // Send a new set of words back to the host and players.
        //sendWord(data.round, data.gameId);
    } else {

      if(!data.done)
      {
        //updating players win count
        db.all("SELECT * FROM player WHERE player_name=?",data.winner, function(err, rows) {
        rows.forEach(function (row) {
            win=row.player_win;
            win++;
            console.log(win);
            db.run("UPDATE player SET player_win = ? WHERE player_name = ?", win, data.winner);
            console.log(row.player_name, row.player_win);
        })
        });
        data.done++;
      }
        // If the current round exceeds the number of words, send the 'gameOver' event.
      io.sockets.in(data.gameId).emit('gameOver',data);
    }
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
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
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
        console.log("Voting time!!!!!!!!!!!!!!!!!!");
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