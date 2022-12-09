
import { _decorator, Component, Collider, ITriggerEvent, ParticleSystem, SphereCollider } from 'cc';
import { Enemy_Control } from './Enemy_Control';
import { PlayerControl } from './PlayerControl';
const { ccclass, property } = _decorator;

 
@ccclass('Egg_Control')
export class Egg_Control extends Component {
    websocket: WebSocket;

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


        let collider = this.getComponent(Collider);
        collider.on('onTriggerEnter', this.triggerEnter, this);
        collider.on('onTriggerStay', this.triggerStay, this);
    }

    private triggerEnter(event: ITriggerEvent){

        var player = event.otherCollider.node.getComponent(PlayerControl) 
                    || event.otherCollider.node.getComponent(Enemy_Control);
        if(event.otherCollider.node.layer === 1){
            if(event.otherCollider.isTrigger){
                return;
            }

            this.destroyEgg();

            const data = {
                "method": "collect_egg",
                "collecter_id": player.playerid
            }

            this.WaitForConnection(0.5, () => {
                this.websocket.send(JSON.stringify(data));
            })
        }
        
    }

    private triggerStay(event: ITriggerEvent){
        if (event.selfCollider.node.layer === 2 || event.otherCollider.node.layer === 2){
            this.destroyEgg();
        }
    }

    destroyEgg(){
        this.node.destroy();
        this.node.parent.destroy();
    }
    
}
