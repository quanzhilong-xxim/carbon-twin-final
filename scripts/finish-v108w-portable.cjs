const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'finish-v108u-portable.cjs'),'utf8').replaceAll('v108u','v108w').replaceAll('ctFinishU','ctFinishW');
eval(source);
