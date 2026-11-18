const fs=require('fs'),path=require('path');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const {sceneEvidence}=require('./citylight-visual.cjs');
const output=process.env.CITY_STUDIES_OUTPUT||path.resolve('work/city-studies',new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(output,{recursive:true});
const base=process.env.CITY_STUDIES_BASE_URL||'http://127.0.0.1:3020';
const result={date:new Date().toISOString(),base,paidBudget:0,browsers:{}};
const modes={chromium:{engine:chromium,args:['--use-angle=d3d11','--enable-gpu']},'chromium-software':{engine:chromium,args:['--use-angle=swiftshader']},firefox:{engine:firefox},webkit:{engine:webkit}};
async function run(name,mode){
 const row=result.browsers[name]={checks:[],errors:[],consoleErrors:[],blocked:[],assetResponses:[]};let browser;
 async function check(label,fn){try{await fn();row.checks.push({label,status:'passed'});}catch(e){row.checks.push({label,status:'failed',error:e.message.slice(0,1200)});}}
 try{
  browser=await mode.engine.launch({headless:true,args:mode.args});row.version=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1100},serviceWorkers:'block'});
  await context.route('**/*',route=>{
   const r=route.request(),u=new URL(r.url());
   if(['http:','https:'].includes(u.protocol)&&(!['127.0.0.1','localhost'].includes(u.hostname)||!['GET','HEAD'].includes(r.method())||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/auth/session'))){row.blocked.push({path:u.pathname,method:r.method()});return route.abort();}
   return route.continue();
  });
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text().slice(0,500));});page.on('response',r=>{if(r.url().includes('/models/city-studies/'))row.assetResponses.push({file:r.url().split('/').pop(),status:r.status()});});
  const started=Date.now();await page.goto(base+'/city-studies',{waitUntil:'domcontentloaded',timeout:120000});
  const stage=page.locator('.city-studies-viewport'),panel=page.locator('.city-studies-panel'),canvas=stage.locator('canvas');await stage.scrollIntoViewIfNeeded();
  await check('真实 GLB 建筑与街道加载',async()=>{await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas).toHaveAttribute('data-models-loaded','3');expect(new Set(row.assetResponses.filter(r=>/b0[123]/.test(r.file)&&r.status===200).map(r=>r.file.slice(0,3))).size).toBe(3);row.loadMs=Date.now()-started;});
  if(await canvas.count()){
   await page.waitForTimeout(8000);const imagePath=path.join(output,name+'-district-dusk.png');await stage.screenshot({path:imagePath});
   await check('截图中心实际包含非空三维画面',async()=>{row.pixelEvidence=await sceneEvidence(imagePath);expect(row.pixelEvidence.pass).toBe(true);});
   row.performance=await page.evaluate(async()=>{const canvas=document.querySelector('.city-studies-viewport canvas'),gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),ext=gl.getExtension('WEBGL_debug_renderer_info');const samples=[];let last=performance.now(),start=last;await new Promise(resolve=>{function frame(now){samples.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(frame);}requestAnimationFrame(frame);});samples.sort((a,b)=>a-b);const box=canvas.getBoundingClientRect();return {dataset:{...canvas.dataset},rafFps:Number((1000*samples.length/(last-start)).toFixed(1)),frameP95:samples[Math.floor(samples.length*.95)],renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),canvas:{width:box.width,height:box.height,bufferWidth:canvas.width,bufferHeight:canvas.height},context:gl.getContextAttributes()};});
   await check('三栋建筑正面、侧面、屋顶、入口镜头',async()=>{
    for(let i=1;i<=3;i++){
     await panel.getByRole('button',{name:new RegExp('B0'+i+' ')}).click();await page.waitForTimeout(2500);
     expect(await stage.getAttribute('data-selected')).toBe('B0'+i);
     await stage.screenshot({path:path.join(output,name+'-b0'+i+'-front.png')});
     for(const [label,view] of [['侧面幕墙','side'],['屋顶细节','roof'],['入口街道','entry']]){
      await panel.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(2300);await expect(stage).toHaveAttribute('data-view',view);
      await stage.screenshot({path:path.join(output,name+'-b0'+i+'-'+view+'.png')});
     }
    }
   });
   await check('晨光、白天、黄昏、夜景',async()=>{
    await panel.getByRole('button',{name:'街区全景',exact:true}).click();await page.waitForTimeout(2500);
    row.lighting={};for(const [label,time] of [['晨光','morning'],['白天','day'],['黄昏','dusk'],['夜景','night']]){await panel.getByRole('button',{name:label,exact:true}).click();await expect(stage).toHaveAttribute('data-time',time);await page.waitForTimeout(2300);row.lighting[time]=await canvas.getAttribute('data-window-materials');await stage.screenshot({path:path.join(output,name+'-district-'+time+'.png')});}
   });
   await check('自由旋转镜头不回弹',async()=>{
    await stage.evaluate(el=>el.scrollIntoView({block:'center'}));await page.waitForTimeout(500);const before=await canvas.getAttribute('data-camera'),box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.47,{steps:12});await page.mouse.up();await page.waitForTimeout(2500);const moved=await canvas.getAttribute('data-camera');await page.waitForTimeout(2500);const end=await canvas.getAttribute('data-camera');row.orbit={before,moved,end,box};expect(moved).not.toBe(before);expect(end.split(',').map(Number).every((n,i)=>Math.abs(n-Number(moved.split(',')[i]))<2)).toBe(true);
   });
   await check('节能画质与交通可控',async()=>{await panel.getByRole('button',{name:'切换节能画质',exact:true}).click();await expect(canvas).toHaveAttribute('data-quality','economy');await panel.getByRole('button',{name:'播放街道交通',exact:true}).click();await expect(panel.getByRole('button',{name:'暂停街道交通',exact:true})).toHaveAttribute('aria-pressed','true');await panel.getByRole('button',{name:'暂停街道交通',exact:true}).click();await panel.getByRole('button',{name:'恢复标准画质',exact:true}).click();});
   await check('真实 Context Lost 明确降级与手动恢复',async()=>{await expect(canvas).toHaveAttribute('data-models-loaded','3',{timeout:45000});const supported=await canvas.evaluate(el=>{const extension=el.getContext('webgl2').getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true;});expect(supported).toBe(true);await expect(stage.getByRole('heading',{name:'三维视图已暂停'})).toBeVisible({timeout:45000});expect(await stage.locator('canvas').count()).toBe(0);await stage.getByRole('button',{name:'重新加载三维视图',exact:true}).click();await expect(stage).toHaveAttribute('data-ready','true',{timeout:45000});await expect(stage.locator('canvas')).toHaveAttribute('data-models-loaded','3',{timeout:45000});});
  }
  await check('375 / 768 像素布局无水平溢出',async()=>{for(const width of [375,768]){await page.setViewportSize({width,height:950});await page.waitForTimeout(600);const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(sizes.scroll).toBeLessThanOrEqual(sizes.width+1);await page.screenshot({path:path.join(output,name+'-layout-'+width+'.png'),fullPage:true});}});
  await context.close();
 }catch(e){row.fatal=e.stack;}finally{await browser?.close();fs.writeFileSync(path.join(output,'city-studies.json'),JSON.stringify(result,null,2));}
}
(async()=>{for(const name of (process.env.CITY_STUDIES_BROWSERS||'chromium,firefox,webkit,chromium-software').split(','))await run(name,modes[name]);console.log(JSON.stringify(result));})();
