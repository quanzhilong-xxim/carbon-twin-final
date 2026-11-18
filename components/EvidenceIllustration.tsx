/** Original teaching illustrations. No official cover or measured chart implied. */
export default function EvidenceIllustration({ lane }: { lane: string }) {
  return <svg viewBox="0 0 320 144" aria-hidden="true" className="evidence-illustration" data-illustration={lane}>
    {lane === 'climate' ? <>
      <circle cx="154" cy="70" r="53" /><ellipse cx="154" cy="70" rx="23" ry="53" /><path d="M101 70h106M111 39q43 17 86 0M111 101q43-17 86 0M154 17v106" />
      <path d="m126 32 17 8 3 17-15 12-9-5-9-17m59 8 21 7-3 18-13 6-7 21-14-7-6-24 12-12" className="evidence-land" />
      <path d="M20 37h51m-38 9h38M235 96h62m-42 9h42M76 72l22-2m112 0 23-5" /><circle cx="71" cy="37" r="3" /><circle cx="235" cy="96" r="3" />
    </> : lane === 'accounting' ? <>
      <rect x="39" y="15" width="242" height="113" rx="4" strokeDasharray="5 5" /><rect x="75" y="35" width="170" height="76" rx="3" /><rect x="114" y="55" width="92" height="38" rx="2" className="evidence-land" />
      <path d="M133 79V64h19v15m-16-9h3m6 0h3m11 9V61h12v18m-45 0h54M58 51h15m174 43h18" />
      <text x="118" y="107">1</text><text x="81" y="29">2</text><text x="44" y="141">3</text>
    </> : lane === 'measurement' ? <>
      <path d="m55 117 22-91 22 91m-37-61h30M58 74h38M52 117h51M67 26h20m-19 68h19M166 118V63l21-15 20 15v55m-47 0h54m-39-44h7m11 0h7m-25 15h7m11 0h7m-25 15h7m11 0h7M112 49q22-14 43 0M109 57q24-14 49 0M217 77l32-23 28 16m-40 32h44" />
      <circle cx="253" cy="44" r="12" /><path d="m255 34-7 12h8l-6 11" /><circle cx="239" cy="102" r="4" /><circle cx="282" cy="102" r="4" />
    </> : lane === 'ecosystem' ? <>
      <path d="M114 122c-16-40-7-80 62-101 25 69-2 101-62 101Z" className="evidence-land" /><path d="m106 134 66-105M125 104l-11-26m25 5 27 2m-14-25-5-20m-23 65 31 1M47 111h39m-29 8h29M204 56h58m-42 9h42M189 91h30" />
      <circle cx="221" cy="91" r="3" /><circle cx="47" cy="111" r="3" />
    </> : lane === 'action' ? <>
      <path d="M20 112h280M48 111V58h43v53m9 0V38h46v73m12 0V66h47v45m-96-63h28m-28 12h28m-28 12h28m-28 12h28M57 69h24m-24 12h24m86-4h29m-29 12h29M238 110V57m0 24c-28-3-30-23-15-30 4-27 34-23 32-4 22 9 13 32-17 34Z" />
      <circle cx="72" cy="118" r="11" /><circle cx="110" cy="118" r="11" /><path d="m72 118 13-20 13 20H72l18-9h12m-6-17h9" />
    </> : <>
      <path d="M80 28q42-13 80 8 39-21 80-8v89q-40-12-80 8-40-20-80-8V28Zm80 8v89M94 46q25-4 49 5m-49 8q25-4 49 5m-49 8q25-4 49 5m-49 8q25-4 49 5m31-39q25-9 49-5m-49 18q25-9 49-5m-49 18q25-9 49-5" /><path d="M54 113h16m178 0h22M53 31h16m180 0h20" />
    </>}
  </svg>;
}
