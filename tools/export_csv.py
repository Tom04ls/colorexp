#!/usr/bin/env python3
"""Responses CSV またはブラウザのバックアップJSONから、HSL明示の長形式と2種の横形式を生成。標準ライブラリのみ。"""
import argparse, csv, json
from pathlib import Path

def legacy_id(c):
    i=c['colorId']
    if i>144:return i
    base,off=divmod(i-1,12)
    return i if off<8 else base*12+21-off

def read_payloads(path):
    if path.suffix.lower()=='.json':
        state=json.loads(path.read_text(encoding='utf-8-sig'))
        for b in state['blocks']:
            if b.get('payload'):
                yield b['payload'],bool(b.get('ack'))
    else:
        with path.open(encoding='utf-8-sig',newline='') as f:
            for r in csv.DictReader(f):
                yield dict(sessionId=r['SessionID'],subjectId=r['SubjectID'],age=int(r['Age']),taste=r['Taste'],method=r['Method'],tasteOrder=int(r['TasteOrder']),paletteVersion=r['PaletteVersion'],colors=json.loads(r['ColorsJSON'])),True

def export(source,dest):
    dest.mkdir(parents=True,exist_ok=True)
    rows=[];wide=[];legacy=[];seen=set()
    meta=['SessionID','SubjectID','Age','Taste','Method','TasteOrder','PaletteVersion','ServerConfirmed']
    for p,confirmed in read_payloads(source):
        key=(p['sessionId'],p['taste'])
        if key in seen:raise ValueError('Duplicate session/taste: '+str(key))
        seen.add(key)
        colors=p['colors']
        if p['paletteVersion']!='hsl150-original-v1' or p['method']!='RD':raise ValueError('Unsupported schema')
        pairs=[(25,75),(50,75),(75,75),(100,75),(25,50),(50,50),(75,50),(100,50),(100,25),(75,25),(50,25),(25,25)]
        palette=[(h,s,l) for h in range(0,360,30) for s,l in pairs]+[(0,0,l) for l in [100,80,60,40,20,0]]
        if len(colors)!=150 or {c['colorId'] for c in colors}!=set(range(1,151)):raise ValueError('Invalid color IDs')
        if {c['presentationOrder'] for c in colors}!=set(range(1,151)):raise ValueError('Invalid presentation order')
        for c in colors:
            if (c['h'],c['s'],c['l'])!=palette[c['colorId']-1] or type(c['score']) is not int or not 0<=c['score']<=5:raise ValueError('Invalid color/score')
        base=[p['sessionId'],p['subjectId'],p['age'],p['taste'],p['method'],p['tasteOrder'],p['paletteVersion'],confirmed]
        for c in colors:rows.append(base+[c['colorId'],c['presentationOrder'],c['h'],c['s'],c['l'],c['score'],legacy_id(c)])
        wide.append(base+[c['score'] for c in sorted(colors,key=lambda c:c['colorId'])])
        legacy.append(base+[c['score'] for c in sorted(colors,key=legacy_id)])
    def write(name,headers,data):
        with (dest/name).open('w',encoding='utf-8-sig',newline='') as f:
            w=csv.writer(f);w.writerow(headers);w.writerows(data)
    write('long.csv',meta+['ColorID','PresentationOrder','H','S','L','Score','LegacyMapColorID'],rows)
    write('wide-canonical.csv',meta+[f'Score{i:03}' for i in range(1,151)],wide)
    write('wide-legacy-map.csv',meta+[f'color{i}' for i in range(1,151)],legacy)
    print(f'{len(wide)} tastes / {len(rows)} color ratings exported to {dest}')
if __name__=='__main__':
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('source',type=Path);a.add_argument('output_dir',type=Path);args=a.parse_args();export(args.source,args.output_dir)
