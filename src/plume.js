import * as T from 'three';

const shader=`uniform float time;uniform float vacuum;uniform float methane;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){return noise(p)*.55+noise(p*2.03+13.)*.28+noise(p*4.1)*.17;}
void main(){float t=1.-vUv.y,x=(vUv.x-.5)*2.;float flow=fbm(vec2(x*4.2,t*14.-time*7.));float width=mix(.21,.58,t)*(1.-pow(t,5.))*(1.+vacuum*.6);width+=sin(t*42.-time*4.)*.026*(1.-t);float lateral=abs(x+sin(t*24.-time*13.)*.035*t);
float edge=1.-smoothstep(width*.40,width*(.83+flow*.48),lateral);float tail=pow(max(0.,1.-t),.56);float core=1.-smoothstep(.01,width*.58,lateral);float diamonds=pow(max(0.,sin(t*67.+.3)),10.)*exp(-t*5.);
vec3 orange=mix(vec3(1.,.055,.002),vec3(1.,.28,.045),flow);vec3 blue=mix(vec3(.20,.35,1.),vec3(.72,.88,1.),flow);vec3 outer=mix(orange,blue,methane*.50+vacuum*.3);vec3 col=mix(outer,vec3(1.,.84,.45),core*(1.-smoothstep(.12,.8,t)*.83));col=mix(col,vec3(.4,.62,1.),methane*(1.-smoothstep(.02,.16,t))*.8);col+=diamonds*vec3(.7,.75,1.);
float density=edge*tail*(.62+flow*.38)*smoothstep(0.,.012,t)*smoothstep(.14,.74,flow+(1.-t)*.45);gl_FragColor=vec4(col*(1.2+core*1.4),density*.79);}`;

export function createPlume(parent,star){
  const group=new T.Group();group.visible=false;parent.add(group);const material=new T.ShaderMaterial({uniforms:{time:{value:0},vacuum:{value:0},methane:{value:star?1:0}},transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:shader});
  for(let i=0;i<3;i++){const m=new T.Mesh(new T.PlaneGeometry(2,1,1,1),material);m.position.y=-.5;m.rotation.y=i*Math.PI/3;group.add(m);}
  return {group,material,star};
}
export function updatePlume(plume,count,total,time,strength,vacuum){
  plume.group.visible=count>0;if(!count)return;const {group,material,star}=plume;
  const fraction=count/total,radius=star?9:3.8,coreScale=count===total?1:Math.sqrt(fraction)*1.2;
  group.scale.set(radius*coreScale*(1+vacuum*1.7),(star?26:24)*strength*(.98+Math.sin(time*22)*.015),radius*coreScale*(1+vacuum*1.7));
  material.uniforms.time.value=time;material.uniforms.vacuum.value=vacuum;
}
