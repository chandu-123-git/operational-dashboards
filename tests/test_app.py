"""
End-to-end browser tests for OrderOps Lab (Playwright + Google Chrome).
Every number shown on screen is checked against an INDEPENDENT Python
re-implementation of the business rules, computed from the raw order records.
Run:  python3 test_app.py http://localhost:8765/
"""
import asyncio, json, math, os, re, sys, time
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots") + os.sep
os.makedirs(SHOTS, exist_ok=True)
CHROME = os.environ.get("CHROME_PATH")  # optional: use an installed Chrome
OPEN = ["New", "Picking", "Packed", "On Hold"]
results = []


def record(group, name, ok, detail=""):
    results.append({"group": group, "test": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + f"[{group}] {name} {('— ' + detail) if detail else ''}")


# ---------------- independent oracle ----------------
def status(o, now):
    if o["cancelledAt"] is not None and o["cancelledAt"] <= now: return "Cancelled"
    if o["hold"] and o["hold"]["since"] <= now: return "On Hold"
    if o["shippedAt"] <= now: return "Shipped"
    if o["packedAt"] <= now: return "Packed"
    if o["pickStartAt"] <= now: return "Picking"
    return "New"


def sla(o, st, now):
    if st == "Cancelled": return "—"
    if st == "Shipped": return "Shipped on time" if o["shippedAt"] <= o["shipBy"] else "Shipped late"
    left = o["shipBy"] - now
    if left < 0: return "Overdue"
    if left <= 60: return "At risk"
    return "On track"


def oracle_rows(orders, now):
    out = []
    for o in orders:
        if o["placedAt"] > now: continue
        st = status(o, now)
        out.append(dict(o, status=st, sla=sla(o, st, now)))
    return out


def kpis(rows):
    shipped = [r for r in rows if r["status"] == "Shipped"]
    ontime = [r for r in shipped if r["sla"] == "Shipped on time"]
    opn = [r for r in rows if r["status"] in OPEN]
    return {
        "received": len(rows),
        "value": sum(r["value"] for r in rows if r["status"] != "Cancelled"),
        "shipped": len(shipped), "onTime": len(ontime),
        "onTimeRate": round(len(ontime) / len(shipped) * 100, 1) if shipped else None,
        "avgHours": round(sum(r["shippedAt"] - r["placedAt"] for r in shipped) / len(shipped) / 60, 2) if shipped else None,
        "open": len(opn), "overdue": sum(1 for r in opn if r["sla"] == "Overdue"),
        "onHold": sum(1 for r in opn if r["status"] == "On Hold"),
    }


def inr(v):  # Indian digit grouping, e.g. 13,20,290
    s = str(int(v))
    if len(s) <= 3: return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:]); head = head[:-2]
    if head: parts.insert(0, head)
    return ",".join(parts) + "," + tail


async def state(pg):
    return await pg.evaluate("({orders: OD.store.orders.map(o => Object.assign({}, o)), now: OD.store.now})")


async def funnel_final(pg):
    t = await pg.locator(".funnel .stage.final b").inner_text()
    return int(t)


async def goto(pg, route):
    await pg.goto(BASE + "#/" + route)
    await pg.wait_for_timeout(250)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        ctx = await browser.new_context(viewport={"width": 1400, "height": 900})
        pg = await ctx.new_page()
        errors = []
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))

        # ================= Lesson 1: tables =================
        G = "L1 Tables"
        await goto(pg, "orders")
        st = await state(pg)
        rows = oracle_rows(st["orders"], st["now"])
        record(G, "Total orders in funnel matches data", await funnel_final(pg) == len(rows), f"{len(rows)} orders")
        record(G, "Default page shows 10 rows", await pg.locator("table.data tbody tr").count() == 10)
        pager = await pg.locator(".pager").inner_text()
        record(G, "Pagination page count = ceil(n/10)", f"of {math.ceil(len(rows)/10)}" in pager.replace("\n", " "), f"expected {math.ceil(len(rows)/10)} pages")
        # default sort placed desc
        firsts = await pg.locator("table.data tbody tr td:nth-child(3)").all_inner_texts()
        record(G, "Default sort is newest first", firsts == sorted(firsts, reverse=True))

        # search
        await pg.fill("#q", "shah")
        await pg.wait_for_timeout(200)
        exp = [r for r in rows if "shah" in r["id"].lower() or "shah" in r["customer"].lower()]
        got = await funnel_final(pg)
        names = await pg.locator("table.data tbody tr td:nth-child(2)").all_inner_texts()
        record(G, "Search 'shah' count matches oracle", got == len(exp), f"{got} vs {len(exp)}")
        record(G, "Every visible row contains search text", all("shah" in n.lower() for n in names) and len(names) > 0)
        record(G, "Search matches are highlighted", await pg.locator("table.data mark").count() >= 1)
        record(G, "Search keeps focus in the box while typing", await pg.evaluate("document.activeElement.id") == "q")
        ex = await pg.locator("#explain").inner_text()
        record(G, "Explanation describes the search", "Search" in ex and str(len(exp)) in ex, ex[:90])
        await pg.fill("#q", "")

        # zone filter + sla filter (AND)
        await pg.select_option("select[data-filter=zone]", "B")
        await pg.wait_for_timeout(150)
        expB = [r for r in rows if r["zone"] == "B"]
        record(G, "Zone B filter count matches", await funnel_final(pg) == len(expB), f"{len(expB)}")
        await pg.select_option("select[data-filter=sla]", "Overdue")
        await pg.wait_for_timeout(150)
        expBO = [r for r in expB if r["sla"] == "Overdue"]
        record(G, "Zone B AND Overdue count matches", await funnel_final(pg) == len(expBO), f"{len(expBO)}")
        stages = await pg.locator(".funnel .stage").all_inner_texts()
        record(G, "Funnel shows each narrowing step", len(stages) == 4, " → ".join(stages))
        record(G, "Active filters shown as removable chips", await pg.locator(".chip").count() == 2)
        # sort by ship-by
        await pg.click("th button[data-sort=shipBy]")
        await pg.wait_for_timeout(150)
        ids = await pg.locator("table.data tbody tr td:nth-child(1)").all_inner_texts()
        oldest = sorted(expBO, key=lambda r: r["shipBy"])[0]["id"] if expBO else None
        record(G, "Sort by ship-by asc puts earliest first", ids and ids[0] == oldest, f"first={ids[0] if ids else None}")
        aria = await pg.locator("th[aria-sort]").get_attribute("aria-sort")
        record(G, "Sorted column exposes aria-sort", aria == "ascending")
        await pg.click("button:has-text('Show this view as a query')")
        q = await pg.locator("pre.query").inner_text()
        record(G, "Query inspector reflects filters/sort/limit", "zone = 'B'" in q and "sla = 'Overdue'" in q and "ORDER BY ship_by ASC" in q and "LIMIT 10 OFFSET 0" in q)
        # remove a chip
        await pg.click(".chip button >> nth=1")
        await pg.wait_for_timeout(150)
        record(G, "Removing a chip widens the result", await funnel_final(pg) == len(expB))
        # filter resets page
        await pg.click("[data-clear] >> nth=0")
        await pg.wait_for_timeout(150)
        await pg.click(".pager button:has-text('Next')")
        await pg.wait_for_timeout(150)
        await pg.click(".pager button[data-page='3']")
        await pg.wait_for_timeout(150)
        record(G, "Pager moves to page 3", "Page 3 of" in (await pg.locator(".pager").inner_text()).replace("\n", " "))
        ex = await pg.locator("#explain").inner_text()
        record(G, "Pagination explanation says nothing is filtered out", "nothing is filtered out" in ex)
        await pg.select_option("select[data-filter=priority]", "Express")
        await pg.wait_for_timeout(150)
        record(G, "Changing a filter resets to page 1", "Page 1 of" in (await pg.locator(".pager").inner_text()).replace("\n", " "))
        expE = [r for r in rows if r["priority"] == "Express"]
        record(G, "Priority Express count matches", await funnel_final(pg) == len(expE), f"{len(expE)}")
        await pg.click("[data-clear] >> nth=0")
        await pg.select_option("select[data-pagesize]", "25")
        await pg.wait_for_timeout(150)
        record(G, "Rows-per-page 25 → correct page count", f"of {math.ceil(len(rows)/25)}" in (await pg.locator(".pager").inner_text()).replace("\n", " ") and await pg.locator("table.data tbody tr").count() == 25)
        await pg.select_option("select[data-pagesize]", "10")
        await pg.click(".pager button[data-page='2']")
        await pg.wait_for_timeout(150)
        # status 'open' filter
        await pg.select_option("select[data-filter=status]", "open")
        await pg.wait_for_timeout(150)
        record(G, "'All open' status filter count matches", await funnel_final(pg) == len([r for r in rows if r["status"] in OPEN]))
        await pg.click("[data-clear] >> nth=0")
        # empty state
        await pg.fill("#q", "zzzz")
        await pg.wait_for_timeout(150)
        record(G, "Empty result shows guidance, not a blank table", await pg.locator(".empty").count() == 1)
        await pg.fill("#q", "")
        await pg.wait_for_timeout(150)
        # drawer
        first_id = (await pg.locator("table.data tbody tr td:nth-child(1)").all_inner_texts())[0]
        await pg.click("table.data tbody tr >> nth=0")
        await pg.wait_for_timeout(300)
        dtitle = await pg.locator("#drawer-title").inner_text()
        record(G, "Row click opens order detail drawer", dtitle == first_id and await pg.locator("#drawer.open").count() == 1)
        await pg.screenshot(path=SHOTS + "L1_drawer.png")
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(250)
        record(G, "Escape closes the drawer", await pg.locator("#drawer.open").count() == 0)
        steps_done = await pg.locator("#activity .steps li.done").count()
        record(G, "Activity 1 steps auto-tick (6/6)", steps_done == 6, f"{steps_done}/6")
        # activity answers
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"])
        bo = sorted([r for r in rows if r["zone"] == "B" and r["sla"] == "Overdue"], key=lambda r: r["shipBy"])
        await pg.fill("#in-q1_pages", "3")
        await pg.click("[data-check=q1_pages]")
        await pg.wait_for_timeout(200)
        record(G, "Wrong answer gives a hint", await pg.locator("[data-q=q1_pages] .fb.no").count() == 1)
        await pg.fill("#in-q1_pages", str(math.ceil(len(rows) / 10)))
        await pg.click("[data-check=q1_pages]")
        await pg.fill("#in-q1_overdueB", str(len(bo)))
        await pg.click("[data-check=q1_overdueB]")
        await pg.fill("#in-q1_oldest", bo[0]["id"].lower())
        await pg.click("[data-check=q1_oldest]")
        await pg.check("input[name=q1_reset][value='1']")
        await pg.click("[data-check=q1_reset]")
        await pg.wait_for_timeout(250)
        okc = await pg.locator("#activity .fb.ok").count()
        record(G, "Activity 1: all 4 correct answers accepted", okc == 4, f"{okc}/4 (answers: {math.ceil(len(rows)/10)}, {len(bo)}, {bo[0]['id']})")
        await pg.screenshot(path=SHOTS + "L1_table_desktop.png", full_page=True)

        # ================= Lesson 2: KPIs & charts =================
        G = "L2 KPIs & Charts"
        await goto(pg, "business")
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"]); K = kpis(rows)
        vals = dict(zip(await pg.locator(".kpi .lbl").all_inner_texts(), await pg.locator(".kpi .val").all_inner_texts()))
        record(G, "Orders received KPI", vals["Orders received"] == str(K["received"]), vals["Orders received"])
        record(G, "Order value KPI (excl. cancelled)", vals["Order value"].replace("₹", "") == inr(K["value"]), vals["Order value"])
        record(G, "On-time ship rate KPI", vals["On-time ship rate"] == f"{K['onTimeRate']:.1f}%", vals["On-time ship rate"])
        record(G, "Avg time to ship KPI", vals["Avg time to ship"] == f"{K['avgHours']:.2f} h", vals["Avg time to ship"])
        record(G, "Open backlog KPI", vals["Open backlog"] == str(K["open"]), vals["Open backlog"])
        record(G, "Overdue orders KPI", vals["Overdue orders"] == str(K["overdue"]), vals["Overdue orders"])
        formula = await pg.locator(".calc .formula").inner_text()
        record(G, "Calculation shows the real numbers", f"{K['onTime']} ÷ {K['shipped']}" in formula, formula)
        record(G, "Status chip reflects target (92.9% → Watch)", "Watch" in await pg.locator(".kpi[data-kpi=onTimeRate] .state").inner_text())
        await pg.click(".kpi[data-kpi=overdue]")
        await pg.wait_for_timeout(150)
        record(G, "Clicking a KPI switches the calculation panel", "Overdue orders" in await pg.locator(".calc").locator("xpath=..").inner_text())
        await pg.click(".kpi[data-kpi=onTimeRate]")
        # zone filter
        await pg.click("[data-bizzone=B]")
        await pg.wait_for_timeout(200)
        KB = kpis([r for r in rows if r["zone"] == "B"])
        v = await pg.locator(".kpi[data-kpi=onTimeRate] .val").inner_text()
        record(G, "Zone filter recomputes KPIs (Zone B)", v == f"{KB['onTimeRate']:.1f}%" and await pg.locator(".kpi[data-kpi=received] .val").inner_text() == str(KB["received"]), v)
        record(G, "Zone B is off/watch vs target", ("Off target" in await pg.locator(".kpi[data-kpi=onTimeRate] .state").inner_text()) == (KB["onTimeRate"] < 90))
        await pg.click("[data-bizzone=all]")
        await pg.wait_for_timeout(200)
        # status chart values
        bars = await pg.locator("#ch-status g.item").evaluate_all("gs => gs.map(g => g.getAttribute('aria-label'))")
        exp_status = {s: sum(1 for r in rows if r["status"] == s) for s in ["New", "Picking", "Packed", "On Hold", "Shipped", "Cancelled"]}
        okb = all(f"{s}: {n}" in bars for s, n in exp_status.items())
        record(G, "Status chart values match data", okb, "; ".join(bars))
        # hourly sums to total
        hourly = await pg.locator("#ch-hourly g.item").evaluate_all("gs => gs.map(g => parseInt(g.getAttribute('aria-label').split(': ')[1]))")
        record(G, "Hourly chart sums to total orders", sum(hourly) == len(rows), f"sum={sum(hourly)}")
        # zone chart
        zl = await pg.locator("#ch-zone g.item").evaluate_all("gs => gs.map(g => g.getAttribute('aria-label'))")
        zexp = {z: kpis([r for r in rows if r["zone"] == z])["onTimeRate"] for z in "ABCD"}
        record(G, "Zone chart rates match data", all(f"{zexp[z]:.1f}%" in zl[i] for i, z in enumerate("ABCD")), "; ".join(zl))
        record(G, "Zone B is the lowest (story check)", min(zexp, key=zexp.get) == "B", str(zexp))
        # urgency
        ul = await pg.locator("#ch-urgency g.item").evaluate_all("gs => gs.map(g => g.getAttribute('aria-label'))")
        opn = [r for r in rows if r["status"] in OPEN]
        record(G, "Urgency chart matches open orders by SLA", all(str(sum(1 for r in opn if r["sla"] == k)) in ul[i] for i, k in enumerate(["Overdue", "At risk", "On track"])), "; ".join(ul))
        # tooltip
        await pg.hover("#ch-zone g.item >> nth=1")
        await pg.wait_for_timeout(150)
        tt = await pg.locator("#tooltip").inner_text()
        record(G, "Hover tooltip explains the bar", "Zone B" in tt and "shipped on time" in tt, tt.replace("\n", " ")[:80])
        # view data
        await pg.click("[data-showdata=zone]")
        await pg.wait_for_timeout(150)
        record(G, "'View data' shows the table behind a chart", await pg.locator("#tbl-zone table").count() == 1)
        await pg.screenshot(path=SHOTS + "L2_business_desktop.png", full_page=True)
        # drill-down
        await pg.click("#ch-zone g.item >> nth=1")
        await pg.wait_for_timeout(400)
        lateB = [r for r in rows if r["zone"] == "B" and r["sla"] == "Shipped late"]
        record(G, "Clicking Zone B bar drills to its late shipments", "#/orders" in pg.url and await funnel_final(pg) == len(lateB), f"{len(lateB)} orders")
        record(G, "Drill-down shows where you came from", await pg.locator(".provenance").count() == 1)
        await goto(pg, "business")
        await pg.click(".kpi[data-kpi=overdue]")
        await pg.click("[data-kpidrill]")
        await pg.wait_for_timeout(300)
        record(G, "KPI 'See these orders' drills to overdue rows", await funnel_final(pg) == K["overdue"])
        await goto(pg, "business")
        await pg.fill("#in-q2_rate", f"{K['onTimeRate']:.1f}")
        await pg.click("[data-check=q2_rate]")
        await pg.check("input[name=q2_zone][value='1']"); await pg.click("[data-check=q2_zone]")
        await pg.fill("#in-q2_lateB", str(len(lateB))); await pg.click("[data-check=q2_lateB]")
        await pg.check("input[name=q2_kpi][value='1']"); await pg.click("[data-check=q2_kpi]")
        await pg.wait_for_timeout(250)
        okc = await pg.locator("#activity .fb.ok").count()
        sd = await pg.locator("#activity .steps li.done").count()
        record(G, "Activity 2: steps 4/4 and answers 4/4", okc == 4 and sd == 4, f"steps {sd}/4, answers {okc}/4")

        # ================= Lesson 3: live & alerts =================
        G = "L3 Live & Alerts"
        await goto(pg, "live")
        record(G, "Simulated label always visible in header", "SIMULATED" in await pg.locator("#simchip").inner_text())
        record(G, "Lesson explains feed is simulated, not real", "SIMULATED live feed" in await pg.locator(".simbanner").inner_text())
        await pg.click("[data-live='1']")
        await pg.wait_for_timeout(200)
        st = await state(pg)
        record(G, "Step +1 min advances clock to 16:01", st["now"] == 961)
        await pg.click("[data-live='10']")
        await pg.wait_for_timeout(300)
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"]); K = kpis(rows)
        lv = dict(zip(await pg.locator(".livekpis .kpi .lbl").all_inner_texts(), await pg.locator(".livekpis .kpi .val").all_inner_texts()))
        record(G, "Live KPIs equal oracle after +11 min", lv["Orders received"] == str(K["received"]) and lv["Open backlog"] == str(K["open"]) and lv["Overdue orders"] == str(K["overdue"]) and lv["On-time ship rate"] == f"{K['onTimeRate']:.1f}%", json.dumps(lv, ensure_ascii=False))
        log = await pg.evaluate("OD.store.kpiLog.slice(0,40)")
        consistent = all(len(c["causes"]) > 0 for c in log if c["key"] in ("received", "open", "overdue"))
        record(G, "Every count change has a recorded cause", consistent and len(log) > 0, f"{len(log)} changes logged")
        record(G, "'Why did the numbers change?' panel populated", await pg.locator(".changes > li").count() > 0)
        # oracle: replay events — new-order events equal new orders
        evs = await pg.evaluate("OD.store.events")
        new_ev = sum(1 for e in evs if e["type"] == "new")
        record(G, "New-order events = orders added since 16:00", new_ev == len(rows) - 197, f"{new_ev} new")
        od_ev = [e for e in evs if e["type"] == "overdue"]
        omap = {o["id"]: o for o in st["orders"]}
        record(G, "Each 'became overdue' event happened after ship-by", all(e["t"] > omap[e["id"]]["shipBy"] for e in od_ev), f"{len(od_ev)} overdue events")
        # play / pause
        t0 = (await state(pg))["now"]
        await pg.click("[data-live=toggle]")
        await pg.wait_for_timeout(2600)
        t1 = (await state(pg))["now"]
        record(G, "▶ Start runs the clock (≈1 sim-min / s)", t1 - t0 >= 2, f"+{t1 - t0} sim-min in 2.6 s")
        record(G, "Header shows LIVE while running", "LIVE" in await pg.locator("#simchip").inner_text())
        # radio survives a tick
        await pg.check("input[name=q3_time][value='1']")
        await pg.wait_for_timeout(1300)
        record(G, "Unsaved answer survives live re-render", await pg.locator("input[name=q3_time][value='1']").is_checked())
        await pg.click("[data-live=toggle]")
        t2 = (await state(pg))["now"]; await pg.wait_for_timeout(1500)
        record(G, "⏸ Pause stops the clock", (await state(pg))["now"] == t2)
        # shortage + flash sale -> backlog alert in zone B
        await pg.click("[data-scenario=shortage]")
        await pg.wait_for_timeout(200)
        await pg.click("[data-live='10']"); await pg.wait_for_timeout(150)
        await pg.click("[data-scenario=flash]")
        await pg.wait_for_timeout(250)
        al = await pg.evaluate("OD.activeAlerts().map(a => ({id:a.ruleId, key:a.key, v:a.value, uid:a.uid}))")
        fired = ([a for a in al if a["id"] == "backlog" and a["key"] == "B"] or [None])[0]
        record(G, "Shortage + flash sale → Zone B backlog alert fires", fired is not None and fired["key"] == "B", str(fired))
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"])
        bopen = sum(1 for r in rows if r["zone"] == "B" and r["status"] in OPEN)
        record(G, "Alert value equals Zone B open orders", fired and fired["v"] == bopen and bopen >= 20, f"{bopen}")
        await pg.screenshot(path=SHOTS + "L3_alert_fired.png", full_page=True)
        await pg.click(f"[data-ack='{fired['uid']}']")
        await pg.wait_for_timeout(150)
        stt = await pg.evaluate(f"OD.store.alerts.find(a => a.uid === {fired['uid']}).status")
        record(G, "Acknowledge keeps alert open (acknowledged)", stt == "acknowledged")
        await pg.click(f"[data-investigate='{fired['uid']}']")
        await pg.wait_for_timeout(300)
        record(G, "Investigate opens the orders behind the alert", "#/orders" in pg.url and await funnel_final(pg) == bopen, f"{bopen} rows")
        await goto(pg, "live")
        # threshold tuning
        K = kpis(rows)
        await pg.fill("input[data-threshold=overdue]", "1")
        await pg.press("input[data-threshold=overdue]", "Tab")
        await pg.wait_for_timeout(200)
        al = await pg.evaluate("OD.activeAlerts().map(a => a.ruleId)")
        record(G, "Lowering a threshold fires the alert immediately", ("overdue" in al) == (K["overdue"] >= 1), f"overdue={K['overdue']}, active={al}")
        await pg.fill("input[data-threshold=backlog]", "99")
        await pg.press("input[data-threshold=backlog]", "Tab")
        await pg.wait_for_timeout(200)
        res = await pg.evaluate("OD.store.alerts.filter(a => a.ruleId==='backlog' && a.status==='resolved').length")
        record(G, "Raising a threshold resolves the alert", res >= 1)
        record(G, "Resolved alerts listed in history", await pg.locator("text=Recently resolved").count() == 1)
        await pg.click("[data-resetrules]")
        # flash sale & stock
        before = len(rows)
        await pg.click("[data-scenario=flash]")
        await pg.wait_for_timeout(200)
        st = await state(pg)
        record(G, "Flash sale adds 16 orders instantly", len(oracle_rows(st["orders"], st["now"])) == before + 16)
        await pg.click("[data-scenario=stock]")
        await pg.wait_for_timeout(200)
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"]); K = kpis(rows)
        al = await pg.evaluate("OD.activeAlerts().map(a => a.ruleId)")
        record(G, "Stock mismatch → On-hold alert fires", "hold" in al and K["onHold"] >= 4, f"onHold={K['onHold']}")
        # speed
        await pg.click("[data-speed='15']")
        await pg.click("[data-live=toggle]")
        t0 = (await state(pg))["now"]; await pg.wait_for_timeout(2200)
        t1 = (await state(pg))["now"]
        await pg.click("[data-live=toggle]")
        record(G, "15× speed advances ~15 sim-min per second", t1 - t0 >= 25, f"+{t1 - t0} min in 2.2 s")
        await pg.click("[data-speed='1']")
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"]); K = kpis(rows)
        lv = dict(zip(await pg.locator(".livekpis .kpi .lbl").all_inner_texts(), await pg.locator(".livekpis .kpi .val").all_inner_texts()))
        record(G, "KPIs still match oracle after scenarios", lv["Orders received"] == str(K["received"]) and lv["Overdue orders"] == str(K["overdue"]) and lv["On-time ship rate"] == f"{K['onTimeRate']:.1f}%" and lv["Avg time to ship"] == f"{K['avgHours']:.2f} h", json.dumps(lv, ensure_ascii=False))
        for qid in ["q3_time", "q3_zone", "q3_ack", "q3_fatigue"]:
            await pg.check(f"input[name={qid}][value='1']"); await pg.click(f"[data-check={qid}]")
        await pg.wait_for_timeout(250)
        await pg.fill("input[data-threshold=express]", "3"); await pg.press("input[data-threshold=express]", "Tab")
        await pg.wait_for_timeout(200)
        okc = await pg.locator("#activity .fb.ok").count(); sd = await pg.locator("#activity .steps li.done").count()
        record(G, "Activity 3: steps 7/7 and answers 4/4", okc == 4 and sd == 7, f"steps {sd}/7, answers {okc}/4")
        await pg.click("[data-resetrules]")
        await pg.screenshot(path=SHOTS + "L3_live_desktop.png", full_page=True)

        # ================= Lesson 4: roles =================
        G = "L4 Roles"
        await pg.evaluate("OD.reset(true)")
        await goto(pg, "roles")
        record(G, "Banner states roles are simulated, not access control", "NOT access control" in await pg.locator(".simbanner").inner_text())
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"])
        pipe = dict(re.findall(r"(New|Picking|Packed|On Hold|Shipped)\n?(\d+)", await pg.locator(".pipeline").inner_text()))
        record(G, "Manager pipeline counts match data", all(int(pipe[s]) == sum(1 for r in rows if r["status"] == s) for s in pipe), str(pipe))
        await pg.click("[data-role=operator]")
        await pg.wait_for_timeout(200)
        q = sorted([r for r in rows if r["zone"] == "B" and r["status"] in ("New", "Picking", "On Hold")], key=lambda r: r["shipBy"])
        cnt = await pg.locator(".operator .bigcount >> nth=0").inner_text()
        record(G, "Operator queue count (Zone B) matches data", int(cnt) == len(q), cnt)
        top = await pg.locator(".task .mono strong >> nth=0").inner_text()
        record(G, "Operator queue is most-urgent-first", top == q[0]["id"], top)
        optext = await pg.locator(".roleview.operator").inner_text()
        record(G, "Operator view hides order value (₹) and other zones", "₹" not in optext and "Zone A" not in optext.replace("Zone A · Electronics", ""))
        await pg.select_option("select[data-opzone]", "C")
        await pg.wait_for_timeout(150)
        qc = [r for r in rows if r["zone"] == "C" and r["status"] in ("New", "Picking", "On Hold")]
        record(G, "Changing operator zone changes the queue", int(await pg.locator(".operator .bigcount >> nth=0").inner_text()) == len(qc))
        await pg.select_option("select[data-opzone]", "B")
        await pg.screenshot(path=SHOTS + "L4_operator_desktop.png", full_page=True)
        await pg.click("[data-role=side]")
        await pg.wait_for_timeout(200)
        record(G, "Side-by-side shows both views", await pg.locator(".roleview.manager").count() == 1 and await pg.locator(".roleview.operator").count() == 1)
        picking_btn = pg.locator("[data-opaction=markPacked]").first
        oid = await picking_btn.get_attribute("data-id")
        before = await state(pg); rb = oracle_rows(before["orders"], before["now"]); kb = kpis(rb)
        await picking_btn.click()
        await pg.wait_for_timeout(250)
        after = await state(pg); ra = oracle_rows(after["orders"], after["now"]); ka = kpis(ra)
        pipe2 = dict(re.findall(r"(New|Picking|Packed|On Hold|Shipped)\n?(\d+)", await pg.locator(".pipeline").inner_text()))
        pb = {s: sum(1 for r in rb if r["status"] == s) for s in ["Picking", "Packed"]}
        record(G, "Mark packed: manager pipeline Picking −1, Packed +1", int(pipe2["Picking"]) == pb["Picking"] - 1 and int(pipe2["Packed"]) == pb["Packed"] + 1, f"{oid}: Picking {pb['Picking']}→{pipe2['Picking']}, Packed {pb['Packed']}→{pipe2['Packed']}")
        record(G, "Changed pipeline boxes are highlighted", await pg.locator(".pipeline div.changed").count() == 2)
        record(G, "On-time rate unchanged until the order ships", ka["onTimeRate"] == kb["onTimeRate"])
        await pg.screenshot(path=SHOTS + "L4_side_by_side.png", full_page=True)
        await pg.evaluate("OD.advance(20)")
        st = await state(pg)
        record(G, "Packed order ships ~20 sim-min later", status([o for o in st["orders"] if o["id"] == oid][0], st["now"]) == "Shipped")
        nb = pg.locator("[data-opaction=startPicking]").first
        if await nb.count():
            nid = await nb.get_attribute("data-id"); await nb.click(); await pg.wait_for_timeout(200)
            st = await state(pg)
            record(G, "Start picking moves New → Picking", status([o for o in st["orders"] if o["id"] == nid][0], st["now"]) == "Picking")
        hb = pg.locator("[data-opaction=releaseHold]").first
        if await hb.count():
            hid = await hb.get_attribute("data-id"); await hb.click(); await pg.wait_for_timeout(200)
            st = await state(pg)
            record(G, "Release hold moves order back into Picking", status([o for o in st["orders"] if o["id"] == hid][0], st["now"]) == "Picking")
        st = await state(pg); rows = oracle_rows(st["orders"], st["now"])
        qn = len([r for r in rows if r["zone"] == "B" and r["status"] in ("New", "Picking", "On Hold")])
        for qid in ["q4_question", "q4_changed", "q4_security"]:
            await pg.check(f"input[name={qid}][value='1']"); await pg.click(f"[data-check={qid}]")
        await pg.fill("#in-q4_queue", str(qn)); await pg.click("[data-check=q4_queue]")
        await pg.wait_for_timeout(250)
        okc = await pg.locator("#activity .fb.ok").count(); sd = await pg.locator("#activity .steps li.done").count()
        record(G, "Activity 4: steps 4/4 and answers 4/4", okc == 4 and sd == 4, f"steps {sd}/4, answers {okc}/4")

        # ================= General =================
        G = "General"
        await pg.evaluate("OD.advance(30)")
        await pg.click("#simchip [data-sim=reset]")
        await pg.wait_for_timeout(300)
        st = await state(pg)
        record(G, "Reset restores 16:00 baseline (197 orders)", st["now"] == 960 and len(st["orders"]) == 197)
        await goto(pg, "")
        prog = await pg.locator(".lessoncard .small.muted:has-text('Activity progress')").all_inner_texts()
        record(G, "Start page shows activity progress", len(prog) == 4, "; ".join(prog))
        # determinism: fresh context sees identical data
        ctx2 = await browser.new_context(); p2 = await ctx2.new_page(); await p2.goto(BASE + "#/business"); await p2.wait_for_timeout(300)
        v2 = await p2.locator(".kpi[data-kpi=onTimeRate] .val").inner_text()
        record(G, "Same seed → every student sees identical numbers", v2 == "92.9%", v2)
        await ctx2.close()
        # keyboard: chart bars focusable
        await goto(pg, "business")
        await pg.focus("#ch-zone g.item >> nth=1")
        await pg.keyboard.press("Enter")
        await pg.wait_for_timeout(300)
        record(G, "Chart bars work with keyboard (Enter drills down)", "#/orders" in pg.url)

        # ================= Responsive =================
        G = "Responsive"
        for (w, h, label) in [(390, 844, "mobile"), (820, 1180, "tablet"), (1920, 1080, "wide")]:
            c = await browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
            m = await c.new_page()
            m.on("pageerror", lambda e: errors.append(str(e)))
            for r in ["", "orders", "business", "live", "roles"]:
                await m.goto(BASE + "#/" + r); await m.wait_for_timeout(350)
                over = await m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                record(G, f"{label} {w}px /{r or 'start'}: no page-level horizontal scroll", over <= 0, f"overflow={over}px")
                if label == "mobile": await m.screenshot(path=SHOTS + f"mobile_{r or 'start'}.png", full_page=True)
            if label == "mobile":
                await m.goto(BASE + "#/roles"); await m.click("[data-role=side]"); await m.wait_for_timeout(300)
                over = await m.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                record(G, "mobile side-by-side roles stack without overflow", over <= 0, f"overflow={over}px")
            await c.close()

        record("General", "No JavaScript errors during the whole run", len(errors) == 0, "; ".join(errors[:5]))
        await browser.close()

    passed = sum(r["pass"] for r in results)
    print(f"\n{passed}/{len(results)} passed")
    json.dump(results, open(os.path.join(HERE, "results.json"), "w"), indent=1, ensure_ascii=False)


asyncio.run(main())
