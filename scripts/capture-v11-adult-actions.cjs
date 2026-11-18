const {chromium}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve(process.env.CT_ADULT_ACTION_OUT||'outputs/v108/internal/adult-actions');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
 try{
 await context.route('**/api/**',r=>r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066')+'/#identities',{waitUntil:'domcontentloaded'});
 const roles=[];
 for(const id of ['business','city']){
  const card=page.locator(`.identity-unit[data-character=${id}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();const dialog=page.getByRole('dialog');
  await page.waitForFunction(id=>document.querySelector('.character-room canvas')?.dataset.avatarIdentity===id,id,{timeout:90000});
  const actions=[];
  for(const label of [id==='city'?'查看平板':'看数据','思考','介绍']){
   await dialog.getByRole('button',{name:label,exact:true}).click();await dialog.getByRole('button',{name:'正面',exact:true}).click();await page.waitForTimeout(1600);await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();await dialog.screenshot({path:path.join(out,`${id}-${label}-front.png`)});
   await dialog.getByRole('button',{name:'手部',exact:true}).click();await page.waitForTimeout(800);await dialog.screenshot({path:path.join(out,`${id}-${label}-hands.png`)});actions.push({label,state:await dialog.locator('canvas').evaluate(c=>({...c.dataset}))});
  }
  roles.push({id,actions});await page.getByRole('button',{name:'关闭角色展厅'}).click();
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),roles,errors,video:await page.video().path()},null,2));console.log(out);
 }finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
