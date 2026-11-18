import type { Identity } from '@/lib/store';

/** Each prior editable source remains on disk; switch only the display version. */
// Candidate builds use their own output directory and never overwrite the
// stable V10 assets. Both card forms resolve the same explicit revision.
// The delivered site uses the preserved native-animation characters even
// when a preview build omitted its environment override. Historical revisions
// remain explicitly selectable (including v114 for the previous stable set).
const requestedRevision = process.env.NEXT_PUBLIC_CT_CHARACTER_PREVIEW_REVISION || 'v135';
// V13.5: one master student asset for every scene (identity page, room, sakura,
// behaviour sandbox). Scenes choose position/lighting/LOD only, never geometry.
export const characterMaster = {
  characterId: 'student',
  assetVersion: 'v135-master-C',
  materialVersion: 'mat-v135-1',
  animationVersion: 'anim-v135-1',
  desktop: '/models/characters-v13-master/student/CT_Student_Explore_Master_v135.glb',
  lite: '/models/characters-v13-master/student/CT_Student_Explore_Master_v135-lite.glb',
} as const;
export const isV135MasterPreview = requestedRevision === 'v135';
// V13.7 proportion-rebuild candidate. Isolated preview only; the verified V13.5
// master stays untouched until the user accepts this candidate.
export const characterMasterV137 = {
  characterId: 'student',
  assetVersion: 'v137-A-NOT-PASSED',
  materialVersion: 'mat-v137-A',
  animationVersion: 'anim-v137-A',
  desktop: '/models/characters-v137-candidate/CT_Student_Explore_v137C_desktop.glb',
  mobile: '/models/characters-v137-candidate/CT_Student_Explore_v137C_mobile.glb',
} as const;
export const isV137StudentPreview = requestedRevision === 'v137';
// V13.8 candidate: jaw/chin/neck refinement on top of V13.7 proportions. Isolated
// preview only; no production reference is replaced while the score is below 98.
export const characterMasterV138 = {
  characterId: 'student',
  assetVersion: 'v138-B-NOT-PASSED',
  materialVersion: 'mat-v138-B',
  animationVersion: 'anim-v138-B',
  desktop: '/models/characters-v138-candidate/CT_Student_Explore_v138B_desktop.glb',
  mobile: '/models/characters-v138-candidate/CT_Student_Explore_v138B_mobile.glb',
} as const;
export const isV138StudentPreview = requestedRevision === 'v138';
// V13.9 candidate: nose/lips/chin/brow/eye-socket structure + larger eyes on V13.7
// proportions, rendered/evaluated with Cycles GPU. Isolated preview until accepted.
export const characterMasterV139 = {
  characterId: 'student',
  assetVersion: 'v139-A-NOT-PASSED',
  materialVersion: 'mat-v139-A',
  animationVersion: 'anim-v139-A',
  desktop: '/models/characters-v139-candidate/CT_Student_Explore_v139A_desktop.glb',
  mobile: '/models/characters-v139-candidate/CT_Student_Explore_v139A_mobile.glb',
} as const;
export const isV139StudentPreview = requestedRevision === 'v139';
// V13.11 candidate: braid geometry shaping (helical weave grooves + taper) on the
// V13.9 best candidate. Isolated preview; production stays untouched below 98.
export const characterMasterV1311 = {
  characterId: 'student',
  assetVersion: 'v1311-A-NOT-PASSED',
  materialVersion: 'mat-v1311-A',
  animationVersion: 'anim-v1311-A',
  desktop: '/models/characters-v1311-candidate/CT_Student_Explore_v1311A_desktop.glb',
  mobile: '/models/characters-v1311-candidate/CT_Student_Explore_v1311A_mobile.glb',
} as const;
export const isV1311StudentPreview = requestedRevision === 'v1311';
// V13.11-C candidate: the twin braids were moved off the chest to the back of the head
// and draped behind the shoulders over the backpack (pure rest-pose reflow, braids stay
// skinned to J_Bip_C_Head). Isolated preview only; production stays untouched below 98.
export const characterMasterV1311C = {
  characterId: 'student',
  assetVersion: 'v1311-C-NOT-PASSED',
  materialVersion: 'mat-v1311-C',
  animationVersion: 'anim-v1311-C',
  desktop: '/models/characters-v1311-candidate/CT_Student_Explore_v1311C_desktop.glb',
  mobile: '/models/characters-v1311-candidate/CT_Student_Explore_v1311C_mobile.glb',
} as const;
export const isV1311CStudentPreview = requestedRevision === 'v1311c';
// V13.11-D candidate: clothing & props stage on top of the braid-fixed v1311C
// (surface-mounted pockets/flaps/lips, real front zipper hardware, shoe laces/eyelets/tongue,
// knit rib geometry). Braids stay behind the back. Isolated preview only, below 98.
export const characterMasterV1311D = {
  characterId: 'student',
  assetVersion: 'v1311-D-NOT-PASSED',
  materialVersion: 'mat-v1311-D',
  animationVersion: 'anim-v1311-D',
  desktop: '/models/characters-v1311-candidate/CT_Student_Explore_v1311D_desktop.glb',
  mobile: '/models/characters-v1311-candidate/CT_Student_Explore_v1311D_mobile.glb',
} as const;
export const isV1311DStudentPreview = requestedRevision === 'v1311d';
// V13.12-A candidate: structural proportion pass (head/neck/shoulder/waist/trouser silhouette
// fields) + convex eye structure on top of v1311D. Braids stay behind the back.
export const characterMasterV1312A = {
  characterId: 'student',
  assetVersion: 'v1312-A-NOT-PASSED',
  materialVersion: 'mat-v1312-A',
  animationVersion: 'anim-v1312-A',
  desktop: '/models/characters-v1312-candidate/CT_Student_Explore_v1312A_desktop.glb',
  mobile: '/models/characters-v1312-candidate/CT_Student_Explore_v1312A_mobile.glb',
} as const;
export const isV1312AStudentPreview = requestedRevision === 'v1312a';
// V13.4 was the previous isolated 3121 art-review candidate.
export const isV134StudentPreview = requestedRevision === 'v134';
// V13.3 cinematic rebuild preview for the student role only.
export const isV133StudentPreview = requestedRevision === 'v133';
// V13.2 student candidate preview: keeps every older revision available and never
// overwrites the accepted v123 files; only the student URL is redirected.
export const isV132StudentPreview = requestedRevision === 'v132' || isV133StudentPreview || isV134StudentPreview || isV135MasterPreview || isV137StudentPreview || isV138StudentPreview || isV139StudentPreview || isV1311StudentPreview || isV1311CStudentPreview || isV1311DStudentPreview || isV1312AStudentPreview;
export const isNativeClipPreview=requestedRevision==='v123-native'||isV132StudentPreview;
export const isRefinedCharacterPreview = isNativeClipPreview||['v122h', 'v122k', 'v122m', 'v122n', 'v122p', 'v122r', 'v122w', 'v122ab', 'v122ac', 'v122ae', 'v123a'].includes(requestedRevision ?? '');
const nativeCandidate = requestedRevision === 'v12a' || requestedRevision === 'v12g' ? 'v12g' : requestedRevision === 'v122a' ? 'v122a' : isRefinedCharacterPreview ? requestedRevision : undefined;
// Reviewed per-role sources, retained separately from every prior revision.
// Explicit older revisions remain available for repeatable visual comparison.
const current = requestedRevision === undefined || requestedRevision === 'v114';
const integratedRevision = requestedRevision === 'v11b'
    ? 'v11d'
    : ['v11c', 'v11d'].includes(requestedRevision ?? '')
      ? requestedRevision
      : requestedRevision === 'v108w' ? 'v108w' : undefined;
const adultRevision = requestedRevision === 'v108l' ? 'v108l' : requestedRevision === 'v108k' ? 'v108k' : requestedRevision === 'v108j' ? 'v108j' : requestedRevision === 'v108i' ? 'v108i' : requestedRevision === 'v108h' ? 'v108h' : requestedRevision === 'v108m' ? 'v108m' : 'v108n';
const revision = requestedRevision === 'v104g' ? 'v104g' : requestedRevision === 'v104f' ? 'v104f' : requestedRevision === 'v104e' ? 'v104e' : requestedRevision === 'v104d' ? 'v104d' : requestedRevision === 'v104c' ? 'v104c' : requestedRevision === 'v104b' ? 'v104b' : requestedRevision === 'v104' ? 'v104' : requestedRevision === 'v10' ? 'v10' : 'v108';
const sharedSourceRevision = requestedRevision === 'v123a' ? 'v123a' : undefined;
export const exploreCharacterAssets: Record<Identity, { stem: string; version: string }> = {
  student: { stem: 'Student', version: sharedSourceRevision ?? (requestedRevision === 'v122ae' ? 'v122ae' : requestedRevision === 'v122ac' ? 'v122ac' : requestedRevision === 'v122ab' ? 'v122ab' : requestedRevision === 'v122w' ? 'v122w' : requestedRevision === 'v122r' ? 'v122q' : ['v122m', 'v122n', 'v122p'].includes(requestedRevision ?? '') ? 'v122m' : requestedRevision === 'v122k' ? 'v122k' : isRefinedCharacterPreview ? 'v122g' : nativeCandidate === 'v122a' ? 'v122a' : nativeCandidate ? 'v12b' : current ? 'v11e' : integratedRevision ?? (requestedRevision === 'v108v' ? 'v108v' : requestedRevision === 'v108u' ? 'v108u' : revision === 'v108' ? 'v108p' : revision)) },
  business: { stem: 'Business', version: sharedSourceRevision ?? (requestedRevision === 'v122ae' ? 'v122ae' : ['v122ab','v122ac'].includes(requestedRevision ?? '') ? 'v122x' : requestedRevision === 'v122w' ? 'v122t' : nativeCandidate ?? (current ? 'v11i' : integratedRevision ?? (requestedRevision === 'v108u' ? 'v108u' : revision === 'v108' ? adultRevision : revision))) },
  city: { stem: 'City', version: sharedSourceRevision ?? (requestedRevision === 'v122ae' ? 'v122ae' : ['v122w', 'v122ab', 'v122ac'].includes(requestedRevision ?? '') ? 'v122s' : nativeCandidate ?? (current ? 'v11g' : integratedRevision ?? (requestedRevision === 'v108u' ? 'v108u' : revision === 'v108' ? requestedRevision === 'v108s' ? 'v108s' : requestedRevision === 'v108q' ? 'v108q' : requestedRevision === 'v108r' ? 'v108r' : adultRevision === 'v108n' ? 'v108t' : adultRevision : revision))) },
};
export type CharacterQuality = 'standard' | 'portrait' | 'lite';
/** Device LOD policy shared by every scene that renders the student. */
export const characterQualityForDevice = (): CharacterQuality => {
  if (typeof window === 'undefined') return 'standard';
  const compact = window.matchMedia('(max-width: 760px)').matches;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  return compact || saveData ? 'lite' : 'standard';
};
if(isNativeClipPreview){exploreCharacterAssets.student.version='v123b';exploreCharacterAssets.business.version='v123g';exploreCharacterAssets.city.version='v123e';}
export const exploreCharacterModel = (id: Identity, quality: CharacterQuality = 'standard') => {
  const { stem, version } = exploreCharacterAssets[id];
  if (isV1312AStudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV1312A.mobile : characterMasterV1312A.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV1311DStudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV1311D.mobile : characterMasterV1311D.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV1311CStudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV1311C.mobile : characterMasterV1311C.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV1311StudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV1311.mobile : characterMasterV1311.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV139StudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV139.mobile : characterMasterV139.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV138StudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV138.mobile : characterMasterV138.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV137StudentPreview) {
    if (id === 'student') return quality === 'lite' ? characterMasterV137.mobile : characterMasterV137.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV135MasterPreview) {
    // Single source of truth for the student role: all pages and scenes resolve
    // this same file (only LOD differs), so the character cannot fork per page.
    if (id === 'student') return quality === 'lite' ? characterMaster.lite : characterMaster.desktop;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV134StudentPreview) {
    if (id === 'student') return `/models/characters-v13-candidate/CT_Student_Explore_v134-${quality === 'lite' ? 'lite' : 'web'}.glb`;
    const accepted = id === 'business' ? 'v123g' : 'v123e';
    return `/models/characters-v12-candidate/CT_${stem}_Explore_${accepted}${quality === 'lite' ? '-lite' : ''}.glb`;
  }
  if (isV133StudentPreview) {
    // V13.3: cinematic student rebuild. The web build uses the decimated LOD file
    // when present; business/city keep their accepted v123 assets.
    const candidateVersion = id === 'student' ? 'v133-web' : { student: 'v133-web', business: 'v123g', city: 'v123e' }[id];
    const dir = id === 'student' ? 'characters-v13-candidate' : 'characters-v12-candidate';
    const suffix = quality === 'lite' && id !== 'student' ? '-lite' : '';
    return `/models/${dir}/CT_${stem}_Explore_${candidateVersion}${suffix}.glb`;
  }
  if (isV132StudentPreview) {
    // Student: refined V13.2 candidate in its own directory (old files untouched).
    // Business/city: keep the accepted v123 assets until their candidates pass.
    const candidateVersion = id === 'student' ? 'v132' : { student: 'v132', business: 'v123g', city: 'v123e' }[id];
    const dir = id === 'student' ? 'characters-v13-candidate' : 'characters-v12-candidate';
    const suffix = quality === 'lite' && id !== 'student' ? '-lite' : '';
    return `/models/${dir}/CT_${stem}_Explore_${candidateVersion}${suffix}.glb`;
  }
  // Native portrait exports contain the same geometry/texture BIN payload as
  // standard (only initial expression weights differ). Keep one decoded asset
  // when moving into a close-up; the owned rig supplies its live expressions.
  if(isNativeClipPreview){const nativeVersion={student:'v123b',business:'v123g',city:'v123e'}[id];return `/models/characters-v12-candidate/CT_${stem}_Explore_${nativeVersion}${quality==='lite'?'-lite':''}.glb`;}
  if (nativeCandidate) return `/models/characters-v12-candidate/CT_${stem}_Explore_${version}${quality === 'standard' ? '' : '-' + quality}.glb`;
  if (id === 'student' && !['v108m', 'v108n', 'v108p', 'v108u', 'v108v', 'v108w', 'v11b', 'v11c', 'v11d', 'v11e'].includes(version)) return `/models/characters-v10/CT_${stem}_Explore_${version}.glb`;
  return `/models/characters-v10/CT_${stem}_Explore_${version}${quality === 'standard' ? '' : '-' + quality}.glb`;
};
export const exploreCharacterPoster = (id: Identity, portrait = false) =>
  `/media/explore-v10/${portrait ? 'role' : 'full'}-${id}-${revision}.webp`;

