"""V13 read-only baseline + original contract ledgers. Never reads environment files."""
import hashlib, json, re, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=Path(r'C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v13')
WORK=ROOT/'work/citylight-v13-checkpoint'
DOC=ROOT/'docs/citylight'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x):
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8',errors='replace').strip()
def main():
    if (WORK/'snapshot.json').exists(): raise RuntimeError('Checkpoint already exists; refusing overwrite')
    OUT.mkdir(parents=True,exist_ok=True)
    paths=set()
    for name in ['app','components','lib','browser-tests','scripts','docs/citylight','public/models/citylight']:
        for p in (ROOT/name).rglob('*'):
            if p.is_file() and '__pycache__' not in p.parts and p.suffix.lower() in ['.ts','.tsx','.css','.js','.cjs','.json','.py','.md','.glb','.csv'] and not p.name.startswith('.env'):
                paths.add(p.relative_to(ROOT))
    for n in ['package.json','package-lock.json','tsconfig.json','AGENTS.md','netlify.toml']:
        if (ROOT/n).is_file(): paths.add(Path(n))
    for n in ['work/light-court-v12.blend','work/light-court-lod-v12.blend']:
        if (ROOT/n).is_file(): paths.add(Path(n))
    files=[]
    for rel in sorted(paths):
        source=ROOT/rel; target=WORK/'files'/rel
        target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
        files.append({'path':rel.as_posix(),'bytes':source.stat().st_size,'sha256':sha(source),'backupSHA256':sha(target)})
    snapshot={'at':datetime.now(timezone.utc).isoformat(),'root':str(ROOT),'branch':git('branch','--show-current'),'head':git('rev-parse','HEAD'),'gitStatus':git('status','--short'),'files':files,'environmentFilesReadOrCopied':False}
    save(WORK/'snapshot.json',snapshot)
    # Restore rehearsal is into an isolated directory, never onto the live working tree.
    rehearsed=[]
    for rel in ['components/3d/CitylightV12Studio.tsx','app/api/tts/route.ts','public/models/citylight/v12/light-court.glb']:
        src=WORK/'files'/rel
        if src.exists():
            dest=WORK/'restore-rehearsal'/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
            rehearsed.append({'path':rel,'matches':sha(src)==sha(dest)})
    historical=[]
    for old in ['work/citylight-v12-checkpoint/checkpoint.json','work/citylight-v12-r7/snapshot.json']:
        data=json.loads((ROOT/old).read_text(encoding='utf-8'))
        changed=[]
        for f in data['files']:
            p=ROOT/f['path'];expected=f.get('sha256',f.get('after'))
            if not p.exists() or (expected and sha(p)!=expected): changed.append(f['path'])
        historical.append({'record':old,'count':len(data['files']),'changed':changed})
    save(OUT/'protection-baseline.json',{'at':snapshot['at'],'branch':snapshot['branch'],'head':snapshot['head'],'protectedFiles':len(files),'backupVerified':all(f['sha256']==f['backupSHA256'] for f in files),'restoreRehearsal':rehearsed,'historicalRecheck':historical,'environmentFilesReadOrCopied':False})
    contract=Path(r'C:/Users/23242/Desktop/3.txt').read_text(encoding='utf-8-sig')
    supplement=Path(r'C:/Users/23242/.codex/attachments/31340179-0fba-454f-8a64-efccd54520fe/Pasted text.txt')
    save(OUT/'contract-source.json',{'v13SHA256':sha(Path(r'C:/Users/23242/Desktop/3.txt')),'v13Lines':len(contract.splitlines()),'v13_1SHA256':sha(supplement),'questions':'Q001–Q300 原文逐条提取','tasks':'T001–T120 原文逐条提取；状态采用V13.1枚举'})
    questions=[];category=''
    mapping=[(20,[1,2,3,4,5]),(40,[6,7,8,9,10]),(60,list(range(11,21))),(80,list(range(21,31))),(100,[24,25,26,27,28]),(120,list(range(41,51))),(140,list(range(31,41))),(160,[33,34,35,36,39,63,64,71,78]),(180,list(range(51,71))),(200,list(range(62,71))),(220,list(range(44,51))),(240,list(range(71,81))),(260,list(range(81,91))),(280,list(range(91,101))),(300,list(range(101,111)))]
    for line in contract.splitlines():
        if re.match(r'Q\d{3}—Q\d{3}',line):category=line
        m=re.match(r'(Q\d{3}) 问：(.*?)\s*\*\*设计答：\*\*(.*)',line)
        if m:
            num=int(m[1][1:]); tasks=next(t for end,t in mapping if num<=end)
            questions.append({'id':m[1],'category':category,'question':m[2],'acceptanceStandard':m[3],'actualAnswer':'尚未完成本轮逐题证据复核；原文的设计答案不是当前项目的通过证明。','evidence':[],'gap':'缺少本轮可复验证据或功能尚未完成。','risk':'P1','decision':'按关联任务核实、整改及复测，不以历史PASS补齐。','tasks':[f'TASK-{t:03}' for t in tasks],'responsibleAsset':'CL-T01-V12 / 原站对应模块','retestStatus':'UNVERIFIED','earnedPoints':0})
    tasks=[];stage=''
    rubric={'实际成果':40,'真实证据':25,'边界与安全':15,'复现与回归':15,'维护':5}
    for line in contract.splitlines():
        if re.match(r'S\d{2}｜',line):stage=line
        m=re.match(r'T(\d{3})｜(.*?)。\*\*产出',line)
        if m:
            n=int(m[1]); deps=[] if n==1 else [f'TASK-{n-1:03}']
            # Evidence studio is explicitly allowed as independent continuous supporting work.
            if n in [6,7,8,9,10]:deps=['TASK-003']
            tasks.append({'id':f'TASK-{n:03}','originalID':f'T{n:03}','stage':stage,'name':m[2],'goal':m[2],'dependencies':deps,'files':[],'expectedEffect':m[2],'rubric':rubric.copy(),'rubricFixedBeforeWork':True,'verification':'核对对应原文验收条件；安全任务以哈希/日志/回滚演练，视觉任务以实际模型、多视角及兼容性实测。','evidence':[],'performanceEvidence':[],'score':0,'scoreMeaning':'未测计0；不是用户美术评分','failureReasons':[],'repairs':[],'status':'NOT_STARTED','p0Open':False,'userApproved':False})
    assert len(questions)==300 and len(tasks)==120
    save(DOC/'Q300_LEDGER.json',{'source':'V13.0 原文','round':'设计/现状审查，非最终复核','questions':questions})
    save(DOC/'TASK_GATE_REGISTER.json',{'version':'V13.1','threshold':98,'currentUserVisualFeedback':'可能不足5—10分；未经重新认可不得提高','overall':'NOT_READY','rules':'依赖必须全部INTERNALLY_PASSED；证据中心为独立支撑工作；不得以数量或自动化通过替代美术评价','tasks':tasks})
    print(json.dumps({'protected':len(files),'historical':historical,'questions':len(questions),'tasks':len(tasks),'restoreRehearsal':rehearsed},ensure_ascii=False))
if __name__=='__main__':main()
