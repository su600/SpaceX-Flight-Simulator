// Geometry transcribed directly from the SpaceX website header on 2026-09-10.
// Source: https://www.spacex.com/vehicles/starship — viewBox 0 0 147 19.
export const SPACEX_PATH = "M33.4556 7.10059C35.9425 7.10059 37.5024 8.14389 37.5024 9.99707V11.2383C37.5024 13.2081 36.1594 14.0693 33.6704 14.0693H24.7524V18.4062H21.3345V7.10059H33.4556ZM146.805 0.544922V0.561523C141.398 1.00137 120.15 3.63015 105.414 18.4062H99.9458L100.557 17.7988C103.641 14.8268 117.282 2.23051 146.803 0.542969L146.805 0.544922ZM56.2397 18.4043H52.1655L50.3599 15.9287H39.8169L41.6274 14H48.9526L45.4292 9.17285L47.5093 6.62012L56.2397 18.4043ZM72.1841 7.09863C74.0086 7.09865 75.3021 7.72865 75.6343 9.07031H62.8081V16.2803H75.6343C75.2694 17.7734 74.4885 18.4042 72.2827 18.4043H62.5786C60.9037 18.4043 59.3268 17.7248 59.3267 15.9209V9.58203C59.3267 7.778 60.9037 7.09868 62.5786 7.09863H72.1841ZM90.7222 12.834H83.8247V16.2803H95.6489V18.4043H80.3481V10.8975H90.7222V12.834ZM120.998 18.4043H115.584L110.775 14.9082H110.777C111.663 14.2168 112.602 13.5232 113.51 12.9014L120.998 18.4043ZM12.9351 7.09863C14.8252 7.09865 15.9037 8.0272 16.2358 9.07031H3.59424V11.5049H13.3979V11.5029C15.3722 11.6154 16.5677 12.4597 16.5679 14.0488V15.8535C16.5677 17.6083 15.5242 18.4014 13.4331 18.4014H3.43018C1.52352 18.4014 0.428522 17.6897 0.112793 16.2783H13.4849V13.6934H3.54541C1.70432 13.7036 0.459473 12.8582 0.459473 11.3691V9.58203C0.459473 7.87612 1.66924 7.09863 3.77686 7.09863H12.9351ZM24.7524 12H33.0435C34.3863 12 34.5356 11.5512 34.5356 10.7412V10.2979C34.5356 9.50218 34.3371 9.07228 32.8774 9.07227H24.7729L24.7524 12ZM109.604 9.87891C108.627 10.4554 107.562 11.1202 106.646 11.7334L100.298 7.09863H105.705L109.604 9.87891ZM109.607 9.88086L109.604 9.87891L109.607 9.87793V9.88086ZM95.811 9.07031H80.3481V7.09863H95.811V9.07031Z";
export const REFERENCE_DATE = '2026-09-10';
export function drawSpaceX(ctx,x,y,width,color='#17394f') {
  ctx.save();ctx.translate(x,y);ctx.scale(width/147,width/147);ctx.fillStyle=color;ctx.fill(new Path2D(SPACEX_PATH));ctx.restore();
}
// Upright glyphs, stacked as in SpaceX's Falcon 9 first-stage reference render.
// These are reflowed from the official wordmark, not a substitute typeface.
export function drawVerticalSpaceX(ctx,x,y,glyphWidth,color='#17394f') {
  const bounds=[[0,16.7],[21.3,37.6],[39.8,56.3],[59.3,75.7],[80.3,95.9]];
  const path=new Path2D(SPACEX_PATH),scale=glyphWidth/16.7;
  bounds.forEach(([left,right],i)=>{
    ctx.save();ctx.translate(x+(glyphWidth-(right-left)*scale)/2,y+i*glyphWidth*1.15);
    ctx.scale(scale,scale);ctx.beginPath();ctx.rect(0,0,right-left,12.1);ctx.clip();
    ctx.translate(-left,-6.5);ctx.fillStyle=color;ctx.fill(path);ctx.restore();
  });
  // Preserve the distinctive swept X geometry and its aspect ratio.
  drawSpaceXX(ctx,x-glyphWidth*.15,y+glyphWidth*5.7,glyphWidth*1.7,color);
}
export function drawSpaceXX(ctx,x,y,width,color='#e7e8df') {
  ctx.save();ctx.translate(x,y);ctx.scale(width/47,width/47);
  ctx.beginPath();ctx.rect(0,0,47,19);ctx.clip();ctx.translate(-99.9,0);
  ctx.fillStyle=color;ctx.fill(new Path2D(SPACEX_PATH));ctx.restore();
}
export function drawUSFlag(ctx,x,y,width) {
  const h=width/1.9,s=h/13;
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,h);
  ctx.fillStyle='#b22234';for(let row=0;row<13;row+=2)ctx.fillRect(0,row*s,width,s);
  ctx.fillStyle='#3c3b6e';ctx.fillRect(0,0,width*.4,s*7);ctx.fillStyle='#ffffff';
  for(let row=0;row<9;row++){const count=row%2?5:6;for(let col=0;col<count;col++){const cx=width*.4*(col+(row%2?1:.5))/6,cy=s*7*(row+.5)/9,r=s*.3;ctx.beginPath();for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,rad=k%2?r*.4:r;ctx.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}ctx.closePath();ctx.fill();}}
  ctx.restore();
}
