#!/bin/sh
# Bundles the ES modules into plain scripts so tx.html / rx.html open straight from disk
# (browsers refuse to load ES modules from file://). Rerun after editing anything in js/.
set -e
cd "$(dirname "$0")"
for p in tx rx; do
  npx -y esbuild@0.24.0 "js/ui/$p-ui.js" --bundle --format=iife --target=es2020 --log-level=warning --outfile="js/$p.bundle.js"
done
