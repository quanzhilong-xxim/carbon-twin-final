// Local rendered model evidence only; no API/provider calls. Not a performance run.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 try{
  const blocked=[];
  const context=await browser.newContext({viewport:{width:1440,height:1100},serviceWorkers:'block',recordVideo:{dir:out,size:{width:1440,height:1100}}});
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['localhost','127.0.0.1'].includes(u.hostname)||!['GET','HEAD'].includes(r.method())||u.pathname.startsWith('/api/')){blocked.push(u.pathname);return route.abort();}return route.continue();});
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3020/citylight',{waitUntil:'domcontentloaded'});
  const stage=page.locator('.citylight-viewport'),canvas=stage.locator('canvas');
  await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await stage.scrollIntoViewIfNeeded();
  const b=await canvas.boundingBox(),points=[];
  const sample=async()=>points.push((await canvas.getAttribute('data-camera')).split(',').map(Number));
  const start=b.x+b.width*.88,y=b.y+b.height*.48;
  await sample();await page.mouse.move(start,y);await page.mouse.down();
  for(let i=1;i<=180;i++){
   await page.mouse.move(start-b.height*i/180,y);await page.waitForTimeout(25);if(i%3===0)await sample();
  }
  await page.mouse.up();await page.waitForTimeout(1200);await sample();
  let angle=0;for(let i=1;i<points.length;i++){const a=Math.atan2(points[i-1][0],points[i-1][2]),z=Math.atan2(points[i][0],points[i][2]);angle+=Math.atan2(Math.sin(z-a),Math.cos(z-a));}
  const fullOrbit=Math.abs(angle)>6.05&&Math.abs(angle)<6.52;
  await stage.screenshot({path:path.join(out,'after-360-orbit.png')});
  await page.getByRole('button',{name:'人眼入口',exact:true}).click();
  await expect(stage).toHaveAttribute('data-ready','true');await page.waitForTimeout(1600);
  await stage.screenshot({path:path.join(out,'after-continuous-entry.png')});
  const video=page.video();await context.close();await video.saveAs(path.join(out,'light-tower-orbit-to-entry.webm'));
  const sourceHashes=Object.fromEntries(['components/3d/CitylightHero.tsx','lib/citylight/stable-renderer.ts','lib/citylight/hero.ts','public/models/citylight/light-tower-v2.glb'].map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
  const report={scope:'Real local 3D model, continuous mouse orbit and aerial-to-entry transition; not full city or walk mode',sourceHashes,fullOrbit,radians:angle,degrees:angle*180/Math.PI,points,errors,blocked,paidCalls:0,video:'light-tower-orbit-to-entry.webm'};
  fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,points:points.length}));if(!fullOrbit||errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
