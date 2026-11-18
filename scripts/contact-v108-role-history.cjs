const fs=require("node:fs"),path=require("node:path"),sharp=require("sharp");
(async()=>{
 let rows=[];
 for(const d of fs.readdirSync("outputs/v108/internal").filter(n=>n.startsWith("roles-"))){
  const f=path.join("outputs/v108/internal",d,"city-detail.png");if(fs.existsSync(f))rows.push({d,f});
 }
 rows=rows.slice(-12);const tiles=[];
 for(const [i,row]of rows.entries()){
  tiles.push({input:await sharp(row.f).resize(480,310,{fit:"contain",background:"#102219"}).toBuffer(),left:i%3*480,top:Math.floor(i/3)*340});
  const svg=Buffer.from(`<svg width="480" height="30"><rect width="480" height="30" fill="white"/><text x="5" y="20" font-size="15">${row.d}</text></svg>`);
  tiles.push({input:svg,left:i%3*480,top:Math.floor(i/3)*340+310});
 }
 await sharp({create:{width:1440,height:Math.ceil(rows.length/3)*340,channels:3,background:"white"}}).composite(tiles).png().toFile("outputs/v108/internal/city-history-sheet.png");
 console.log(rows);
})();
