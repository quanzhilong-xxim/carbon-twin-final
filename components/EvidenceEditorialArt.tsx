/** Authored spatial studies, not photographs, official covers or measured data.
 * Pavilion surfaces echo the retained Light Court glass/timber/plant palette. */
export default function EvidenceEditorialArt({id}:{id:string}) {
  const p=`study-${id}`;
  const glass=`url(#${p}-glass)`,ground=`url(#${p}-ground)`,flow=`url(#${p}-flow)`;
  const plant=(x:number,y:number,s=1)=><g transform={`translate(${x} ${y}) scale(${s})`} className="study-plant"><path d="M0 0q-3-17 0-29M0-8q-19-2-16-16 15-1 16 16M0-15q18-1 16-17-15 2-16 17M0-22q-9-10 0-19 10 11 0 19"/><path d="M-7 0h14l-2 9H-5Z" className="study-stone"/></g>;
  const person=(x:number,y:number,s=1)=><g transform={`translate(${x} ${y}) scale(${s})`} className="study-person"><circle cx="0" cy="-15" r="2.5"/><path d="M-3-10q3-3 6 0l1 8H-4Zm1 8-1 7m5-7 2 7M-3-9-7-3m10-6 4 6"/></g>;
  return <g className={`evidence-spatial-study study-${id}`}>
    <defs>
      <linearGradient id={`${p}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c6dbd6" stopOpacity=".5"/><stop offset=".45" stopColor="#729d92" stopOpacity=".14"/><stop offset="1" stopColor="#c6dbd6" stopOpacity=".32"/></linearGradient>
      <linearGradient id={`${p}-ground`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#859a80" stopOpacity=".22"/><stop offset="1" stopColor="#405d52" stopOpacity=".02"/></linearGradient>
      <linearGradient id={`${p}-flow`} x1="0" y1="1" x2="1" y2="0"><stop stopColor="#93bd97" stopOpacity=".04"/><stop offset=".55" stopColor="#a9d9b1" stopOpacity=".48"/><stop offset="1" stopColor="#e3d3a7" stopOpacity=".8"/></linearGradient>
    </defs>
    {id==='scope-boundaries'&&<>
      <path d="M22 112 155 69 301 107 165 150Z" fill={ground} stroke="none"/>
      <path d="M100 37q44-25 104 0v80q-52 26-104 0Z" className="study-boundary"/>
      <path d="m116 58 44-16 32 14-43 17Z" fill={glass}/><path d="M116 58v46l33 15V73l43-17v48l-43 15" fill={glass}/>
      <path d="m125 62 24 10m-17-13 24 10m8-18 18 8M126 68v32m12-27v32m22-30v33m11-37v32m11-35v31" className="study-mullion"/>
      <path d="m121 100 25 11 39-14m-63-12 25 11 38-13" className="study-mullion"/>
      <path d="M171 100V82l10-4v18Z" className="study-timber"/><path d="M175 80V62m4 16V60"/>
      <path d="M23 78V48l17-5 20 7v32l-20 7Z" fill={glass}/><path d="m23 48 17 7 20-5M40 55v34m-11-28 6 2m11-4 7-2M32 46V31h6v13"/>
      <path d="M62 82q28-26 55-4" className="study-energy"/><path d="m109 75 8 3-7 4"/>
      <path d="m250 77 18-8 22 8-20 9Z" className="study-timber"/><path d="M250 77v19l20 9 20-10V77M270 86v19m-11-32 20 9"/>
      <path d="M249 96q-26 20-47 1" className="study-boundary"/>
      {plant(225,116,.8)}
      <text x="115" y="25">ORGANIZATION</text><text x="164" y="134">S1 · ON SITE</text>
      <text x="20" y="111">S2 · POWER</text><text x="240" y="56">S3 · CHAIN</text>
    </>}
    {id==='carbon-budget'&&<>
      <path d="M22 123q65 9 131-26t145-13" className="study-boundary"/>
      {[0,1,2,3,4].map(i=><path key={i} d={`M24 ${121-i*5}C101 ${136-i*8} 142 ${77-i*10} 215 ${83-i*11}Q264 ${86-i*12} 296 ${65-i*11}L296 ${76-i*9}Q257 ${101-i*10} 214 ${94-i*9}C143 ${88-i*8} 101 ${144-i*5} 24 ${127-i*4}Z`} fill={flow} stroke="#a7c3a2" strokeOpacity={.35+i*.1} strokeWidth=".65"/>)}
      <path d="M29 87q66 11 107-20t75-17" className="study-energy"/><path d="m205 46 6 4-7 4"/>
      <path d="M120 110v-18m62-9V63m62 24V38" className="study-boundary"/>
      <circle cx="120" cy="96" r="2" className="study-node"/><circle cx="182" cy="68" r="2" className="study-node"/><circle cx="244" cy="43" r="2" className="study-node"/>
      <text x="23" y="27">EMISSIONS × TIME</text><text x="187" y="24">Σ CO₂</text>
      <text x="30" y="76">RATE</text><text x="152" y="132">CUMULATIVE TOTAL →</text>
      <text x="26" y="149" className="study-caption">CONCEPTUAL LAYERS · NO MEASURED SCALE</text>
    </>}
    {id==='ipcc-wgiii-demand'&&<>
      <path d="M9 109 134 67 310 103 171 148Z" fill={ground} stroke="none"/>
      <path d="M22 111q31-13 60-3t64-3m-130 18q38-14 69-4t58-3" className="study-path"/>
      <path d="m88 55 88-27 91 24-87 30Z" fill={glass}/><path d="M88 55v9l92 27 87-30v-9M180 82v9" className="study-timber"/>
      {[0,1,2,3,4,5,6,7,8].map(i=><path key={i} d={`m${96+i*10} ${52-i*3} 81 25`} className="study-slat"/>)}
      <path d="M96 67v48m82-24v42m79-68v47" className="study-column"/>
      <path d="m109 72 58 17v33l-58-17Z" fill={glass}/><path d="m186 92 61-21v31l-61 21Z" fill={glass}/>
      <path d="M126 79v31m20-25v31m59-31v31m22-39v31" className="study-mullion"/>
      <ellipse cx="148" cy="106" rx="15" ry="5" className="study-timber"/><path d="M148 111v13m-8 0h16M126 108v14m0-14 8 2v12m32-15v15m0-15 8-2v15"/>
      <ellipse cx="219" cy="111" rx="14" ry="5" className="study-timber"/><path d="M219 116v11m-7 0h14M198 114v13m0-13 8 2v12m29-17v14m0-14 8-2v14"/>
      {plant(77,99,1.05)}{plant(278,112,1.1)}{plant(245,137,.54)}{person(59,110,.95)}{person(186,121,.85)}
      <path d="M29 79h16m-5-4 5 4-5 4"/>
      <text x="18" y="23">THE SAME NEED. DIFFERENT PATHS.</text>
      <text x="19" y="145">AVOID</text><text x="89" y="145">SHIFT</text><text x="258" y="145">IMPROVE</text>
    </>}
    {id==='ghgp-scope2-audited'&&<>
      <path d="m13 105 66-20 85 26-67 25Z" fill={ground} stroke="none"/>
      <path d="M23 94V60l20-14 20 10v47L43 113Z" className="study-stone"/><path d="M63 103V77l23-8 17 6v40l-40-12" fill={glass}/>
      <path d="M34 53V29h8v20m13 3V21h8v35M43 69v35m28-23 25 8m-25 2 25 8"/>
      <path d="M130 18v117" className="study-boundary"/>
      <path d="M98 89c32-20 61-20 87 0" className="study-energy"/><path d="m177 83 8 6-9 1"/>
      <path d="M172 40q53-30 129-2v90q-55 20-129 0Z" className="study-boundary"/>
      <path d="m194 58 44-13 42 17-44 15Z" fill={glass}/><path d="M194 58v48l42 19 44-18V62l-44 15v48" fill={glass}/>
      <path d="M205 64v40m15-35v42m31-38v41m15-46v40m-67-25 37 17 39-15m-76 4 37 18 39-16" className="study-mullion"/>
      {plant(287,122,.7)}{person(215,116,.6)}
      <text x="19" y="18">GENERATOR</text><text x="191" y="19">ELECTRICITY BUYER</text><text x="105" y="66">kWh →</text>
      <text x="19" y="145">DIRECT EMISSIONS</text><text x="181" y="145">SCOPE 2 · INDIRECT</text>
    </>}
    {id==='ipcc-industry-materials'&&<>
      <path d="M18 111 143 65 306 103 178 147Z" fill={ground} stroke="none"/>
      <path d="m20 81 22-10 22 10-22 10Z" className="study-stone"/><path d="M20 81v13l22 10 22-10V81M42 91v13" className="study-stone"/>
      <path d="m26 65 22-10 22 10-22 10Z" className="study-timber"/><path d="M26 65v9l22 10 22-10v-9M48 75v9" className="study-timber"/>
      <path d="M106 111V72l24-14v14l24-14v14l29 9v31l-41 16Z" fill={glass}/><path d="M130 60V34h8v30m20 4V44h8v26M116 83v21m12-26v30m15-25v30m13-28v24m14-20v16" className="study-mullion"/>
      <path d="M76 94h23m-6-5 6 5-6 5M186 94h25m-6-5 6 5-6 5" className="study-energy"/>
      <path d="m224 70 31-12 35 14-33 13Z" fill={glass}/><path d="M224 70v36l33 14 33-13V72M257 85v35" fill={glass}/><path d="m232 81 17 7m-17 4 17 7m-17 4 17 7m15-20 18-7m-18 18 18-7m-18 18 18-7" className="study-mullion"/>
      <path d="M264 46q-20-28-51-13m7-5-7 5 8 3M204 120q-42 34-97 1m6 7-6-7 9-1" className="study-boundary"/>
      <text x="17" y="25">LESS MATERIAL. LASTING SERVICE.</text><text x="17" y="136">INPUT</text><text x="108" y="148">PRODUCTION</text><text x="225" y="136">SERVICE LIFE</text>
      <text x="203" y="27" className="study-caption">REPAIR / REUSE</text>
    </>}
  </g>;
}
