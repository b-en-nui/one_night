var app = new Vue({
    el: '#content',
    data: {
        name: null,
        playerCount: null,
        emojis: ["😉","😅","😇","😜","🤪","🤔","🤨","🤠","😤","🤦‍♀️"]
    },
    methods: {

    },
    mounted(){
        setTimeout(() => {
        }, 0);
    }
});

var user = sessionStorage.clientName;
app.name = user;
console.log("Hello: " + app.name + sessionStorage.tabID)
var socket = io('/game');
socket.emit("defineSocket", {id:sessionStorage.tabID,name:sessionStorage.clientName});

var playerDOMArray = [];
for (var i = 1; i <= 8; i++){
    var playerClassName = "player player"+i;
    playerDOMArray.push(document.getElementsByClassName(playerClassName)[0]);
}

socket.on("playerInfo", function (data) {
    app.playerCount = data.length;
    for (var i = 0; i < data.length; i++){
        if (data[i].name == app.name){
            playerDOMArray[(i*3)%8].innerHTML = "<strong>" + data[i].name + "</strong>";
        }
        else{
            playerDOMArray[(i*3)%8].innerHTML = "<strong>" + data[i].name + "  </strong><br>Whisper<br>Vote";
        }
    }
    console.log(data);
})