
import { _decorator, Component, systemEvent, EventKeyboard, SystemEvent, Vec3, KeyCode, RigidBody, CCInteger, Collider, ICollisionEvent, Label} from 'cc';
const { ccclass, property } = _decorator;

enum MoveDir {
    IDLE,
    LEFT,
    RIGHT,
    FORWARD,
    BACKWARD,
}
 
@ccclass('PlayerControl')
export class PlayerControl extends Component {
    websocket: WebSocket;

    playerID;
    playerName: String;
    score:number = 0;

    RigidBody: RigidBody;

    @property(Label)
    scoreLabel: Label;

    public get playerid(){
        return this.playerID;
    }

    @property(CCInteger)
    moveSpeed = 10;

    private _curPos = new Vec3();
    private _targetPos = new Vec3();
    private moveState = MoveDir.IDLE;

    private currentKeysPressed : Map<number,boolean> = new Map();

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

    start () {
        this.websocket = new WebSocket('ws://localhost:7000');

        this.RigidBody = this.node.getComponent(RigidBody);


        let collider = this.getComponent(Collider);
        collider.on('onCollisionEnter', this.collisionEnter, this);
        
    }

    private collisionEnter(event: ICollisionEvent){
        const contactPoint = new Vec3();
        event.contacts[0].getWorldPointOnA(contactPoint);
        if(event.otherCollider.node.layer === 2){
            this.setInputActive(false);
            this.moveState = MoveDir.IDLE;
            this.bounceBack(contactPoint);
            this.scheduleOnce(()=>{
                this.setInputActive(true)
            }, 0.1);
        }
    }

    private bounceBack(contactPoint: Vec3) {
        const bounceDir = new Vec3();
        Vec3.subtract(bounceDir, this._curPos, contactPoint);
        Vec3.multiplyScalar(bounceDir, bounceDir, 0.5);
        bounceDir.y = this._curPos.y;
        Vec3.add(this._curPos, this._curPos, bounceDir);
        this.node.setPosition(this._curPos);
    }

    setPlayerName(name){
        if(name === undefined){
            this.playerName = null;
        } 
        else this.playerName = name;
    }

    setInputActive(active: boolean){
        this.activateScoreText(active);
        if(active){
            systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
            systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        }else {
            this.currentKeysPressed.clear();
            systemEvent.off(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
            systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        }
    }

    private activateScoreText(active: boolean) {
        this.scoreLabel.node.active = active;
        this.scoreLabel.node.parent.active = active;
        this.scoreLabel.string = this.playerName + ": " + this.score;
    }

    onKeyDown(event: EventKeyboard){
        this.currentKeysPressed.set(event.keyCode, true);

        switch(event.keyCode){
            case KeyCode.KEY_A:
                this.moveState = MoveDir.LEFT;
                break;
            case KeyCode.KEY_D:
                this.moveState = MoveDir.RIGHT;
                break;
            case KeyCode.KEY_W:
                this.moveState = MoveDir.FORWARD;
                break;
            case KeyCode.KEY_S:
                this.moveState = MoveDir.BACKWARD;
                break;
            default:
                this.currentKeysPressed.delete(event.keyCode);
                break;
        }
    }

    onKeyUp(event: EventKeyboard){
        this.currentKeysPressed.delete(event.keyCode);

        if(this.currentKeysPressed.size === 0){
            this.moveState = MoveDir.IDLE; 
        }
    }

    update (deltaTime: number) {
        this.Move(deltaTime);

        this.communicateWithServer();
    }

    private communicateWithServer() {
        this.websocket.onmessage = message => {
            const response = JSON.parse(message.data);
            if (response.method === "connect") {
                this.playerID = response.playerID;
            }

            if (response.method === "collect_egg") {
                this.handleScore(response);
            }

            if(response.method === "start"){
                const data = {
                    "method": "set_name",
                    "playerID": this.playerID,
                    "player_name": this.playerName
                }
        
                this.WaitForConnection(0.5, ()=> {
                    this.websocket.send(JSON.stringify(data));
                })
                this.setInputActive(true);
            }
            if(response.method === "end"){
                this.setInputActive(false);
            }
        };
    }

    private handleScore(response: any) {
        console.log("Yummy!");
        console.log("Your score: " + response.score * 10);
        this.score = response.score * 10;
        this.scoreLabel.string = this.playerName + ": " + this.score;
    }

    private Move(deltaTime : number) {
        switch(this.moveState){
            case MoveDir.LEFT:
                this._targetPos.z = -this.moveSpeed * deltaTime;
                break;
            case MoveDir.RIGHT:
                this._targetPos.z = this.moveSpeed * deltaTime;
                break;
            case MoveDir.FORWARD:
                this._targetPos.x = this.moveSpeed * deltaTime;
                break;
            case MoveDir.BACKWARD:
                this._targetPos.x = -this.moveSpeed * deltaTime;
                break;
            case MoveDir.IDLE:
                setTimeout(() => {
                    this._targetPos = new Vec3(0,0,0);
                }, 0.5);
                break;
        }
        this.node.getPosition(this._curPos);
        Vec3.add(this._curPos, this._curPos, this._targetPos);
        this.node.setPosition(this._curPos);
    }
}

