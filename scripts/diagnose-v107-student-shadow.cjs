/* Compare the same candidate under different shadow settings without touching the live site. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/v10-explore/V107-SHADOW-DIAGNOSIS');
fs.mkdirSync(out, { recursive: true });
const html = `<!doctype html><style>body{margin:0;background:#182a26}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script>
<script type="module">
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1000,800);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#182a26');
scene.add(new T.HemisphereLight('#faf3df','#40564b',1.4));
const key=new T.DirectionalLight('#fff1df',2.7);key.position.set(-3,4,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-2,right:2,top:3,bottom:-1});scene.add(key);
const rim=new T.DirectionalLight('#e2e9ff',1.2);rim.position.set(2,2,-3);scene.add(rim);
const model=(await new GLTFLoader().loadAsync('/model')).scene;scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
const camera=new T.PerspectiveCamera(32,1000/800,.01,30);camera.position.set(0,1.49,.88);camera.lookAt(0,1.47,0);
window.renderCase=(mode)=>{key.shadow.bias=mode==='biased'?-.0001:0;key.shadow.normalBias=mode==='biased'?.002:0;model.traverse(o=>{if(o.isMesh)o.receiveShadow=mode!=='no-receive';});renderer.render(scene,camera);};
window.renderCase('baseline');window.ready=true;
</script>`;
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(html); }
  const file = pathname === '/model' ? path.join(root, 'public/models/characters-v10/CT_Student_Explore_v107c.glb') : pathname.startsWith('/three/') ? path.join(root, 'node_modules/three', pathname.slice(7)) : '';
  if (!file || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.ready, { timeout: 45000 });
    for (const mode of ['baseline', 'biased', 'no-receive']) {
      await page.evaluate(value => window.renderCase(value), mode);
      await page.screenshot({ path: path.join(out, `${mode}.png`) });
    }
    console.log(JSON.stringify({ output: out, errors }));
    if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
