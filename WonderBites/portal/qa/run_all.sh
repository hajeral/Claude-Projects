#!/usr/bin/env bash
# WonderBites QA — full run (Python Playwright + Chromium). Results land in qa/results/.
#   render matrix : every route x EN/AR x Night/Day x 1440/1280
#   click-through : every interactive element per route (EN + AR, two parallel shards each)
#   flows         : end-to-end journeys
#   inventory     : regenerates docs/screens.html
set -euo pipefail
cd "$(dirname "$0")"
python3 render_crawl.py | tee results/render.log | tail -1
python3 render_crawl.py --all-markets | tee results/render-allmarkets.log | tail -1   # (v1.3) UAE + KSA enabled
for L in en ar; do
  python3 click_crawl.py --lang "$L" --shard 0/2 > "results/clicks-$L-0.log" 2>&1 &
  python3 click_crawl.py --lang "$L" --shard 1/2 > "results/clicks-$L-1.log" 2>&1 &
  wait
done
python3 click_crawl.py --all-markets chrome admin-settings-markets admin-financials admin-orders admin-merchants admin-wallet m-branches m-branch-edit m-signup > results/clicks-allmarkets.log 2>&1
python3 flows.py | tee results/flows.log | tail -1
python3 build_screens.py
python3 scrub_pii.py --check                          # (v1.4) no realistic PII / banking data
python3 gallery.py | tail -1                            # (v1.4 F-018) docs/gallery.html
python3 summarize.py
