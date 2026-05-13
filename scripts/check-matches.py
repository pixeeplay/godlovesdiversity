import json, os, csv, unicodedata, re

scrape_dir = '/Users/arnaudgredai/Desktop/parislgbt.com/scripts/output'
csv_path = '/Users/arnaudgredai/Desktop/parislgbt.com/scripts/data/liste-lgbt-france.csv'

def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '', s.lower())

# scrape names
scrape_names = {}
for f in os.listdir(scrape_dir):
    if f.startswith('job_listing__') and f.endswith('.json'):
        try:
            d = json.load(open(os.path.join(scrape_dir, f)))
            if d.get('name') and d.get('slug'):
                scrape_names[norm(d['name'])] = (d['name'], d['slug'])
        except: pass

csv_names = {}
with open(csv_path, encoding='utf-8') as f:
    for r in csv.DictReader(f):
        n = r.get('NOM ETABLISSEMENT', r.get('NOM ÉTABLISSEMENT', '')).strip()
        if n: csv_names[norm(n)] = n

print(f'Scrape names: {len(scrape_names)}')
print(f'CSV names: {len(csv_names)}')
matches = scrape_names.keys() & csv_names.keys()
print(f'Exact matches: {len(matches)}')

print()
print('=== Scrape names NOT in CSV (first 30) ===')
unmatched_scrape = list(scrape_names.keys() - csv_names.keys())[:30]
for k in unmatched_scrape:
    name, slug = scrape_names[k]
    print(f'  WP slug={slug:30s}  name={name}')

# Fuzzy: substring match
print()
print('=== Fuzzy/substring matches (scrape name partial in csv name) ===')
csv_keys = list(csv_names.keys())
found_partial = []
for sk in (scrape_names.keys() - csv_names.keys()):
    sname, sslug = scrape_names[sk]
    sn_norm = sk
    if len(sn_norm) < 5: continue
    for ck in csv_keys:
        if sn_norm in ck or (len(ck) >= 5 and ck in sn_norm):
            found_partial.append((sname, csv_names[ck]))
            break

print(f'  Total fuzzy matches: {len(found_partial)}')
for s, c in found_partial[:15]:
    print(f'  WP "{s}" ↔ CSV "{c}"')
