import json, os
scrape_dir = '/Users/arnaudgredai/Desktop/parislgbt.com/scripts/output'

from collections import Counter
types = Counter()
listings_with_addr = 0
listings_no_addr = 0

for f in os.listdir(scrape_dir):
    if not f.endswith('.json') or f == '_index.json': continue
    try:
        d = json.load(open(os.path.join(scrape_dir, f)))
        t = d.get('type', 'unknown')
        types[t] += 1
        if t in ('listing', 'event'):
            has_addr = bool(d.get('address', {}).get('street'))
            if has_addr: listings_with_addr += 1
            else: listings_no_addr += 1
    except: pass

print('=== Types in scrape ===')
for t, n in types.most_common():
    print(f'  {n:4d} {t}')
print()
print(f'With address: {listings_with_addr}')
print(f'No address:   {listings_no_addr}')

# Show 5 sample events (with dates) and 5 sample listings
events = []
listings = []
for f in os.listdir(scrape_dir):
    if not f.endswith('.json') or f == '_index.json': continue
    try:
        d = json.load(open(os.path.join(scrape_dir, f)))
        if d.get('type') == 'event' and len(events) < 5: events.append(d.get('name'))
        elif d.get('type') == 'listing' and len(listings) < 5: listings.append(d.get('name'))
    except: pass

print()
print('=== Sample events ===')
for n in events: print(f'  {n}')
print()
print('=== Sample listings ===')
for n in listings: print(f'  {n}')
