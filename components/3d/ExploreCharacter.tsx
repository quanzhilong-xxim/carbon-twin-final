'use client';
import { SceneFrameReady, SceneLifecycle, useSceneRuntime } from '@/lib/three/scene-runtime';
import { SceneResources, Environment, useGLTF } from '@/lib/three/scene-assets';

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Identity } from '@/lib/store';
import type { AvatarAction } from './IdentityAvatar';
import { exploreCharacterAssets, exploreCharacterModel, exploreCharacterPoster, isRefinedCharacterPreview, isV135MasterPreview, isV137StudentPreview, isV138StudentPreview, isV139StudentPreview, isV1311StudentPreview, isV1311CStudentPreview, isV1311DStudentPreview, isV1312AStudentPreview, characterMaster, characterMasterV137, characterMasterV138, characterMasterV139, characterMasterV1311, characterMasterV1311C, characterMasterV1311D, characterMasterV1312A, type CharacterQuality } from '@/lib/visuals/exploreCharacterAssets';
import { articulatedCharacter } from '@/lib/visuals/characterArm';
import { characterPerformance, type CharacterPose } from '@/lib/visuals/characterPerformance';
import { studentCharacter, studentPerformance } from '@/lib/visuals/studentPerformance';
import { nativeAdultCharacter, nativeAdultPerformance } from '@/lib/visuals/nativeAdult';
import CharacterSetting from './CharacterSetting';
import { characterCamera, type AvatarView } from '@/lib/visuals/characterCamera';
import {nativeClipCharacter,nativeClipPerformance} from '@/lib/visuals/nativeClipPerformance';
import {createStableRenderer,needsStableDrawingBuffer} from '@/lib/citylight/stable-renderer';

export type { AvatarView } from '@/lib/visuals/characterCamera';
export const characterPoster = exploreCharacterPoster;
const nativeCandidateAction = (id: Identity, action: AvatarAction) => id === 'business' && exploreCharacterAssets[id].version.startsWith('v12') && (action === 'standing' || action === 'walking');

class CharacterBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onFailure: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onFailure(error); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Character({ id, action, sequence, view, reduced, paused, quality, engaged, onActionComplete }: {
  id: Identity; action: AvatarAction; sequence: number; view: AvatarView; reduced: boolean; paused: boolean; quality: CharacterQuality; engaged: boolean; onActionComplete?:(sequence:number)=>void;
}) {
  const url = exploreCharacterModel(id, quality);
  // The decoder path also enables Draco-compressed character LODs; non-compressed
  // GLBs (v123/v132) load unchanged because the extension is simply absent.
  const { scene,animations } = useGLTF(url, '/models/draco/'), { gl, camera, invalidate } = useThree();
  const orbit = useThree(state => state.controls) as unknown as { target: THREE.Vector3; update: () => void } | undefined;
  // Geometry/material cache remains immutable; articulated instances own their
  // skeletons, morph weights and fitted sleeve buffers.
  const native = Boolean(scene.getObjectByName('CT_Humanoid'));
  const embedded=animations.some(clip=>clip.name==='Idle');
  const rig = useMemo(() => embedded?nativeClipCharacter(scene,id):id === 'student' ? studentCharacter(scene) : native ? nativeAdultCharacter(scene) : articulatedCharacter(scene, id), [scene, id, native,embedded]);
  const model = rig.model;
  const writingView = id === 'student' && view === 'hands' && action === 'recording';
  const standingView = native && id === 'business' && (action === 'standing' || action === 'walking');
  useEffect(() => () => rig.dispose(), [rig]);
  const parts = useMemo(() => ({
    head: model.getObjectByName(id === 'student' ? 'J_Bip_C_Head' : 'Head'),
    arm: model.getObjectByName(id === 'student' ? 'J_Bip_R_UpperArm' : 'ArmRight'),
    elbow: id === 'student' ? model.getObjectByName('J_Bip_R_LowerArm') : rig.elbow,
  }), [model, id, rig.elbow]);
  const pose = useRef<{ id: Identity; state: CharacterPose }>();
  const handFraming = useRef(0);
  const completedSequence = useRef(-1);
  const performance = useMemo(() => embedded?nativeClipPerformance(model,animations,pose.current?.id===id?pose.current.state:undefined):id === 'student'
    ? studentPerformance(model, pose.current?.id === id ? pose.current.state : undefined)
    : native ? nativeAdultPerformance(model, id, pose.current?.id === id ? pose.current.state : undefined)
    : characterPerformance(model, id, rig.elbows, pose.current?.id === id ? pose.current.state : undefined), [model, id, rig.elbows, native,embedded,animations]);
  useEffect(()=>()=>{if('dispose' in performance&&typeof performance.dispose==='function')performance.dispose();},[performance]);
  useEffect(() => {
    const version = embedded?(url.match(/_(v12[0-9][a-z]*|v13[0-9][a-z]*)(?:-[a-z0-9]+)?\.glb/)?.[1]??'native'):exploreCharacterAssets[id].version;
    gl.domElement.dataset.avatarIdentity = id;
    gl.domElement.dataset.assetVersion = version;
    gl.domElement.dataset.modelSource = url;
    gl.domElement.dataset.assetQuality = quality;
    // V13.5/V13.7 unified identity metadata (read by cross-scene consistency tests).
    const masterMeta = id === 'student' ? (isV1312AStudentPreview ? characterMasterV1312A : isV1311DStudentPreview ? characterMasterV1311D : isV1311CStudentPreview ? characterMasterV1311C : isV1311StudentPreview ? characterMasterV1311 : isV139StudentPreview ? characterMasterV139 : isV138StudentPreview ? characterMasterV138 : isV137StudentPreview ? characterMasterV137 : isV135MasterPreview ? characterMaster : null) : null;
    gl.domElement.dataset.characterId = id;
    gl.domElement.dataset.characterVersion = masterMeta ? masterMeta.assetVersion : version;
    gl.domElement.dataset.materialVersion = masterMeta ? masterMeta.materialVersion : 'legacy';
    gl.domElement.dataset.animationVersion = masterMeta ? masterMeta.animationVersion : 'legacy';
    gl.domElement.dataset.lodLevel = quality;
  }, [gl, id, parts, url, quality, embedded]);
  useEffect(() => { invalidate(); }, [action, sequence, paused, invalidate]);
  useEffect(() => {
    const pose = characterCamera(id, view, writingView, standingView, action === 'greeting'); model.rotation.y = pose.rotation;
    camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateProjectionMatrix(); invalidate();
    handFraming.current = 0;
  }, [view, id, camera, invalidate, model, writingView, standingView, action]);
  useFrame(({ pointer }, dt) => {
    const state = performance.update(dt, action, sequence, reduced, paused, pointer, engaged);
    if(embedded&&'completed' in state&&state.completed&&!reduced&&completedSequence.current!==sequence){completedSequence.current=sequence;onActionComplete?.(sequence);}
    if(embedded){const clip=model.userData.nativeClip;gl.domElement.dataset.nativeClip=clip?.name??'';gl.domElement.dataset.nativeClipTime=String(clip?.time??0);const wrist=model.getObjectByName(id==='student'?'J_Bip_R_Hand':'CT_Hand_R');if(wrist)gl.domElement.dataset.nativeWrist=JSON.stringify(wrist.getWorldPosition(new THREE.Vector3()).toArray());}
    // The native hands move from the chair arms to the face during thinking.
    // Frame their actual joints briefly after a view/action change, then leave
    // OrbitControls free for inspection. A static waist target cropped them.
    if (native && view === 'hands' && handFraming.current < 1.4) {
      const activeHand = ['greeting', 'guide', 'thinking'].includes(action);
      const names = (activeHand ? ['R'] : ['R', 'L']).flatMap(side =>
        ['Hand', 'Thumb3', 'Index3', 'Middle3', 'Ring3', 'Pinky3'].map(joint => `CT_${joint}_${side}`));
      const points = names.map(name => model.getObjectByName(name)).filter((bone): bone is THREE.Object3D => Boolean(bone))
        .map(bone => bone.getWorldPosition(new THREE.Vector3()));
      if (points.length > 1 && camera instanceof THREE.PerspectiveCamera) {
        const bounds = new THREE.Box3().setFromPoints(points).expandByScalar(.025), center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3()), tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
        const distance = Math.max(.34, size.y / (2 * tan), size.x / (2 * tan * camera.aspect)) * 1.3 + size.z;
        camera.position.copy(center).add(new THREE.Vector3(.025, .025, distance)); camera.lookAt(center);
        if (orbit) { orbit.target.copy(center); orbit.update(); }
        camera.updateMatrixWorld();
        const projected = points.map(p => p.clone().project(camera));
        gl.domElement.dataset.handFrame = JSON.stringify({ joints: names, min: [Math.min(...projected.map(p => p.x)), Math.min(...projected.map(p => p.y))], max: [Math.max(...projected.map(p => p.x)), Math.max(...projected.map(p => p.y))] });
      }
      handFraming.current = paused ? 1.4 : handFraming.current + Math.min(dt, .05);
    }
    if (native) gl.domElement.dataset.nativeRig = JSON.stringify(model.userData.nativeRig ?? null);
    pose.current = { id, state: performance.snapshot() };
    Object.assign(gl.domElement.dataset, { action, avatarView: view, motion: state.motion, paused: String(paused), morphMeshes: String(state.morphMeshes), blink: state.blink.toFixed(3), smile: state.smile.toFixed(3), arm: String(parts.arm?.rotation.z.toFixed(3)), elbow: String(parts.elbow?.rotation.z.toFixed(3)), nod: String(parts.head?.rotation.x.toFixed(3)), characterFrame: String(Math.round(state.elapsed * 1000)), characterTriangles: String(gl.info.render.triangles), characterDpr: gl.getPixelRatio().toFixed(2), characterAntialias: String(gl.getContext().getContextAttributes()?.antialias ?? false), recordingProps: String(model.userData.studentRecordingProps ?? 0), recordingVisible: String(model.userData.studentRecordingVisible ?? 0), contact: JSON.stringify(model.userData.studentContact ?? null) });
  });
  return <primitive object={model} dispose={null} />;
}

export default function ExploreCharacter({ id, engaged, reduced, visible, active = false, action = 'idle', sequence = 0, posterVisible = true, view = 'front', paused = false, interactive = false,onActionComplete }: {
  id: Identity; engaged: boolean; reduced: boolean; visible: boolean; active?: boolean; action?: AvatarAction; sequence?: number; posterVisible?: boolean; view?: AvatarView; paused?: boolean; interactive?: boolean;onActionComplete?:(sequence:number)=>void;
}) {
  const [readyModel, setReadyModel] = useState(''), [pageVisible, setPageVisible] = useState(true);
  const runtime = useSceneRuntime(visible && pageVisible, '身份角色 / ' + id);
  const failed = Boolean(runtime.error);
  const [lightweight,setLightweight] = useState(() => typeof window !== 'undefined' && (window.matchMedia('(max-width: 760px)').matches || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)));
  const stage=useRef<HTMLDivElement>(null),stable=needsStableDrawingBuffer();
  const [surface,setSurface]=useState({width:0,height:0});
  useEffect(()=>{
    if(!stable||!stage.current)return;
    let timer:ReturnType<typeof setTimeout>;
    const observer=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;clearTimeout(timer);
      timer=setTimeout(()=>setSurface(previous=>previous.width===width&&previous.height===height?previous:{width,height}),120);
    });
    observer.observe(stage.current);return()=>{clearTimeout(timer);observer.disconnect();};
  },[stable]);
  const stableDpr=lightweight?.8:1;
  const createRenderer=useCallback((canvas:HTMLCanvasElement|OffscreenCanvas)=>createStableRenderer(canvas,stableDpr,{antialias:!lightweight,powerPreference:'low-power'}),[stableDpr,lightweight]);
  useEffect(()=>{const media=matchMedia('(max-width: 760px)');const sync=()=>setLightweight(media.matches||Boolean((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData));sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);
  const quality: CharacterQuality = lightweight ? 'lite' : interactive && ['detail','eyes','hair'].includes(view) ? 'portrait' : 'standard';
  const modelKey = `${id}:${quality}`;
  const ready = readyModel === modelKey && runtime.ready;
  const reportRendered = runtime.onRendered;
  const onReady = useCallback(() => { setReadyModel(modelKey); reportRendered(); }, [modelKey, reportRendered]);
  const retry = () => { setReadyModel(''); runtime.retry(); };
  useEffect(() => { const update = () => setPageVisible(!document.hidden); update(); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  const poster = <div className="avatar-poster avatar-poster-v3" style={{ backgroundImage: `url(${characterPoster(id)})` }} />;
  return <><div ref={stage} className="avatar-stage avatar-stage-v3" aria-hidden="true" data-avatar={id} data-ready={visible && ready && !failed} data-load-state={runtime.phase} data-version={exploreCharacterAssets[id].version}>
    {posterVisible && (!visible || !ready || failed) && poster}
    {visible && !failed && (!stable||surface.width>0) && <CharacterBoundary key={runtime.generation} fallback={poster} onFailure={runtime.fail}><SceneResources.Provider value={runtime.scope}><Canvas key={stable?`${surface.width}:${surface.height}:${stableDpr}`:'native'} shadows={lightweight ? false : { type: THREE.PCFShadowMap }} dpr={stable?stableDpr:lightweight ? [.7, 1] : [1, interactive ? 1.5 : 1.25]} camera={{ position: [0, 1.02, 3.25], fov: 38 }} frameloop={!pageVisible || runtime.lost ? 'never' : reduced || paused ? 'demand' : 'always'} gl={stable?createRenderer:{ alpha: true, antialias: !lightweight, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}>
      <SceneLifecycle runtime={runtime}/><ambientLight intensity={isRefinedCharacterPreview ? .10 : .18} color="#f1ebdf" />
      <hemisphereLight args={['#f3ece1', '#a4ada1', isRefinedCharacterPreview ? .28 : .48]} />
      <directionalLight castShadow={!lightweight} position={[-3, 3.5, 4]} intensity={1.8} color={isRefinedCharacterPreview ? '#ffe5c9' : '#fff1df'} shadow-mapSize={interactive && !lightweight ? [2048, 2048] : [1024, 1024]} shadow-bias={-.0001} shadow-normalBias={.002} shadow-radius={3} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={3} shadow-camera-bottom={-1} /><directionalLight position={[2, 2, -2]} intensity={isRefinedCharacterPreview ? .65 : 1.1} color="#d7e5df" />
      <Suspense fallback={null}><Environment files="/environments/citylight/kloppenheim_06_puresky_1k.hdr" environmentIntensity={isRefinedCharacterPreview ? .38 : .65} />
        <Character id={id} action={action} sequence={sequence} view={view} reduced={reduced} paused={paused} quality={quality} engaged={engaged || active} onActionComplete={onActionComplete} /><CharacterSetting id={id} />
        {interactive && <OrbitControls makeDefault key={id + view + (action === 'greeting' ? '-greeting' : '')} enablePan={false} minDistance={.35} maxDistance={4.5} maxPolarAngle={Math.PI * .57} target={characterCamera(id, view, action === 'recording', nativeCandidateAction(id, action), action === 'greeting').target} />}
        <SceneFrameReady scope={runtime.scope} sceneKey={modelKey} onReady={onReady}/>
      </Suspense>
    </Canvas></SceneResources.Provider></CharacterBoundary>}
  </div>{interactive && !ready && !failed && <div className="character-room__loading" role="status">{runtime.lost ? '正在恢复图形连接…' : '正在载入三维角色与环境…'}</div>}{interactive && failed && <div className="character-room__recovery" role="status"><p>三维角色暂时无法显示，当前展示备用画面。</p><small>{runtime.error}</small><button type="button" onClick={retry}>重试三维</button></div>}</>;
}
