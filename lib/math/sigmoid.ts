/** Visual mapping only: this is NOT an emissions factor or an IPCC threshold. */
export function calculateSigmoid(x: number, k = 0.1, x0 = 0.5): number {
  if (![x, k, x0].every(value => typeof value === 'number' && Number.isFinite(value))) {
    console.error('[Math Hub Error] 非法输入被拦截', { x, k, x0 });
    return 0.5;
  }
  // Avoid 0 * Infinity when finite operands overflow during subtraction.
  if (k === 0 || x === x0) return 0.5;
  const difference = x - x0;
  const z = Number.isFinite(difference) ? k * difference : k * x - k * x0;
  const y = z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
  return Math.max(0, Math.min(1, y));
}
