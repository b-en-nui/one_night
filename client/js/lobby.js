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
    setCookie("playername", clientName, 1);
}

function startGame() {
    var readyBtn = document.getElementById("startGameButton");
    readyBtn.style.display = "none";

    socket.emit('playerReady',{});
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + sessionStorage.tabID + "=" + cvalue + ";" + expires + ";path=/";
}
  
function getCookie(cname) {
    var name = cname + sessionStorage.tabID + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
