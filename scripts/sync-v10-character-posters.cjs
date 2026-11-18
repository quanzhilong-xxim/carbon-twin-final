/* Entry portraits always come from the same exported models as the viewer. */
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require('sharp');
(async()=>{
 const version=process.env.CT_CHARACTER_VERSION||'v10',root=path.resolve(__dirname,'..'),evidence=path.join(root,'outputs/v10-explore/characters-'+version);
 for(const [id,stem]of [['student','Student'],['business','Business'],['city','City']]){
  for(const kind of ['role','full'])await sharp(path.join(evidence,`${kind}-${id}.png`)).webp({quality:92}).toFile(path.join(root,`public/media/explore-v10/${kind}-${id}-${version}.webp`));
  const file=path.join(root,`public/models/characters-v10/CT_${stem}_Explore_${version}.sources.json`),info=JSON.parse(await fs.readFile(file,'utf8'));
  info.surface_revision={...info.surface_revision,at:new Date().toISOString(),neutral_export_weights:true,posters_from_current_export:true,paid_calls:0,status:'exported-model posters synced; browser/art acceptance recorded separately'};
  await fs.writeFile(file,JSON.stringify(info,null,2));
 }
 console.log('Updated six exported-model posters and three source records; zero remote calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
