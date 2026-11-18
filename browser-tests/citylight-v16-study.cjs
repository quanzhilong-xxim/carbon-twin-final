/* Real WebGL geometry study only. All API and external traffic is blocked. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;if(!out)throw Error('CITYLIGHT_OUTPUT required');
if(fs.existsSync(path.join(out,'study.json')))throw Error('Preserve earlier results; select a new output directory');
fs.mkdirSync(out,{recursive:true});
const root=process.cwd(),base='http://127.0.0.1:3020',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={at:new Date().toISOString(),type:'GEOMETRY_STUDY_NOT_ART_ACCEPTANCE',head:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:{width:1440,height:1100},dpr:1,bloom:false,paidRequestsForwarded:0,codeHash:sha(fs.readFileSync('components/3d/CitylightTowerStudy.tsx')),browsers:{}};
const labels={front:'正面45°',rear:'背面45°',left:'左侧',right:'右侧',roof:'屋顶',eye:'人眼1.6m',detail:'幕墙结构近景',hero:'主视觉低机位'};
const positions={front:[92,66,145],rear:[-92,66,-145],left:[-150,62,6],right:[150,62,6],roof:[30,139,42],eye:[6,1.6,34],detail:[25,35,34],hero:[60,9,118]};
const candidateLabels={crystal:'A · 连续晶体折面',terrace:'B · 分段退台对照',baseline:'旧塔 · 同机位白模',previous:'R2 · 本轮初版对照'};
const lights={dawn:'清晨方向',day:'上午方向',noon:'正午方向',sunset:'夕阳方向',blue:'蓝调结构',night:'夜间结构'};
(async()=>{
 for(const name of (process.env.CITYLIGHT_ENGINES||'chromium,firefox,webkit').split(',')){
  const row=report.browsers[name]={checks:[],blocked:[],errors:[],consoleErrors:[],models:[],views:{},lights:{},performance:[]};let browser;
  try{
   browser=await {chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});
   row.browserVersion=browser.version();
   const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,serviceWorkers:'block'});
   await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base&&!u.pathname.startsWith('/api/')&&route.request().method()==='GET')return route.continue();row.blocked.push({path:u.pathname,method:route.request().method()});return route.abort('blockedbyclient')});
   const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text())});
   page.on('response',async response=>{if(response.url().endsWith('.glb')){const uri=new URL(response.url()).pathname;try{const body=await response.body(),expected=sha(fs.readFileSync(path.join(root,'public',uri)));row.models.push({uri,status:response.status(),sha256:sha(body),matchesDisk:sha(body)===expected,bytes:body.length})}catch(e){row.errors.push('GLB hash: '+e.message)}}});
   const start=performance.now();await page.goto(base+'/citylight/tower-study',{waitUntil:'domcontentloaded',timeout:60000});
   const viewport=page.locator('.citylight-viewport'),canvas=viewport.locator('canvas'),controls=page.locator('.citylight-controls');
   const stable=async()=>{await expect(viewport).toHaveAttribute('data-ready','true',{timeout:60000});await expect(canvas).toHaveAttribute('data-model-loaded','true');await viewport.scrollIntoViewIfNeeded();await page.waitForTimeout(400)};
   await stable();row.firstReadyWallMs=performance.now()-start;
   const data=()=>canvas.evaluate(el=>({...el.dataset,canvasWidth:el.width,canvasHeight:el.height}));
   row.renderer=(await data()).renderer;row.canvas=await canvas.boundingBox();
   const check=async(label,fn)=>{try{await fn();row.checks.push({label,pass:true})}catch(e){row.checks.push({label,pass:false,error:e.message})}};
   const button=async text=>{await controls.getByRole('button',{name:text,exact:true}).click();await stable()};
   const sample=async id=>{
    const frames=await page.evaluate(()=>new Promise(resolve=>{const a=[];let last=0,begin=0;function step(t){if(!begin)begin=t;if(last)a.push(t-last);last=t;if(t-begin>=3000)resolve(a);else requestAnimationFrame(step)}requestAnimationFrame(step)}));
    const sorted=[...frames].sort((a,b)=>a-b),sum=frames.reduce((a,b)=>a+b,0);
    row.performance.push({id,source:'page requestAnimationFrame, includes long frames; not GPU timer',rawMs:frames,fps:1000*frames.length/sum,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],p99:sorted[Math.floor(sorted.length*.99)],dataset:await data()});
   };
   for(const candidate of ['crystal','terrace','baseline','previous']){
    await button(candidateLabels[candidate]);
    await expect(canvas).toHaveAttribute('data-model-uri',candidate==='baseline'?'/models/citylight/v12/light-court.glb':/\/models\/citylight\/v16-study\/r\d+\/(crystal|terrace)\.glb/);
    row.views[candidate]={};
    for(const id of Object.keys(labels)){
     if((process.env.CITYLIGHT_QUICK==='1'&&candidate==='baseline'||candidate==='previous')&&id!=='front'&&id!=='detail'&&id!=='roof')continue;
     await button(labels[id]);const d=await data(),file=name+'-'+candidate+'-'+id+'.png';
     await canvas.screenshot({path:path.join(out,file)});
     row.views[candidate][id]={file,dataset:d};
     await check(candidate+'/'+id+' camera coordinates exact',async()=>{const v=d.camera.split(',').map(Number);expect(Math.max(...v.map((x,i)=>Math.abs(x-positions[id][i])))).toBeLessThan(.001)});
    }
    await button(labels.front);await sample(candidate+'-neutral-clay');
   }
   await check('Loaded model bytes match on-disk GLB, no stale asset',async()=>{expect(row.models.length).toBeGreaterThanOrEqual(3);expect(row.models.every(m=>m.status===200&&m.matchesDisk)).toBe(true)});
   await button(candidateLabels.crystal);
   await button(labels.front);
   await check('Real raycast selects correct first-tower ID',async()=>{const box=await canvas.boundingBox();await page.mouse.click(box.x+box.width*.5,box.y+box.height*.5);await expect(controls.getByText('已选中 CL-T01-V16-CRYSTAL',{exact:true})).toBeVisible()});
   await check('Actual metre bounds agree with exported manifest',async()=>{const d=await data(),bounds=JSON.parse(d.bounds),m=JSON.parse(fs.readFileSync('public/models/citylight/v16-study/r3/manifest.json','utf8')).find(x=>x.candidate==='crystal');const actual=bounds.max.map((v,i)=>v-bounds.min[i]);const want=[m.dimensionsMetres[0],m.dimensionsMetres[2],m.dimensionsMetres[1]];expect(Math.max(...actual.map((x,i)=>Math.abs(x-want[i])))).toBeLessThan(.002)});
   for(const [mode,label] of [['silhouette','纯色剪影'],['normals','法线方向'],['section','拆除外壳查楼板'],['clay','中性白模']]){
    await button(label);await expect(canvas).toHaveAttribute('data-mode',mode);await canvas.screenshot({path:path.join(out,name+'-crystal-'+mode+'.png')});
   }
   for(const [id,label] of Object.entries(lights)){
    await button(label);row.lights[id]={dataset:await data(),file:name+'-crystal-light-'+id+'.png'};await canvas.screenshot({path:path.join(out,row.lights[id].file)});
   }
   await button('中性斜光');await button(labels.eye);
   await check('1.6m eye after real Orbit then preset',async()=>{
    const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.75,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5,{steps:12});await page.mouse.up();await page.waitForTimeout(300);row.orbitCamera=(await data()).camera;expect(row.orbitCamera).not.toEqual(positions.eye.join(','));
    await button(labels.eye);row.eyeAfterOrbit=(await data()).camera;expect(Math.abs(Number(row.eyeAfterOrbit.split(',')[1])-1.6)).toBeLessThan(.001);
   });
   await check('Esc resets actual camera, not only label (1e-3 metre tolerance)',async()=>{await page.keyboard.press('Escape');await stable();const v=(await data()).camera.split(',').map(Number);expect(Math.max(...v.map((x,i)=>Math.abs(x-positions.front[i])))).toBeLessThan(.001)});
   if(process.env.CITYLIGHT_QUICK!=='1'){
    await check('Pause removes canvas then manual recovery works',async()=>{
     await button('中性白模');await controls.getByRole('button',{name:'暂停本地三维',exact:true}).click();await expect(canvas).toHaveCount(0);await page.getByRole('button',{name:'手动恢复三维'}).click();await stable();
    });
    await check('Context loss removes stale canvas; manual recovery',async()=>{
     const supported=await canvas.evaluate(el=>{const g=el.getContext('webgl2')||el.getContext('webgl');const x=g.getExtension('WEBGL_lose_context');if(!x)return false;x.loseContext();return true});expect(supported).toBe(true);await expect(page.getByRole('heading',{name:'WebGL 中断，已移除旧画面'})).toBeVisible();await expect(canvas).toHaveCount(0);await page.getByRole('button',{name:'手动恢复三维'}).click();await stable();
    });
    for(const width of [375,768,1440]){
     await page.setViewportSize({width,height:1100});await stable();
     await check(width+'px layout, no horizontal overflow',async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true));
     await page.screenshot({path:path.join(out,name+'-layout-'+width+'.png'),fullPage:true});
    }
   }
   await check('No unhandled errors in geometry workbench',async()=>expect(row.errors).toEqual([]));
   row.status=row.checks.every(x=>x.pass)?'PASS_TECHNICAL_ONLY':'FAILED_CHECK';
   await context.close();
  }catch(e){row.status='FAILED';row.error=e.stack}
  finally{await browser?.close();fs.writeFileSync(path.join(out,'study.json'),JSON.stringify(report,null,2))}
 }
 console.log(JSON.stringify(Object.fromEntries(Object.entries(report.browsers).map(([k,r])=>[k,{status:r.status,checks:r.checks.length,failed:r.checks.filter(x=>!x.pass),errors:r.errors,error:r.error,perf:r.performance.map(x=>({id:x.id,fps:x.fps,p95:x.p95}))}]))));
 if(Object.values(report.browsers).some(r=>r.status!=='PASS_TECHNICAL_ONLY'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
