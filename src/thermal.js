import * as THREE from 'three';

// Surface coordinates are in metres. Tiles retain their size on the ogive and flaps.
// Windward side is +Z; the exposed steel side is -Z throughout the vehicle model.
const tileFunctions=`
float thermalHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 hexTile(vec2 p){
  const float r=.165;
  vec2 axial=vec2(.577350269*p.x-p.y/3.,2.*p.y/3.)/r;
  vec3 cube=vec3(axial.x,-axial.x-axial.y,axial.y),cell=floor(cube+.5);
  vec3 err=abs(cell-cube);
  if(err.x>err.y&&err.x>err.z)cell.x=-cell.y-cell.z;else if(err.y>err.z)cell.y=-cell.x-cell.z;else cell.z=-cell.x-cell.y;
  vec2 center=r*vec2(1.732050808*(cell.x+cell.z*.5),1.5*cell.z);
  vec2 d=p-center;float edge=.866025404*r-max(abs(d.x),max(abs(.5*d.x+.866025404*d.y),abs(.5*d.x-.866025404*d.y)));
  float aa=max(fwidth(edge),.0006);float face=smoothstep(.004-aa,.009+aa,edge);
  return vec3(face,thermalHash(cell.xz),smoothstep(.001-aa,.013+aa,edge));
}
`;

export function starshipSurface(flap=false){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,metalness:.82,roughness:.32,envMapIntensity:1.65});
  material.name=flap?'Thermal tiles · windward flap / steel reverse':'Thermal tiles · windward hull / steel leeward';
  material.customProgramCacheKey=()=>flap?'thermal-flap-v4':'thermal-hull-v4';
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 thermalP;varying vec3 thermalN;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nthermalP=position;thermalN=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 thermalP;varying vec3 thermalN;\n'+tileFunctions);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float angle=atan(thermalP.x,thermalP.z),radius=length(thermalP.xz);
      float halfCoverage=mix(1.61,3.1416,smoothstep(43.5,51.4,thermalP.y));
      float tileMask=${flap?'smoothstep(.2,.8,thermalN.z)':'1.-smoothstep(halfCoverage-.008,halfCoverage+.008,abs(angle))'};
      vec2 tileUV=${flap?'thermalP.xy':'vec2(angle*radius,thermalP.y)'};
      vec3 tile=hexTile(tileUV);
      float footprint=max(length(dFdx(tileUV)),length(dFdy(tileUV)));
      float tileDetail=1.-smoothstep(.10,.35,footprint);
      vec3 tileColor=mix(vec3(.005,.007,.008),vec3(.021,.025,.028)*(.78+mix(.5,tile.y,tileDetail)*.44),mix(.90,tile.x,tileDetail));
      float aa=max(fwidth(thermalP.y),.002),seamDistance=abs(mod(thermalP.y+.925,1.85)-.925);
      float seam=(1.-smoothstep(.015-aa,.042+aa,seamDistance))*(1.-smoothstep(.10,.45,aa));
      float brushed=sin(thermalP.y*430.)*.018*(1.-smoothstep(.2,.8,aa*68.44))+sin(thermalP.y*87.)*.012*(1.-smoothstep(.2,.8,aa*13.85));
      vec3 steelColor=vec3(.53,.59,.61)*(1.-seam*.18+brushed);
      diffuseColor.rgb=mix(steelColor,tileColor,tileMask);
      float tileHeight=tile.z*tileMask*.003*tileDetail;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.32,.94,tileMask);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(.83,.015,tileMask);');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
      vec3 rx=cross(sy,normal),ry=cross(normal,sx);float det=dot(sx,rx);
      vec3 grad=sign(det)*(dFdx(tileHeight)*rx+dFdy(tileHeight)*ry);
      vec3 bumped=abs(det)*normal-grad;if(dot(bumped,bumped)>1e-18)normal=normalize(bumped);
    `);
  };
  return material;
}
