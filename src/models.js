import * as THREE from 'three';
import { clamp, mix, smooth } from './mission.js';
import { drawVerticalSpaceX, drawUSFlag, drawSpaceXX } from './branding.js';
import { createPlume, updatePlume } from './plume.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { starshipSurface } from './thermal.js';

export const VEHICLE_GEOMETRY={falconRadius:1.83,heavyCoreOffset:(12.2-3.66)/2,starBoosterHeight:72,starShipHeight:52};

const white = new THREE.MeshStandardMaterial({color:0xe5e7e5,metalness:.08,roughness:.62});
const dark = new THREE.MeshStandardMaterial({color:0x152029,metalness:.5,roughness:.42});
const steel = new THREE.MeshStandardMaterial({color:0xc9cecd,metalness:.72,roughness:.30,envMapIntensity:1.5});
const nozzleMat = new THREE.MeshStandardMaterial({color:0x373a3e,metalness:.86,roughness:.3,side:THREE.DoubleSide});
const black = new THREE.MeshStandardMaterial({color:0x101417,metalness:.025,roughness:.90});
const gold = new THREE.MeshStandardMaterial({color:0x958567,metalness:.75,roughness:.4});

function mergeChildren(group){
  const byMaterial=new Map();for(const o of [...group.children])if(o.isMesh&&!Array.isArray(o.material)&&!o.material.isShaderMaterial){o.updateMatrix();const copy=o.geometry.clone().applyMatrix4(o.matrix);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(copy);group.remove(o);o.geometry.dispose();}
  for(const [material,geometries]of byMaterial){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(geometry){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}}
}

function add(parent, geometry, material, x=0,y=0,z=0) {
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const cyl=(p,rt,rb,h,m,y,x=0,z=0,n=48)=>add(p,new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
const box=(p,x,y,z,m,px=0,py=0,pz=0)=>add(p,new THREE.BoxGeometry(x,y,z),m,px,py,pz);
function rod(p,a,b,r=.055,mat=steel){const d=new THREE.Vector3().subVectors(b,a);const m=cyl(p,r,r,d.length(),mat,0,0,0,8);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function labelTexture(star=false,tiled=star) {
  const c=document.createElement('canvas');c.width=1024;c.height=2048;const g=c.getContext('2d');
  g.fillStyle=star?'#afbac0':'#e6e8e7';g.fillRect(0,0,1024,2048);
  // Deterministic surface detail, seams and soot; all textures are bundled procedural artwork.
  for(let i=0;i<13000;i++){const x=(i*347)%1024,y=(i*977)%2048;g.fillStyle=`rgba(${star?'35,49,58':'55,62,65'},${(i%7)/300})`;g.fillRect(x,y,(i%3)+1,star?22:4);}
  if(star){
    for(let y=30;y<2048;y+=66){g.fillStyle='#647780';g.fillRect(0,y,1024,1);g.fillStyle='#dce1e2';g.fillRect(0,y+2,1024,1);}
    if(tiled){g.save();g.beginPath();g.rect(500,0,524,2048);g.clip();g.fillStyle='#1b2329';g.fillRect(500,0,524,2048);
      g.strokeStyle='#363e42';g.lineWidth=1;const r=14;for(let row=0;row<100;row++)for(let col=0;col<24;col++){const cx=490+col*r*Math.sqrt(3)+(row%2?r*Math.sqrt(3)/2:0),cy=row*r*1.5;g.beginPath();for(let i=0;i<6;i++){const a=(30+60*i)*Math.PI/180;g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}g.closePath();g.stroke();}g.restore();}
  }else{
    for(const y of [80,350,775,1250,1770,1960]){g.fillStyle='rgba(70,78,80,.22)';g.fillRect(0,y,1024,2);}
    const grad=g.createLinearGradient(0,1500,0,2048);grad.addColorStop(0,'rgba(46,43,37,0)');grad.addColorStop(1,'rgba(46,43,37,.4)');g.fillStyle=grad;g.fillRect(0,1500,1024,548);
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
function flames(parent,positions,radius,star=false,deckHeight=1.15) {
  const engines=[];
  positions.forEach(([x,z],i)=>{
    const r=Array.isArray(radius)?radius[i]:radius;
    const bell=add(parent,new THREE.CylinderGeometry(r*.44,r,r*1.45,32,1,true),nozzleMat,x,r*.65,z);
    const lip=add(parent,new THREE.TorusGeometry(r-.018,.024,6,32),steel,x,-r*.075,z);lip.rotation.x=Math.PI/2;
    const collarY=r*1.375+.055;
    cyl(parent,r*.52,r*.52,.16,dark,collarY,x,z,20);
    // A visible powerhead/load path joins every nozzle collar to the thrust deck.
    const neckHeight=Math.max(.12,deckHeight-collarY+.10);
    cyl(parent,r*.34,r*.43,neckHeight,steel,collarY+neckHeight*.5-.05,x,z,20);
    const flame=new THREE.Group();flame.position.set(x,-.12,z);parent.add(flame);
    const outer=new THREE.ShaderMaterial({uniforms:{time:{value:0},tint:{value:new THREE.Color(star?0x779dff:0xff9a39)},seed:{value:i*.81}},transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,
      vertexShader:`varying vec2 uvP;varying vec3 n;varying vec3 eye;void main(){uvP=uv;n=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);eye=-p.xyz;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform float time;uniform float seed;uniform vec3 tint;varying vec2 uvP;varying vec3 n;varying vec3 eye;void main(){float edge=pow(abs(dot(normalize(n),normalize(eye))),.7);float flow=sin(uvP.y*65.-time*38.+seed+sin(uvP.x*19.+time*7.));float noise=.78+.22*flow;float fade=pow(max(0.,1.-uvP.y),.6);float diamonds=pow(max(0.,sin(uvP.y*30.-1.)),8.);vec3 c=mix(vec3(1.,.93,.82),tint,smoothstep(.0,.5,uvP.y));c+=vec3(.7,.8,1.)*diamonds*.35;gl_FragColor=vec4(c*1.8,edge*fade*noise*.55);}`});
    const inner=new THREE.MeshBasicMaterial({color:star?0xc2ddff:0xffecb9,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
    const cone=add(flame,new THREE.ConeGeometry(r*1.3,10,16),outer,0,-5);cone.rotation.z=Math.PI;
    const core=add(flame,new THREE.ConeGeometry(r*.75,7,12),inner,0,-3.5);core.rotation.z=Math.PI;
    const diamonds=[];for(let j=0;j<3;j++){const d=add(flame,new THREE.SphereGeometry(r*.3,10,8),inner,0,-1.8-j*1.8);d.scale.set(.65,2.6-j*.35,.65);diamonds.push(d);}
    flame.visible=false;engines.push({flame,bell,outer,inner,nozzleRadius:r,phase:i*.73});
  });
  engines.plume=createPlume(parent,star);
  return engines;
}
function engineLayout(n,r){const out=[[0,0]];if(n===9){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;out.push([Math.sin(a)*r,Math.cos(a)*r]);}}else if(n===33){out.length=0;for(const [count,rad]of [[3,.85],[10,2.35],[20,3.8]])for(let i=0;i<count;i++){const a=i/count*Math.PI*2;out.push([Math.sin(a)*rad,Math.cos(a)*rad]);}}return out;}
function gridFins(parent,r,y,star=false){const result=[];for(let k=0;k<4;k++){
  const pivot=new THREE.Group();const a=k*Math.PI/2+Math.PI/4;pivot.position.set(Math.sin(a)*r,y,Math.cos(a)*r);pivot.rotation.y=a;parent.add(pivot);
  const fin=new THREE.Group();pivot.add(fin);const w=star?3.5:2.1,d=star?2.8:1.7;
  box(pivot,star?1.25:.80,.70,.72,dark,0,0,-.15);
  rod(pivot,new THREE.Vector3(-w*.32,0,.10),new THREE.Vector3(w*.32,0,.10),star?.19:.13,steel);
  box(fin,star?1.20:.75,.18,.36,dark,0,0,.08);
  box(fin,w,.17,.13,dark,0,0,d);box(fin,w,.17,.13,dark,0,0,.15);box(fin,.13,.17,d,dark,-w/2,0,d/2);box(fin,.13,.17,d,dark,w/2,0,d/2);
  for(let i=1;i<7;i++){box(fin,.075,.14,d,dark,-w/2+i*w/7,0,d/2);box(fin,w,.14,.065,dark,0,0,i*d/7);}
  mergeChildren(fin);result.push(fin);
}return result;}
function landingLegs(parent,r){const result=[];for(let k=0;k<4;k++){
  const a=k*Math.PI/2+Math.PI/4,pivot=new THREE.Group();pivot.position.set(Math.sin(a)*r,1.95,Math.cos(a)*r);pivot.rotation.y=a;parent.add(pivot);
  const leg=new THREE.Group();pivot.add(leg);leg.name=`Falcon landing leg ${k+1}`;
  // Broad carbon-composite root fairing tapers to the outboard foot; deployed span ~18 m.
  const outline=new THREE.Shape();outline.moveTo(-.83,0);outline.lineTo(.83,0);outline.lineTo(.76,2.0);outline.lineTo(.40,5.9);outline.quadraticCurveTo(.26,7.55,0,7.8);outline.quadraticCurveTo(-.26,7.55,-.40,5.9);outline.lineTo(-.76,2);outline.closePath();
  add(leg,new THREE.ExtrudeGeometry(outline,{depth:.24,bevelEnabled:true,bevelSize:.055,bevelThickness:.04,bevelSegments:2,steps:1}),black,0,0,-.12);
  for(const sign of[-1,1])rod(leg,new THREE.Vector3(sign*.70,.2,-.14),new THREE.Vector3(sign*.09,7.45,-.14),.075,dark);
  for(let j=0;j<5;j++)rod(leg,new THREE.Vector3(-.55+j*.065,1+j*1.1,-.15),new THREE.Vector3(.55-j*.065,1+j*1.1,-.15),.045,steel);
  const hinge=cyl(pivot,.22,.22,1.95,steel,0,0,0,20);hinge.rotation.z=Math.PI/2;
  const foot=new THREE.Group();foot.position.set(0,7.72,.06);leg.add(foot);box(foot,1.15,.18,.72,dark,0,0,0);box(foot,.72,.12,.52,steel,0,.15,0);
  const anchor=new THREE.Vector3(0,5.55,.24);const anchorBlock=box(pivot,.58,.55,.6,dark,anchor.x,anchor.y,anchor.z);
  const actuator=new THREE.Group();pivot.add(actuator);const tubes=[];
  for(let j=0;j<4;j++){const m=cyl(actuator,.17-j*.027,.17-j*.027,1,j%2?steel:dark,.5,0,0,20);m.castShadow=true;tubes.push(m);}
  leg.userData={pivot,foot,actuator,tubes,anchor,tip:new THREE.Vector3(0,7.55,.19),length:7.72,deployedAngle:1.899};
  result.push(leg);
}return result;}

export function setLandingLegs(part,deploy){
  const amount=smooth(deploy);
  for(const leg of part.legs){const d=leg.userData;leg.rotation.x=d.deployedAngle*amount;d.foot.rotation.x=-leg.rotation.x;
    const end=d.tip.clone().applyAxisAngle(new THREE.Vector3(1,0,0),leg.rotation.x);const axis=end.sub(d.anchor),length=axis.length();
    d.actuator.position.copy(d.anchor);d.actuator.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());
    const segment=length/4+.16;d.tubes.forEach((m,j)=>{m.position.y=j*length/4+segment*.5;m.scale.y=segment;});
  }
}
function falconBooster(side=false){const g=new THREE.Group();const bodyMat=white.clone();bodyMat.map=labelTexture();
  cyl(g,1.83,1.83,40.4,bodyMat,21.5);cyl(g,1.86,1.86,.5,dark,1.9);cyl(g,1.84,1.84,.42,steel,41.76);
  cyl(g,1.80,1.80,.36,dark,1.16);
  if(side){const pts=[new THREE.Vector2(0,47.3),new THREE.Vector2(.5,46.8),new THREE.Vector2(1.25,45.5),new THREE.Vector2(1.83,41.65)];add(g,new THREE.LatheGeometry(pts.reverse(),48),white);}else cyl(g,1.83,1.83,5.5,black,44.6);
  // Cable raceway and longitudinal service pipes.
  box(g,.18,34,.15,black,-.8,23,1.67);box(g,.11,28,.12,steel,1.78,22,.46);
  const decal=document.createElement('canvas');decal.width=256;decal.height=2048;const ink=decal.getContext('2d');
  drawUSFlag(ink,63,32,130);drawVerticalSpaceX(ink,72,890,110);
  const logo=new THREE.CanvasTexture(decal);logo.colorSpace=THREE.SRGBColorSpace;logo.anisotropy=8;
  const decalMat=new THREE.MeshStandardMaterial({map:logo,transparent:true,roughness:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  // Cylinder patches follow the hull; 2.2 × 17.6 m matches the 1:8 texture aspect.
  for(const angle of[0,Math.PI])add(g,new THREE.CylinderGeometry(1.837,1.837,17.6,24,1,true,angle-.6,1.2),decalMat,0,29.7);
  for(let i=0;i<3;i++)cyl(g,1.85,1.85,.1,white,10+i*10);
  const engines=flames(g,engineLayout(9,1.12),.42), fins=gridFins(g,1.8,40.9),legs=landingLegs(g,1.8);
  mergeChildren(g);const part={group:g,engines,fins,legs,height:47.3};setLandingLegs(part,0);return part;
}
function falconUpper(){const g=new THREE.Group();cyl(g,1.83,1.83,9.7,white,6.85);cyl(g,1.84,1.84,.22,steel,11.6);cyl(g,1.79,1.79,.32,dark,2.05);
  const fair=new THREE.Group();fair.position.y=11.6;g.add(fair);
  const points=[new THREE.Vector2(1.83,0),new THREE.Vector2(2.6,1.5),new THREE.Vector2(2.6,7.3),new THREE.Vector2(2.47,8.5),new THREE.Vector2(2.0,10),new THREE.Vector2(1.3,11.6),new THREE.Vector2(.5,12.7),new THREE.Vector2(0,13.1)];
  const fairingMaterial=white.clone();fairingMaterial.side=THREE.DoubleSide;
  const fairings=[];for(let i=0;i<2;i++){const half=add(fair,new THREE.LatheGeometry(points,32,i*Math.PI,Math.PI),fairingMaterial);fairings.push(half);}
  cyl(g,1.15,1.4,1.3,steel,12.2);
  cyl(g,1.15,1.15,4.5,gold,15);box(g,2.4,3,.15,dark,0,15,1.2);
  const engines=flames(g,[[0,0]],1.25,false,2.05);return {group:g,engines,fins:[],legs:[],fairings,height:24.7};}
function starBooster(){const g=new THREE.Group();const mat=steel.clone();mat.map=labelTexture(true,false);
  // Super Heavy is bare steel all around; the ship alone has a tiled windward side.
  cyl(g,4.5,4.5,67,mat,35.5);cyl(g,4.51,4.51,1.6,dark,2.2);cyl(g,4.5,4.5,3.0,dark,70.3);
  cyl(g,4.46,4.46,.36,dark,1.25);
  for(let i=0;i<36;i++){const a=i*Math.PI/18;box(g,.23,2.8,.22,steel,Math.sin(a)*4.52,70.3,Math.cos(a)*4.52);}
  cyl(g,4.55,4.55,.2,steel,71.9);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(g,.35,53,.22,steel,Math.sin(a)*4.5,33.5,Math.cos(a)*4.5);}
  for(let i=0;i<4;i++){const chine=new THREE.Group();chine.rotation.y=i*Math.PI/2+Math.PI/4;g.add(chine);const shape=new THREE.Shape();shape.moveTo(4.46,2.8);shape.lineTo(5.65,5.0);shape.lineTo(5.65,20.5);shape.lineTo(4.65,24.2);shape.lineTo(4.46,24.2);shape.closePath();add(chine,new THREE.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:1,steps:1}),steel,0,0,-.10);}
  for(const sign of[-1,1])rod(g,new THREE.Vector3(0,61,sign*4.4),new THREE.Vector3(0,61,sign*6.5),.27,steel);
  const engines=flames(g,engineLayout(33,0),.65,true,1.25),fins=gridFins(g,4.5,64,true);
  mergeChildren(g);return {group:g,engines,fins,legs:[],height:VEHICLE_GEOMETRY.starBoosterHeight,catchHeight:61};}
function starUpper(){const g=new THREE.Group(),mat=starshipSurface(),flapMat=starshipSurface(true);
  const profile=[[4.5,0],[4.5,34.5],[4.49,36],[4.43,38],[4.24,40],[3.99,42],[3.61,44],[3.11,46],[2.45,48],[1.57,50],[.86,51.1],[.24,51.85],[0,52]].map(([r,y])=>new THREE.Vector2(r,y));
  add(g,new THREE.LatheGeometry(profile,128),mat);
  cyl(g,4.40,4.40,.36,dark,2.15);
  const fins=[];
  for(const front of[false,true])for(const sign of[-1,1]){
    const width=front?2.85:3.55,length=front?6.8:12.4,mount=new THREE.Group(),pivot=new THREE.Group();
    mount.position.set(sign*(front?3.98:4.43),front?40.1:1.15,front?-1.12:0);g.add(mount);mount.add(pivot);
    pivot.userData={front,sign,baseYaw:front?sign*.27:0,baseLean:front?sign*.18:0,mount,length};mount.rotation.set(0,pivot.userData.baseYaw,pivot.userData.baseLean);pivot.name=front?'Forward flap · leeward offset':'Aft flap · skirt root';
    const pts=new THREE.Shape();pts.moveTo(0,0);pts.lineTo(sign*width,front?.45:.4);pts.lineTo(sign*width,front?2.25:6.6);pts.lineTo(sign*.40,length-.4);pts.lineTo(0,length);pts.closePath();
    add(pivot,new THREE.ExtrudeGeometry(pts,{depth:.22,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.055,bevelThickness:.04}),flapMat,0,0,-.11);
    // Exposed reverse-side stiffeners and protected longitudinal hinge.
    for(let j=1;j<(front?5:8);j++){const y=j*length/(front?5:8);const outer=y<(front?2.25:6.6)?width:mix(width,.4,(y-(front?2.25:6.6))/(length-(front?2.25:6.6)));
      rod(pivot,new THREE.Vector3(sign*.18,y,-.18),new THREE.Vector3(sign*(outer-.13),y,-.18),.045,steel);
    }
    cyl(mount,.22,.22,length,dark,length*.5,0,0,20);
    for(const y of[.7,length*.45,length-.7]){box(mount,.52,.34,.52,steel,0,y,-.05);cyl(mount,.27,.27,.4,dark,y,0,0,20);
      const axisPoint=new THREE.Vector3(0,y,0).applyQuaternion(mount.quaternion).add(mount.position);
      const upperPoint=profile.findIndex(p=>p.y>=axisPoint.y),i=Math.max(1,upperPoint),a=profile[i-1],b=profile[i];
      const hullR=mix(a.x,b.x,(axisPoint.y-a.y)/(b.y-a.y));
      const hullPoint=new THREE.Vector3(axisPoint.x,0,axisPoint.z).normalize().multiplyScalar(hullR-.20);hullPoint.y=axisPoint.y;
      rod(g,hullPoint,axisPoint,.17,steel);
    }
    fins.push(pivot);
  }
  const positions=[];for(let i=0;i<3;i++){let a=i*Math.PI*2/3;positions.push([Math.sin(a)*1.2,Math.cos(a)*1.2]);}for(let i=0;i<3;i++){let a=(i+.5)*Math.PI*2/3;positions.push([Math.sin(a)*3,Math.cos(a)*3]);}
  const engines=flames(g,positions,[.65,.65,.65,1.15,1.15,1.15],true,2.15);return{group:g,engines,fins,legs:[],height:VEHICLE_GEOMETRY.starShipHeight};}
export function createVehicle(type){
  const booster=type==='starship'?starBooster():falconBooster();const upper=type==='starship'?starUpper():falconUpper();
  const sides=type==='heavy'?[falconBooster(true),falconBooster(true)]:[];
  if(type==='heavy'){const mounts=new THREE.Group();booster.group.add(mounts);for(const sign of[-1,1])for(const y of[4,41,45.3]){
    // The upper fitting reaches the tapered side-core nose, not the tank radius.
    const sideRadius=y>41.65?mix(1.83,1.25,(y-41.65)/(45.5-41.65)):1.83;
    rod(mounts,new THREE.Vector3(sign*1.72,y,0),new THREE.Vector3(sign*(VEHICLE_GEOMETRY.heavyCoreOffset-sideRadius+.10),y,0),.16,steel);
  }booster.mounts=mounts;}
  return{booster,upper,sides,type,height:type==='starship'?booster.height+upper.height:70,join:type==='starship'?booster.height:45.3,coreOffset:VEHICLE_GEOMETRY.heavyCoreOffset};
}
export function setEngineFire(part,count,time,strength=1,vacuum=0){const plume=part.engines.plume;if(plume)updatePlume(plume,count,part.engines.length,time,strength,vacuum);part.engines.forEach((e,i)=>{const on=part.engines.length===9&&count===3?[0,1,5].includes(i):i<count;e.flame.visible=on;if(on){const flutter=.97+.025*Math.sin(time*43+e.phase);e.flame.scale.set(1+vacuum*.65,plume?.22:strength*flutter*(1+vacuum*.9),1+vacuum*.65);e.outer.uniforms.time.value=time;}});}
export function articulate(part,deploy,legDeploy,time,star=false){part.fins.forEach((f,i)=>{if(star){f.rotation.z=.1*Math.sin(time*.8+i)*deploy;f.rotation.x=.06*Math.sin(time+i);}else{f.rotation.x=mix(-Math.PI/2,0,smooth(deploy))+.025*Math.sin(time+i);}});setLandingLegs(part,legDeploy);}

export function setShipFlaps(part,amount,time=0){part.fins.forEach((f,i)=>{const d=f.userData;f.rotation.set(0,d.sign*(amount+Math.sin(time*.8+i)*.025*amount),0);});}
export function disposeVehicle(v){for(const part of [v.booster,v.upper,...v.sides]){part.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(![white,dark,steel,nozzleMat,black,gold].includes(m)){for(const t of new Set([m.map,m.roughnessMap,m.metalnessMap,m.bumpMap]))t?.dispose();m.dispose();}}}});part.group.removeFromParent();}}
export function createTower(height=80,star=false){const g=new THREE.Group(),w=star?15:3.2;const mat=new THREE.MeshStandardMaterial({color:0x596064,metalness:.6,roughness:.6});
  if(!star){
    for(const x of[-1.6,1.6])for(const z of[-1.1,1.1])box(g,.42,height,.42,mat,x,height/2,z);
    for(let y=1;y<height;y+=3.5){box(g,3.5,.24,2.5,mat,0,y,0);for(const z of[-1.1,1.1])rod(g,new THREE.Vector3(-1.6,y,z),new THREE.Vector3(1.6,Math.min(height,y+3.5),z),.16,mat);}
    for(const x of[-.75,0,.75])cyl(g,.18,.18,height-2,steel,height/2,x,-1.3,12);
    for(const y of[10,27,42,53]){box(g,5,.55,1.4,mat,2.7,y,0);cyl(g,.5,.5,1.2,dark,y,5.1,0);}
    box(g,3.6,2.4,3.2,dark,0,1.2,0);const arm=new THREE.Group();g.add(arm);mergeChildren(g);return{group:g,arm,arms:[]};
  }
  for(const x of[-w/2,w/2])for(const z of[-w/2,w/2])box(g,.65,height,.65,mat,x,height/2,z);
  for(let y=2;y<height-7;y+=7){box(g,w,.22,w,mat,0,y,0);for(const z of[-w/2,w/2]){rod(g,new THREE.Vector3(-w/2,y,z),new THREE.Vector3(w/2,y+7,z),.24,mat);rod(g,new THREE.Vector3(w/2,y,z),new THREE.Vector3(-w/2,y+7,z),.24,mat);}for(const x of[-w/2,w/2])rod(g,new THREE.Vector3(x,y,-w/2),new THREE.Vector3(x,y+7,w/2),.22,mat);}
  box(g,w+1,2,w+1,dark,0,height-2,0);box(g,1,height*.8,2,white,0,height*.4,w/2+1);
  const arm=new THREE.Group();arm.position.set(w/2,height*.68,0);g.add(arm);box(arm,12,1.4,2.3,mat,6,0,0);rod(arm,new THREE.Vector3(0,6,0),new THREE.Vector3(11,0,0),.22,mat);
  const arms=[];if(star){for(const z of[-7,7]){const a=new THREE.Group();a.position.set(0,60,z);g.add(a);box(a,27,2,1.5,mat,13.5,0,0);rod(a,new THREE.Vector3(0,6,0),new THREE.Vector3(25,0,0),.36,mat);for(let i=1;i<6;i++)rod(a,new THREE.Vector3(i*4,0,0),new THREE.Vector3(i*4,6-i*.9,0),.2,mat);mergeChildren(a);arms.push(a);}}
  mergeChildren(g);mergeChildren(arm);return {group:g,arm,arms};
}
export function landingPad(size=28){const g=new THREE.Group();const base=new THREE.MeshStandardMaterial({color:0x4b555a,roughness:.96});cyl(g,size,size,.3,base,0,0,0,96);
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#4d585f';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#dfdfcc';ctx.lineWidth=9;ctx.beginPath();ctx.arc(256,256,223,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(256,256,193,0,Math.PI*2);ctx.stroke();drawSpaceXX(ctx,126,197,260);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const top=add(g,new THREE.CircleGeometry(size*.97,96),new THREE.MeshStandardMaterial({map:tex,roughness:.95}),0,.17,0);top.rotation.x=-Math.PI/2;return g;}
export function droneShip(){const g=new THREE.Group();box(g,47,3.3,78,dark,0,-1.7,0);
  const c=document.createElement('canvas');c.width=512;c.height=864;const ctx=c.getContext('2d');ctx.fillStyle='#31393b';ctx.fillRect(0,0,512,864);
  for(let i=0;i<21000;i++){ctx.fillStyle=i%3?'#414845':'#20272a';ctx.globalAlpha=.14;ctx.fillRect((i*127)%512,(i*241)%864,1+i%3,1+i%7);}ctx.globalAlpha=1;ctx.strokeStyle='#b4a261';ctx.lineWidth=4;ctx.strokeRect(12,12,488,840);
  ctx.strokeStyle='#a6aaa0';ctx.lineWidth=6;ctx.beginPath();ctx.arc(256,432,209,0,Math.PI*2);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.arc(256,432,185,0,Math.PI*2);ctx.stroke();drawSpaceXX(ctx,139,381,235,'#c8ccbf');
  ctx.strokeStyle='#77796b';ctx.lineWidth=1;for(let y=30;y<860;y+=48){ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(494,y);ctx.stroke();}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;const deck=new THREE.MeshStandardMaterial({map:texture,roughness:.86});const plane=add(g,new THREE.PlaneGeometry(45,76),deck,0,.17,0);plane.rotation.x=-Math.PI/2;
  for(const x of[-19,19])for(const z of[-32,32]){box(g,5,2.7,8,white,x,1.35,z);box(g,5,.18,8,dark,x,2.8,z);for(let j=0;j<5;j++)box(g,.05,2.4,8.02,steel,x-2+j,1.4,z);}for(const x of[-23,23])box(g,.28,.4,76,gold,x,.2,0);
  box(g,7,3.4,6,white,11,1.7,-32);rod(g,new THREE.Vector3(13,3,-32),new THREE.Vector3(13,13,-32),.1,steel);mergeChildren(g);return g;}
