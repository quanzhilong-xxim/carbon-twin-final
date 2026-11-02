import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/** Test-only loopback server transpiles the actual source, including the module Worker. */
export async function startWorkerServer() {
  const root = process.cwd();
  const allowed = new Set([
    '/lib/core/CarbonWorkerClient', '/lib/core/StateMachine', '/lib/core/clock', '/lib/core/readonly',
    '/lib/core/validation', '/lib/core/workerTransport', '/lib/core/browserWorkerFactory', '/lib/core/CarbonWorker',
    '/lib/math/sigmoid', '/lib/stores/internal/dataHub', '/lib/emissions',
  ]);
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    try {
      if (pathname === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><title>A1 Worker verification</title><script type="module" src="/__harness.ts"></script>'); return; }
      if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      if (pathname === '/__vendor/zustand.mjs') {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(await readFile(path.join(root, 'node_modules/zustand/esm/vanilla.mjs'), 'utf8')); return;
      }
      const base = pathname.replace(/\.ts$/, '');
      if (pathname !== '/__harness.ts' && !allowed.has(base)) { response.writeHead(404); response.end(); return; }
      const filename = pathname === '/__harness.ts' ? '__tests__/helpers/browserHarness.ts' : `${base.slice(1)}.ts`;
      const source = await readFile(path.join(root, filename), 'utf8');
      const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
        .replace(/(['"])@\//g, '$1/').replace(/(['"])zustand\/vanilla\1/g, "'/__vendor/zustand.mjs'");
      response.setHeader('Content-Type', 'text/javascript'); response.end(compiled);
    } catch (error: unknown) {
      response.writeHead(500); response.end(error instanceof Error ? error.message : 'Test module failed');
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test listener');
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
