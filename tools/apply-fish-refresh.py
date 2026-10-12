"""Merge data/fish-refresh.json (from tools/wiki-data.py) into the fish data in data/fish-data.js.

Usage:  python3 tools/apply-fish-refresh.py

Updates each fish's rank table (weight range and hook sizes per rank) and its traits.
Everything else in the fish data is left as it is.
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(ROOT, 'data', 'fish-data.js')
lines = open(path, encoding='utf-8').read().split('\n')
i = next(n for n, l in enumerate(lines) if l.startswith('const DATA='))
line = lines[i]; cut = line.index(';const RIMG=')
data = json.loads(line[len('const DATA='):cut])
fresh = json.load(open(os.path.join(ROOT, 'data', 'fish-refresh.json'), encoding='utf-8'))
changed = 0
for res in data['reserves'].values():
    for rec in res['records'].values():
        f = fresh.get(rec['source'])
        if not f: continue
        before = json.dumps([rec.get('hookRanks'), rec.get('ranks'), rec.get('traits')])
        if f['ranks']:
            rec['ranks'] = [{'rank': r['rank'], 'min': r['min'], 'max': r['max'], 'hooks': r['hooks']} for r in f['ranks']]
            rec['hookRanks'] = [{'rank': r['rank'], 'hooks': r['hooks']} for r in f['ranks'] if r['hooks']]
        if f['traits']: rec['traits'] = f['traits']
        changed += before != json.dumps([rec.get('hookRanks'), rec.get('ranks'), rec.get('traits')])
lines[i] = 'const DATA=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + line[cut:]
open(path, 'w', encoding='utf-8').write('\n'.join(lines))
print('updated', changed, 'fish')
