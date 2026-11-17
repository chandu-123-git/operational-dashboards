# Four guided student activities

Each activity also appears inside the app, in the panel beside its lesson. Steps tick **automatically** when the student does them. Answers are checked against the **current** data, so they stay correct even after the simulation has moved on.

The answer key below is for the **16:00 baseline**. Press *Reset* in the header to return to it.

---

## Activity 1: Find the overdue orders in Zone B
**Lesson 1 · Tables, search & filters, pagination** · about 15 min

**Scenario:** a shift lead says "Zone B feels behind today." Use the table to find the evidence.

**Steps (action → what to observe)**
1. Type `shah` in Search → 197 becomes 4 orders, and the matches are highlighted. *Search is a "contains" match on ID or name.*
2. Set Zone = Zone B → the funnel shows 197 → 67. *A filter keeps exact matches only.*
3. Add SLA = Overdue → the funnel shows 197 → 67 → 2. *Several filters combine with AND.*
4. Click the Ship-by header (▲) → same count, but the most urgent order moves to the top. *Sorting never removes rows.*
5. Clear the filters and go to page 2 → "rows 11–20 of 197." *Pagination only changes which slice you see.*
6. Click a row → the order drawer opens with a timeline and the reason for its SLA label.

Optional: press **Show this view as a query** to see the same view as `WHERE … ORDER BY … LIMIT … OFFSET`.

**Questions (baseline answers)**
| # | Question | Answer |
|---|---|---|
| Q1 | With no filters and 10 rows per page, how many pages? | **20** (197 ÷ 10, rounded up) |
| Q2 | How many Zone B orders are Overdue? | **2** |
| Q3 | Which Zone B overdue order has the earliest ship-by? | **ORD-10112** (ship-by 13:15) |
| Q4 | Why does adding a filter jump back to page 1? | The filtered result is a new, smaller list, so the old page number may not exist |

---

## Activity 2: Is today's delivery promise being kept?
**Lesson 2 · KPIs & charts** · about 15 min

**Scenario:** the operations director wants a one-line answer and a reason.

**Steps**
1. Click the **On-time ship rate** card → the panel shows `144 ÷ 155 = 92.9%`, with the "Watch" status explained.
2. Use the Zone filter (for example, Zone B) → every KPI and chart recalculates for that zone only.
3. Click **View data** under any chart → the table of numbers behind the chart appears. *A chart is a summarised table.*
4. Click Zone B's bar in **"Which zone is breaking the delivery promise?"** → the Orders table opens filtered to Zone B + Shipped late, with a note saying where you came from.

**Questions (baseline answers)**
| # | Question | Answer |
|---|---|---|
| Q1 | Overall on-time ship rate (one decimal)? | **92.9** |
| Q2 | Which zone has the lowest on-time rate? | **Zone B · Apparel** (80.9%; A 97.8, C 97.2, D 100) |
| Q3 | How many Zone B orders shipped late? | **9** |
| Q4 | "Orders received" has no target. Is it a KPI? | Not really. It's a context metric: without a target you can't tell good from bad |

**Takeaway:** the overall average hid one failing segment. KPI (verdict) → chart (where) → drill-down (which orders).

---

## Activity 3: Watch the floor live, then handle an alert
**Lesson 3 · Live data & alerts** · about 20 min

**Scenario:** you're on the evening shift. All updates here are **simulated** by a timer in the browser.

**Steps**
1. Press **Step +1 min** or **▶ Start live feed** → the clock moves, and KPI deltas and events appear.
2. Read an entry in **"Why did the numbers change?"** → each KPI change lists the events that caused it. Look for an order that became overdue only because time passed.
3. Run **Picker shortage in Zone B** → Zone B picking slows for 90 simulated minutes.
4. While Zone B is short-staffed, run **Flash sale** → 16 orders arrive (7 for Zone B), and the **Zone backlog high: Zone B** alert fires (for example, 23 ≥ 20).
5. **Acknowledge** the alert → it stays open but is marked "someone is on it."
6. Click **Investigate →** → the table opens showing exactly the open Zone B orders the alert counted.
7. Change a threshold in the rules table (for example, set Overdue to 1) → alerts fire or resolve straight away.

**Questions**
| # | Question | Answer |
|---|---|---|
| Q1 | Overdue went up by 1 but no one touched the order. Why? | Time passed its ship-by time while it was still in the warehouse |
| Q2 | Which zone's backlog alert fired after the flash sale? | **Zone B** |
| Q3 | Acknowledged vs Resolved? | Acknowledged = a person is on it; Resolved = the metric is back within the threshold |
| Q4 | Main risk of setting the Overdue threshold to 1? | Alert fatigue: too many alerts, so people ignore them |

**Discussion prompt:** watch the Overdue alert at its default threshold of 6. It can fire and resolve repeatedly as the value moves between 5 and 6. That is *flapping*; how do real systems prevent it?

---

## Activity 4: Same data, different jobs
**Lesson 4 · Role-specific dashboards** · about 15 min

**Scenario:** compare how the Operations Manager and a Zone B Warehouse Operator use the dashboard. The role switch is **simulated, not access control**.

**Steps**
1. View as **Operations Manager** → whole-facility KPIs, pipeline, zone comparison, alerts, most overdue orders (with ₹ value).
2. View as **Warehouse Operator (Zone B)** → only Zone B: a queue sorted most-urgent-first, a countdown and one action button per order, with no ₹ values and no other zones.
3. As the operator, click the action on the top order (**Mark packed**, **Start picking** or **Release hold**).
4. Open **Side by side**, then act again → the manager's pipeline highlights *Picking −1, Packed +1*. The on-time rate only changes about 20 simulated minutes later, when the order ships.

**Questions (baseline answers)**
| # | Question | Answer |
|---|---|---|
| Q1 | Which question does the operator view answer best? | What should I work on next, and how urgent is it? |
| Q2 | How many orders are in the Zone B operator queue? | **14** at 16:00 (New + Picking + On Hold; it changes as you act) |
| Q3 | What changed in the manager view right after "Mark packed"? | The pipeline: Picking −1, Packed +1 |
| Q4 | Is hiding order value on screen enough to protect it? | No. The server must only send each role the data it is allowed to see |

**Takeaway:** one data source, two lenses. Design each view from the role's decisions and actions, and enforce real permissions on the server.
