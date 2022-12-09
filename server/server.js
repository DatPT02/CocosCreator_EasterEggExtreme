const http = require('http');
const websocketServer = require('websocket').server;
const httpServer = http.createServer();
const port = 7000;
httpServer.listen(port, () => console.log("Listening on port " + port));


const players = {};
var playerCount = 0;

const wsServer = new websocketServer({
    "httpServer": httpServer
})

wsServer.on("request", request => {
    const connection = request.accept(null,request.origin);
    connection.on("open", () => console.log("Opened"));
    connection.on("close", () => console.log("Closed"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);
        if(result.method === "start" || result.method === "restart"){
            newGame(result);
        }
        if(result.method === "end"){
            Object.keys(players).forEach(element => {
                delayCall(() => {
                    players[element].connection.send(JSON.stringify(result));
                })
            });
        }
        if(result.method === "set_name"){
            setPlayerName(result);
        }
        if(result.method === "collect_egg"){
            collectEgg(result);  
        }
        if (result.method === "generate_random_position"){
            generateRandomPosition(result, connection);
        }
        if(result.method === "update_scoreboard"){
            updateScoreboard(connection);
        }
    })

    const playerID = guid();
    players[playerID] = {
        "connection": connection,
        "name": null,
        "score": 0
    }

    const payLoad = {
        "method": "connect",
        "playerID": playerID,
    }

    delayCall(() => {
        connection.send(JSON.stringify(payLoad));
    })
})

function updateScoreboard(connection) {
    const scoreBoard = {};
    Object.keys(players).forEach(element => {
        if (players[element].name != null) {
            scoreBoard[players[element].score] = players[element].name;
        }
    });
    const data = {
        "method": "update_scoreboard",
        "scoreboard": scoreBoard
    };
    connection.send(JSON.stringify(data));
}

function newGame(result) {
    Object.keys(players).forEach(element => {
        players[element].score = 0;
        delayCall(() => {
            players[element].connection.send(JSON.stringify(result));
        })
    });
}

function delayCall(callback){
    setTimeout(() => {
        callback();
    }, generateRandom(1,5) * 0.1)
}

function setPlayerName(result) {
    playerCount++;
    if(result.player_name === null){
        generateNewName(result);
    }else{
        players[result.playerID].name = result.player_name;
    }
}

function generateNewName(result) {
    let newName = "player" + playerCount;
    players[result.playerID].name = newName;
    const data = {
        "method": "set_name",
        "player_name": "player" + playerCount
    };
    delayCall(() => {
        players[result.playerID].connection.send(JSON.stringify(data));
    })
    
}

function generateRandomPosition(result, connection) {
    const data = {
        "method": "generate_random_position",
        "x": generateRandom(result.center.x - result.scale.x / 2, result.center.x + result.scale.x / 2),
        "z": generateRandom(result.center.z - result.scale.z / 2, result.center.z + result.scale.z / 2)
    };

    delayCall(() => {
        connection.send(JSON.stringify(data));
    })
}

function collectEgg(result) {
    if (players[result.collecter_id] != null) {
        players[result.collecter_id].score ++;
        const data = {
            "method": "collect_egg",
            "score": players[result.collecter_id].score
        };

        delayCall(() => {
            players[result.collecter_id].connection.send(JSON.stringify(data));
        })
    }
}

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();


function generateRandom(min, max){
    return Math.floor(Math.random() * (max-min + 1)) + min;
}