
import { _decorator, Component, Node, CCInteger, Label, JsonAsset } from 'cc';
const { ccclass, property } = _decorator;
 
enum GameState{
    GS_INIT,
    GS_PLAYING,
    GS_END
}

@ccclass('GameManager')
export class GameManager extends Component {

    websocket: WebSocket;

    @property(Node)
    startMenu: Node = null!;

    @property(Node)
    endMenu: Node = null!;

    @property(Label)
    timerLabel: Label;

    @property(Label)
    scoreBoard: Label;

    @property(Label)
    WinnerLabel: Label;

    @property(CCInteger)
    playTime: number = 120;
    
    private _curState : GameState;

    private playerScores: Map<String,number> = new Map();

    private leader: String;

    set curState(value: GameState){
        switch(value){
            case GameState.GS_INIT:
                this.Initialize();
                break;
            case GameState.GS_PLAYING:
                this.startMenu.active = false;
                this.scoreBoard.node.active = true;
                this._curState = GameState.GS_PLAYING;
                
                this.timer();
                const data = {
                    "method": "start"
                };
                this.WaitForConnection(0.5, () => {
                    this.websocket.send(JSON.stringify(data));
                })
                break;
            case GameState.GS_END:
                this.endGame();
                break;
        }
    }

    private endGame() {
        console.log("End game");
        this.endMenu.active = true;
        console.log("Winner: " + this.leader);
        this.WinnerLabel.string = "Winner: " + this.leader;
        const data = {
            "method": "end"
        };
        this.WaitForConnection(0.5, () => {
            this.websocket.send(JSON.stringify(data));
        })

    }

    private Initialize() {
        this.endMenu.active = false;
        this.timerLabel.node.active = false;
        this.timerLabel.node.parent.active = false;
        this.scoreBoard.node.active = false;
        this.startMenu.active = true;
    }

    WaitForConnection(interval, callback: Function){
        if(this.websocket.readyState === 1){
            callback();
        }else {
            var that = this;
            setTimeout(function() {
                that.WaitForConnection(interval, callback);
            }, interval)
        }
    }

    onStartButtonPressed(){
        this.curState = GameState.GS_PLAYING;
    }

    onRestartButtonPressed(){
        this.curState = GameState.GS_INIT;
    }

    start () {
        // [3]
        this.websocket = new WebSocket('ws://localhost:7000');

        this.curState = GameState.GS_INIT;

    }

    update (deltaTime: number) {
        // [4]
        this.schedule(() => {
            this.updateScoreboardServer();
        }, 2);
    }

    communicateWithServer(){
        this.websocket.onmessage = message => {
            const response = JSON.parse(message.data);
            if(response.method === "update_scoreboard"){
                Object.keys(response.scoreboard).forEach(element =>{
                    this.playerScores.set(response.scoreboard[element], parseInt(element));
                })

                this.updateScoreBoardValue();
            }
        };
    }

    private updateScoreBoardValue() {
        this.scoreBoard.string = "";

        let maxValue = 0;

        for (let [key, value] of this.playerScores) {
            if (!value) value = 0;
            if(maxValue <= value) maxValue = value;
        }
        for (let [key, value] of this.playerScores) {
            if(value == maxValue) {
                this.leader = key;
                this.scoreBoard.string += key + "  " + value * 10 + "\n";
                this.playerScores.delete(key);
            }
        }
    }

    updateScoreboardServer(){
        const data = {
            "method": "update_scoreboard"
        }
        this.WaitForConnection(0.5, () => {
            this.websocket.send(JSON.stringify(data));
        })

        this.communicateWithServer();
    }

    timer(){
        this.timerLabel.node.active = true;
        this.timerLabel.node.parent.active = true;
        let timePassed = 0;
        this.scheduleOnce(()=>{
            this.curState = GameState.GS_END;
        }, this.playTime + 1);

        this.schedule(()=>{
            timePassed++;
            this.timerLabel.string = "Time left: " + (this.playTime - timePassed).toString();
        }, 1, this.playTime -1);
    }
}


