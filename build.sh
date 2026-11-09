#!/bin/sh
# Bundles the ES modules into plain scripts so tx.html / rx.html open straight from disk
# (browsers refuse to load ES modules from file://). Rerun after editing anything in js/.
set -e
cd "$(dirname "$0")"
for p in tx rx; do
  npx -y esbuild@0.24.0 "js/ui/$p-ui.js" --bundle --format=iife --target=es2020 --log-level=warning --outfile="js/$p.bundle.js"
done
# cache-bust: the pages reference the bundles with ?v=<build time>, so a reload always gets the new one
v=$(date +%s)
for p in tx rx; do
  sed -i '' -E "s#js/$p\.bundle\.js(\?v=[0-9]+)?#js/$p.bundle.js?v=$v#" "$p.html"
done
