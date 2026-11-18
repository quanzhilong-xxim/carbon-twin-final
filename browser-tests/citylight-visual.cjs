const sharp=require('sharp');
/** Check high-frequency scene structure in the central region, away from UI.
 * Unlike stdev, this rejects the dithered CSS background of the WebKit failure.
 * This detects blank composition; artistic quality still needs visual review.
 */
async function sceneEvidence(file){
 const meta=await sharp(file).metadata();const{data,info}=await sharp(file).extract({left:Math.floor(meta.width*.25),top:Math.floor(meta.height*.12),width:Math.floor(meta.width*.5),height:Math.floor(meta.height*.62)}).greyscale().raw().toBuffer({resolveWithObject:true});
 let edges=0,gradient=0,count=0;
 for(let y=1;y<info.height;y++)for(let x=1;x<info.width;x++){
  const i=y*info.width+x,d=Math.max(Math.abs(data[i]-data[i-1]),Math.abs(data[i]-data[i-info.width]));
  gradient+=d;if(d>20)edges++;count++;
 }
 return{edgeRatio:edges/count,meanGradient:gradient/count,pass:edges/count>.006&&gradient/count>1.2};
}
module.exports={sceneEvidence};
