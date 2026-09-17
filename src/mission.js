export const VEHICLES = {
  falcon9: { name: 'FALCON 9', chinese: '猎鹰 9 号', subtitle: '让回收成为日常', height: '70 m', diameter: '3.7 m', thrust: '7,607 kN', engines: 9, engine: 'MERLIN 1D', scale: 70, site: 'KENNEDY SPACE CENTER', pad: 'LC–39A', description: '一枚火箭，两段旅程。看一级助推器把飞船送向太空，再稳稳地回到家。' },
  heavy: { name: 'FALCON HEAVY', chinese: '猎鹰重型', subtitle: '三芯并肩，双箭归来', height: '70 m', diameter: '12.2 m', thrust: '22,819 kN', engines: 27, engine: 'MERLIN 1D', scale: 70, site: 'KENNEDY SPACE CENTER', pad: 'LC–39A', description: '27 台发动机一起点火。跟随两枚侧助推器分离、转身，最后并肩着陆。' },
  starship: { name: 'STARSHIP', chinese: '星舰', subtitle: '下一站，星辰大海', height: '124 m', diameter: '9 m', thrust: '8,240 tf', engines: 33, engine: 'RAPTOR', scale: 124, site: 'STARBASE · TEXAS', pad: 'ORBITAL PAD', description: '不锈钢巨箭飞向天空。看热分级、助推器回收，再跟随飞船翻转与溅落。' },
};

// Each duration is cinematic seconds; mission times are representative, not a flight solver.
const phase = (id, title, en, duration, t0, t1, a0, a1, v0, v1, text, child) => ({ id, title, en, duration, t0, t1, a0, a1, v0, v1, text, child });
export function makeStages(type) {
  const star = type === 'starship', heavy = type === 'heavy';
  const stages = [
    phase('countdown', '点火倒计时', 'COUNTDOWN', 10, -10, 0, 0, 0, 0, 0, '燃料加注完成。发射台撤离，等待发动机点火。', '小小指挥官，准备好了吗？一起倒数，送火箭去太空！'),
    phase('ascent', '点火升空', 'LIFTOFF', 24, 0, 60, 0, 10, 0, 1150, heavy?'27 台发动机点火升空，随后中心芯级降低推力，留存推进剂。':'发动机点火。火箭缓慢离开发射台，逐渐加速。', '出发啦！火箭向下喷出火焰，就能把自己推向天空。'),
    phase('maxq', '最大动压', 'MAX Q', 16, 60, star ? 160 : 148, 10, star ? 67 : 74, 1150, star ? 5600 : 6900, '穿越稠密大气，完成俯仰转弯。经过最大气动载荷区间后继续加速。', '风变得很大，火箭会稍微收一点力气，再继续向上冲！'),
  ];
  if (heavy) stages.push(phase('side', '侧芯分离', 'SIDE BOOSTER SEP', 12, 148, 170, 74, 87, 6900, 7500, '两枚侧助推器关机、向两侧分离。中心芯级恢复全推力，继续推动二级。', '两位小伙伴完成任务啦！它们先分开，准备一起回家。'));
  stages.push(
    phase('separation', star ? '热分级' : '一级分离', star ? 'HOT STAGING' : 'STAGE SEPARATION', 12, heavy ? 170 : star ? 160 : 148, heavy ? 190 : star ? 180 : 165, star ? 67 : heavy ? 87 : 74, star ? 85 : 95, star ? 5600 : heavy ? 7500 : 6900, star ? 5900 : 7100, star ? '飞船发动机提前点火，热分级环排出气流。超级重型助推器翻转返航。' : '一级发动机关机，气动推杆分离两级。二级继续前进，镜头跟随返回的助推器。', '火箭接力赛！上面的伙伴继续飞，下面的伙伴转身回家。'),
    phase('boostback', '返航点火', 'BOOSTBACK BURN', 16, star ? 180 : heavy ? 190 : 165, star ? 230 : 220, star ? 85 : 95, star ? 100 : 108, star ? 5900 : 7100, 3900, '助推器翻转并重新点火，调整水平速度与返回轨迹。', '火箭转过身，用发动机给自己“踩刹车”，瞄准回家的方向。'),
    phase('coast', '滑行下降', 'COAST & GUIDANCE', 14, star ? 230 : 220, star ? 310 : 345, star ? 100 : 108, 60, 3900, 4600, '发动机关闭。栅格舵展开，以微小动作修正下降姿态。', '现在不用一直喷火啦！小小的栅格舵像翅膀一样帮它找准方向。'),
    phase('entry', '大气再入', 'ATMOSPHERIC ENTRY', 16, star ? 310 : 345, star ? 370 : 455, 60, star ? 1.2 : 1.6, 4600, star ? 950 : 900, star ? '助推器以尾部迎风，利用大气阻力减速，栅格舵持续调整姿态。' : '三台发动机短暂再入点火，降低速度与气动加热；关机后继续依靠栅格舵引导下降。', '回到厚厚的大气里啦！空气像一床大被子，帮助火箭慢下来。'),
    phase('landing', '着陆点火', 'LANDING BURN', 30, star ? 370 : 455, star ? 405 : 485, star ? 1.2 : 1.6, 0, star ? 950 : 900, 0, star ? '中央发动机点火减速。陆地模式进入塔架捕获；海面模式垂直减速溅落。' : '中央发动机精确减速，四条着陆腿逐渐展开，进行最后的对准。', '打开最后的刹车，慢一点，再慢一点……准备到家！'),
    phase('touchdown', '助推器回收', 'BOOSTER RECOVERED', 9, star ? 405 : 485, star ? 415 : 500, 0, 0, 0, 0, star ? '助推器完成回收演示。接下来，镜头将切换到返回大气层的星舰飞船。' : '发动机关机，着陆完成。助推器可以检查、整备，准备下一次出发。', '欢迎回家！太棒啦，你成功指挥了火箭回收！'),
  );
  if (star) stages.push(
    phase('shipentry', '飞船再入', 'SHIP REENTRY', 18, 2650, 2800, 100, 20, 26500, 1900, '时间快进至飞船再入。隔热瓦迎向气流，前后襟翼调整姿态，出现再入辉光。', '另一位伙伴也要回家啦！黑色隔热瓦保护着它，像穿了一件防热外套。'),
    phase('belly', '腹部下落', 'BELLY FLOP', 16, 2800, 2870, 20, 1.2, 1900, 240, '星舰保持近水平姿态，利用宽大的腹部与四片襟翼减速。', '它像跳伞一样，把身体横过来，让空气托住自己。'),
    phase('flip', '翻转点火', 'FLIP & LANDING BURN', 12, 2870, 2890, 1.2, 0, 240, 0, '海面上方重新启动中央发动机，飞船快速翻转为竖直姿态并减速。', '看！它点火、翻身、站起来了，准备轻轻落在海面上。'),
    phase('splash', '海面溅落', 'SHIP SPLASHDOWN', 8, 2890, 2900, 0, 0, 0, 0, '飞船受控溅落。任务演示完成；此处不代表飞船已实现常规运营回收。', '轻轻落在大海里！小小指挥官，今天的太空任务圆满完成。'),
  );
  let start = 0;
  return stages.map(s => { const result = { ...s, start, end: start + s.duration }; start += s.duration; return result; });
}
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mix = (a,b,t) => a + (b-a)*t;
export const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
export function sample(stages, time) {
  const index = stages.findIndex(s => time < s.end - .00001);
  const i = index < 0 ? stages.length - 1 : index, s=stages[i];
  const p=clamp((time-s.start)/s.duration);
  const landing = ['landing','flip'].includes(s.id);
  const altitude = mix(s.a0, s.a1, landing ? 1-Math.pow(1-p,2.5) : smooth(p));
  const velocity = mix(s.v0,s.v1,landing ? 1-Math.pow(1-p,1.6) : smooth(p));
  return { ...s, index:i, progress:p, altitude, velocity, missionTime:mix(s.t0,s.t1,p), total:stages.at(-1).end };
}
export function clockText(seconds) {
  const sign=seconds<0?'−':'+'; const a=Math.abs(Math.round(seconds));
  return `T${sign}${String(Math.floor(a/3600)).padStart(2,'0')}:${String(Math.floor(a/60)%60).padStart(2,'0')}:${String(a%60).padStart(2,'0')}`;
}
export function engineCount(type, phase, progress) {
  const star=type==='starship';
  if (phase==='countdown') return progress>.72?(star?33:type==='heavy'?27:9):0;
  if (['ascent','maxq'].includes(phase)) return star?33:type==='heavy'?27:9;
  if (phase==='side') return 9;
  if (phase==='separation'&&star) return progress<.22?3:0;
  if (phase==='boostback') return progress>.28&&progress<.78?(star?13:type==='heavy'?6:3):0;
  if (phase==='entry') return star?0:progress<.22?(type==='heavy'?6:3):0;
  if (phase==='landing') return star?(progress<.25?13:3):type==='heavy'?2:1;
  if (phase==='flip') return 3;
  return 0;
}
