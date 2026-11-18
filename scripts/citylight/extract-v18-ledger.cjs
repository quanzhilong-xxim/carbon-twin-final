// Extract the task names verbatim; no implementation or score is inferred.
const fs = require('fs');
const source = process.argv[2];
const target = process.argv[3];
if (!source || !target || fs.existsSync(target)) throw new Error('Provide source and a new output path');
const text = fs.readFileSync(source, 'utf8');
const rows = [...text.matchAll(/^OPT-(\d{3})｜(.+)$/gm)].map(m => ({ id: `OPT-${m[1]}`, title: m[2].trim(), status: 'PENDING', score: null, evidence: [] }));
if (rows.length !== 200 || new Set(rows.map(row => row.id)).size !== 200) throw new Error(`Expected 200 unique items, found ${rows.length}`);
fs.writeFileSync(target, JSON.stringify({ source: 'V18.0', note: '仅提取标题；未实施、未评分', items: rows }, null, 2));
