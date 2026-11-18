/* Final asset-only visual regression after the continuous coat/iris repair. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/character-detail-final-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false}),page=await browser.newPage({viewport:{width:1440,height:1000}}),report={out,base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3030/',errors:[],http:[],api:[],checks:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),150000);
 await page.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort()});page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});
 try{
  await page.goto(report.base+'#identities',{waitUntil:'domcontentloaded'});await page.locator('#identities').scrollIntoViewIfNeeded();
  for(const[id,label]of [['student','学生'],['business','企业主'],['city','城市管理者']].filter(([id])=>!process.argv[2]||id===process.argv[2])){
   const card=page.locator(`.identity-unit[data-character="${id}"]`);await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();await page.waitForFunction(({id,version})=>document.querySelector(`canvas[data-avatar-identity=${id}]`)?.dataset.assetVersion===version,{id,version:process.env.CT_CHARACTER_VERSION||'v10'});
   await card.getByRole('button',{name:'进入角色展厅',exact:false}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
   await page.waitForFunction(({id,version})=>document.querySelector(`.character-room canvas[data-avatar-identity=${id}]`)?.dataset.assetVersion===version,{id,version:process.env.CT_CHARACTER_VERSION||'v10'});
   await page.waitForFunction(()=>Number(document.querySelector('.character-room canvas')?.dataset.blink)<.1);
   await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();
   for(const[view,text]of [['front','正面'],['detail','面部'],['outfit','服装'],['threequarter','45°'],['hands','手部'],['prop','道具'],['left','左侧'],['right','右侧'],['back','背面']]){
    await dialog.getByRole('button',{name:text,exact:true}).click();await page.waitForFunction(({id,view})=>{const d=document.querySelector(`.character-room canvas[data-avatar-identity=${id}]`)?.dataset;return d?.avatarView===view&&d.assetQuality===(view==='detail'?'portrait':'standard')},{id,view});await page.waitForTimeout(250);await dialog.screenshot({path:path.join(out,id+'-'+view+'.png')});
   }
   if(id==='city'){
    await dialog.getByRole('button',{name:'正面',exact:true}).click();await dialog.getByRole('button',{name:'查看平板',exact:true}).click();await page.waitForTimeout(650);await dialog.screenshot({path:path.join(out,'city-reading.png')});
   }
   report.checks.push({id,views:9,currentAsset:await dialog.locator('canvas').getAttribute('data-model-source')});await page.keyboard.press('Escape');
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.api,[]);report.passed=true;
 }catch(e){report.failure=String(e);report.state=await page.getByRole('dialog').evaluate(d=>({open:d.open,bounds:JSON.stringify(d.getBoundingClientRect()),canvas:{...d.querySelector('canvas')?.dataset},buttons:[...d.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled,bounds:JSON.stringify(b.getBoundingClientRect())}))})).catch(()=>null);process.exitCode=1}
 finally{clearTimeout(timer);await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report))}
})().catch(e=>{console.error(e);process.exitCode=1});
