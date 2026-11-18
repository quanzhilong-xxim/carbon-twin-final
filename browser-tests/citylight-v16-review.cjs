/* Evidence-only checks. No API or remote requests are forwarded. Preserve every failure. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{pathToFileURL}=require('url');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;
if(!out||fs.existsSync(path.join(out,'review-tests.json')))throw Error('Use a fresh CITYLIGHT_OUTPUT');
fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3020',uri=base+'/citylight-review-v16/index.html';
const report={at:new Date().toISOString(),paidRequestsForwarded:0,templateSHA256:crypto.createHash('sha256').update(fs.readFileSync('public/citylight-review-v16/index.html')).digest('hex'),browsers:{}};
const media={at:report.at,expectedSize:[998,758],scope:'Actual MP4 playback, not artistic approval or physical phone validation',browsers:{}};
(async()=>{
 for(const [name,type] of Object.entries({chromium,firefox,webkit})){
  const row=report.browsers[name]={checks:[],blocked:[],errors:[]},m=media.browsers[name]={checks:[]};
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,serviceWorkers:'block'});
   await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===base&&!u.pathname.startsWith('/api/')&&['GET','HEAD'].includes(route.request().method()))return route.continue();row.blocked.push({path:u.pathname,method:route.request().method()});return route.abort('blockedbyclient')});
   const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
   const check=async(label,fn,target=row)=>{try{await fn();target.checks.push({label,pass:true})}catch(e){target.checks.push({label,pass:false,error:e.message})}};
   await page.goto(uri,{waitUntil:'load'});
   await check('中文失败状态与真实报告显示',async()=>{await expect(page.locator('header .status')).toContainText('FAILED_GATE');await expect(page.locator('#check-count')).toHaveText('114/114 技术检查')});
   // The report files produced by this very run are linked now and verified after the run, not fabricated in advance.
   const paths=await page.locator('a[href],img[src],source[src],track[src]').evaluateAll(els=>els.map(e=>e.getAttribute('href')||e.getAttribute('src')).filter(x=>x&&!x.startsWith('http')&&!x.startsWith('/')));
   row.links=[];
   for(const relative of [...new Set(paths)].filter(x=>!['raw/media-tests.json','raw/review-tests.json'].includes(x))){const res=await context.request.get(new URL(relative,uri).href);row.links.push({path:relative,status:res.status()});await res.dispose()}
   await check('所有当前静态链接返回200',async()=>expect(row.links.filter(x=>x.status!==200)).toEqual([]));
   for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1000});
    await check(width+'px无页面横向溢出',async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true));
    await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:width===375});
   }
   for(const engine of ['chromium','firefox','webkit']){
    await page.locator('#engines').getByRole('button',{name:engine,exact:true}).click();
    for(const [candidate,label] of Object.entries({crystal:'A 连续折面',terrace:'B 退台',baseline:'旧塔同条件'})){
     await page.locator('#candidates').getByRole('button',{name:label,exact:true}).click();
     await check(engine+'/'+candidate+'八视角相册与图片',async()=>{await expect(page.locator('#views figure')).toHaveCount(8);for(const im of await page.locator('#views img').all()){await im.scrollIntoViewIfNeeded();await expect.poll(()=>im.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true)}});
    }
   }
   await check('前后对比滑块',async()=>{await page.locator('#compare').fill('27');await expect(page.locator('#after')).toHaveCSS('clip-path','inset(0px 0px 0px 27%)')});
   await check('原图弹窗与Esc关闭',async()=>{await page.locator('#views button').first().click();await expect(page.locator('dialog')).toBeVisible();await expect.poll(()=>page.locator('#full').evaluate(el=>el.complete&&el.naturalWidth>600)).toBe(true);await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible()});
   const video=page.locator('video');await video.scrollIntoViewIfNeeded();
   await check('MP4真实来源、元数据与播放推进',async()=>{
    await video.evaluate(async el=>{el.muted=true;await el.play()});
    await expect.poll(()=>video.evaluate(el=>el.currentTime),{timeout:15000}).toBeGreaterThan(1);
    m.metadata=await video.evaluate(el=>({src:el.currentSrc,width:el.videoWidth,height:el.videoHeight,duration:el.duration,currentTime:el.currentTime,error:el.error?.message||null}));
    expect(m.metadata.src).toBe(base+'/citylight-review-v16/video/operation.mp4');expect(m.metadata.duration).toBeGreaterThan(10);expect(m.metadata.error).toBeNull();
   },m);
   await check('严格固有尺寸998×758，不修改属性绕过',async()=>expect([m.metadata?.width,m.metadata?.height]).toEqual([998,758]),m);
   await check('完整播放到ended，无跳进度',async()=>{await expect.poll(()=>video.evaluate(el=>el.ended),{timeout:60000,intervals:[500]}).toBe(true);m.end=await video.evaluate(el=>({currentTime:el.currentTime,ended:el.ended,readyState:el.readyState}));await video.screenshot({path:path.join(out,name+'-video-ended.png')})},m);
   await check('无页面脚本异常',async()=>expect(row.errors).toEqual([]));
   await check('原中文入口跳转V16，旧V14仍可访问',async()=>{await page.goto(base+'/citylight/review');await expect(page).toHaveURL(uri);const old=await context.request.get(base+'/citylight-review-v14/index.html');expect(old.status()).toBe(200);await old.dispose()});
   const offline=await browser.newContext({viewport:{width:375,height:1000},serviceWorkers:'block'});
   await offline.route('**/*',route=>route.request().url().startsWith('file:')?route.continue():route.abort('blockedbyclient'));
   const local=await offline.newPage();
   await check('离线file预览真实报告、相册与原图弹窗',async()=>{await local.goto(pathToFileURL(path.resolve('public/citylight-review-v16/index.html')).href);await expect(local.locator('#check-count')).toHaveText('114/114 技术检查');await expect(local.locator('#preservation')).toContainText('415项检查点');await local.locator('#views button').first().click();const png=fs.readFileSync('public/citylight-review-v16/images/chromium-crystal-front.png');await expect.poll(()=>local.locator('#full').evaluate(el=>[el.complete,el.naturalWidth,el.naturalHeight])).toEqual([true,png.readUInt32BE(16),png.readUInt32BE(20)]);await local.keyboard.press('Escape')});
   await offline.close();
  }catch(e){row.checks.push({label:'run completed',pass:false,error:e.message})}finally{await browser.close()}
 }
 fs.writeFileSync(path.join(out,'review-tests.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,'media-tests.json'),JSON.stringify(media,null,2));
 console.log(JSON.stringify({review:Object.fromEntries(Object.entries(report.browsers).map(([n,r])=>[n,{pass:r.checks.filter(x=>x.pass).length,total:r.checks.length}])),media:media.browsers}));
 if(Object.values(report.browsers).some(r=>r.checks.some(x=>!x.pass))||Object.values(media.browsers).some(r=>r.checks.some(x=>!x.pass)))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
