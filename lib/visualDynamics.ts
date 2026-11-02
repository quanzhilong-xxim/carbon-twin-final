/** Mutable render clock: never pushes pointer-frequency updates through React. */
export const visualDynamics = { scroll: 0, velocity: 0, impulse: 0 };
export function exciteVisuals(amount = 1) {
  visualDynamics.impulse = Math.min(1, Math.max(visualDynamics.impulse, amount));
}
export function askEvidence(question: string) {
  window.dispatchEvent(new CustomEvent<string>('carbon-ask-evidence', { detail: question }));
}
