const fs=require('node:fs'),path=require('node:path');
const p=path.resolve(__dirname,'../components/simulator/StoryScenes.tsx'),s=fs.readFileSync(p,'utf8'),from='onSelect={onBuildingSelect} />';if(!s.includes(from))throw Error('Expected scene prop missing');fs.writeFileSync(p,s.replace(from,'onSelect={onBuildingSelect} paused={stopped} />'));
const q=path.resolve(__dirname,'../components/simulator/SimulatorPanel.tsx'),t=fs.readFileSync(q,'utf8');fs.writeFileSync(q,t.replace('<GlassSurface className="chart-panel">','<GlassSurface className="chart-panel" tilt={false}>'));
