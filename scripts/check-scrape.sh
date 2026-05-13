#!/bin/bash
cd /Users/arnaudgredai/Desktop/parislgbt.com/scripts/output
echo "=== Scrape status (last 5 lines) ==="
tail -5 scrape.log
echo
echo "=== Stats ==="
echo "Total JSON files: $(ls *.json 2>/dev/null | wc -l)"
echo "Successes ✅:     $(grep -c '✅' scrape.log)"
echo "Failures ❌:      $(grep -c '❌' scrape.log)"
echo
echo "=== Failed URLs ==="
grep '❌ http' scrape.log | head -30
echo
echo "=== JSON by type ==="
ls *.json 2>/dev/null | sed 's/__.*//' | sort | uniq -c
echo
echo "=== Scraper still running? ==="
PID=$(cat .scraper.pid 2>/dev/null)
if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
  echo "Still running PID=$PID"
else
  echo "Stopped/finished"
fi
