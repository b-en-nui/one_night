var app = new Vue({
    el: '#content',
    data: {
        minPlayerCount: 2,
        minPlayerCountMet: false,
        playerCount: null,
        list: PLAYER_LIST,
        emojis: ["😉","😅","😇","😜","🤪","🤔","🤨","🤠","😤","🤦‍♀️"]
    },
    methods: {
        setName,
        submit: function(e) {
            if (e.keyCode === 13) {
                setName();
            }
        },
        startGame
    },
    mounted(){
        setTimeout(() => {
        }, 0);
    }
});

var nameInput = document.getElementById("nameInput");
var initPrompt = document.getElementById("initPrompt");
var lobbyMenu = document.getElementById("lobbyMenu");
var pList = document.getElementById("pList");
var PLAYER_LIST = {};
var clientName = '';
var socket = io('/lobby');

socket.on("playerInfo", function (data) {
    app.playerCount = data.length;
    if (app.playerCount > app.minPlayerCount)
        app.minPlayerCountMet = true;
    else
        app.minPlayerCountMet = false;
    var html = "";
    for (var i = 0; i < data.length; i++){
        PLAYER_LIST[data[i].id] = data[i].name;
        if (data[i].name == clientName){
            sessionStorage.tabID = data[i].id;
            html += "<b>" + data[i].name + app.emojis[Math.floor(data[i].id*10)] + "</b>";
        }
        else{
            html += data[i].name + app.emojis[Math.floor(data[i].id*10)];
        }

        if (data[i].ready == true){
            html += "<i> - ready</i><br>";
        }
        else{
            html += "<br>";
        }
    }
    console.log(data)
    pList.innerHTML = html;
})

socket.on('redirect', function(destination) {
    window.location.href = destination;
});

function setName() {
    clientName = nameInput.value;
    socket.emit('setName',{name:clientName});
    initPrompt.style.display = "none";
    lobbyMenu.style.display = "block";
    sessionStorage.clientName = clientName;
}

function startGame() {
    var readyBtn = document.getElementById("startGameButton");
    readyBtn.style.display = "none";

    socket.emit('playerReady',{});
}
