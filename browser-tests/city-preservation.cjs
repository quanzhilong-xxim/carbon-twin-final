// City/voice/try-on UI preservation only. All AI endpoints and writes are blocked.
const fs=require('fs'),path=require('path');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const base=process.env.CITY_STUDIES_BASE_URL||'http://127.0.0.1:3020',output=process.env.CITY_PRESERVATION_OUTPUT||path.resolve('work/city-preservation',Date.now().toString());
fs.mkdirSync(output,{recursive:true});const report={date:new Date().toISOString(),paidCallsAllowed:false,browsers:{}};
(async()=>{
 for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
  const row=report.browsers[name]={checks:[],blocked:[],errors:[]};let browser;
  async function check(label,fn){try{await fn();row.checks.push({label,status:'passed'});}catch(e){row.checks.push({label,status:'failed',error:e.message.slice(0,800)});}}
  try{
   browser=await engine.launch({headless:true,...(name==='chromium'?{args:['--use-angle=d3d11','--enable-gpu']}: {})});
   const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
   await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&(!['localhost','127.0.0.1'].includes(u.hostname)||!['GET','HEAD'].includes(r.method())||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/auth/session'))){row.blocked.push({path:u.pathname,method:r.method()});return route.abort();}return route.continue();});
   if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
   const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));
   await check('原城市25栋、粒子进度、故事与昼夜控制保留',async()=>{
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:120000});const formation=page.locator('.city-formation');await formation.scrollIntoViewIfNeeded();await expect(formation).toHaveAttribute('data-building-count','25');await expect(formation.locator('canvas')).toBeVisible({timeout:45000});
    await formation.getByLabel('城市实体化进度').fill('0.5');await expect(formation).toHaveAttribute('data-stage','volume');await formation.getByRole('button',{name:'跳过到街区',exact:true}).click();await expect(formation).toHaveAttribute('data-stage','district');
    await formation.getByRole('button',{name:'夜晚',exact:true}).click();await expect(formation).toHaveAttribute('data-time','night');await formation.getByRole('button',{name:'黄昏',exact:true}).click();await expect(formation).toHaveAttribute('data-time','dusk');await formation.screenshot({path:path.join(output,name+'-original-city.png')});
   });
   await check('样片可以返回原首页',async()=>{await page.goto(base+'/city-studies',{waitUntil:'domcontentloaded'});await page.getByRole('link',{name:'返回原城市 ↗',exact:true}).click();await expect(page).toHaveURL(base+'/');});
   await check('试衣七件服装与语音入口保留（不调用服务）',async()=>{
    await page.goto(base+'/workspace',{waitUntil:'domcontentloaded',timeout:120000});for(const label of ['耐克黑色短袖','耐克白色长袖','阿迪达斯黄色外套','阿迪达斯黑色长裤','耐克深蓝色短裤','米白色羊毛衫','浅蓝色牛仔裤'])await expect(page.getByRole('button',{name:label,exact:true})).toBeVisible({timeout:45000});
    await page.getByRole('button',{name:'米白色羊毛衫',exact:true}).click();await expect(page.getByRole('button',{name:'米白色羊毛衫',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'语音选衣',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'打开摄像头（不调用 AI）',exact:true})).toBeVisible();
   });
   await check('豆包试听页面与自定义文字入口保留（不合成）',async()=>{await page.goto(base+'/tts-audition',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'豆包语音试听',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'试听输入文字',exact:true})).toBeVisible();expect(await page.locator('body').innerText()).toContain('Vivi 2.0');});
   for(const route of ['/simulator','/learn'])await check('原有页面'+route+'可加载',async()=>{const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:120000});expect(response.status()).toBe(200);});
   await context.close();
  }catch(e){row.fatal=e.message;}finally{await browser?.close();fs.writeFileSync(path.join(output,'preservation.json'),JSON.stringify(report,null,2));}
 }
 console.log(JSON.stringify(report));
})();
