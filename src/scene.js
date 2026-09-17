import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FlightEnvironment, OCEAN_SITE_X } from './environment.js';
import { createVehicle, createTower, landingPad, droneShip, setEngineFire, articulate, setShipFlaps, disposeVehicle } from './models.js';
import { clamp, mix, smooth, engineCount } from './mission.js';
import { createStableRenderer, prepareSceneDepth } from './rendering.js';

const v3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const mesh=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;return m;};
export class FlightScene {
  constructor(container){
    this.container=container;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0x819ea8,.0002);
    this.renderer=createStableRenderer({alpha:false});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.88;this.renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','可拖动旋转、滚轮缩放的三维火箭场景');this.renderer.domElement.setAttribute('role','img');
    this.camera=new THREE.PerspectiveCamera(31,1,.8,250000);this.camera.position.set(90,18,198);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,35,0);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.minDistance=15;this.controls.maxDistance=2400;this.controls.maxPolarAngle=Math.PI*.95;this.controls.enablePan=false;
    this.mode='cinema';this.focus='booster';this.recovery='land';this.weather='clear';this.night=false;this.lastTarget=v3(0,35,0);this.manualOrbit=false;
    this.controls.addEventListener('start',()=>{this.manualOrbit=true;});
    this.ambient=new THREE.HemisphereLight(0xb9d4ea,0x515341,.70);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xffe6c3,3.0);this.sun.position.set(-350,300,320);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-105,right:105,top:145,bottom:-105,near:1,far:1400});this.sun.shadow.bias=this.renderer.capabilities.reversedDepthBuffer?.00015:-.00015;this.sun.shadow.normalBias=.10;this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.engineLight=new THREE.PointLight(0xffbc6e,0,140,1.5);this.scene.add(this.engineLight);
    this.buildEnvironment();this.setVehicle('falcon9');
    prepareSceneDepth(this.scene,this.renderer);prepareSceneDepth(this.world.background,this.renderer);
    const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(4,this.renderer.capabilities.maxSamples),depthTexture:new THREE.DepthTexture(1,1,THREE.FloatType)});
    this.composer=new EffectComposer(this.renderer,target);this.composer.addPass(new RenderPass(this.world.background,this.world.backgroundCamera));
    const vehiclePass=new RenderPass(this.scene,this.camera);vehiclePass.clear=false;vehiclePass.clearDepth=true;this.composer.addPass(vehiclePass);
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.24,.45,1.1);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.renderer.info.autoReset=false;
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(container);this.resize();
  }
  buildEnvironment(){
    this.world=new FlightEnvironment(this.scene,this.renderer);
    this.catchTower=this.world.catchTower;this.barge=this.world.barge;this.barge2=this.world.barge2;
    this.trail=new THREE.Group();this.scene.add(this.trail);this.trajectory=null;
    const glowMat=new THREE.MeshBasicMaterial({color:0xf24a13,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide});this.reentryGlow=new THREE.Mesh(new THREE.CapsuleGeometry(5.2,35,6,20),glowMat);this.scene.add(this.reentryGlow);
    this.splashRing=mesh(new THREE.RingGeometry(3,6,64),new THREE.MeshBasicMaterial({color:0xc6edf1,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));this.splashRing.rotation.x=-Math.PI/2;this.scene.add(this.splashRing);
  }
  setVehicle(type){if(this.vehicle)disposeVehicle(this.vehicle);this.vehicle=createVehicle(type);this.type=type;for(const part of[this.vehicle.booster,this.vehicle.upper,...this.vehicle.sides])this.scene.add(part.group);
    if(this.tower){this.tower.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});this.tower.group.removeFromParent();}this.tower=createTower(type==='starship'?146:56,type==='starship');this.tower.group.position.set(type==='starship'?-23:-7,type==='starship'?0:4,-5);this.scene.add(this.tower.group);this.world.setVehicle(type==='starship');this.launchAltitude=type==='starship'?18.4:4.4;
    this.catchTower.group.visible=type==='starship';prepareSceneDepth(this.scene,this.renderer);this.resetCamera();
  }
  resetCamera(){this.manualOrbit=false;this.focus='booster';this.mode='cinema';const h=this.vehicle?.height||70;this.lastTarget.set(0,h*.46+(this.launchAltitude||4.4),0);this.controls.target.copy(this.lastTarget);this.camera.position.copy(this.lastTarget).add(v3(h*.9,-h*.23,h*2.75));this.camera.lookAt(this.lastTarget);}
  setCamera(mode){this.mode=mode;this.manualOrbit=false;}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.renderer.setSize(w,h);this.composer?.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setEnvironment(weather,night){this.weather=weather;this.night=night;this.sun.intensity=night?.22:weather==='cloudy'?1.4:3;this.ambient.intensity=night?.18:.70;this.renderer.toneMappingExposure=night?1.0:.88;}
  update(s,state,dt,wallTime){
    const {booster,upper,sides,height,join,coreOffset}=this.vehicle;const star=this.type==='starship',heavy=this.type==='heavy',p=s.progress,id=s.id;this.recovery=state.recovery;this.focus=state.focus;
    this.world.updatePlatforms(wallTime);
    const ocean=state.recovery==='ocean';const target=v3(ocean?OCEAN_SITE_X:0,star?(ocean?0:14):(ocean?.8552861471:1.2552861471),-350);if(!ocean)target.z=-450;
    const recoveryIds=['boostback','coast','entry','landing','touchdown'];const isReturn=recoveryIds.includes(id),isShip=['shipentry','belly','flip','splash'].includes(id);
    const sepIndex=state.stages.findIndex(x=>x.id==='separation'),sep=state.stages[sepIndex];const separated=state.time>=sep.start;
    const splitTime=Math.max(0,state.time-sep.start);let x=0,z=0,y=s.altitude*1000+this.launchAltitude,angle=0;
    if(id==='ascent'){x=mix(0,25,smooth(p));angle=mix(0,-.12,smooth(p));}
    if(id==='maxq'){x=mix(25,150,smooth(p));angle=mix(-.12,-.28,smooth(p));}
    if(id==='side'){x=mix(150,190,smooth(p));angle=-.28;}
    if(id==='separation'){x=mix(heavy?190:150,180,smooth(p));angle=mix(-.28,.1,smooth(p));}
    if(id==='boostback'){x=mix(180,mix(180,target.x,.45),smooth(p));z=mix(0,target.z*.4,smooth(p));angle=p<.32?mix(.1,2.1,smooth(p/.32)):p<.7?2.1:mix(2.1,.08,smooth((p-.7)/.3));}
    if(id==='coast'){x=mix(mix(180,target.x,.45),mix(180,target.x,.83),smooth(p));z=mix(target.z*.4,target.z*.8,smooth(p));angle=.08+.02*Math.sin(p*Math.PI);}
    if(id==='entry'){x=mix(mix(180,target.x,.83),mix(180,target.x,.98),smooth(p));z=mix(target.z*.8,target.z*.98,smooth(p));angle=mix(.08,.018,smooth(p));}
    if(id==='landing'){x=mix(mix(180,target.x,.98),target.x,smooth(p));z=mix(target.z*.98,target.z,smooth(p));y=target.y+(s.a0*1000+this.launchAltitude-target.y)*Math.pow(1-p,2.5);angle=.018*(1-p)+.006*Math.sin(p*14)*(1-p);}
    if(id==='touchdown'||isShip){x=target.x;z=target.z;y=target.y;angle=0;}
    booster.group.position.set(x,y,z);booster.group.rotation.set(0,.3,angle);
    if(!separated){upper.group.position.copy(booster.group.position).add(v3(0,join,0).applyQuaternion(booster.group.quaternion));upper.group.quaternion.copy(booster.group.quaternion);}else{
      const relative=Math.min(splitTime,sep.duration),after=Math.max(0,splitTime-sep.duration);
      const origin=id==='separation'?booster.group.position.clone():v3(180,sep.a1*1000+this.launchAltitude,0);const initialOffset=v3(0,join,0).applyAxisAngle(v3(0,0,1),-.28);
      upper.group.position.copy(origin).add(initialOffset).add(v3(relative*2+after*180,relative*4+relative*relative*.4+(210-sep.a1)*1000*clamp(after/88),0));upper.group.rotation.set(0,.3,mix(-.28,-1.15,clamp(splitTime/120)),'XYZ');
    }
    if(star&&isShip){let shipY=s.altitude*1000+1.8;let shipAngle=Math.PI*.5;
      if(id==='shipentry')shipAngle=mix(1.12,Math.PI*.5,smooth(p));
      if(id==='flip')shipAngle=mix(Math.PI*.5,0,smooth(p/.66));
      if(id==='splash'){shipY=1.8-p*2;shipAngle=.06*smooth(p);}
      const roll=id==='flip'?mix(-Math.PI/2,.3,smooth(p/.66)):id==='splash'?.3:-Math.PI/2;
      upper.group.position.set(OCEAN_SITE_X+210,shipY,-440);upper.group.rotation.set(0,roll,shipAngle,'ZYX');
    }
    const sidesSplit=heavy&&state.time>=state.stages.find(q=>q.id==='side').start;
    if(booster.mounts)booster.mounts.visible=!sidesSplit;
    sides.forEach((part,i)=>{
      const sign=i===0?-1:1;
      if(!sidesSplit){part.group.position.copy(booster.group.position).add(v3(sign*coreOffset,0,0).applyQuaternion(booster.group.quaternion));part.group.quaternion.copy(booster.group.quaternion);}else{
        part.group.position.copy(booster.group.position);const sepElapsed=state.time-state.stages.find(q=>q.id==='side').start;const spread=mix(coreOffset,ocean?40:32.5,smooth(sepElapsed/13));part.group.position.x+=sign*spread;part.group.rotation.set(0,.3,angle+sign*.06*Math.sin(Math.min(sepElapsed/13,1)*Math.PI));
        if(isReturn||id==='touchdown'){const retStart=state.stages.find(s=>s.id==='boostback').start;const transition=1-smooth((state.time-retStart)/4);part.group.position.x=x+(i===0?0:ocean?80:65)-(ocean?40:32.5)*transition;part.group.position.y=y;}
      }
      const n=!sidesSplit?(id==='countdown'?(p>.72?9:0):9):isReturn?engineCount(this.type,id,p)/2:0;setEngineFire(part,n,wallTime,id==='landing'?.65:1.6,clamp(s.altitude/85));articulate(part,isReturn?1:id==='side'?p:sidesSplit?1:0,id==='landing'?smooth((p-.48)/.4):id==='touchdown'?1:0,wallTime);
    });
    // The Heavy demonstration follows the side boosters; its center core continues downrange.
    if(heavy&&isReturn){booster.group.position.set(180+splitTime*1200,sep.a1*1000+splitTime*1000,-splitTime*350);booster.group.rotation.z=-.4;}
    if(heavy&&(id==='touchdown'))booster.group.position.set(100000,100000,-30000);
    // Once the feet meet a moving deck, keep the whole booster in that deck's frame.
    if(!star&&ocean&&['landing','touchdown'].includes(id)){
      const contact=id==='touchdown'?1:smooth((p-.94)/.06),parts=heavy?sides:[booster];
      parts.forEach((part,i)=>{const platform=i===0?this.barge:this.barge2;
        const base=v3(0,.8552861471,0).applyQuaternion(platform.quaternion).add(platform.position);
        part.group.position.lerp(base.clone().setY(base.y+(id==='landing'?y-target.y:0)),contact);
        const attitude=platform.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(v3(0,1,0),.3));part.group.quaternion.slerp(attitude,contact);
      });
    }
    let count=engineCount(this.type,id,p);let mainCount=isShip?0:heavy?(id==='countdown'?count/3:id==='side'?9:separated?0:9):count;
    let strength=id==='countdown'?.6:id==='landing'?.65:star?2.7:2;
    // SpaceX: center core throttles down after liftoff, then up after side separation.
    if(heavy&&!sidesSplit&&['ascent','maxq'].includes(id))strength*=id==='ascent'?mix(1,.62,smooth(p*3)):.62;
    setEngineFire(booster,mainCount,wallTime,strength,clamp(s.altitude/85));
    let upperCount=separated&&splitTime<100?(star?6:1):0;if(isShip)upperCount=id==='flip'?3:0;
    setEngineFire(upper,upperCount,wallTime,isShip?1.25:star?2.1:1.4,isShip?clamp(s.altitude/85):1);
    articulate(booster,isReturn?1:id==='separation'?p:0,id==='landing'?smooth((p-.45)/.4):id==='touchdown'?1:0,wallTime,star);
    if(star)setShipFlaps(upper,id==='belly'?.45:id==='shipentry'?.24:id==='flip'?.16:0,wallTime);
    if(upper.fairings)upper.fairings.forEach((f,i)=>{const amount=smooth((s.missionTime-180)/16);f.position.set((i===0?1:-1)*amount*24,-amount*16,amount*8);f.rotation.z=(i===0?-1:1)*amount*.7;f.visible=s.missionTime<245;});
    const active=isShip||state.focus==='upper'&&separated?upper:heavy&&isReturn||heavy&&id==='touchdown'?sides[0]:booster;
    const activeHeight=isShip||state.focus==='upper'&&separated?upper.height:separated?join:height;
    const center=active.group.position.clone().add(v3(0,activeHeight*.48,0).applyQuaternion(active.group.quaternion));
    this.activePosition=center;this.activeAngle=active.group.rotation.z;this.activeHeight=activeHeight;
    const viewAltitude=active===upper&&!isShip?Math.max(0,(upper.group.position.y-this.launchAltitude)/1000):s.altitude;
    this.scene.fog.density=.000075*(1-smooth((viewAltitude-3)/20));this.tower.group.visible=viewAltitude<40;
    this.catchTower.group.visible=star&&!ocean;this.catchTower.arms.forEach((a,i)=>{a.position.y=target.y+(booster.catchHeight||61)-1.27-this.catchTower.group.position.y;a.rotation.y=(i===0?1:-1)*mix(.23,-.035,id==='landing'?smooth((p-.5)/.5):id==='touchdown'||isShip?1:0);});
    this.tower.arm.rotation.y=mix(0,-.8,id==='countdown'?smooth(p):1);this.tower.arms.forEach((a,i)=>{a.rotation.y=(i===0?1:-1)*.22;});if(!star)this.tower.group.rotation.z=.12*(id==='countdown'?smooth(p):1);
    this.engineLight.position.copy(active.group.position).add(v3(0,-3,0));this.engineLight.intensity=count>0?(star?260:100):0;
    const lightRight=v3().crossVectors(v3(0,1,0),this.world.sunDirection).normalize(),lightUp=v3().crossVectors(this.world.sunDirection,lightRight);
    const shadowTarget=center.clone(),sx=center.dot(lightRight),sy=center.dot(lightUp),tx=210/2048,ty=250/2048;
    shadowTarget.addScaledVector(lightRight,Math.round(sx/tx)*tx-sx).addScaledVector(lightUp,Math.round(sy/ty)*ty-sy);
    this.sun.position.copy(shadowTarget).addScaledVector(this.world.sunDirection,600);this.sun.target.position.copy(shadowTarget);this.sun.target.updateMatrixWorld();
    const emitting=heavy?[...sides,booster]:[booster,upper];
    const emitters=emitting.map(part=>({pos:part.group.position,direction:v3(0,-1,0).applyQuaternion(part.group.quaternion),star,on:part.engines.some(e=>e.flame.visible)&&viewAltitude<22}));
    this.reentryGlow.visible=star&&id==='shipentry';if(this.reentryGlow.visible){this.reentryGlow.position.copy(center);this.reentryGlow.quaternion.copy(upper.group.quaternion);this.reentryGlow.material.opacity=.1+.09*Math.sin(wallTime*19)**2;}
    const splashing=(star&&ocean&&id==='touchdown')||id==='splash';this.splashRing.visible=splashing;if(splashing){this.splashRing.position.set(active.group.position.x,.3,active.group.position.z);this.splashRing.scale.setScalar(1+p*10);this.splashRing.material.opacity=(1-p)*.65;}
    if(state.trajectory!==this.pathShown){this.pathShown=state.trajectory;this.trail.visible=state.trajectory;}
    if(state.recovery!==this.pathRecovery||this.pathType!==this.type){this.updatePath(target,state.stages);this.pathRecovery=state.recovery;this.pathType=this.type;}
    let cameraCenter=center,cameraHeight=activeHeight;
    if(count>0&&['ascent','maxq','side'].includes(id)&&this.mode==='cinema'&&!this.manualOrbit){cameraCenter=center.clone().add(v3(0,-activeHeight*.22,0).applyQuaternion(active.group.quaternion));cameraHeight=activeHeight*1.25;}
    if(id==='separation'&&state.focus==='booster'&&this.mode==='cinema'&&!this.manualOrbit){const upperCenter=upper.group.position.clone().add(v3(0,upper.height*.5,0).applyQuaternion(upper.group.quaternion));cameraCenter=center.clone().lerp(upperCenter,.46);cameraHeight=Math.max(height,upper.group.position.distanceTo(booster.group.position)+upper.height*.8);}
    this.updateCamera(cameraCenter,active,cameraHeight,s,dt,state);
    this.world.update({altitude:viewAltitude,activePosition:center,night:state.night,weather:state.weather,camera:this.camera,time:wallTime,dt,emitters,seek:state.justSeek});
    this.renderer.info.reset();this.composer.render();
    const upperAltitude=separated?Math.max(0,(upper.group.position.y-(isShip?1.8:this.launchAltitude))/1000):s.altitude;
    return{angle:this.activeAngle,engineCount:count,activePart:active===upper?'upper':'booster',altitude:viewAltitude,drawCalls:this.renderer.info.render.calls,telemetry:{booster:{altitude:isShip?0:s.altitude,velocity:isShip?0:s.velocity,engines:isShip?0:count,pitch:90-Math.abs((heavy&&isReturn?sides[0]:booster).group.rotation.z*180/Math.PI)},upper:{altitude:upperAltitude,velocity:isShip?s.velocity:separated?mix(sep.v0,27300,clamp(splitTime/100)):s.velocity,engines:upperCount,pitch:90-Math.abs(upper.group.rotation.z*180/Math.PI)}}};
  }
  updateCamera(center,active,h,s,dt,state){
    const delta=center.clone().sub(this.lastTarget);const snap=state.justSeek;const factor=snap?1:1-Math.exp(-dt*3.5);const desired=center.clone();
    // Translate with the vehicle immediately; ease only framing and relative camera offsets.
    // Smoothing absolute kilometre-scale positions lets a fast rocket outrun its camera.
    if(!snap){this.camera.position.add(delta);this.controls.target.add(delta);}
    if(this.mode==='onboard'){
      const pos=active.group.position.clone().add(v3(4,h*.86,8).applyQuaternion(active.group.quaternion));this.camera.position.lerp(pos,snap?1:1-Math.exp(-dt*5));const look=active.group.position.clone().add(v3(0,-h*.35,0));this.controls.target.lerp(look,factor);this.camera.lookAt(this.controls.target);this.controls.enabled=false;
    }else{
      this.controls.enabled=true;
      if(this.manualOrbit){this.controls.target.copy(desired);}
      else{let offset;
        if(this.mode==='wide')offset=v3(h*3.0,h*1.5,h*4.4);
        else if(this.mode==='landing')offset=v3(h*1.35,-h*.05,h*2.65);
        else{const orbit=Math.sin(state.time*.007)*.06;const returning=['landing','touchdown','flip','splash'].includes(s.id);const elevation=returning?.10:mix(-.23,1.18,smooth((s.altitude-8)/30));offset=v3(h*(.9+orbit),h*elevation,h*2.75);}
        // Keep Heavy's two side boosters together in the broadcast frame.
        if(this.type==='heavy'&&['boostback','coast','entry','landing','touchdown'].includes(s.id)&&state.focus!=='upper'){desired.x+=state.recovery==='ocean'?40:32.5;offset.multiplyScalar(1.45);}
        this.camera.position.lerp(desired.clone().add(offset),factor);this.controls.target.lerp(desired,factor);
      }
      this.controls.update();
    }
    this.lastTarget.copy(center);
  }
  updatePath(target,stages){
    if(this.trajectory){this.trajectory.geometry.dispose();this.trajectory.material.dispose();this.trail.remove(this.trajectory);}
    const end=id=>stages.find(s=>s.id===id).a1*1000+this.launchAltitude;
    const points=[v3(0,this.launchAltitude,0),v3(25,end('ascent'),0),v3(150,end('maxq'),0)];
    if(this.type==='heavy')points.push(v3(190,end('side'),0));
    points.push(v3(180,end('separation'),0),v3(mix(180,target.x,.45),end('boostback'),target.z*.4),v3(mix(180,target.x,.83),end('coast'),target.z*.8),v3(mix(180,target.x,.98),end('entry'),target.z*.98),v3(target.x,target.y,target.z));
    const geo=new THREE.BufferGeometry().setFromPoints(points);this.trajectory=new THREE.Line(geo,new THREE.LineDashedMaterial({color:0x70d5c2,transparent:true,opacity:.30,dashSize:80,gapSize:90}));this.trajectory.computeLineDistances();this.trail.add(this.trajectory);
  }
  screenshot(){this.composer.render();return this.renderer.domElement.toDataURL('image/png');}
}
