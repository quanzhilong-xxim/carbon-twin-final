// Current G2 evidence only. No paid API, provider traffic, retries or model changes.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
const out=process.env.CITYLIGHT_OUTPUT;if(!out)throw Error('CITYLIGHT_OUTPUT required');
fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3020';
const report={at:new Date().toISOString(),scope:'V13 current unchanged G2 model audit; not art acceptance',paidRequestsSent:0,device:{os:os.release(),cpu:os.cpus()[0].model},snapshot:{},browsers:{}};
for(const file of ['components/3d/CitylightV12Studio.tsx','app/citylight/studio/studio.css','public/models/citylight/v12/light-court.glb','public/models/citylight/v12/light-court-lod.glb'])report.snapshot[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
async function sample(canvas){return canvas.evaluate(async el=>{const raw=[],begin=performance.now();let last=begin;await new Promise(resolve=>{function tick(now){raw.push(now-last);last=now;if(now-begin>=5000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});const sorted=[...raw].sort((a,b)=>a-b);return{fps:raw.length*1000/(last-begin),p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],rawMs:raw,seconds:(last-begin)/1000,buffer:[el.width,el.height],css:[el.clientWidth,el.clientHeight],dataset:{...el.dataset}};});}
async function protect(context,row){await context.route('**/*',route=>{const q=route.request(),u=new URL(q.url());if((u.origin===base||u.protocol==='blob:'&&u.origin===base)&&['GET','HEAD'].includes(q.method())&&!u.pathname.startsWith('/api/'))return route.continue();row.blocked.push({path:u.pathname,method:q.method()});return route.abort();});if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());}
(async()=>{
 for(const name of ['chromium','firefox','webkit']){
  const row=report.browsers[name]={checks:[],errors:[],console:[],blocked:[],models:[],views:{},lights:{},samples:[],timeline:[]};let browser;
  try{
   browser=await{chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});row.version=browser.version();
   const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block'});await protect(context,row);
   const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.console.push(m.text().slice(0,500));});page.on('response',r=>{if(r.url().includes('/models/citylight/'))row.models.push({path:new URL(r.url()).pathname,status:r.status()});});
   const controls=page.locator('.citylight-controls'),stage=page.locator('.citylight-viewport'),canvas=()=>stage.locator('canvas');
   const stable=async()=>{await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas()).toHaveAttribute('data-stable','true',{timeout:45000});};
   await page.goto(base+'/citylight/studio',{waitUntil:'domcontentloaded',timeout:120000});await stage.scrollIntoViewIfNeeded();await stable();
   for(const[label,key]of [['正面 45°','front'],['背面 45°','rear'],['左侧','left'],['右侧','right'],['屋顶斜俯视','roof'],['人眼入口','entry'],['夜景中距离','night'],['窗内空间','window']]){
    await controls.getByRole('button',{name:label,exact:true}).click();await stable();await page.mouse.move(1400,1000);
    const file=name+'-'+key+'.png';await stage.screenshot({path:path.join(out,file)});row.views[key]={file,dataset:await canvas().evaluate(el=>({...el.dataset})),viewport:[1440,1100],quality:'standard',at:new Date().toISOString()};
   }
   await controls.getByRole('button',{name:'正面 45°',exact:true}).click();await stable();
   for(const label of ['晨光','夕阳','蓝调','夜景']){await controls.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(1400);const file=name+'-'+label+'.png';await stage.screenshot({path:path.join(out,file)});row.lights[label]={file,dataset:await canvas().evaluate(el=>({...el.dataset}))};}
   await controls.getByRole('button',{name:'夕阳',exact:true}).click();await stable();await page.waitForTimeout(2000);
   row.samples.push({quality:'standard',...await sample(canvas())});
   await controls.getByRole('button',{name:'LOD / 低分辨率',exact:true}).click();await stable();await page.waitForTimeout(2000);row.samples.push({quality:'low',...await sample(canvas())});
   row.checks.push({name:'实际GLB请求成功且实体ID匹配',pass:row.models.some(m=>m.status===200&&m.path.endsWith('light-court.glb'))&&row.views.front.dataset.entityId==='CL-T01-V12'});
   row.checks.push({name:'七视角及透窗截图留存',pass:Object.keys(row.views).length===8});row.checks.push({name:'四时刻数据确实变化',pass:new Set(Object.values(row.lights).map(v=>v.dataset.worldTime)).size===4});row.checks.push({name:'无未捕获页面异常',pass:row.errors.length===0});
   await context.close();
   if(name==='chromium'){
    const ctx=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block',recordVideo:{dir:path.join(out,'video-original'),size:{width:1440,height:1100}}});await protect(ctx,row);const p=await ctx.newPage();const start=Date.now();const mark=(text)=>row.timeline.push({seconds:(Date.now()-start)/1000,text});
    mark('打开现有单塔工作台；加载阶段保留，未剪辑');await p.goto(base+'/citylight/studio',{waitUntil:'domcontentloaded',timeout:120000});const s=p.locator('.citylight-viewport'),c=s.locator('canvas'),ctrl=p.locator('.citylight-controls');await s.scrollIntoViewIfNeeded();await expect(c).toHaveAttribute('data-stable','true',{timeout:90000});
    const b=await c.boundingBox(),points=[];mark('鼠标按住画布连续环绕真实GLB');const x=b.x+b.width*.88,y=b.y+b.height*.48;await p.mouse.move(x,y);await p.mouse.down();
    for(let i=0;i<=180;i++){await p.mouse.move(x-b.height*i/180,y);await p.waitForTimeout(25);if(i%3===0)points.push((await c.getAttribute('data-camera')).split(',').map(Number));}await p.mouse.up();await p.waitForTimeout(1200);points.push((await c.getAttribute('data-camera')).split(',').map(Number));let radians=0;for(let i=1;i<points.length;i++){const d=Math.atan2(points[i][0],points[i][2])-Math.atan2(points[i-1][0],points[i-1][2]);radians+=Math.atan2(Math.sin(d),Math.cos(d));}row.orbit={degrees:radians*180/Math.PI,points};
    mark('点击人眼入口；相机下降，未实现室内自由步行');await ctrl.getByRole('button',{name:'人眼入口',exact:true}).click();await expect(c).toHaveAttribute('data-stable','true',{timeout:45000});await p.waitForTimeout(1200);await s.screenshot({path:path.join(out,'operation-entry.png')});
    mark('按Esc返回正面机位');await p.keyboard.press('Escape');await expect(s).toHaveAttribute('data-view','front');await expect(c).toHaveAttribute('data-stable','true',{timeout:45000});await p.waitForTimeout(1200);mark('本段操作结束');
    const video=p.video();await ctx.close();await video.saveAs(path.join(out,'current-orbit.webm'));row.checks.push({name:'实测连续环绕接近360度且Esc返回',pass:Math.abs(row.orbit.degrees)>347&&Math.abs(row.orbit.degrees)<374});
   }
   row.status=row.checks.every(c=>c.pass)?'AUDIT_CAPTURED':'FAILED_CHECK';
  }catch(e){row.status='FAILED';row.error=e.stack;}finally{await browser?.close();fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify(report,null,2));}
 }
 console.log(JSON.stringify(Object.fromEntries(Object.entries(report.browsers).map(([k,v])=>[k,{status:v.status,version:v.version,checks:v.checks,samples:v.samples.map(s=>({quality:s.quality,fps:s.fps,p95:s.p95})),error:v.error}]))));
 if(Object.values(report.browsers).some(r=>r.status!=='AUDIT_CAPTURED'))process.exitCode=1;
})();
