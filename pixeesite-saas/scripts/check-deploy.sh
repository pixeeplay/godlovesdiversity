#!/bin/bash
# Quick check of deployment errors
TOKEN="${COOLIFY_TOKEN:-12|8y8nKwV0lQY6U2V3WmTOfN0ccLnNkStKk2rV7jPzf6756939}"
URL="${COOLIFY_URL:-http://51.75.31.123:8000}"
ID="${1:?Usage: $0 <deployment-uuid>}"

curl -s "$URL/api/v1/deployments/$ID" -H "Authorization: Bearer $TOKEN" > /tmp/deploy.json

/usr/bin/python3 <<'EOF'
import json
d = json.load(open("/tmp/deploy.json"))
print("status:", d.get("status"))
print("finished:", d.get("finished_at"))
logs = json.loads(d.get("logs","[]") or "[]")
relevant = []
for e in logs:
    out = e.get("output","").lower()
    if "error" in out or "can't resolve" in out or "module not found" in out or "exit code" in out or "failed" in out:
        relevant.append(e)
seen = set()
for e in relevant[-30:]:
    out = e.get("output","")[:500]
    if out in seen: continue
    seen.add(out)
    print("---")
    print(out)
EOF
