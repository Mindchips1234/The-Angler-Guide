"""Set this week's legendary fish and spawn spot for a reserve (data/this-week.json).

Each reserve has one legendary active per week, at one of its known spawn spots. The game
picks them at random, so they have to be confirmed by players (in-game, the community Discord,
or the weekly "Legendary Fish this Week" videos linked on the wiki's legendary page).
The week turns over every Wednesday at 10 pm US Eastern time; the app works that out itself
and ignores entries from an earlier week, so a stale file never shows old spots.

Usage:
  python3 tools/this-week.py                                   show the current week and entries
  python3 tools/this-week.py "Golden Ridge Reserve" Goldstein 3 [source-url]
  python3 tools/this-week.py "Golden Ridge Reserve" Goldstein "Gravy Bubble" [source-url]
  python3 tools/this-week.py "Golden Ridge Reserve" Goldstein "Spot not confirmed yet" [source-url]

The spot is best given as the number of its pin on the legendary's map in the app (1, 2, 3...):
the app then highlights that pin. A name or description also works, but can't be shown on the map.
  python3 tools/this-week.py "Golden Ridge Reserve" --clear    remove a reserve's entry
"""
import json, os, sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data', 'this-week.json')


def week_key(now=None):
    """Date (US Eastern) of the Wednesday the current rotation started, as YYYY-MM-DD."""
    ny = (now or datetime.now(timezone.utc)).astimezone(ZoneInfo('America/New_York'))
    back = (ny.weekday() - 2) % 7  # Monday=0, Wednesday=2
    if back == 0 and ny.hour < 22: back = 7
    return (ny - timedelta(days=back)).date().isoformat()


def main(args):
    legends = json.load(open(os.path.join(ROOT, 'data', 'legendary.json'), encoding='utf-8'))
    data = json.load(open(PATH, encoding='utf-8')) if os.path.exists(PATH) else {}
    key = week_key()
    if data.get('week') != key:  # new week: earlier entries no longer apply
        data = {'week': key, 'reserves': {}}
    if args:
        rn = args[0]
        here = [l['name'] for l in legends if l['reserves'] and l['reserves'][0] == rn]
        if not here: sys.exit(f'Unknown reserve: {rn}')
        if args[1:] == ['--clear']:
            data['reserves'].pop(rn, None)
        else:
            if len(args) < 3: sys.exit(__doc__)
            name, spot = args[1], args[2]
            if name not in here: sys.exit(f'{name} is not a {rn} legendary. Pick one of: {", ".join(here)}')
            entry = {'legendary': name, 'spot': spot}
            if spot.isdigit():  # a pin number on the legendary's map
                pins = len(next(l for l in legends if l['name'] == name).get('spots') or [])
                if not 1 <= int(spot) <= pins: sys.exit(f'{name} has {pins} numbered spots; pick 1 to {pins}')
                entry = {'legendary': name, 'spot': f'Spot {spot}', 'pin': int(spot)}
            if len(args) > 3: entry['source'] = args[3]
            data['reserves'][rn] = entry
        data['updated'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        json.dump(data, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(PATH, 'a').write('\n')
    print('Week starting', data['week'], '(Wednesday 10 pm US Eastern)')
    for rn, e in data['reserves'].items(): print(f"  {rn}: {e['legendary']} at {e['spot']}")
    if not data['reserves']: print('  nothing confirmed yet')


if __name__ == '__main__':
    main(sys.argv[1:])
