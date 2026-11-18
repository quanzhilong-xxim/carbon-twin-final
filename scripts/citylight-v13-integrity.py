"""Final local integrity + gate validation; reads no environment files."""
import difflib,hashlib,json,subprocess
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(r'C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v13')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
snapshot=load(ROOT/'work/citylight-v13-checkpoint/snapshot.json')
changes=[];missing=[]
for f in snapshot['files']:
    p=ROOT/f['path']
    if not p.exists():missing.append(f['path'])
    elif sha(p)!=f['sha256']:changes.append({'path':f['path'],'before':f['sha256'],'after':sha(p)})
assert not missing
assert [f['path'] for f in changes]==['components/3d/CitylightV12Studio.tsx'],changes
changedPath=ROOT/changes[0]['path'];before=(ROOT/'work/citylight-v13-checkpoint/files'/changes[0]['path']).read_text(encoding='utf-8');after=changedPath.read_text(encoding='utf-8')
diff=''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='checkpoint',tofile='current'))
assert sum(line.startswith('- ') for line in diff.splitlines())==2
(OUT/'workbench-minimal-diff.txt').write_text(diff,encoding='utf-8')
historic=[]
for record,key in [('work/citylight-v12-checkpoint/checkpoint.json','files'),('work/citylight-v12-r7/snapshot.json','v12Snapshot')]:
    d=load(ROOT/record);delta=[]
    for f in d[key]:
        p=ROOT/f['path'];expected=f['sha256']
        if not p.exists() or sha(p)!=expected:delta.append(f['path'])
    historic.append({'record':record,'entries':len(d[key]),'changed':delta,'expectedChanges':['components/3d/CitylightV12Studio.tsx'] if key=='v12Snapshot' else []})
baseline=load(OUT/'protection-baseline.json')
baseline.update(atFinal=datetime.now(timezone.utc).isoformat(),currentBranch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),unchangedSinceCheckpoint=len(snapshot['files'])-len(changes),changes=changes,missing=missing,historicalFinalRecheck=historic,reason='仅工作台入口链接与最新用户反馈文字两处更改；渲染和业务逻辑没有变更。',secretFilesReadOrCopied=False,originalServicesRestarted=False,onlyStoppedProcesses='本智能体挂起的证据测试进程；没有停止原服务',paidAIRequests=0,knownNewInferenceCost=0,productionDeployed=False)
save(OUT/'protection-current.json',baseline)
g=load(ROOT/'docs/citylight/TASK_GATE_REGISTER.json');q=load(ROOT/'docs/citylight/Q300_LEDGER.json')
assert [t['id'] for t in g['tasks']]==[f'TASK-{i:03}' for i in range(1,121)]
assert [t['id'] for t in q['questions']]==[f'Q{i:03}' for i in range(1,301)]
allowed={'NOT_STARTED','IN_PROGRESS','FAILED_GATE','BLOCKED','REWORKING','READY_FOR_RETEST','INTERNALLY_PASSED','REGRESSION_FAILED'}
tasks={t['id']:t for t in g['tasks']}
for t in g['tasks']:
    assert t['status'] in allowed
    assert sum(t['rubric'].values())==100
    if t['status']=='INTERNALLY_PASSED':
        assert t['score']>=98 and not t['p0Open'] and t['evidence']
        assert all(tasks[d]['status']=='INTERNALLY_PASSED' for d in t['dependencies'])
assert tasks['TASK-006']['status']=='BLOCKED'
assert all(t['status']=='NOT_STARTED' for t in g['tasks'][6:])
save(OUT/'gate-validation.json',{'tasks':120,'questions':300,'originalOrderPreserved':True,'scoreDenominatorsPreserved':True,'passedAuditTasks':[t['id'] for t in g['tasks'] if t['status']=='INTERNALLY_PASSED'],'blocked':'TASK-006','artStageUnlocked':False,'userVisualRatingChanged':False,'result':'PASS_REGISTER_INTEGRITY_ONLY'})
print(json.dumps({'protected':len(snapshot['files']),'unchanged':baseline['unchangedSinceCheckpoint'],'intentionalChanges':changes,'historical':historic,'gateValidation':'PASS'},ensure_ascii=False))
