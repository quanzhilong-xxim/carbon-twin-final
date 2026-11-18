// Material experiment only: requests confined to same-origin public GET assets.
// Never opens TTS/Decart or authentication routes; no retries.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),os=require('os');
const{chromium,firefox,webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;if(!out)throw Error('CITYLIGHT_OUTPUT required');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3020',report={at:new Date().toISOString(),scope:'V14 isolated facade research, not original tower replacement or art acceptance',paidRequestsSent:0,device:{os:os.release(),cpu:os.cpus()[0].model},hashes:{},browsers:{}};
for(const p of ['components/3d/CitylightMaterialLab.tsx','scripts/citylight/build-v14-facade.py','public/models/citylight/v14-lab/facade-specimen.glb'])report.hashes[p]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function sample(canvas){return canvas.evaluate(async el=>{const raw=[];let first=performance.now(),last=first;await new Promise(resolve=>{function tick(t){raw.push(t-last);last=t;if(t-first>=3000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick)});const sorted=[...raw].sort((a,b)=>a-b);return{fps:raw.length*1000/(last-first),p95:sorted[Math.floor(sorted.length*.95)],worst:sorted.at(-1),rawRafMs:raw,seconds:(last-first)/1000,dataset:{...el.dataset},buffer:[el.width,el.height],css:[el.clientWidth,el.clientHeight]};});}
(async()=>{
 for(const name of(process.env.CITYLIGHT_BROWSER||'chromium,firefox,webkit').split(',')){
  const row=report.browsers[name]={checks:[],errors:[],consoleErrors:[],blocked:[],responses:[],experiments:[]};let browser;
  try{
   browser=await{chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});row.version=browser.version();const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block'});
   await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(u.origin===base&&['GET','HEAD'].includes(q.method())&&!u.pathname.startsWith('/api/'))return r.continue();row.blocked.push({path:u.pathname,method:q.method()});return r.abort();});if(context.routeWebSocket)await context.routeWebSocket('**/*',s=>s.close());
   const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text().slice(0,400));});page.on('response',r=>{if(r.url().includes('/v14-lab/'))row.responses.push({path:new URL(r.url()).pathname,status:r.status()});});
   await page.goto(base+'/citylight/material-lab',{waitUntil:'domcontentloaded',timeout:90000});const v=page.locator('.citylight-viewport'),canvas=v.locator('canvas'),controls=page.locator('.citylight-controls');await v.scrollIntoViewIfNeeded();
   const stable=async()=>{await expect(v).toHaveAttribute('data-ready','true',{timeout:60000});await expect(canvas).toHaveAttribute('data-configured','true',{timeout:60000});};await stable();
   const shot=async(id)=>{await page.mouse.move(1410,1050);const file=name+'-'+id+'.png';await v.screenshot({path:path.join(out,file)});return file;};
   const take=async(id)=>{await stable();await page.waitForTimeout(800);const file=await shot(id);row.experiments.push({id,file,at:new Date().toISOString(),glass:await v.getAttribute('data-glass'),...(await sample(canvas))});fs.writeFileSync(path.join(out,'browser-matrix.json'),JSON.stringify(report,null,2));console.log(name,id);};
   for(const [label,key]of[['晨光','morning'],['夕阳','sunset'],['夜景','night']]){
    await controls.getByRole('button',{name:label,exact:true}).click();
    for(const [method,title]of[['hdr','A · 静态 HDR'],['local','B · 现场邻楼探针'],['opaque','C · 不透射负对照']]){await controls.getByRole('button',{name:title,exact:true}).click();await take(key+'-'+method);}
   }
   await controls.getByRole('button',{name:'夕阳',exact:true}).click();await controls.getByRole('button',{name:'B · 现场邻楼探针',exact:true}).click();await controls.getByRole('button',{name:'透窗近景',exact:true}).click();await take('detail-neighbours-on');
   await controls.getByRole('button',{name:'旧发雾参数／清透参数对照',exact:true}).click();await take('detail-hazy-reference');await controls.getByRole('button',{name:'旧发雾参数／清透参数对照',exact:true}).click();
   await controls.getByRole('button',{name:'邻楼开／关并重捕获',exact:true}).click();await take('detail-neighbours-off');await controls.getByRole('button',{name:'邻楼开／关并重捕获',exact:true}).click();
   await controls.getByRole('button',{name:'正45°',exact:true}).click();await controls.getByRole('button',{name:'CC0 地面 PBR 开／关',exact:true}).click();await take('sunset-local-noPbr');await controls.getByRole('button',{name:'CC0 地面 PBR 开／关',exact:true}).click();
   await controls.getByRole('button',{name:'阴影开／关',exact:true}).click();await take('sunset-local-noShadow');await controls.getByRole('button',{name:'阴影开／关',exact:true}).click();await stable();
   row.views={};for(const [label,key]of[['正45°','front'],['背45°','rear'],['左侧','left'],['右侧','right'],['顶视','top'],['人眼1.6m','eye'],['透窗近景','detail']]){await controls.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(450);row.views[key]={file:await shot(key),dataset:await canvas.evaluate(el=>({...el.dataset}))};}
   row.checks.push({name:'真实GLB及4项授权资源HTTP200',pass:row.responses.filter(r=>r.status===200).length>=5&&row.responses.some(r=>r.path.endsWith('facade-specimen.glb')&&r.status===200)});
   row.checks.push({name:'三方案×晨夕夜共9组原始帧样本',pass:row.experiments.filter(r=>/^(morning|sunset|night)-(hdr|local|opaque)$/.test(r.id)).length===9});row.checks.push({name:'七视角实体ID一致',pass:Object.values(row.views).every(r=>r.dataset.entityId==='CL-G2-FACADE-14')});
   // Real hit/drag then Escape recovery, not synthetic image rotation.
   const b=await canvas.boundingBox(),before=await canvas.getAttribute('data-camera');await page.mouse.move(b.x+b.width*.6,b.y+b.height*.45);await page.mouse.down();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.45,{steps:16});await page.mouse.up();await page.waitForTimeout(600);const after=await canvas.getAttribute('data-camera');await page.keyboard.press('Escape');await expect(v).toHaveAttribute('data-view','front');row.checks.push({name:'真实Orbit改变相机且Esc复位',pass:before!==after});
   await controls.getByRole('button',{name:'暂停本地渲染',exact:true}).click();await expect(page.getByRole('heading',{name:'试件已暂停'})).toBeVisible();row.checks.push({name:'暂停移除canvas释放渲染器',pass:await canvas.count()===0});await page.getByRole('button',{name:'恢复本地三维试件'}).click();await stable();row.checks.push({name:'手动恢复本地三维',pass:true});
   // Inject real context-lost event through the extension; no service calls.
   const ext=await canvas.evaluate(el=>{const g=el.getContext('webgl2')||el.getContext('webgl');const e=g?.getExtension('WEBGL_lose_context');if(!e)return false;e.loseContext();return true;});if(ext){await expect(page.getByRole('heading',{name:'WebGL 已中断，未继续显示旧画面'})).toBeVisible();row.checks.push({name:'Context Lost明确降级不留旧画面',pass:await canvas.count()===0});await page.getByRole('button',{name:'恢复本地三维试件'}).click();await stable();row.checks.push({name:'Context Lost手动重建',pass:true});}else row.checks.push({name:'Context Lost注入扩展',status:'UNVERIFIED',pass:false});
   await page.emulateMedia({reducedMotion:'reduce'});row.checks.push({name:'减少动态下无自动镜头飞行',pass:await canvas.getAttribute('data-stable')==='true'});
   for(const width of[375,768,1440]){await page.setViewportSize({width,height:1100});await page.waitForTimeout(500);await stable();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);row.checks.push({name:width+'px无横溢出',pass:!overflow});if(width===375)await page.screenshot({path:path.join(out,name+'-mobile.png'),fullPage:true});}
   row.checks.push({name:'无未捕获页面错误',pass:row.errors.length===0});row.status=row.checks.every(c=>c.pass)?'PASS_TECHNICAL_ONLY':'FAILED_CHECK';await context.close();
  }catch(e){row.status='FAILED';row.error=e.stack;}finally{await browser?.close();fs.writeFileSync(path.join(out,'browser-matrix.json'),JSON.stringify(report,null,2));}
 }
 console.log(JSON.stringify(Object.fromEntries(Object.entries(report.browsers).map(([k,r])=>[k,{status:r.status,checks:r.checks,error:r.error,errors:r.errors,samples:r.experiments.map(s=>({id:s.id,fps:s.fps,p95:s.p95}))}]))));if(Object.values(report.browsers).some(r=>r.status!=='PASS_TECHNICAL_ONLY'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
