// Same-condition quality samples. No API, provider, external or WebSocket traffic.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;if(!out)throw Error('CITYLIGHT_OUTPUT required');fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),scope:'same camera, sunset .35, sky PMREM, clear glass; standard/low/standard; no video recording',paidCalls:0,limits:'5-second requestAnimationFrame scheduling samples, not physical refresh or device certification. Low mode deliberately changes geometry, DPR, shadow and transmission buffer resolution.',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync('components/3d/CitylightV12Studio.tsx')).digest('hex'),browsers:{}};
(async()=>{for(const name of(process.env.V12_BROWSERS||'chromium,firefox,webkit').split(',')){
 let browser;const row=report.browsers[name]={samples:[],errors:[],blocked:[]};
 try{
  browser=await{chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});row.version=browser.version();
  const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>{const q=route.request(),u=new URL(q.url());if(u.protocol==='blob:'&&u.origin==='http://127.0.0.1:3020'&&q.method()==='GET')return route.continue();if(u.origin!=='http://127.0.0.1:3020'||!['GET','HEAD'].includes(q.method())||u.pathname.startsWith('/api/')){row.blocked.push({path:u.pathname,method:q.method()});return route.abort();}return route.continue();});if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
  await page.goto('http://127.0.0.1:3020/citylight/studio',{waitUntil:'domcontentloaded',timeout:120000});const stage=page.locator('.citylight-viewport'),controls=page.locator('.citylight-controls'),canvas=()=>stage.locator('canvas');await stage.scrollIntoViewIfNeeded();
  const stable=async()=>{await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas()).toHaveAttribute('data-stable','true',{timeout:45000});};await stable();
  for(const mode of['standard-before','low','standard-after']){
   if(mode==='low')await controls.getByRole('button',{name:'LOD / 低分辨率',exact:true}).click();if(mode==='standard-after')await controls.getByRole('button',{name:'恢复标准画质',exact:true}).click();await stable();await page.mouse.move(1400,1000);await page.waitForTimeout(4000);
   const data=await canvas().evaluate(async el=>{const frames=[],start=performance.now();let last=start;await new Promise(resolve=>{const next=now=>{frames.push(now-last);last=now;if(now-start>=5000)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);});frames.sort((a,b)=>a-b);const r=el.getBoundingClientRect();return{fps:frames.length*1000/(last-start),p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1),long33:frames.filter(t=>t>33.34).length,samples:frames.length,seconds:(last-start)/1000,css:[r.width,r.height],buffer:[el.width,el.height],dataset:{...el.dataset}};});row.samples.push({mode,...data});
   expect(data.dataset.worldTime).toBe('0.35');expect(data.dataset.reflection).toBe('physical-atmosphere-pmrem');expect(data.dataset.transmissionScale).toBe(mode==='low'?'0.5':'1');expect(JSON.parse(data.dataset.transmissions).every(t=>Math.abs(t-.96)<.001)).toBe(true);
   await stage.screenshot({path:path.join(out,name+'-'+mode+'.png')});
  }expect(row.errors).toEqual([]);row.status='PASS_MEASUREMENT_ONLY';await context.close();
 }catch(e){row.status='FAIL';row.error=e.stack;}finally{await browser?.close();fs.writeFileSync(path.join(out,'quality.json'),JSON.stringify(report,null,2));}
 }console.log(JSON.stringify(report));if(Object.values(report.browsers).some(b=>b.status==='FAIL'))process.exitCode=1;
})();
