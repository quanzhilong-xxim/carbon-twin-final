const fs=require('fs'),path=require('path');
const{webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await webkit.launch({headless:true});const report={paidCalls:0,requests:[],failed:[],errors:[]};
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(!['127.0.0.1','localhost'].includes(u.hostname)||!['GET','HEAD'].includes(r.method())||(u.pathname.startsWith('/api/')&&u.pathname!=='/api/auth/session'))return route.abort();return route.continue();});
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{const p=new URL(r.url()).pathname;if(p==='/'||r.status()>=400)report.requests.push({path:p,status:r.status()});});page.on('requestfailed',r=>report.failed.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  await page.goto('http://127.0.0.1:3020/city-studies',{waitUntil:'domcontentloaded',timeout:120000});
  const link=page.getByRole('link',{name:'返回原城市 ↗',exact:true});await expect(link).toHaveAttribute('href','/');
  report.before=page.url();const start=Date.now();
  try{await link.click();await expect(page).toHaveURL('http://127.0.0.1:3020/',{timeout:30000});report.navigation='PASS';}catch(e){report.navigation='FAIL';report.error=e.message;}
  report.navigationMs=Date.now()-start;report.after=page.url();await page.screenshot({path:path.join(out,'webkit-navigation.png'),fullPage:true});await context.close();
 }finally{await browser.close();fs.writeFileSync(path.join(out,'navigation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.navigation!=='PASS')process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
