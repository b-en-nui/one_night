var app = new Vue({
    el: '#content',
    data: {
        name: null,
        playerCount: null,
        role: null,
        emojis: ["😉","😅","😇","😜","🤪","🤔","🤨","🤠","😤","🤦‍♀️"],
        roleMatrix:  {
            3: ["werewolf","minion","seer","robber","troublemaker","villager"],
            4: ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner"],
            5: ["werewolf","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
            6: ["werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
            7: ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager"],
            8: ["werewolf","werewolf","minion","seer","robber","troublemaker","drunk","insomniac","tanner","villager","villager"]
        }
    },
    methods: {

    },
    mounted(){
        setTimeout(() => {
        }, 0);
    }
});

// 1) Grabs username from sessionStorage
app.name = sessionStorage.clientName;
console.log("Hello: " + app.name + sessionStorage.tabID)

// 2) Instantiates socket and sends identifying info to server
var socket = io('/game');
socket.emit("defineSocket", {id:sessionStorage.tabID,name:sessionStorage.clientName});

// 3) Generates playerDOMArray - filled by playerInfo
var playerDOMArray = [];
for (var i = 0; i < 8; i++){
    var playerClassName = "player player"+i;
    playerDOMArray.push(document.getElementsByClassName(playerClassName)[0]);
}


socket.on("playerInfo", function (data) {
    app.playerCount = data.length;
    for (var i = 0; i < data.length-1; i++){
        var index = (i*3)%8;
        if (data[i].name == app.name){
            app.role = data[i].role;
            document.getElementById("playername"+index).innerHTML = "<b>" + data[i].name + " (you), </b>";
            document.getElementById("playerrole"+index).innerHTML = data[i].role;
        }
        else{
            document.getElementById("playername"+index).innerHTML = "<b>" + data[i].name + "</b>";
            document.getElementById("playerrole"+index).innerHTML = " <sub>(" + data[i].role + ")</sub>";
            document.getElementById("playerpeek"+index).style.display = "block";
        }
    }
    console.log("in the middle: " + data[data.length - 1]);
    document.getElementsByClassName("bottomleft")[0].innerHTML = "<i>good luck, have fun :)</i><br><strong>role list: </strong>" 
        + app.roleMatrix[data.length - 1];
    console.log(data);
})

function peekPlayer(thisPlayer){
    console.log("BUTTON PRESS");
    var playerRoleID = "playerrole" + thisPlayer.attributes.alt.value;
    var buttonID = "peek" + thisPlayer.attributes.alt.value;
    document.getElementById(playerRoleID).style.display = "block";
    document.getElementById(buttonID).style.display = "none";

}