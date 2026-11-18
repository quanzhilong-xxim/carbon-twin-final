// Verify native GLB clips in the actual homepage and character room.
const{chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:60000}),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'chromium',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3082',out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v123/native-integration');
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={engine,base,at:new Date().toISOString(),roles:[],errors:[],http:[],passed:false,artAccepted:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless: true, ...require('./browser-runtime.cjs').launchOptions(),...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('**/api/**',route=>route.abort());const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded'});
  for(const[id,revision]of[['student','v123b'],['business','v123g'],['city','v123e']].filter(([id])=>!process.env.CT_ROLES||process.env.CT_ROLES.split(',').includes(id))){
   const unit=page.locator(`.identity-unit[data-character="${id}"]`);await unit.scrollIntoViewIfNeeded();await unit.locator('.identity-card').click();
   const cardCanvas=unit.locator('canvas');await expect(cardCanvas).toHaveAttribute('data-asset-version',revision);await expect(cardCanvas).toHaveAttribute('data-native-clip','Idle');
   await unit.getByRole('button',{name:'挥手致意',exact:true}).click();await expect(cardCanvas).toHaveAttribute('data-native-clip','Wave');
   await page.waitForTimeout(650);await unit.getByRole('button',{name:'暂停动作',exact:true}).click();const paused=Number(await cardCanvas.getAttribute('data-native-clip-time'));await page.waitForTimeout(300);assert.equal(Number(await cardCanvas.getAttribute('data-native-clip-time')),paused);
   await unit.getByRole('button',{name:'继续动作',exact:true}).click();await expect.poll(async()=>Number(await cardCanvas.getAttribute('data-native-clip-time'))).toBeGreaterThan(paused);
   await unit.getByRole('button',{name:'进入角色展厅',exact:true}).click();const room=page.getByRole('dialog'),canvas=room.locator('canvas');
   await expect(canvas).toHaveAttribute('data-asset-version',revision);await expect(canvas).toHaveAttribute('data-native-clip','Idle');
   const row={id,revision,cardPauseResume:true,clips:[],views:[],mobile:false};report.roles.push(row);
   for(const[label,clip]of[['挥手致意','Wave'],['轻转身','Turn'],['自然休息','Idle']]){
    await room.getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-native-clip',clip);
    const first=JSON.parse(await canvas.getAttribute('data-native-wrist'));await page.waitForTimeout(1000);const last=JSON.parse(await canvas.getAttribute('data-native-wrist'));
    assert(first.every(Number.isFinite)&&last.every(Number.isFinite));const distance=Math.hypot(...last.map((x,i)=>x-first[i]));if(clip==='Wave')assert(distance>.005,'Exported Wave must move the actual wrist');
    row.clips.push({clip,distance});await room.screenshot({path:path.join(out,`${id}-${clip}.png`)});
   }
   for(const[label,view]of[['正面','front'],['左侧','left'],['右侧','right'],['45°','threequarter'],['背面','back'],['面部','detail']]){await room.getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-avatar-view',view);await expect(room.locator('.avatar-stage')).toHaveAttribute('data-ready','true');await page.waitForTimeout(250);await room.screenshot({path:path.join(out,`${id}-${label}.png`)});row.views.push(label);}
   await page.setViewportSize({width:375,height:844});await expect(canvas).toHaveAttribute('data-asset-quality','lite');await expect(canvas).toHaveAttribute('data-native-clip','Idle');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await room.getByRole('button',{name:'正面',exact:true}).click();await room.getByRole('button',{name:'挥手致意',exact:true}).click();await expect(canvas).toHaveAttribute('data-native-clip','Wave');await room.getByRole('button',{name:'暂停动作',exact:true}).click();await room.evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,`${id}-mobile.png`)});row.mobile=true;
   await page.keyboard.press('Escape');await expect(room).toHaveCount(0);await page.setViewportSize({width:1440,height:1000});
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(error){report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({engine,passed:report.passed,roles:report.roles,errors:report.errors,http:report.http,failure:report.failure?.slice(0,600)}));}
})().catch(error=>{console.error(error);process.exitCode=1;});
