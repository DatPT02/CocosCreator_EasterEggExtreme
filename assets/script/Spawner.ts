
import { _decorator, Component, Node, Vec3, instantiate, Prefab, CCInteger, Slider, Material, MeshRenderer, Mesh } from 'cc';
const { ccclass, property } = _decorator;

 
@ccclass('Spawner')
export class Spawner extends Component {

    websocket: WebSocket;


    @property(Number)
    maxSpawnAmount: number;

    @property(Slider)
    spawnAmount: Slider;

    @property(Node)
    playGround: Node;

    @property(Prefab)
    SpawnObj: Node;


    ObjAmount: number ;

    private playGroundScale: Vec3 = new Vec3();
    private spawnCenter:Vec3 = new Vec3();

    start () {
        // [3]
        this.websocket = new WebSocket('ws://localhost:7000');

        this.playGround.getScale(this.playGroundScale);
        this.playGround.getPosition(this.spawnCenter);
    }

    update (deltaTime: number) {
        if(this.node.children.length < this.ObjAmount){
            this.getNewObj();
        }

        this.setSpawnAmount();
    }

    setSpawnAmount(){

        if(this.spawnAmount.progress === undefined){
            this.ObjAmount = this.maxSpawnAmount;
        }
        else {
            this.ObjAmount = Math.floor(this.spawnAmount.progress * this.maxSpawnAmount);
        } 

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

    getNewObj(){
        const data = {
            "method": "generate_random_position",
            "scale": this.playGroundScale,
            "center": this.spawnCenter
        }

        this.WaitForConnection(0.5, () => {
            this.websocket.send(JSON.stringify(data))
        });

        this.websocket.onmessage = message => {
            const response = JSON.parse(message.data);
            if(response.method === "generate_random_position"){
                const randomPosition = new Vec3(response.x, this.spawnCenter.y + 1.5, response.z);
                this.spawn(this.SpawnObj,randomPosition);
            }
        }
    }

    spawn(obj: Node, position: Vec3){


        let node = instantiate(obj);

        node.parent = this.node;
        node.setPosition(position);

    }
}

