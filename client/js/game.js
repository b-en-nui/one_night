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

console.log("Hello!")

var user = getCookie("playername");
app.name = user;
console.log(app.name)
var socket = io('/game');

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