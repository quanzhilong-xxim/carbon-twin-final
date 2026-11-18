"""Use measured donor iris height, not an assumed character head origin.
Original H/K and I attempts remain untouched, as do all original source meshes.
"""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
s=(R/'scripts/refine-v108i-anime-portraits.py').read_text()
s=s.replace('v108i','v108l').replace('V108i','V108l').replace('v108h','v108k')
s=s.replace("p.x*=1.12 if who=='Business' else 1.09;p.y=p.y*1.35-.040;p.z=eye+(p.z-1.480)*1.17", "p.x*=1.14 if who=='Business' else 1.18;p.y=p.y*1.62-.038;p.z=eye+(p.z-1.4432)*(1.30 if who=='Business' else 1.26)")
s=s.replace(".24 if who=='Business' else .09", ".32 if who=='Business' else .16")
s=s.replace(".20 if who=='Business' else .035", ".32 if who=='Business' else .10")
s=s.replace(".85,.68,.58,1", ".78,.59,.46,1")
exec(compile(s,__file__,'exec'))
