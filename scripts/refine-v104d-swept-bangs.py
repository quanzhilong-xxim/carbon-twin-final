"""Add scalp-following middle-scale locks after the first actual D render.
Archives the prior D business master externally before this local refinement.
"""
import bpy,math,json,shutil,hashlib,datetime
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/models/characters-v10'
file=OUT/'CT_Business_Explore_v104d.blend'
backup=Path('D:/CarbonTwin_Recovery_Backups/v10-visual-rebuild')/('V104D-QUFF-PREEDIT-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir()
shutil.copy2(file,backup/file.name)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(file)==sha(backup/file.name)
(backup/'manifest.json').write_text(json.dumps({'source':str(file),'sha256':sha(file),'verified':True},indent=2))
bpy.ops.wm.open_mainfile(filepath=str(file),load_ui=False,use_scripts=False)
root=bpy.data.objects['CT_Business_Explore_v104d'];parent=bpy.data.objects['Head']
bpy.context.view_layer.update()
if root.get('scalp_following_bangs'):raise RuntimeError('Already refined')
cap=bpy.data.objects['V104d fitted complete scalp'];ps=[cap.matrix_world@v.co for v in cap.data.vertices]
center=Vector((0,0,1.598));mat=cap.data.materials[0]
def surface(a,phi):
    # Interpolate the known source ring grid directly. Rays were rejected
    # after missing the cropped cap; no inferred fallback sphere is used.
    edge=1.20+.67*max(0,math.sin(a))+.27*(1-abs(math.sin(a)))
    row=max(0,min(26.999,(phi-.006)/(edge-.006)*27));col=(a/math.tau%1)*96
    j=int(row);i=int(col);v=row-j;u=col-i
    p0=ps[j*96+i].lerp(ps[j*96+(i+1)%96],u)
    p1=ps[(j+1)*96+i].lerp(ps[(j+1)*96+(i+1)%96],u)
    p=p0.lerp(p1,v);n=(p-center).normalized();return p,n
for band in range(13):
    vs=[];fs=[];uv=[];R=54;N=12
    for j in range(R):
        t=j/(R-1);a=-.42-2.42*t;phi=.21+band*.036+.89*t
        p,n=surface(a,phi);p2,_=surface(a-.003,phi+.001)
        tangent=(p2-p).normalized();side=tangent.cross(n).normalized()
        taper=max(.025,math.sin(math.pi*(.04+.92*t))**.65)
        p+=n*(.002+(.009+.003*math.sin(band*.5))*math.sin(math.pi*t))
        for k in range(N):
            ang=k/N*math.tau;vs.append(tuple(p+side*.010*taper*math.cos(ang)+n*.0045*taper*math.sin(ang)));uv.append((k/N,t))
    for j in range(R-1):
        for k in range(N):a=j*N+k;b=j*N+(k+1)%N;fs.append((a,b,b+N,a+N))
    fs.extend([tuple(reversed(range(N))),tuple((R-1)*N+k for k in range(N))])
    mesh=bpy.data.meshes.new('V104d measured side swept fringe');mesh.from_pydata(vs,[],fs);mesh.materials.append(mat)
    layer=mesh.uv_layers.new()
    for f in mesh.polygons:
        f.use_smooth=True
        for li in f.loop_indices:layer.data[li].uv=uv[mesh.loops[li].vertex_index]
    obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.scene.collection.objects.link(obj);bpy.context.view_layer.update();w=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=w
root['scalp_following_bangs']=True;bpy.ops.wm.save_as_mainfile(filepath=str(file))
(ROOT/'docs/recovery/v10.4/swept-fringe-d.json').write_text(json.dumps({'fitted_lock_count':13,'preedit_backup':str(backup),'editable_master':str(file),'paid_calls':0},indent=2))
