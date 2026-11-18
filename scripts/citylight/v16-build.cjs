// Copy existing sources into an isolated build folder. Credentials never copied.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const root=path.resolve(__dirname,'../..'),out=process.env.CITYLIGHT_OUTPUT;
if(!out)throw Error('CITYLIGHT_OUTPUT required');
const sandbox=path.join(root,'work','citylight-v16-build-'+path.basename(out));
if(fs.existsSync(sandbox))throw Error('Do not overwrite an earlier sandbox');
fs.mkdirSync(sandbox,{recursive:true});fs.mkdirSync(out,{recursive:true});
for(const dir of ['app','components','lib','types','prisma'])if(fs.existsSync(path.join(root,dir)))fs.cpSync(path.join(root,dir),path.join(sandbox,dir),{recursive:true});
for(const file of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.mjs','postcss.config.mjs','postcss.config.js','tailwind.config.ts','.eslintrc.json'])if(fs.existsSync(path.join(root,file)))fs.copyFileSync(path.join(root,file),path.join(sandbox,file));
const source=[];function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())scan(p);else source.push({path:path.relative(sandbox,p),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})}}scan(sandbox);fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(source,null,2));
fs.symlinkSync(path.join(root,'node_modules'),path.join(sandbox,'node_modules'),'junction');
const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','USERPROFILE','TEMP','TMP','LOCALAPPDATA','APPDATA','COMSPEC'])if(process.env[key])env[key]=process.env[key];
env.NEXT_TELEMETRY_DISABLED='1';env.NODE_OPTIONS='--require '+JSON.stringify(path.join(root,'work/citylight-build-guard.cjs'));
const log=fs.createWriteStream(path.join(out,'build.log')),start=new Date().toISOString();
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build'],{cwd:sandbox,env,windowsHide:true});
child.stdout.pipe(log);child.stderr.pipe(log);child.on('exit',exitCode=>{const result={start,end:new Date().toISOString(),exitCode,sandbox,credentialsCopied:false,providerEnvironmentInherited:false,activeDevArtifactsTouched:false,guard:'existing citylight-build-guard: local non-API and bounded Google font requests only'};fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=exitCode});

