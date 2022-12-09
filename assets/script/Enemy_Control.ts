
import { _decorator, Component, Vec3, CCInteger, SphereCollider, ITriggerEvent, geometry, PhysicsSystem, BoxCollider, ICollisionEvent } from 'cc';
import { Egg_Control } from './Egg_Control';
const { ccclass, property } = _decorator;


 
@ccclass('Enemy_Control')
export class Enemy_Control extends Component {
    websocket: WebSocket;
    
    @property(CCInteger)
    moveSpeed = 10;

    //Generate random target position in radius
    @property(CCInteger)
    perceptionRadius = 20;

    allowMoving: boolean = false;

    playerID;
    playerName;

    public get playerid(){
        return this.playerID;
    }
    
    private _curPos: Vec3 = new Vec3();
    private _targetPos: Vec3 = new Vec3();

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
        // [3]
        this.websocket = new WebSocket('ws://localhost:7000');

        this.node.getPosition(this._curPos);
        this._targetPos = this._curPos;

        let detectCollider = this.node.getComponent(SphereCollider);
        detectCollider.on('onTriggerEnter', this.triggerEnter, this);

        let collider = this.getComponent(BoxCollider);
        collider.on('onCollisionEnter', this.collisionEnter, this);
    }

    update (deltaTime: number) {
        this.communicateWithServer();

        if(this.allowMoving){
            this.changeDirection();
            this.moveToTarget(deltaTime);
            this.node.getPosition(this._curPos);
        }
    }

    private communicateWithServer() {
        this.websocket.onmessage = message => {
            const response = JSON.parse(message.data);
            if (response.method === "connect") {
                this.playerID = response.playerID;
            }
            if(response.method === "start"){
                this.setPlayerName();
                this.allowMoving = true;
            }
            if (response.method === "set_name") {
                this.playerName = response.player_name;
            }
            if(response.method === "end") {
                this.allowMoving = false;   
            }
        };
    }

    setPlayerName(){
        const data = {
            "method": "set_name",
            "playerID": this.playerID,
            "player_name": null
        }

        this.WaitForConnection(0.5, () => {
            this.websocket.send(JSON.stringify(data));
        })
    }

    changeDirection() {
        if (Vec3.distance(this._curPos, this._targetPos) < 0.1) {
            this._targetPos = this.generateNewPosition();
        }
    }

    moveToTarget(deltaTime: number){
        this.node.getPosition(this._curPos);
        let moveDir = new Vec3();
        Vec3.subtract(moveDir,this._targetPos,this._curPos);
        moveDir.normalize();
        Vec3.multiplyScalar(moveDir ,moveDir , this.moveSpeed*deltaTime);
        moveDir.y = 0;
        Vec3.add(this._curPos, this._curPos, moveDir);
        this.node.setPosition(this._curPos);
    }

    generateNewPosition() : Vec3{
        let target = new Vec3(
            this.generateRandom(this._curPos.x - this.perceptionRadius, this._curPos.x + this.perceptionRadius),
            this._curPos.y,
            this.generateRandom(this._curPos.z - this.perceptionRadius, this._curPos.z + this.perceptionRadius));
        return target;
    }

    generateRandom(min, max) : number{
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }


    private triggerEnter(event: ITriggerEvent){
        console.log(event);
        if(event.otherCollider.getComponent(Egg_Control)){
            event.otherCollider.node.parent.getPosition(this._targetPos);
        }
    }

    private collisionEnter(event: ICollisionEvent){
        const contactPoint = new Vec3();
        event.contacts[0].getWorldPointOnA(contactPoint);
        if(event.otherCollider.node.layer === 2){
            this.allowMoving = false;
            this.bounceBack(contactPoint);
            this.scheduleOnce(()=>{
                this._targetPos = this.generateNewPosition();
                this.allowMoving = true;
            }, 0.1);
        }
    }

    private bounceBack(contactPoint: Vec3) {
        const bounceDir = new Vec3();
        Vec3.subtract(bounceDir, this._curPos, contactPoint);
        Vec3.multiplyScalar(bounceDir, bounceDir, 0.5);
        bounceDir.y = 0;
        Vec3.add(this._curPos, this._curPos, bounceDir);
        this.node.setPosition(this._curPos);
    }
}


