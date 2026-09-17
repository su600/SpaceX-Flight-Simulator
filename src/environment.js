import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { landingPad, droneShip, createTower } from './models.js';
import { clamp, mix, smooth } from './mission.js';
export const OCEAN_SITE_X=30000;

const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return mix(mix(rand(a+b*157),rand(a+1+b*157),u),mix(rand(a+(b+1)*157),rand(a+1+(b+1)*157),u),v);};
const fbm=(x,y)=>noise(x,y)*.53+noise(x*2.01,y*2.01)*.27+noise(x*4.03,y*4.03)*.13+noise(x*8.09,y*8.09)*.07;
const mat=(color,roughness=.8,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
function mesh(g,geo,m,x=0,y=0,z=0){const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const box=(g,m,w,h,d,x,y,z)=>mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);

export function cloudTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),pixels=g.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const dx=(x-128)/122,dy=(y-128)/116,d=Math.sqrt(dx*dx+dy*dy);
    const n=fbm(x/34+20,y/34+11),edge=clamp((1-d)*4.4),a=clamp((n-.23)*2.1)*edge;
    const light=clamp(.63+n*.36-(y/256)*.16);const i=(y*256+x)*4;
    pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=Math.round(light*255);pixels.data[i+3]=Math.round(a*255);
  }
  g.putImageData(pixels,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}

function concreteTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d'),p=g.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const n=fbm(x/42,y/42)*24+rand(x+y*512)*20,v=100+n;const i=(y*512+x)*4;p.data[i]=v+7;p.data[i+1]=v+6;p.data[i+2]=v;p.data[i+3]=255;}g.putImageData(p,0,0);
  g.strokeStyle='#51554c';g.lineWidth=1;for(let i=0;i<=512;i+=128){g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.moveTo(0,i);g.lineTo(512,i);g.stroke();}
  const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
}

const noiseGLSL=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float fbm(vec2 p){float n=0.,a=.5;float footprint=max(length(dFdx(p)),length(dFdy(p)));for(int i=0;i<5;i++){float detail=1.-smoothstep(.25,.8,footprint);n+=mix(.5,noise(p),detail)*a;p=p*2.03+7.31;footprint*=2.03;a*=.5;}return n;}`;
const worldVertex=`varying vec3 worldP;varying vec2 vUv;void main(){vUv=uv;worldP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export class FlightEnvironment {
  constructor(scene,renderer){
    this.scene=scene;this.ground=new T.Group();scene.add(this.ground);this.night=false;
    // Distant scenery never competes for depth with metre-scale ground or vehicles.
    this.background=new T.Scene();this.backgroundCamera=new T.PerspectiveCamera(31,1,.5,300000);
    this.sunDirection=new T.Vector3(-.65,.45,.62).normalize();
    this.sky=new Sky();this.sky.scale.setScalar(150000);this.background.add(this.sky);
    const u=this.sky.material.uniforms;u.turbidity.value=2.2;u.rayleigh.value=2.8;u.mieCoefficient.value=.003;u.mieDirectionalG.value=.83;u.sunPosition.value.copy(this.sunDirection);
    this.sky.material.fragmentShader=this.sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );','vec3 clearSky=mix(vec3(.44,.62,.76),vec3(.045,.19,.42),pow(max(direction.y,0.),.35));gl_FragColor = vec4(mix(retColor*.32,clearSky,.68),1.0);');
    const pmrem=new T.PMREMGenerator(renderer);this.environment=pmrem.fromScene(this.sky,.02,1,200000);scene.environment=this.environment.texture;scene.environmentIntensity=.20;pmrem.dispose();
    this.sky.material.depthWrite=false;
    // A dark dome fades in with altitude; the Earth uses photographic day/cloud maps.
    this.space=new T.Mesh(new T.SphereGeometry(145000,24,16),new T.MeshBasicMaterial({color:0x020710,side:T.BackSide,transparent:true,opacity:0,depthWrite:false}));this.space.renderOrder=1;this.background.add(this.space);
    const geo=new T.BufferGeometry(),pos=[];for(let i=0;i<700;i++){const y=rand(i)*2-1,a=i*2.39996,r=Math.sqrt(1-y*y);pos.push(Math.cos(a)*r*80000,y*80000,Math.sin(a)*r*80000);}geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    this.stars=new T.Points(geo,new T.PointsMaterial({color:0xc5d8e9,size:55,transparent:true,opacity:0,depthWrite:false}));this.stars.renderOrder=3;this.background.add(this.stars);
    const loader=new T.TextureLoader();const earthMap=loader.load('./textures/earth-day.jpg');earthMap.colorSpace=T.SRGBColorSpace;
    this.earth=new T.Group();this.background.add(this.earth);
    this.earthRadius=63710;
    const cm=loader.load('./textures/earth-clouds.png');cm.colorSpace=T.SRGBColorSpace;cm.anisotropy=8;
    earthMap.anisotropy=8;const planetMaterial=new T.MeshBasicMaterial({map:earthMap,color:0xb9d6ff,fog:false,transparent:true});this.planetMaterial=planetMaterial;
    planetMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 earthN;varying vec3 earthEye;');shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nearthN=normalize(normalMatrix*normal);earthEye=normalize(-mvPosition.xyz);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 earthN;varying vec3 earthEye;\n'+noiseGLSL);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float cloud=fbm(vMapUv*vec2(3000.,1700.));float wisps=fbm(vMapUv*vec2(8400.,4200.)+17.);
      float cover=smoothstep(.54,.73,cloud)*(.45+wisps*.55);
      vec4 mappedCloud=texture2D(earthCloudMap,vMapUv);float cloudAlpha=mappedCloud.a*dot(mappedCloud.rgb,vec3(.3333));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.81,.89),clamp(cover*.67+cloudAlpha*.26,0.,.9));
      float haze=pow(clamp(1.-abs(dot(normalize(earthN),normalize(earthEye))),0.,1.),3.);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.32,.52),haze*.64);
    `);};
    const compilePlanet=planetMaterial.onBeforeCompile;planetMaterial.onBeforeCompile=shader=>{compilePlanet(shader);shader.uniforms.earthCloudMap={value:cm};shader.fragmentShader='uniform sampler2D earthCloudMap;\n'+shader.fragmentShader;};
    const planet=mesh(this.earth,new T.SphereGeometry(this.earthRadius,160,96),planetMaterial);planet.rotation.set(-.8,2.4,.2);planet.castShadow=false;planet.renderOrder=2;
    const atmosphere=new T.ShaderMaterial({transparent:true,blending:T.AdditiveBlending,side:T.BackSide,depthWrite:false,uniforms:{fade:{value:0}},vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`uniform float fade;varying vec3 n;varying vec3 eye;void main(){float a=pow(clamp(1.+dot(n,eye),0.,1.),4.);gl_FragColor=vec4(.13,.43,.88,a*.72*fade);}`});
    this.atmosphere=atmosphere;const halo=mesh(this.earth,new T.SphereGeometry(this.earthRadius+200,128,80),atmosphere);halo.castShadow=false;halo.renderOrder=4;
    this.makeGround();this.makeBuildings();this.makeClouds();
    this.barge=droneShip();this.barge.position.set(OCEAN_SITE_X,0,-350);this.ground.add(this.barge);
    this.barge2=droneShip();this.barge2.position.set(OCEAN_SITE_X+80,0,-350);this.ground.add(this.barge2);
    this.landSite=new T.Group();this.landSite.position.set(0,.4,-450);this.landSite.add(landingPad(25));const pad=landingPad(25);pad.position.x=65;this.landSite.add(pad);this.ground.add(this.landSite);
    this.catchTower=createTower(145,true);this.catchTower.group.position.set(-24,.4,-450);this.ground.add(this.catchTower.group);
    this.smoke=new ExhaustSmoke(scene,this.cloudMap);
    this.groundMaterials=new Set();const copies=new Map();this.ground.traverse(o=>{if(o.isMesh&&!o.material.isShaderMaterial){const clone=m=>{if(!copies.has(m))copies.set(m,m.clone());const c=copies.get(m);c.transparent=true;c.depthWrite=true;this.groundMaterials.add(c);return c;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);}});
    for(const material of[this.landMat,this.waterMat]){material.transparent=true;material.depthWrite=true;}
  }
  makeGround(){
    this.landMat=new T.ShaderMaterial({uniforms:{night:{value:0},fade:{value:1}},vertexShader:worldVertex,fragmentShader:`varying vec3 worldP;uniform float night;uniform float fade;${noiseGLSL}
      void main(){vec2 p=worldP.xz;float coast=270.+sin(p.y*.0013)*150.+sin(p.y*.009)*26.;float edge=coast-p.x;if(edge<0.)discard;
      float n=fbm(p*.005),fine=fbm(p*.085);vec3 grass=mix(vec3(.13,.18,.095),vec3(.29,.32,.16),n);grass=mix(grass,vec3(.33,.31,.22),smoothstep(.48,.76,n)*.7);
      float marsh=fbm(p*.0018+41.);grass=mix(grass,vec3(.055,.15,.15),smoothstep(.66,.72,marsh)*smoothstep(170.,300.,length(p)));
      vec3 c=mix(vec3(.55,.52,.40),grass,smoothstep(5.,65.,edge));c*=.82+fine*.31;
      float distance=length(cameraPosition-worldP);c=mix(c,vec3(.40,.48,.50),1.-exp(-distance*.00009));c=mix(c,c*.14,night);float boundary=(1.-smoothstep(7600.,9000.,abs(p.y)))*smoothstep(-15500.,-13500.,p.x);gl_FragColor=vec4(c,fade*boundary);}`});
    const land=mesh(this.ground,new T.PlaneGeometry(16000,18000,1,1),this.landMat,-7500,-.05,0);land.rotation.x=-Math.PI/2;land.castShadow=false;
    this.waterMat=new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0},fade:{value:1},sun:{value:this.sunDirection}},vertexShader:worldVertex,fragmentShader:`varying vec3 worldP;uniform float time;uniform float night;uniform float fade;uniform vec3 sun;${noiseGLSL}
      float wave(vec2 p){return sin(p.x*.035+time*.8+sin(p.y*.014))*1.4+sin(p.y*.068-time*.56+p.x*.02)*.6+fbm(p*.15-time*.09)*1.9;}
      void main(){vec2 p=worldP.xz;float dist=length(cameraPosition-worldP);float detail=1.-smoothstep(.4,6.,max(fwidth(p.x),fwidth(p.y)));float h=wave(p);vec3 n=normalize(vec3((h-wave(p+vec2(.6,0)))*.4,1.,(h-wave(p+vec2(0,.6)))*.4));n=mix(vec3(0,1,0),n,detail);
      vec3 eye=normalize(cameraPosition-worldP);float fres=pow(clamp(1.-dot(n,eye),0.,1.),4.);vec3 c=mix(vec3(.018,.075,.092),vec3(.33,.44,.49),fres);
      float spec=pow(max(dot(reflect(-sun,n),eye),0.),110.);c+=vec3(1.,.78,.5)*spec*1.15;float ripple=fbm(p*.7+time*.13);c+=vec3(.05,.07,.07)*smoothstep(.72,.86,ripple)*detail;
      c=mix(c,vec3(.38,.46,.49),1.-exp(-dist*.00004));c=mix(c,c*.10,night);float boundary=1.-smoothstep(41000.,50000.,max(abs(p.x),abs(p.y)));gl_FragColor=vec4(c,fade*boundary);}`});
    const ocean=mesh(this.ground,new T.PlaneGeometry(100000,100000),this.waterMat,0,-.62,0);ocean.rotation.x=-Math.PI/2;ocean.castShadow=false;
    const concrete=mat(0xb4b1a4,.98);concrete.map=concreteTexture();concrete.bumpMap=concrete.map;concrete.bumpScale=.055;
    box(this.ground,concrete,110,.35,95,-6,.08,-2);
    const asphalt=mat(0x363c3d,.99);box(this.ground,asphalt,17,.1,1900,-105,.04,-820);box(this.ground,asphalt,120,.1,12,-52,.05,16);
    const line=mat(0xb1afa2);for(let i=0;i<37;i++)box(this.ground,line,.17,.02,7,-105,.11,80-i*45);
    const trench=mat(0x252a29,.99);box(this.ground,trench,12,.1,65,0,.32,17);box(this.ground,concrete,3,3,55,-8,1.5,12);box(this.ground,concrete,3,3,55,8,1.5,12);
    this.mount=new T.Group();this.ground.add(this.mount);const metal=mat(0x596366,.58,.68);
    for(const x of[-3.8,3.8])for(const z of[-3.8,3.8])box(this.mount,metal,1.1,3.8,1.1,x,2,z);
    const ring=mesh(this.mount,new T.TorusGeometry(4.8,.65,8,32),metal,0,3.6,0);ring.rotation.x=Math.PI/2;
    this.starMount=new T.Group();this.ground.add(this.starMount);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const leg=mesh(this.starMount,new T.CylinderGeometry(.9,1.25,17,12),metal,Math.sin(a)*7,8.5,Math.cos(a)*7);leg.rotation.z=-Math.sin(a)*.09;leg.rotation.x=Math.cos(a)*.09;}
    mesh(this.starMount,new T.CylinderGeometry(8,8,2.1,48,1,true),metal,0,17,0);
    for(let i=0;i<26;i++){const a=i*Math.PI/13;box(this.starMount,metal,.28,2,.28,Math.sin(a)*8,18.5,Math.cos(a)*8);}
    const shrubs=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),mat(0x384b27,.98),650),dummy=new T.Object3D();
    for(let i=0;i<650;i++){let x=-40-rand(i*4)*2200,z=rand(i*4+1)*3400-2200;const near=Math.abs(x)<170&&z>-500&&z<100;if(near)x-=190;dummy.position.set(x,.2+rand(i+90),z);const s=2+rand(i+20)*8;dummy.scale.set(s,.8+rand(i+70)*3,s*.7);dummy.rotation.y=i;dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);shrubs.setColorAt(i,new T.Color().setHSL(.20+rand(i)*.06,.20,.13+rand(i+3)*.07));}
    shrubs.receiveShadow=true;this.ground.add(shrubs);
  }
  makeBuildings(){
    const wall=mat(0x9d9e97,.88),roof=mat(0x697276,.6,.35),door=mat(0x424e53,.8),pipes=mat(0xb1b7b5,.47,.5),tank=mat(0xb9bcb5,.42,.35);
    for(let i=0;i<12;i++){const x=-230-(i%4)*100,z=-240-Math.floor(i/4)*130,w=42+rand(i)*30,d=65,h=8+rand(i+1)*9;box(this.ground,wall,w,h,d,x,h/2,z);const top=box(this.ground,roof,w+1,.6,d+1,x,h,z);for(let j=0;j<5;j++)box(this.ground,door,w/8,h*.55,.18,x+(j-2)*w*.17,h*.34,z+d/2+.12);for(let k=0;k<3;k++)box(this.ground,pipes,2.4,1.5,3,x+(k-1)*12,h+1,z);}
    for(let i=0;i<7;i++){const x=-45-i*10,z=-84-(i%2)*13;mesh(this.ground,new T.CylinderGeometry(3.7,3.7,17,32),tank,x,8.5,z);const cap=mesh(this.ground,new T.SphereGeometry(3.7,24,12,0,Math.PI*2,0,Math.PI/2),tank,x,17,z);cap.scale.y=.36;box(this.ground,pipes,.45,.4,80,x,.8,-46);}
    for(let i=0;i<3;i++){const x=-65-i*20;mesh(this.ground,new T.SphereGeometry(7,32,20),tank,x,8,56);box(this.ground,roof,10,3,10,x,1.5,56);}
    // Fence segments and access lamps add near-ground scale without hiding the vehicle.
    const fence=mat(0x5f6767,.7,.4);for(let i=0;i<28;i++){const x=-80+i*8;box(this.ground,fence,.1,2.4,.1,x,1.2,-120);box(this.ground,fence,8,.04,.04,x+4,2,-120);}
    for(const x of[-40,40])for(const z of[-40,40]){mesh(this.ground,new T.CylinderGeometry(.12,.18,9,8),roof,x,4.5,z);box(this.ground,pipes,1.7,.2,.5,x,9,z);}
  }
  makeClouds(){
    this.cloudMap=cloudTexture();this.clouds=new T.Group();this.scene.add(this.clouds);
    for(let i=0;i<90;i++){const sprite=new T.Sprite(new T.SpriteMaterial({map:this.cloudMap,color:0xecf0ed,opacity:.42,transparent:true,depthWrite:false}));const angle=i*2.39996,dist=1500+rand(i)*8000;sprite.position.set(Math.cos(angle)*dist,1200+rand(i+5)*2400,Math.sin(angle)*dist);sprite.scale.set(700+rand(i+2)*850,160+rand(i+3)*200,1);sprite.renderOrder=1+i/1000;this.clouds.add(sprite);}
  }
  setVehicle(star){this.mount.visible=!star;this.starMount.visible=star;}
  updatePlatforms(time){this.barge.rotation.set(Math.sin(time*.44)*.003,0,Math.sin(time*.6)*.003);this.barge2.rotation.set(-Math.sin(time*.44)*.003,0,Math.sin(time*.6+.6)*.003);}
  update({altitude,activePosition,night,weather,camera,time,dt,emitters,seek}){
    this.night=night;const space=smooth((altitude-22)/50),groundFade=1-smooth((altitude-22)/22);
    this.backgroundCamera.quaternion.copy(camera.quaternion);this.backgroundCamera.aspect=camera.aspect;this.backgroundCamera.fov=camera.fov;this.backgroundCamera.updateProjectionMatrix();
    this.space.material.opacity=clamp(space+(night?.88:0));this.stars.material.opacity=space*.13+(night?.3:0);this.earth.visible=altitude>20;this.planetMaterial.opacity=smooth((altitude-20)/8);this.atmosphere.uniforms.fade.value=this.planetMaterial.opacity;
    // Scenic Earth uses a 1:100 scale with the same altitude/radius ratio as Earth.
    // Anchor to the camera to avoid combining the miniature globe with metre-scale vehicles.
    this.earth.position.set(0,-this.earthRadius-altitude*10,0);
    this.ground.visible=groundFade>.005;this.landMat.uniforms.fade.value=groundFade;this.waterMat.uniforms.fade.value=groundFade;
    for(const material of[this.landMat,this.waterMat])material.uniforms.night.value=night?1:0;
    for(const material of this.groundMaterials)material.opacity=groundFade;
    this.waterMat.uniforms.time.value=time;this.sky.material.uniforms.turbidity.value=weather==='cloudy'?7:2.2;
    this.clouds.children.forEach((c,i)=>{c.material.opacity=(weather==='cloudy'?.78:.44)*(1-space*.95)*(night?.22:1);c.position.x+=dt*(weather==='windy'?1.8:.28);});
    this.smoke.update(emitters,dt,time,camera,seek,night,weather);
  }
}

class ExhaustSmoke {
  constructor(scene,texture){
    this.size=360;this.particles=Array.from({length:this.size},()=>({age:100,life:1,pos:new T.Vector3(),vel:new T.Vector3(),size:1}));this.cursor=0;this.tick=0;this.accum=0;
    const geometry=new T.PlaneGeometry(1,1);this.alpha=new Float32Array(this.size);geometry.setAttribute('instanceAlpha',new T.InstancedBufferAttribute(this.alpha,1));
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{map:{value:texture},light:{value:1}},vertexShader:`attribute float instanceAlpha;varying vec2 vUv;varying float alpha;void main(){vUv=uv;alpha=instanceAlpha;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D map;uniform float light;varying vec2 vUv;varying float alpha;void main(){vec4 s=texture2D(map,vUv);vec3 col=mix(vec3(.20,.23,.24),vec3(.76,.76,.72),s.r);gl_FragColor=vec4(col*light,s.a*alpha);}`});
    this.mesh=new T.InstancedMesh(geometry,material,this.size);this.mesh.frustumCulled=false;this.mesh.renderOrder=4;scene.add(this.mesh);this.dummy=new T.Object3D();
  }
  update(emitters,dt,time,camera,seek,night,weather){
    if(seek){this.particles.forEach(p=>p.age=100);this.accum=0;}
    this.accum+=dt*55;const spawn=Math.floor(this.accum);this.accum-=spawn;
    for(const emitter of emitters){if(!emitter.on)continue;for(let k=0;k<spawn;k++){
      const p=this.particles[this.cursor++%this.size],i=this.tick++,a=rand(i)*Math.PI*2,low=emitter.pos.y<30;
      p.age=0;p.life=low?7+rand(i+1)*4:4+rand(i+1)*3;p.size=emitter.star?5:3;p.low=low;
      if(low){const r=4+rand(i+2)*4;p.pos.set(emitter.pos.x+Math.cos(a)*r,1+rand(i+3)*2,emitter.pos.z+Math.sin(a)*r);p.vel.set(Math.cos(a)*(6+rand(i+4)*6),1.3+rand(i+5)*2,Math.sin(a)*(6+rand(i+6)*6));}
      else{p.pos.copy(emitter.pos).addScaledVector(emitter.direction,emitter.star?43:29);p.vel.copy(emitter.direction).multiplyScalar(8+rand(i)*7);p.vel.x+=Math.cos(a)*2;p.vel.z+=Math.sin(a)*2;}
    }}
    this.particles.forEach((p,i)=>{p.age+=dt;const t=p.age/p.life;if(t>=1){this.alpha[i]=0;this.dummy.scale.setScalar(0);}else{p.pos.addScaledVector(p.vel,dt);p.vel.multiplyScalar(1-dt*.08);p.pos.x+=dt*(weather==='windy'?3.1:.5);const grow=p.size+p.age*(p.low?3.1:1.3);this.dummy.position.copy(p.pos);this.dummy.scale.set(grow*2.6,grow*2,1);this.dummy.quaternion.copy(camera.quaternion);this.dummy.rotateZ(rand(i)*6.28);this.alpha[i]=Math.min(p.age*4,1)*Math.pow(1-t,1.5)*(p.low?.58:.27);}this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);});
    this.mesh.geometry.attributes.instanceAlpha.needsUpdate=true;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.material.uniforms.light.value=night?.25:1;
  }
}
