var app = new Vue({
    el: '#content',
    data: {
        name: null,
        id: null,
        playerCount: null,
        role: null,
        divID: null,
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

var initialPlayerData = null;
var currentPlayerData = null;
var frameCount = 0;

// 1) Grabs username from sessionStorage
app.name = sessionStorage.clientName;
console.log("Hello: " + app.name + sessionStorage.tabID)

// 2) Instantiates socket and sends identifying info to server
var socket = io('/game');
socket.emit("defineSocket", {id:sessionStorage.tabID,name:sessionStorage.clientName});

// Server emits data packet on set interval that is received here to do the following:
//      1) Update currentPlayerData array
//      2) Fill player names in center circle
//      3) Fill role list in bottom left
socket.on("playerInfo", function (data) {
    currentPlayerData = data;
    app.playerCount = data.length;
    if (frameCount == 0){
        console.log("Initializing....");
        initializePlayerBoard(data);
        initialPlayerData = data;
    }
    console.log(frameCount);
    frameCount++;
    //console.log(data);
})


socket.on("peekInfo", function (data) {
    if (data.isMid){
        document.getElementById("peekCenterRow").innerHTML = "That card was&nbsp;<i>" + data.role + "</i>";
    }
    else{
        document.getElementById("playerrole"+data.divID).innerHTML = " <sub>(" + data.player.role + ")</sub>";
        document.getElementById("playerrole"+data.divID).style.display = "block";
        document.getElementById("peek"+data.divID).style.display = "none";
    }
})

socket.on("robInfo", function (data) {
    app.role = data.role;
    document.getElementById("playerrole"+data.mydivID).innerHTML = "<sub>(" + data.role + ")</sub>";
    document.getElementById("rob"+data.divID).style.display = "none";
})

function initializePlayerBoard(data){
    for (var i = 0; i < data.length-1; i++){
        var index = i;
        if (data[i].name == app.name){
            //console.log(data);
            app.role = data[i].role;    app.id = data[i].id;    app.divID = index;
            document.getElementById("playername"+index).innerHTML = "<b>you</b>";
            document.getElementById("playerrole"+index).innerHTML = "<sub>(" + data[i].role + ")</sub>";
            document.getElementById("playerrole"+index).style.display = "block";
        }
        else{
            document.getElementById("playername"+index).innerHTML = "<b>" + data[i].name + "</b>";
            document.getElementById("playerpeek"+index).style.display = "block";
            document.getElementById("playerrob"+index).style.display = "block";
            document.getElementById("peek"+index).setAttribute("alt", data[i].id);
            document.getElementById("rob"+index).setAttribute("alt", data[i].id);
        }
    }
    //console.log("in the middle: " + data[data.length - 1]);
    document.getElementsByClassName("bottomleft")[0].innerHTML = "<i>good luck, have fun :)</i><br><strong>role list: </strong>" 
        + app.roleMatrix[data.length-1];
}

function peekPlayer(thisPlayer){
    var divID = thisPlayer.attributes.id.value.charAt(4); //
    var playerID = thisPlayer.attributes.alt.value;
    socket.emit("peekRole", {id:playerID, divID:divID, isMid:false});
}

function peekMid(thisCard){
    var playerID = thisCard.attributes.alt.value;
    socket.emit("peekRole", {id:playerID, isMid:true});
}

function robPlayer(thisPlayer){
    var divID = thisPlayer.attributes.id.value.charAt(3);
    var playerID = thisPlayer.attributes.alt.value;
    console.log(playerID + "spacespace" + divID);
    socket.emit("robRole", {id:playerID, divID:divID, myid: app.id, mydivID: app.divID, myrole: app.role});
}