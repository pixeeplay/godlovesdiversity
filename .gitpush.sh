#!/bin/bash
# Helper utilisé par Cowork pour pousser depuis le Mac (auth keychain).
# Argument 1 : message de commit.
cd /Users/arnaudgredai/Desktop/godlovedirect
MSG="${1:-chore: cowork push}"
/usr/bin/git add -A
/usr/bin/git commit -m "$MSG" 2>&1
/usr/bin/git push origin main 2>&1
echo "DONE"
