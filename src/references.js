import { REFERENCE_DATE } from './branding.js';

export { REFERENCE_DATE };
export const REFERENCES = {
  falcon9: {
    title:'Falcon 9', chinese:'猎鹰 9 号',
    url:'https://www.spacex.com/vehicles/falcon-9',
    image:'./reference/falcon9-first-stage.jpg',
    imageUrl:'https://www.spacex.com/assets/images/vehicles/falcon-9/WebsiteF9S1_Render_Desktop.jpg',
    caption:'SpaceX 官网一级助推器渲染图 · 竖排字标、黑色级间段、栅格舵与收拢的着陆腿',
    landingImage:'./reference/falcon9-landing.jpg',
    landingUrl:'https://www.spacex.com/assets/images/vehicles/falcon-9/F9_9.jpg',
    facts:[['总高度','70 m'],['箭体直径','3.7 m'],['海平面推力','7,607 kN'],['一级发动机','9 × Merlin'],['整流罩','13.1 m × Ø 5.2 m'],['回收结构','4 片栅格舵 · 4 条腿']],
    detail:'二级使用 1 台 Merlin Vacuum，官网列出推力 981 kN。着陆腿同时对照收拢渲染图和展开实拍，重做底部铰链、碳纤维主腿、高位固定点与伸缩支撑杆；小型任务徽章随任务变化，未逐一复刻。',
    recovery:'一级可返回陆地着陆场，或降落在海上的无人回收船。具体点火时序随任务变化。'
  },
  heavy:{
    title:'Falcon Heavy', chinese:'猎鹰重型',
    url:'https://www.spacex.com/vehicles/falcon-heavy',
    image:'./reference/heavy-gallery-6.jpg',
    imageUrl:'https://www.spacex.com/assets/images/vehicles/falcon-heavy/FH_6.jpg',
    caption:'SpaceX 官网发射实拍 · 三枚芯级共同起飞',
    facts:[['总高度','70 m'],['整体宽度','12.2 m'],['海平面推力','22,819 kN'],['一级发动机','27 × Merlin'],['芯级数量','3 枚'],['栅格舵','每芯 4 片 · 共 12 片']],
    detail:'官网说明：升空后中心芯级发动机节流；两枚侧芯分离后，中心芯级恢复全推力。模型按官网整体宽度收紧三芯间距，补上连接结构，并表现节流变化。',
    recovery:'此演示跟随两枚侧助推器返回。陆地模式演示并肩着陆；双船模式是教学设定，不对应一次真实任务，中心芯级回收未纳入本演示。'
  },
  starship:{
    title:'Starship', chinese:'星舰',
    url:'https://www.spacex.com/vehicles/starship',
    image:'./reference/starship-official.jpg',
    imageUrl:'https://www.spacex.com/assets/images/vehicles/starship/starship_hero_d.jpg',
    caption:'SpaceX 官网实拍参考 · 不锈钢表面、六边形隔热瓦与襟翼；照片批次与现行规格可能不同',
    facts:[['组合体总高度','124 m'],['箭体直径','9 m'],['超级重型高度','72 m'],['飞船高度','52 m'],['助推器推力','8,240 tf'],['发动机数量','助推器 33 · 飞船 6']],
    detail:'沿用官网 124 米参考构型，与官网更新页的 V3 构型分开记录。助推器有 13 台内圈可摆动发动机、20 台外圈发动机。飞船为 3 台海平面 Raptor（直径 1.3 m）和 3 台 Raptor Vacuum（直径 2.3 m）。四片襟翼、瓦面与裸钢分区按公开照片重建，襟翼具体偏置和瓦片尺寸为外观近似。tf 表示公吨力，8,240 tf 约为 80,803 kN。',
    recovery:'陆地模式演示超级重型助推器的塔架捕获；海面模式演示受控溅落。飞船返回段演示再入、腹部下落、翻转与溅落，属于科普场景。'
  }
};

export function referenceContent(type){
  const r=REFERENCES[type];
  return `<figure class="reference-photo"><img src="${r.image}" alt="${r.caption}" width="1200" height="620"/><figcaption>© SpaceX · ${r.caption}</figcaption></figure>
    <div class="reference-heading"><h3>${r.title}</h3><span>官网规格 · ${REFERENCE_DATE} 核对</span></div>
    <dl class="reference-facts">${r.facts.map(([key,value])=>`<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>
    <p>${r.detail}</p>${r.landingImage?`<figure class="reference-photo reference-landing"><img src="${r.landingImage}" alt="SpaceX 官方照片：猎鹰 9 号展开主腿与斜向伸缩支撑杆" width="1300" height="600"/><figcaption>© SpaceX · 展开机构参考，<a href="${r.landingUrl}" target="_blank" rel="noopener noreferrer">查看官方着陆原图 ↗</a></figcaption></figure>`:''}<p>${r.recovery}</p>
    <div class="source-links"><a href="${r.url}" target="_blank" rel="noopener noreferrer">查看 SpaceX 官方页面 ↗</a><a href="${r.imageUrl}" target="_blank" rel="noopener noreferrer">查看官方原图 ↗</a></div>`;
}
