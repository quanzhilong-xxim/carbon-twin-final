const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises'), path = require('node:path');
(async()=>{
 const out=path.resolve(process.env.CT_CHARACTER_REVIEW_OUT||'outputs/v108/internal/v11e-review');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
 try {
 await context.route('**/api/**',route=>route.abort());
 await context.route(/CT_(Student|Business|City)_Explore_v11d(-portrait|-lite)?\.glb/,async route=>{const file=decodeURIComponent(new URL(route.request().url()).pathname).replace('v11d','v11e');await route.fulfill({path:path.join(__dirname,'../public',file),contentType:'model/gltf-binary'});});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066')+'/#identities',{waitUntil:'domcontentloaded'});
 for(const id of ['student','business','city']){
  if(process.env.CT_CHARACTER_REVIEW_ROLE&&id!==process.env.CT_CHARACTER_REVIEW_ROLE)continue;
  const card=page.locator(`.identity-unit[data-character=${id}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
  const dialog=page.getByRole('dialog');await page.waitForFunction(id=>document.querySelector('.character-room canvas')?.dataset.avatarIdentity===id,id,{timeout:90000});
  await page.waitForTimeout(1500);await dialog.screenshot({path:path.join(out,id+'-front.png')});
  if(id==='student'){await dialog.getByRole('button',{name:'展示相机',exact:true}).click();await page.waitForTimeout(1800);await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();await dialog.screenshot({path:path.join(out,id+'-camera.png')});await dialog.getByRole('button',{name:'道具',exact:true}).click();await page.waitForTimeout(1000);await dialog.screenshot({path:path.join(out,id+'-camera-detail.png')});await dialog.getByRole('button',{name:'记录笔记',exact:true}).click();await page.waitForTimeout(2000);await dialog.screenshot({path:path.join(out,id+'-recording.png')});await dialog.getByRole('button',{name:'手部',exact:true}).click();await page.waitForTimeout(1500);await dialog.screenshot({path:path.join(out,id+'-recording-hands.png')});}
  await dialog.getByRole('button',{name:'面部',exact:true}).click();await page.waitForTimeout(1000);await dialog.screenshot({path:path.join(out,id+'-face.png')});
  await page.getByRole('button',{name:'关闭角色展厅'}).click();
 }
 await fs.writeFile(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),reviewedRoles:process.env.CT_CHARACTER_REVIEW_ROLE?[process.env.CT_CHARACTER_REVIEW_ROLE]:['student','business','city'],candidateRoutes:['Student v11e','Business v11e','City v11e'],student:'v11e with new runtime IK',errors,video:await page.video().path()},null,2));console.log(out);
 } finally { await context.close(); await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
