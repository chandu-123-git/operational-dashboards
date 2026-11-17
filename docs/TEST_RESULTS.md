# Browser test results

**Run:** 13 Nov 2026 · Google Chrome (headless) driven by Playwright · `tests/test_app.py`
**Result: 109 / 109 checks passed** · 0 JavaScript errors

## How the checks work
- The suite clicks, types and selects in a real Chrome browser, the same way a student would.
- **Data accuracy:** after each action it reads the raw order records from the page and recalculates every expected value with a separate Python version of the business rules (status, SLA, KPI formulas). The numbers on screen are compared against that.
- Viewports tested: 1400×900 desktop, 1920×1080 wide, 820×1180 tablet, 390×844 mobile.

## Summary by area

| Area | Passed |
|---|---|
| L1 Tables | 29 / 29 |
| L2 KPIs & Charts | 22 / 22 |
| L3 Live & Alerts | 24 / 24 |
| L4 Roles | 13 / 13 |
| General | 5 / 5 |
| Responsive | 16 / 16 |

## Problems found during testing, and the fixes

| # | Problem found | Fix |
|---|---|---|
| 1 | The site footer's `.foot` class clashed with the KPI card `.foot` row, so KPI status chips were centred with extra padding | Renamed the footer class to `sitefoot` |
| 2 | The picker-shortage scenario alone did not reliably push Zone B over the backlog threshold. A robustness sweep showed it fired at only ~60% of start times, because a backlog only grows when orders keep *arriving* | Changed Activity 3 to a realistic combination: an Apparel-heavy flash sale lands during the shortage. Verified in Node that it fires at every start time from 16:00 to 18:00 |
| 3 | Mobile (390 px): the filter toolbar and the manager's 4-column KPI grid caused 51–56 px of horizontal page scroll | Grid tracks changed to `minmax(0,1fr)`, selects set to full width, and the manager KPI grid moved from an inline style to responsive classes |
| 4 | The closed order drawer (moved off-screen with a transform) added to the page's scroll width on mobile | The drawer is now `display:none` when closed and slides in with an animation when opened |
| 5 | Nested cause lists in "Why did the numbers change?" inherited the outer card border | Scoped the styles to `.changes > li` |
| 6 | An explanation text claimed the shortage keeps the backlog alert open longer; the sweep showed this is not consistently true | Removed the claim |
| 7 | Main area showed a focus outline after navigating between lessons | `main:focus-visible { outline: none }` (focus still moves to the content for screen readers) |

## All checks

| Area | Check | Result | Detail |
|---|---|---|---|
| L1 Tables | Total orders in funnel matches data | ✅ Pass | 197 orders |
| L1 Tables | Default page shows 10 rows | ✅ Pass |  |
| L1 Tables | Pagination page count = ceil(n/10) | ✅ Pass | expected 20 pages |
| L1 Tables | Default sort is newest first | ✅ Pass |  |
| L1 Tables | Search 'shah' count matches oracle | ✅ Pass | 4 vs 4 |
| L1 Tables | Every visible row contains search text | ✅ Pass |  |
| L1 Tables | Search matches are highlighted | ✅ Pass |  |
| L1 Tables | Search keeps focus in the box while typing | ✅ Pass |  |
| L1 Tables | Explanation describes the search | ✅ Pass | Search “shah”: 197 → 4 orders. Search keeps rows whose Order ID or customer name contains  |
| L1 Tables | Zone B filter count matches | ✅ Pass | 67 |
| L1 Tables | Zone B AND Overdue count matches | ✅ Pass | 2 |
| L1 Tables | Funnel shows each narrowing step | ✅ Pass | Orders today: 197 → Zone B: 67 → SLA: Overdue: 2 → showing 1–2 |
| L1 Tables | Active filters shown as removable chips | ✅ Pass |  |
| L1 Tables | Sort by ship-by asc puts earliest first | ✅ Pass | first=ORD-10112 |
| L1 Tables | Sorted column exposes aria-sort | ✅ Pass |  |
| L1 Tables | Query inspector reflects filters/sort/limit | ✅ Pass |  |
| L1 Tables | Removing a chip widens the result | ✅ Pass |  |
| L1 Tables | Pager moves to page 3 | ✅ Pass |  |
| L1 Tables | Pagination explanation says nothing is filtered out | ✅ Pass |  |
| L1 Tables | Changing a filter resets to page 1 | ✅ Pass |  |
| L1 Tables | Priority Express count matches | ✅ Pass | 46 |
| L1 Tables | Rows-per-page 25 → correct page count | ✅ Pass |  |
| L1 Tables | 'All open' status filter count matches | ✅ Pass |  |
| L1 Tables | Empty result shows guidance, not a blank table | ✅ Pass |  |
| L1 Tables | Row click opens order detail drawer | ✅ Pass |  |
| L1 Tables | Escape closes the drawer | ✅ Pass |  |
| L1 Tables | Activity 1 steps auto-tick (6/6) | ✅ Pass | 6/6 |
| L1 Tables | Wrong answer gives a hint | ✅ Pass |  |
| L1 Tables | Activity 1: all 4 correct answers accepted | ✅ Pass | 4/4 (answers: 20, 2, ORD-10112) |
| L2 KPIs & Charts | Orders received KPI | ✅ Pass | 197 |
| L2 KPIs & Charts | Order value KPI (excl. cancelled) | ✅ Pass | ₹13,20,290 |
| L2 KPIs & Charts | On-time ship rate KPI | ✅ Pass | 92.9% |
| L2 KPIs & Charts | Avg time to ship KPI | ✅ Pass | 1.90 h |
| L2 KPIs & Charts | Open backlog KPI | ✅ Pass | 38 |
| L2 KPIs & Charts | Overdue orders KPI | ✅ Pass | 4 |
| L2 KPIs & Charts | Calculation shows the real numbers | ✅ Pass | shipped on time ÷ all shipped = 144 ÷ 155 = 92.9% |
| L2 KPIs & Charts | Status chip reflects target (92.9% → Watch) | ✅ Pass |  |
| L2 KPIs & Charts | Clicking a KPI switches the calculation panel | ✅ Pass |  |
| L2 KPIs & Charts | Zone filter recomputes KPIs (Zone B) | ✅ Pass | 80.9% |
| L2 KPIs & Charts | Zone B is off/watch vs target | ✅ Pass |  |
| L2 KPIs & Charts | Status chart values match data | ✅ Pass | Shipped: 155; Picking: 22; Packed: 9; New: 4; Cancelled: 4; On Hold: 3 |
| L2 KPIs & Charts | Hourly chart sums to total orders | ✅ Pass | sum=197 |
| L2 KPIs & Charts | Zone chart rates match data | ✅ Pass | Zone A · Electronics: 97.8%; Zone B · Apparel: 80.9% ▼; Zone C · Home & Kitchen: 97.2%; Zone D · Beauty: 100.0% |
| L2 KPIs & Charts | Zone B is the lowest (story check) | ✅ Pass | {'A': 97.8, 'B': 80.9, 'C': 97.2, 'D': 100.0} |
| L2 KPIs & Charts | Urgency chart matches open orders by SLA | ✅ Pass | ✕ Overdue: 4; ! At risk (≤ 60 min): 3; ✓ On track: 31 |
| L2 KPIs & Charts | Hover tooltip explains the bar | ✅ Pass | Zone B · Apparel 38 of 47 shipped on time = 80.9% 9 shipped late · below the 95% |
| L2 KPIs & Charts | 'View data' shows the table behind a chart | ✅ Pass |  |
| L2 KPIs & Charts | Clicking Zone B bar drills to its late shipments | ✅ Pass | 9 orders |
| L2 KPIs & Charts | Drill-down shows where you came from | ✅ Pass |  |
| L2 KPIs & Charts | KPI 'See these orders' drills to overdue rows | ✅ Pass |  |
| L2 KPIs & Charts | Activity 2: steps 4/4 and answers 4/4 | ✅ Pass | steps 4/4, answers 4/4 |
| L3 Live & Alerts | Simulated label always visible in header | ✅ Pass |  |
| L3 Live & Alerts | Lesson explains feed is simulated, not real | ✅ Pass |  |
| L3 Live & Alerts | Step +1 min advances clock to 16:01 | ✅ Pass |  |
| L3 Live & Alerts | Live KPIs equal oracle after +11 min | ✅ Pass | {"Orders received": "202", "Order value": "₹13,55,520", "On-time ship rate": "93.0%", "Avg time to ship": "1.92 h", "Open backlog": "41",… |
| L3 Live & Alerts | Every count change has a recorded cause | ✅ Pass | 20 changes logged |
| L3 Live & Alerts | 'Why did the numbers change?' panel populated | ✅ Pass |  |
| L3 Live & Alerts | New-order events = orders added since 16:00 | ✅ Pass | 5 new |
| L3 Live & Alerts | Each 'became overdue' event happened after ship-by | ✅ Pass | 1 overdue events |
| L3 Live & Alerts | ▶ Start runs the clock (≈1 sim-min / s) | ✅ Pass | +2 sim-min in 2.6 s |
| L3 Live & Alerts | Header shows LIVE while running | ✅ Pass |  |
| L3 Live & Alerts | Unsaved answer survives live re-render | ✅ Pass |  |
| L3 Live & Alerts | ⏸ Pause stops the clock | ✅ Pass |  |
| L3 Live & Alerts | Shortage + flash sale → Zone B backlog alert fires | ✅ Pass | {'id': 'backlog', 'key': 'B', 'v': 23, 'uid': 1} |
| L3 Live & Alerts | Alert value equals Zone B open orders | ✅ Pass | 23 |
| L3 Live & Alerts | Acknowledge keeps alert open (acknowledged) | ✅ Pass |  |
| L3 Live & Alerts | Investigate opens the orders behind the alert | ✅ Pass | 23 rows |
| L3 Live & Alerts | Lowering a threshold fires the alert immediately | ✅ Pass | overdue=5, active=['overdue', 'backlog'] |
| L3 Live & Alerts | Raising a threshold resolves the alert | ✅ Pass |  |
| L3 Live & Alerts | Resolved alerts listed in history | ✅ Pass |  |
| L3 Live & Alerts | Flash sale adds 16 orders instantly | ✅ Pass |  |
| L3 Live & Alerts | Stock mismatch → On-hold alert fires | ✅ Pass | onHold=7 |
| L3 Live & Alerts | 15× speed advances ~15 sim-min per second | ✅ Pass | +30 min in 2.2 s |
| L3 Live & Alerts | KPIs still match oracle after scenarios | ✅ Pass | {"Orders received": "242", "Order value": "₹15,89,200", "On-time ship rate": "93.6%", "Avg time to ship": "1.89 h", "Open backlog": "67",… |
| L3 Live & Alerts | Activity 3: steps 7/7 and answers 4/4 | ✅ Pass | steps 7/7, answers 4/4 |
| L4 Roles | Banner states roles are simulated, not access control | ✅ Pass |  |
| L4 Roles | Manager pipeline counts match data | ✅ Pass | {'New': '4', 'Picking': '22', 'Packed': '9', 'On Hold': '3', 'Shipped': '155'} |
| L4 Roles | Operator queue count (Zone B) matches data | ✅ Pass | 14 |
| L4 Roles | Operator queue is most-urgent-first | ✅ Pass | ORD-10112 |
| L4 Roles | Operator view hides order value (₹) and other zones | ✅ Pass |  |
| L4 Roles | Changing operator zone changes the queue | ✅ Pass |  |
| L4 Roles | Side-by-side shows both views | ✅ Pass |  |
| L4 Roles | Mark packed: manager pipeline Picking −1, Packed +1 | ✅ Pass | ORD-10112: Picking 22→21, Packed 9→10 |
| L4 Roles | Changed pipeline boxes are highlighted | ✅ Pass |  |
| L4 Roles | On-time rate unchanged until the order ships | ✅ Pass |  |
| L4 Roles | Packed order ships ~20 sim-min later | ✅ Pass |  |
| L4 Roles | Release hold moves order back into Picking | ✅ Pass |  |
| L4 Roles | Activity 4: steps 4/4 and answers 4/4 | ✅ Pass | steps 4/4, answers 4/4 |
| General | Reset restores 16:00 baseline (197 orders) | ✅ Pass |  |
| General | Start page shows activity progress | ✅ Pass | Activity progress: 100%; Activity progress: 100%; Activity progress: 82%; Activity progress: 100% |
| General | Same seed → every student sees identical numbers | ✅ Pass | 92.9% |
| General | Chart bars work with keyboard (Enter drills down) | ✅ Pass |  |
| Responsive | mobile 390px /start: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | mobile 390px /orders: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | mobile 390px /business: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | mobile 390px /live: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | mobile 390px /roles: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | mobile side-by-side roles stack without overflow | ✅ Pass | overflow=0px |
| Responsive | tablet 820px /start: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | tablet 820px /orders: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | tablet 820px /business: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | tablet 820px /live: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | tablet 820px /roles: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | wide 1920px /start: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | wide 1920px /orders: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | wide 1920px /business: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | wide 1920px /live: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| Responsive | wide 1920px /roles: no page-level horizontal scroll | ✅ Pass | overflow=0px |
| General | No JavaScript errors during the whole run | ✅ Pass |  |

## Screenshots
Captured by the test run in `docs/screenshots/`: each lesson at desktop size, an alert firing, side-by-side roles, the order drawer, and every page at 390 px mobile.
