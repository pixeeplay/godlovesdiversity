#!/bin/bash
# Run scraper in background, log to file, print PID
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
cd /Users/arnaudgredai/Desktop/parislgbt.com/scripts
set -a; source .env; set +a

LOG=/Users/arnaudgredai/Desktop/parislgbt.com/scripts/output/scrape.log
mkdir -p output
echo "Starting full scrape at $(date) — log: $LOG" > "$LOG"

nohup node parislgbt-scraper.js >> "$LOG" 2>&1 < /dev/null &
PID=$!
echo "$PID" > /Users/arnaudgredai/Desktop/parislgbt.com/scripts/output/.scraper.pid
echo "Started PID=$PID"
echo "Log file: $LOG"
echo "Check progress: tail -f $LOG"
