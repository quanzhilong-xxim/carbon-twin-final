const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'finish-v108u-portable.cjs');
const source=fs.readFileSync(file,'utf8').replace("[['Student','v108p'],['Business','v108n'],['City','v108t']]","[['Student','v108p']]").replaceAll('v108u','v108v').replaceAll('ctFinishU','ctFinishV');
eval(source);
