const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:3020',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('.city-formation canvas')?.dataset.rendered==='true',null,{timeout:60000});
 await p.getByRole('button',{name:'跳过到街区',exact:true}).click();
 await p.waitForTimeout(12000);
 console.log(JSON.stringify(await p.locator('.city-formation').evaluate(el=>({mode:el.querySelector('.scene-stage')?.dataset.mode,canvas:el.querySelector('canvas')?.dataset})),null,2));
 await b.close();
})().catch(e=>{console.error(e.message);process.exitCode=1;});
