/* Public documentation only. Saves exact consulted pages; no model/API calls. */
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/recovery/v10.4/reference-pages');await fs.mkdir(out,{recursive:true});
 const sources=[
  ['r3f-hooks','https://r3f.docs.pmnd.rs/api/hooks','Existing useFrame, useThree and scene lifecycle; no copied page source'],
  ['gltfloader','https://threejs.org/docs/pages/GLTFLoader.html','Retained GLB loader and shared cache; WebP extension already in exported assets'],
  ['three-textures','https://threejs.org/manual/en/textures.html','Colour-space, normal-map and per-instance owned texture disposal'],
  ['playwright-video','https://playwright.dev/docs/videos','Real browser recording closed before retrieving video'],
  ['mdn-contrast','https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast','Algorithmic contrast audit of actual application text'],
  ['polyhaven-license','https://polyhaven.com/license','Exact bookshelf source CC0; checksums and implementation recorded separately'],
  ['ghg-standard','https://ghgprotocol.org/corporate-standard','Existing Scope definitions retained; no invented emissions'],
  ['ipcc-synthesis','https://www.ipcc.ch/report/ar6/syr/','Existing archive source route retained']
 ];const reports=[];
 // Bounded read concurrency of two; not parallel AI requests.
 for(let i=0;i<sources.length;i+=2){const results=await Promise.allSettled(sources.slice(i,i+2).map(async([id,url,use])=>{const response=await fetch(url,{signal:AbortSignal.timeout(25000)}),body=await response.text();await fs.writeFile(path.join(out,id+'.html'),body);return{id,url,resolved:response.url,status:response.status,title:body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim(),use,at:new Date().toISOString(),copiedCode:false};}));results.forEach((r,k)=>reports.push(r.status==='fulfilled'?r.value:{id:sources[i+k][0],url:sources[i+k][1],failure:String(r.reason)}));}
 await fs.writeFile(path.join(out,'consulted.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
})().catch(e=>{console.error(e);process.exitCode=1});
