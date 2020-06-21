;
jQuery(function($){
    'use strict';

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     *
     * @type {{init: Function, bindEvents: Function, onConnected: Function, onNewGameCreated: Function, playerJoinedRoom: Function, beginNewGame: Function, onNewWordData: Function, hostCheckAnswer: Function, gameOver: Function, error: Function}}
     */
    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io('/');
            console.log(IO.socket)
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connected', IO.onConnected );
            IO.socket.on('newGameCreated', IO.onNewGameCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('beginNewGame', IO.beginNewGame );
            IO.socket.on('startGame', IO.onStartNight);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('errorMessage', IO.error );
            IO.socket.on('showLeader',IO.showLeader);
            IO.socket.on('robInfo',IO.updateRobInfo);
            IO.socket.on('troubleInfo', IO.updateTroubleInfo);
            IO.socket.on('midDrunkInfo', IO.updateMidDrunkInfo);

            IO.socket.on('turn', IO.newTurn);
        },

        /**
         * The client is successfully connected!
         */
        onConnected : function() {
            // Cache a copy of the client's socket.IO session ID on the App
            console.log('onConnected event recieved')
            App.mySocketId = IO.socket.id;
            // console.log(data.message);
        },

        //function for showing leader
        showLeader : function(data){
          App.$gameArea.html(App.$leaderGame);
            var table='<div id="tablearea"><table id="leadertable"><tr><th>Player Name</th><th>Total Win</th></tr>';
            console.log("Showing Leader");
            var i=Object.keys(data).length;
            for(var j=0;j<i;j++)
            {
                //console.log(i);
              table+='<tr><td>'+data[j].name+'</td><td>'+data[j].win+'</td></tr>';
            }
            table+='</table></div>';
            table+="<div id='mid'><button id='back' class='btn'>BACK</button></div>"
            console.log(table);
            App.$gameArea.append(table);
        },

        /**
         * A new game has been created and a random game ID has been generated.
         * @param data {{ gameId: int, mySocketId: * }}
         */
        onNewGameCreated : function(data) {
            console.log("New game created event recieved")
            console.log(data.roleList)
            App.Host.gameInit(data);
            App.Host.displayNewGameScreen();
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom : function(data) {
            // When a player joins a room, do the updateWaitingScreen funciton.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            console.log("playerJoinedRoom event recieved")
            App[App.myRole].updateWaitingScreen(data);
        },

        /**
         * Both players have joined the game.
         * @param data
         */
        beginNewGame : function(data) {
            console.log('beginNewGame event recieved')
            App.roleList = data.roleList;
            App.origRoleList = data.roleList;
            App.players = data.players;
            App[App.myRole].gameCountdown(data);
        },

        /**
         * A new set of words for the round is returned from the server.
         * @param data
         */
        onStartNight : function(data) {
            console.log('onStartNight event recieved')
            // Update the current round
            App.currentRound = data.round;

            // Change the word for the Host and Player
            App[App.myRole].setGameBoard(data);
        },

        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
        hostCheckAnswer : function(data) {
            if(App.myRole === 'Host') {
                App.Host.checkAnswer(data);
            }
        },

        /**
         * 
         * @param data 
         */
        updateRobInfo : function(data) {
            console.log('updateRobInfo!!!')
            App.players[data.myIndex].role = data.robRole;
            App.players[data.robIndex].role = data.myRole;

            if (App.Player.myIndex == data.myIndex){
                App.Player.gameRole = data.robRole;
                document.getElementById("centerMessage").innerHTML = "Hello " + App.Player.myName + "!<br>You are a <i>" + App.Player.gameRole + "</i>...<br>";
                document.getElementById("playerrole"+App.Player.myIndex).innerHTML = "<sub>(" + App.Player.gameRole + ")</sub>";
            }
            if (App.Player.myIndex == data.robIndex){
                App.Player.gameRole = data.myRole;
            }
            console.log('\nUpdated App HTML:');
            console.log(App);
        },

        /**
         * 
         * @param data 
         */
        updateTroubleInfo : function(data) {
            console.log('updateTroubleInfo!!!')
            App.players[data.troubledPlayers[0].troubleIndex].role = data.troubledPlayers[1].troubleRole;
            App.players[data.troubledPlayers[1].troubleIndex].role = data.troubledPlayers[0].troubleRole;

            console.log('\nUpdated App HTML:');
            console.log(App);
        },

        /**
         * 
         * @param data 
         */
        updateMidDrunkInfo : function(data) {
            console.log('updateMidDrunkInfo!!!')
            App.players[data.myIndex].role = data.drunkRole;
            App.roleList[App.roleList.length - 1 - data.drunkIndex] = data.myRole;

            if (App.Player.myIndex == data.myIndex){
                App.Player.gameRole = data.drunkRole;
                document.getElementById("centerMessage").innerHTML = "Hello " + App.Player.myName + "!<br>You are a <i>" + App.Player.gameRole + "</i>...<br>";
                document.getElementById("playerrole"+App.Player.myIndex).innerHTML = "<sub>(" + App.Player.gameRole + ")</sub>";
            }

            console.log('\nUpdated App HTML:');
            console.log(App);
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver : function(data) {
            App[App.myRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {
            alert(data.message);
        },

        newTurn : function(data) {
            console.log('\nNew turn!')
            console.log(data);
            data.gameId = App.gameId;
            if (App.myRole == 'Host'){
                IO.socket.emit('turnComplete', data);
            }
        }

    };

    var App = {

        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        gameId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        myRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        mySocketId: '',

        /**
         * Player list
         */
        players: {},

        /**
         * Troubled players array
         */
        troubledPlayers: [],

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.showInitScreen();
            App.bindEvents();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$templateGameConfig = $('#game-config-template').html();
            App.$templateNewGame = $('#create-game-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$hostGame = $('#host-game-template').html();
            App.$leaderGame = $('#leaderboard-template').html();
            App.$playerView = $('#player-view-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {
            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.onCreateClick);
            App.$doc.on('click', '#btnGameConfig', App.Host.onConfigClick);

            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart',App.Player.onPlayerStartClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);
            App.$doc.on('click', '#leaderboard', App.onLeaderboardClick);
            App.$doc.on('click', '#back', App.onBackClick);

            // Game
            App.$doc.on('click', '.peekPlayer', App.Player.peekPlayer);
            App.$doc.on('click', '.robPlayer', App.Player.robPlayer);
            App.$doc.on('click', '.troublePlayer', App.Player.troublePlayer);
            App.$doc.on('click', '.peekMid', App.Player.peekMid);
            App.$doc.on('click', '.drunkMid', App.Player.drunkMid);
        },

        /* *************************************
         *             Game Logic              *
         * *********************************** */

        /**
         * Show the initial Anagrammatix Title Screen
         * (with Start and Join buttons)
         */
        showInitScreen: function() {
            App.$gameArea.html(App.$templateIntroScreen);
            //App.doTextFit('.title');
        },

        onLeaderboardClick : function(){
          console.log("clicked button");
          IO.socket.emit('findLeader');
        },

        onBackClick : function()
        {
          App.$gameArea.html(App.$templateIntroScreen);
          App.doTextFit('.title');
        },
        /* *******************************
           *         HOST CODE           *
           ******************************* */
        Host : {

            /**
             * Contains references to player data
             */
            players : [],

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame : false,

            /**
             * Keep track of the number of players that have joined the game.
             */
            numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
            currentCorrectAnswer: '',

            /**
             * Handler for the "Start" button on the Title Screen.
             */
            onCreateClick: function () {
                // console.log('Clicked "Create A Game"');
                App.Host.displayGameConfig();
            },

            /**
             * Handler for the config button after the Title Screen
             */
            onConfigClick: function () {
                // collect data to send to the server
                var data = {
                    playerCount : ($('#playerCountRange').val())
                };

                IO.socket.emit('hostCreateNewGame', data);
            },

            /**
             * The Host screen is displayed for the first time.
             * @param data{{ gameId: int, mySocketId: * }}
             */
            gameInit: function (data) {
                App.gameId = data.gameId;
                App.mySocketId = data.mySocketId;
                App.maxPlayers = data.maxPlayers;
                App.roleList = data.roleList;
                App.myRole = 'Host';
                App.Host.numPlayersInRoom = 0;

                // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

            /**
             * Show the Host screen containing game configuration options
             */
            displayGameConfig: function() {
                // Fill the game screen with the appropriate HTML
                App.$gameArea.html(App.$templateGameConfig);
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayNewGameScreen : function() {
                // Fill the game screen with the appropriate HTML
                $('#gameArea').html(App.$templateNewGame);

                // Display the URL on screen
                $('#gameURL').text(window.location.href);
                App.doTextFit('#gameURL');

                // Show the gameId / room id on screen
                $('#spanNewGameCode').text(App.gameId);
            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            updateWaitingScreen: function(data) {
                // If this is a restarted game, show the screen.
                if ( App.Host.isNewGame ) {
                    App.Host.displayNewGameScreen();
                }
                // Update host screen
                $('#playersWaiting')
                    .append('<br>Player ' + data.playerName + ' joined the game.');

                // Store the new player's data on the Host.
                App.Host.players.push(data);
                console.log(App.Host.players);

                // Increment the number of players in the room
                App.Host.numPlayersInRoom += 1;

                // If enough players have joined, start the game!
                if (App.Host.numPlayersInRoom == App.maxPlayers) {
                    console.log('Room is full. Almost ready!');

                    // Let the server know that enough players are present.
                    IO.socket.emit('hostRoomFull', {gameId: App.gameId, players: App.Host.players, roleList: App.roleList});
                }
            },

            /**
             * Show the countdown screen
             */
            gameCountdown : function() {

                // Prepare the game screen with new HTML
                App.$gameArea.html(App.$hostGame);
                App.doTextFit('#countdown');

                // Begin the on-screen countdown timer
                var $secondsLeft = $('#countdown');
                App.countDown( $secondsLeft, 5, function(){
                    console.log('App[Host].countDown callback called')
                    IO.socket.emit('hostCountdownFinished', App.gameId);
                });

            },

            /**
             * Show the word for the current round on screen.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            setGameBoard : function(data) {
                // Hide countdown
                $('#countdown').text('')

                // Display the players' names on screen
                var playerListHTML = 'Players:';
                App.Host.players.forEach(function (item, index) {
                    playerListHTML += `<br>` + item.playerName;
                })
                $('#players').html(playerListHTML);
            },

            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
            checkAnswer : function(data) {
                // Verify that the answer clicked is from the current round.
                // This prevents a 'late entry' from a player whos screen has not
                // yet updated to the current round.
                if (data.round === App.currentRound){

                    // Get the player's score
                    var $pScore = $('#' + data.playerId);

                    // Advance player's score if it is correct
                    if( App.Host.currentCorrectAnswer === data.answer ) {
                        // Add 5 to the player's score
                        $pScore.text( +$pScore.text() + 5 );

                        // Advance the round
                        App.currentRound += 1;

                        // Prepare data to send to the server
                        var data = {
                            gameId : App.gameId,
                            round : App.currentRound
                        }

                        // Notify the server to start the next round.
                        IO.socket.emit('hostNextRound',data);

                    } else {
                        // A wrong answer was submitted, so decrement the player's score.
                        $pScore.text( +$pScore.text() - 3 );
                    }
                }
            },


            /**
             * All 10 rounds have played out. End the game.
             * @param data
             */
            endGame : function(data) {
                // Get the data for player 1 from the host screen
                var $p1 = $('#player1Score');
                var p1Score = +$p1.find('.score').text();
                var p1Name = $p1.find('.playerName').text();

                // Get the data for player 2 from the host screen
                var $p2 = $('#player2Score');
                var p2Score = +$p2.find('.score').text();
                var p2Name = $p2.find('.playerName').text();

                // Find the winner based on the scores
                var winner = (p1Score < p2Score) ? p2Name : p1Name;
                var tie = (p1Score === p2Score);

                // Display the winner (or tie game message)
                if(tie){
                    $('#countdown').text("It's a Tie!");
                } else {
                    $('#countdown').text( winner + ' Wins!!' );
                }
                App.doTextFit('#countdown');
                data.winner=winner;
                if(data.done>0)
                {

                }
                else data.done=0;
                //console.log(data);
                //IO.socket.emit("clientEndGame",data);
                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.isNewGame = true;
                IO.socket.emit('hostNextRound',data);
                // Reset game data
            },

            /**
             * A player hit the 'Start Again' button after the end of a game.
             */
            restartGame : function() {
                App.$gameArea.html(App.$templateNewGame);
                $('#spanNewGameCode').text(App.gameId);
            }
        },


        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player : {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            myName: '',

            /**
             * The player's index
             */
            myIndex: '',

            /**
             * The player's initial game role
             */
            initialGameRole: '',

            /**
             * The player's current game role
             */
            gameRole: '',

            /**
             * Click handler for the 'JOIN' button
             */
            onJoinClick: function () {
                // console.log('Clicked "Join A Game"');

                // Display the Join Game HTML on the player's screen.
                App.$gameArea.html(App.$templateJoinGame);
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerStartClick: function() {
                // console.log('Player clicked "Start"');

                // collect data to send to the server
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'anon'
                };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);

                // Set the appropriate properties for the current player.
                App.myRole = 'Player';
                App.Player.myName = data.playerName;
            },

            /**
             *  Click handler for the Player hitting a word in the word list.
             */
            onPlayerAnswerClick: function() {
                // console.log('Clicked Answer Button');
                var $btn = $(this);      // the tapped button
                var answer = $btn.val(); // The tapped word

                // Send the player info and tapped word to the server so
                // the host can check the answer.
                var data = {
                    gameId: App.gameId,
                    playerId: App.mySocketId,
                    answer: answer,
                    round: App.currentRound
                }
                IO.socket.emit('playerAnswer',data);
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.myName
                }
                IO.socket.emit('playerRestart',data);
                App.currentRound = 0;
                $('#gameArea').html("<h3>Waiting on host to start new game.</h3>");
            },

            /**
             * Display the waiting screen for player 1
             * @param data
             */
            updateWaitingScreen : function(data) {
                console.log(IO.socket.id)
                console.log(data.mySocketId)
                if(IO.socket.id === data.mySocketId){
                    App.myRole = 'Player';
                    App.gameId = data.gameId;

                    $('#playerWaitingMessage')
                        .append('<p/>')
                        .text('Joined Game ' + data.gameId + '. Please wait for game to begin.');
                }
            },

            /**
             * Display 'Get Ready' while the countdown timer ticks down.
             * @param hostData
             */
            gameCountdown : function(hostData) {
                App.Player.hostSocketId = hostData.mySocketId;
                $('#gameArea')
                    .html('<div class="gameOver">Get Ready!</div>');
            },

            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            setGameBoard : function(data) {
                // Insert the game board onto the screen.
                $('#gameArea').html(App.$playerView);

                for (var i = 0; i < App.players.length; i++){
                    var index = i;
                    if (App.players[i].playerName == App.Player.myName){
                        document.getElementById("centerMessage").innerHTML = "Hello " + App.Player.myName + "!<br>You are a <i>" + App.players[i].role + "</i>...<br>";

                        document.getElementById("playername"+index).innerHTML = "<b>you</b>";
                        document.getElementById("playerrole"+index).innerHTML = "<sub>(" + App.players[i].role + ")</sub>";
                        document.getElementById("playerrole"+index).style.display = "block";

                        App.Player.myIndex = i;
                        App.Player.gameRole = App.players[i].role;
                        App.Player.initialGameRole = App.players[i].role;
                    }
                    else{
                        document.getElementById("playername"+index).innerHTML = "<b>" + App.players[i].playerName + "</b>";
                        document.getElementById("playerpeek"+index).style.display = "block";
                        document.getElementById("playerrob"+index).style.display = "block";
                        document.getElementById("playertrouble"+index).style.display = "block";
                    }
                }

                console.log(App)
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame : function() {
                $('#gameArea')
                    .html('<div class="gameOver">Game Over!</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>Start Again</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                    );
            },

            /**
             * Peek player (Seer role)
             */
            peekPlayer : function(element) {
                console.log('Peeking player...')
                console.log('\nelement html:')
                console.log(element)
                console.log('\nApp html:')
                console.log(App)
                console.log('\nAccessing info:')

                var peekIndex = element.currentTarget.attributes.alt.value;
                var peekRole = App.players[peekIndex].role

                document.getElementById("playerrole"+peekIndex).innerHTML = "<sub>(" + peekRole + ")</sub>";
                document.getElementById("playerrole"+peekIndex).style.display = "block";
            },

            /**
             * Rob player (Robber role)
             */
            robPlayer : function(element) {
                console.log('Robbing player...')
                console.log('\nelement html:')
                console.log(element)
                console.log('\nApp html:')
                console.log(App)
                console.log('\nAccessing info:')

                var robIndex = element.currentTarget.attributes.alt.value;
                var robRole = App.players[robIndex].role;
                var myIndex = App.Player.myIndex;
                var myRole = App.Player.gameRole;

                var pack = {gameId: App.gameId, robIndex: robIndex, robRole: robRole, myIndex: myIndex, myRole: myRole};
                console.log(pack);
                IO.socket.emit('playerRobbed', pack);
            },

            /**
             * Trouble player (Troublemaker role)
             */
            troublePlayer : function(element) {
                console.log('Switching player...')
                console.log('\nelement html:')
                console.log(element)
                console.log('\nApp html:')
                console.log(App)
                console.log('\nAccessing info:')

                var troubleIndex = element.currentTarget.attributes.alt.value;
                var troubleRole = App.players[troubleIndex].role;

                App.troubledPlayers.push({troubleIndex: troubleIndex, troubleRole: troubleRole})

                if (App.troubledPlayers.length == 2){
                    console.log('Players selected - time to trouble...')
                    var pack = {gameId: App.gameId, troubledPlayers: App.troubledPlayers}
                    IO.socket.emit('playersTroubled', pack);
                }
            },

            /**
             * 
             */
            peekMid : function(element) {
                console.log('Peeking middle...')
                console.log('\nelement html:')
                console.log(element)
                console.log('\nApp html:')
                console.log(App)
                console.log('\nAccessing info:')

                var peekIndex = element.currentTarget.attributes.alt.value;
                var centerOptions = ['Left', 'Middle', 'Right'];

                document.getElementById("peekCenterRow").innerHTML = centerOptions[peekIndex] + ' card is ' + App.roleList[App.roleList.length - 1 - peekIndex];

                console.log(App.roleList);
            },

            /**
             * 
             */
            drunkMid : function(element) {
                console.log('Peeking middle...')
                console.log('\nelement html:')
                console.log(element)
                console.log('\nApp html:')
                console.log(App)
                console.log('\nAccessing info:')

                var drunkIndex = element.currentTarget.attributes.alt.value;
                var drunkRole = App.roleList[App.roleList.length - 1 - drunkIndex]
                var myIndex = App.Player.myIndex;
                var myRole = App.Player.gameRole;

                var pack = {gameId: App.gameId, drunkIndex: drunkIndex, drunkRole: drunkRole, myIndex: myIndex, myRole: myRole};
                console.log(pack);
                IO.socket.emit('middleDrunked', pack);
            }
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#countdown');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1
                $el.text(startTime);
                App.doTextFit('#countdown');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }

        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            textFit(
                $(el)[0],
                {
                    alignHoriz:true,
                    alignVert:false,
                    widthOnly:true,
                    reProcess:true,
                    maxFontSize:300
                }
            );
        }

    };

    IO.init();
    App.init();

}($));