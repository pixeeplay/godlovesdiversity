#!/bin/bash
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
cd /Users/arnaudgredai/Desktop/parislgbt.com/scripts

# Load .env manually (handles values with spaces)
set -a
source .env
set +a

echo "Using GEMINI_API_KEY=${GEMINI_API_KEY:0:10}..."
echo "Mode: $1"
echo

case "$1" in
  test)
    node parislgbt-scraper.js --limit=5 2>&1
    ;;
  full)
    node parislgbt-scraper.js 2>&1
    ;;
  listings)
    node parislgbt-scraper.js --type=job_listing 2>&1
    ;;
  categories)
    node parislgbt-scraper.js --type=job_listing_category 2>&1
    ;;
  *)
    echo "Usage: $0 {test|full|listings|categories}"
    exit 1
    ;;
esac
