#!/bin/bash
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
cd /Users/arnaudgredai/Desktop/parislgbt.com
npx tsx scripts/import-merge-to-db.ts --dry-run 2>&1
