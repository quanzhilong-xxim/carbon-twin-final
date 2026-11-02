export function captureLogs() {
  const entries: { level: 'warn' | 'error'; args: unknown[] }[] = [];
  const error = console.error, warn = console.warn;
  console.error = (...args: unknown[]) => { entries.push({ level: 'error', args }); };
  console.warn = (...args: unknown[]) => { entries.push({ level: 'warn', args }); };
  return {
    entries,
    restore: () => {
      console.error = error; console.warn = warn;
      for (const entry of entries) console.log(`[EXPECTED ${entry.level}]`, ...entry.args);
    },
  };
}
