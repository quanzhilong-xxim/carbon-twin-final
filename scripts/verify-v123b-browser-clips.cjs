const {chromium,expect:baseExpect}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const expect=baseExpect.configure({timeout:60000}),base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3073',out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v123/native-clips');
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={base,at:new Date().toISOString(),roles:[],errors:[],http:[],passed:false};
 const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({url:new URL(r.url()).pathname,status:r.status()});});
 try{
  await page.goto(base+'/reviews/v123b/index.html'+(process.env.CT_ROLE_REVIEW_QUERY||''),{waitUntil:'domcontentloaded'});const canvas=page.locator('canvas');
  for(const role of (process.env.CT_ROLE_REVIEW_ROLES||'Student,Business,City').split(',')){
   if(await page.locator('#role').inputValue()!==role)await page.locator('#role').selectOption(role);
   await expect(canvas).toHaveAttribute('data-role',role);await expect(canvas).toHaveAttribute('data-ready','true');
   assert.equal(await canvas.getAttribute('data-clips'),'Idle,Wave,Turn');
   const row={role,revision:await canvas.getAttribute('data-asset-revision'),modelSource:await canvas.getAttribute('data-model-source'),clips:[]};report.roles.push(row);
   if(process.env.CT_ROLE_EXPECT_REVISION)assert.equal(row.revision,process.env.CT_ROLE_EXPECT_REVISION);
   for(const [clip,label]of [['Idle','待机'],['Wave','挥手'],['Turn','转身']]){
    await page.getByRole('button',{name:label,exact:true}).click();await page.locator('#timeline').fill('0.033');await page.waitForTimeout(100);
    const initial=JSON.parse(await canvas.getAttribute('data-wrist'));
    await page.locator('#timeline').fill('1.833');await page.waitForTimeout(100);
    const final=JSON.parse(await canvas.getAttribute('data-wrist')),distance=Math.hypot(...initial.map((v,i)=>v-final[i]));
    if(clip==='Wave')assert(distance>.04,'The actual native mixer must move the skinned wrist');
    assert.equal(await canvas.evaluate(c=>c.getContext('webgl2').isContextLost()),false);
    await page.screenshot({path:path.join(out,`${role}-${clip}.png`)});row.clips.push({clip,initial,final,distance});
    await page.getByRole('button',{name:'面部',exact:true}).click();await page.screenshot({path:path.join(out,`${role}-${clip}-face.png`)});
    await page.getByRole('button',{name:'全身',exact:true}).click();
   }
   await page.getByRole('button',{name:'面部',exact:true}).click();await page.screenshot({path:path.join(out,`${role}-face.png`)});
   if(process.env.CT_ROLE_REVIEW_VIEWS==='1'){
    await page.getByRole('button',{name:'待机',exact:true}).click();await page.locator('#timeline').fill('1');
    for(const angle of ['0','45','-45','90','-90','180']){await page.locator(`button[data-angle="${angle}"]`).click();await page.waitForTimeout(200);await page.screenshot({path:path.join(out,`${role}-collar-${angle}.png`)});}
    await page.locator('button[data-angle="0"]').click();row.multiAngleCollar=true;
   }
   await page.getByRole('button',{name:'全身',exact:true}).click();
   await page.getByRole('button',{name:'继续',exact:true}).click();const time=Number(await canvas.getAttribute('data-time'));await page.waitForTimeout(350);assert(Number(await canvas.getAttribute('data-time'))>time);
   await page.getByRole('button',{name:'暂停',exact:true}).click();row.resume=true;
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();await browser.close();report.finished=new Date().toISOString();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,roles:report.roles.length,failure:report.failure,errors:report.errors,http:report.http}));}
})().catch(e=>{console.error(e);process.exitCode=1});
