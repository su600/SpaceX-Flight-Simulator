import { clamp, mix, smooth, clockText } from './mission.js';

const silhouette=(ship=false)=>`<svg viewBox="0 0 34 104" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width=".8">${ship?'<path d="M13 92V30C13 15 17 4 17 4S21 15 21 30V92Z"/><path d="m13 22-5 6v7l5-2m8-11 5 6v7l-5-2M13 70 5 79v13l8-2m8-20 8 9v13l-8-2"/>':'<path d="M13 9h8v83h-8zM11 9h12v4H11zM10 20h14m-14 1h14M13 74l-5 18h5m8-18 5 18h-5"/>'}<path d="M13 94h8m-10-45h12m-10 3h10"/></g></svg>`;
const fuelMarkup=(prefix,fuel)=>`<div class="broadcast-fuel"><span>LOX</span><i role="meter" aria-label="液氧余量示意" aria-valuemin="0" aria-valuemax="100" id="${prefix}-lox-meter"><b id="${prefix}-lox"></b></i></div><div class="broadcast-fuel"><span id="${prefix}-fuel-label">${fuel}</span><i role="meter" aria-label="燃料余量示意" aria-valuemin="0" aria-valuemax="100" id="${prefix}-fuel-meter"><b id="${prefix}-fuel"></b></i></div>`;
export const broadcastMarkup=()=>`<section class="broadcast-hud" aria-label="双级直播遥测">
  <div class="broadcast-stage booster-stage"><div class="broadcast-engine-unit"><svg id="broadcast-engine-map" viewBox="0 0 130 100" aria-label="助推器发动机状态"></svg><span id="broadcast-engine-count"></span></div><div class="stage-readings"><span class="broadcast-stage-title" id="broadcast-booster-name">BOOSTER / 一级</span><div class="broadcast-metric"><span>SPEED</span><strong id="broadcast-velocity">0</strong><small>KM/H</small></div><div class="broadcast-metric"><span>ALTITUDE</span><strong id="broadcast-altitude">0</strong><small>KM</small></div>${fuelMarkup('booster','RP-1')}</div><div class="broadcast-silhouette" id="booster-outline">${silhouette()}</div></div>
  <div class="broadcast-center"><strong id="broadcast-clock">T−00:00:10</strong><span id="broadcast-phase">COUNTDOWN</span><small id="broadcast-pitch">PITCH 90°</small><small class="fuel-note">推进剂余量示意</small></div>
  <div class="broadcast-stage ship-stage"><div class="broadcast-silhouette" id="ship-outline">${silhouette(true)}</div><div class="stage-readings"><span class="broadcast-stage-title" id="broadcast-upper-name">SECOND STAGE / 二级</span><div class="broadcast-metric"><span>SPEED</span><strong id="broadcast-ship-velocity">0</strong><small>KM/H</small></div><div class="broadcast-metric"><span>ALTITUDE</span><strong id="broadcast-ship-altitude">0</strong><small>KM</small></div>${fuelMarkup('ship','RP-1')}</div><div class="broadcast-engine-unit"><svg id="broadcast-ship-engine-map" viewBox="0 0 130 100" aria-label="二级发动机状态"></svg><span id="broadcast-ship-engine-count"></span></div></div>
</section>`;

function engineDiagram(type,upper){
  let pts=[],r=7.3;
  const cluster=(cx,cy,size)=>[[cx,cy],...Array.from({length:8},(_,i)=>[cx+Math.sin(i*Math.PI/4)*size,cy+Math.cos(i*Math.PI/4)*size])];
  if(upper){if(type==='starship'){for(const[n,rad,off]of[[3,11,0],[3,30,.5]])for(let i=0;i<n;i++)pts.push([65+Math.sin((i+off)*Math.PI*2/n)*rad,50+Math.cos((i+off)*Math.PI*2/n)*rad]);}else pts=[[65,50]];}
  else if(type==='heavy'){pts=[...cluster(24,50,12),...cluster(65,50,12),...cluster(106,50,12)];r=3.5;}
  else if(type==='starship'){for(const[n,rad]of[[3,8],[10,21],[20,37]])for(let i=0;i<n;i++)pts.push([65+Math.sin(i*Math.PI*2/n)*rad,50+Math.cos(i*Math.PI*2/n)*rad]);r=3.7;}
  else pts=cluster(65,50,27);
  return pts.map(([x,y],i)=>`<circle class="${upper?'ship-engine':'broadcast-engine'}" cx="${x}" cy="${y}" r="${upper&&type==='starship'?(i<3?5.1:9):r}"/>`).join('');
}
function propellant(state,s,upper){
  const star=state.vehicle==='starship',id=s.id,p=s.progress;
  if(upper){const sep=state.stages.find(q=>q.id==='separation');if(state.time<sep.start)return 100;if(['shipentry','belly'].includes(id))return 3;if(id==='flip')return mix(3,.3,smooth(p));if(id==='splash')return .3;return mix(100,3,clamp((state.time-sep.start)/100));}
  if(id==='countdown')return 100;if(id==='ascent')return mix(100,76,smooth(p));if(id==='maxq')return mix(76,12,smooth(p));if(['side','separation'].includes(id))return 12;if(id==='boostback')return mix(12,5,smooth((p-.28)/.5));if(id==='coast')return 5;if(id==='entry')return star?5:mix(5,3.4,smooth(p/.22));if(id==='landing')return mix(star?5:3.4,.4,smooth(p));return .4;
}
let cachedType='';
export function renderBroadcast(state,s,telemetry){
  if(!telemetry)return;const $=id=>document.getElementById(id),star=state.vehicle==='starship';
  document.querySelector('.ship-stage').classList.toggle('standby',state.time<state.stages.find(q=>q.id==='separation').start);
  if(cachedType!==state.vehicle){cachedType=state.vehicle;
    $('ship-outline').innerHTML=star?silhouette(true):'<svg viewBox="0 0 34 104" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width=".8"><path d="M13 88V52l-4-6V27C9 11 17 4 17 4s8 7 8 23v19l-4 6v36ZM13 52h8m-8 13h8m-6 23-3 8h10l-3-8"/></g></svg>';
    $('booster-outline').innerHTML=star?'<svg viewBox="0 0 34 104" fill="none" aria-hidden="true"><g stroke="currentColor" stroke-width=".8"><path d="M12 9h10v84H12ZM12 17h10M8 23h18M12 73l-3 4v14h3m10-18 3 4v14h-3M12 96h10"/></g></svg>':silhouette();$('broadcast-engine-map').innerHTML=engineDiagram(state.vehicle,false);$('broadcast-ship-engine-map').innerHTML=engineDiagram(state.vehicle,true);$('broadcast-booster-name').textContent=star?'SUPER HEAVY / 助推器':state.vehicle==='heavy'?'BOOSTERS / 助推器':'FIRST STAGE / 一级';$('broadcast-upper-name').textContent=star?'STARSHIP / 飞船':'SECOND STAGE / 二级';for(const side of['booster','ship'])$(side+'-fuel-label').textContent=star?'CH4':'RP-1';}
  const alt=a=>a<100?a.toFixed(1):Math.round(a).toLocaleString('en-US');
  for(const [part,prefix]of[['booster','broadcast'],['upper','broadcast-ship']]){const t=telemetry[part];$(prefix+'-velocity').textContent=Math.round(t.velocity).toLocaleString('en-US');$(prefix+'-altitude').textContent=alt(t.altitude);$(prefix+'-engine-count').textContent=`${t.engines} / ${part==='upper'?(star?6:1):(star?33:state.vehicle==='heavy'?27:9)}`;
    [...$(prefix+'-engine-map').children].forEach((e,i)=>{let on=i<t.engines;
      if(part==='booster'&&state.vehicle==='falcon9'&&t.engines===3)on=[0,1,5].includes(i);
      if(part==='booster'&&state.vehicle==='heavy'){const cluster=Math.floor(i/9),index=i%9;if(['boostback','entry'].includes(s.id))on=t.engines>0&&cluster!==1&&[0,1,5].includes(index);else if(s.id==='landing')on=cluster!==1&&index===0;else if(s.id==='side')on=cluster===1;else on=t.engines>0;}
      e.classList.toggle('on',on);
    });
  }
  for(const [prefix,upper]of[['booster',false],['ship',true]]){const amount=propellant(state,s,upper);for(const fuel of['lox','fuel']){$(`${prefix}-${fuel}`).style.width=`${amount}%`;$(`${prefix}-${fuel}-meter`).setAttribute('aria-valuenow',amount.toFixed(1));}}
  $('broadcast-clock').textContent=clockText(s.missionTime);$('broadcast-phase').textContent=s.en;$('broadcast-pitch').textContent=`PITCH ${telemetry.booster.pitch.toFixed(1)}° / ${telemetry.upper.pitch.toFixed(1)}°`;
}

