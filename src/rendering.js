import * as THREE from 'three';

export function createStableRenderer(options={}){
  const canvas=document.createElement('canvas');
  const settings={antialias:true,powerPreference:'high-performance',...options};
  const context=canvas.getContext('webgl2',settings);
  if(!context)throw new Error('WebGL 2 is unavailable');
  const reverse=Boolean(context.getExtension('EXT_clip_control'));
  return new THREE.WebGLRenderer({...settings,canvas,context,reversedDepthBuffer:reverse,logarithmicDepthBuffer:!reverse});
}

// Built-in materials already support logarithmic depth. Keep procedural shaders
// on the same depth convention on devices without EXT_clip_control.
export function prepareSceneDepth(root,renderer){
  root.traverse(object=>{
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(material?.polygonOffset&&!material.userData.stableDepthOffset){
        material.userData.stableDepthOffset=true;
        if(renderer.capabilities.reversedDepthBuffer){material.polygonOffsetFactor*=-1;material.polygonOffsetUnits*=-1;}
      }
      if(!renderer.capabilities.logarithmicDepthBuffer)continue;
      if(!material?.isShaderMaterial||material.userData.stableDepth)continue;
      material.userData.stableDepth=true;
      if(material.vertexShader.includes('logdepthbuf_vertex'))continue;
      const main=/void\s+main\s*\(\s*(?:void)?\s*\)/;
      const common=material.vertexShader.includes('#include <common>')?'':'#include <common>\n';
      material.vertexShader=common+'#include <logdepthbuf_pars_vertex>\n'+material.vertexShader.replace(main,'void stableDepthMain()')+'\nvoid main(){stableDepthMain();\n#include <logdepthbuf_vertex>\n}';
      material.fragmentShader='#include <logdepthbuf_pars_fragment>\n'+material.fragmentShader.replace(main,'void stableDepthMain()')+'\nvoid main(){stableDepthMain();\n#include <logdepthbuf_fragment>\n}';
      material.needsUpdate=true;
    }
  });
}
