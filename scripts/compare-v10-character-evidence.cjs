/* Compare genuine browser captures. Labels distinguish targets from output. */
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),base=path.join(root,'outputs/v10-explore');
const before=path.join(base,'character-v10-runtime-1794172003804');
// A focused one-role repair is not a complete three-role evidence set.
const current=(async()=>{
 const names=process.env.CT_CHARACTER_DETAIL_DIR?[process.env.CT_CHARACTER_DETAIL_DIR]:(await fs.readdir(base)).filter(n=>n.startsWith('character-detail-final-')).sort((a,b)=>Number(b.split('-').at(-1))-Number(a.split('-').at(-1)));
 for(const n of names){const dir=path.isAbsolute(n)?n:path.join(base,n);try{const r=JSON.parse(await fs.readFile(path.join(dir,'result.json'),'utf8'));if(!r.passed)continue;await Promise.all(['student','business','city'].flatMap(id=>['front','detail','threequarter','left','back'].map(view=>fs.access(path.join(dir,id+'-'+view+'.png')))));return dir}catch{}}
 throw Error('No complete, passing three-role capture set. Capture all three current roles first.');
})();
const refs='C:/Users/23242/Documents/Codex/2026-11-07/ni/work/reference-audit/images073';
const label=(text,width=1180)=>Buffer.from(`<svg width="${width}" height="60"><rect width="100%" height="100%" fill="#10271d"/><text x="24" y="39" font-size="21" fill="#e8eddb" font-family="Arial">${text}</text></svg>`);
(async()=>{
 const after=await current,out=path.join(base,'reference-fit-comparisons-'+path.basename(after).split('-').at(-1));await fs.mkdir(out,{recursive:true});const files=[];
 for(const id of ['student','business','city']){
  const images=await Promise.all([sharp(path.join(before,id+'-room-front.png')).resize(1180,762,{fit:'contain',background:'#10271d'}).png().toBuffer(),sharp(path.join(after,id+'-front.png')).resize(1180,762,{fit:'contain',background:'#10271d'}).png().toBuffer()]);
  const file=path.join(out,id+'-before-current.png');
  await sharp({create:{width:2360,height:822,channels:4,background:'#10271d'}}).composite([{input:label('BEFORE - saved real browser view'),left:0,top:0},{input:label('CURRENT - real browser view; art acceptance pending'),left:1180,top:0},{input:images[0],left:0,top:60},{input:images[1],left:1180,top:60}]).png().toFile(file);files.push(file);
  const views=[];for(const [index,view]of ['front','threequarter','left','back'].entries()){
   const picture=await sharp(path.join(after,id+'-'+view+'.png')).resize(590,420,{fit:'contain',background:'#10271d'}).png().toBuffer();
   views.push({input:label(view.toUpperCase()+' - real browser',590),left:(index%2)*590,top:Math.floor(index/2)*480},{input:picture,left:(index%2)*590,top:Math.floor(index/2)*480+60});
  }
  const sheet=path.join(out,id+'-front-45-side-back.png');await sharp({create:{width:1180,height:960,channels:4,background:'#10271d'}}).composite(views).png().toFile(sheet);files.push(sheet);
 }
 for(const [id,ref]of [['student','074_a3ba842c39b243196a3b5b1eadb4bc43.png'],['business','078_b49ef97a9684a5ef4ee637b0d9566b80.png'],['city','080_c41043c1772b8ebc1d72eb8775b19069.png']]){
  const original=await sharp(path.join(refs,ref)).resize(1180,885,{fit:'contain',background:'#10271d'}).png().toBuffer();
  const current=await sharp(path.join(after,id+'-detail.png')).resize(1180,885,{fit:'contain',background:'#10271d'}).png().toBuffer();
  const file=path.join(out,id+'-target-current.png');
  await sharp({create:{width:2360,height:945,channels:4,background:'#10271d'}}).composite([{input:label('USER TARGET - original concept reference'),left:0,top:0},{input:label('CURRENT WEBGL - visible differences remain'),left:1180,top:0},{input:original,left:0,top:60},{input:current,left:1180,top:60}]).png().toFile(file);files.push(file);
 }
 await fs.writeFile(path.join(out,'sources.json'),JSON.stringify({at:new Date().toISOString(),before,after,referenceDirectory:refs,files,method:'Labelled composites of unretouched source references and actual browser screenshots. No generated imagery or scoring.'},null,2));console.log(JSON.stringify({out,files}));
})().catch(e=>{console.error(e);process.exitCode=1});
