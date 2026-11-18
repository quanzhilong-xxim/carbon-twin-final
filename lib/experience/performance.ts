export type Quality='high'|'balanced'|'low'|'static';
/** Degrade only; user may explicitly retry. Three consecutive samples avoid transient stalls. */
export function performanceTier(fps:number,current:Quality):Quality {
 if(!Number.isFinite(fps)||fps<=0||current==='static')return current;
 // Preserve navigation by reducing real rendering work before using a poster.
 if(fps<30){
  if(current==='high')return 'balanced';
  if(current==='balanced')return 'low';
  if(fps<18)return 'static';
 }
 if(fps<=50&&current==='high')return 'balanced';
 return current;
}
