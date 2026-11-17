/* view-orders.js — Lesson 1: tables, search & filters, pagination. */
(function () {
  const OD = window.OD;
  const C = OD.C;
  const esc = OD.esc;
  const U = () => OD.ui;

  const COLS = [
    { key: "id", label: "Order ID" },
    { key: "customer", label: "Customer" },
    { key: "placedAt", label: "Placed" },
    { key: "zone", label: "Zone" },
    { key: "priority", label: "Priority" },
    { key: "value", label: "Value", num: true },
    { key: "status", label: "Status" },
    { key: "shipBy", label: "Ship-by" },
    { key: null, label: "SLA" },
  ];
  const SQLCOL = { id: "id", customer: "customer", placedAt: "placed_at", zone: "zone", priority: "priority", items: "items", value: "value", status: "status", shipBy: "ship_by" };

  function highlight(text, q) {
    q = q.trim();
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  function sqlFor(f, sort, page, size, count) {
    const kw = (s) => `<span class="kw">${s}</span>`;
    const str = (s) => `<span class="str">'${esc(s)}'</span>`;
    const where = [];
    if (f.q.trim()) where.push(`(id ${kw("ILIKE")} ${str("%" + f.q.trim() + "%")} ${kw("OR")} customer ${kw("ILIKE")} ${str("%" + f.q.trim() + "%")})`);
    if (f.status === "open") where.push(`status ${kw("IN")} (${C.OPEN_STATUSES.map(str).join(", ")})`);
    else if (f.status !== "all") where.push(`status = ${str(f.status)}`);
    if (f.zone !== "all") where.push(`zone = ${str(f.zone)}`);
    if (f.priority !== "all") where.push(`priority = ${str(f.priority)}`);
    if (f.sla !== "all") where.push(`sla = ${str(f.sla)}  <span class="cm">-- sla is derived from ship_by and the current time</span>`);
    let s = `${kw("SELECT")} id, customer, placed_at, zone, priority, value, status, ship_by, sla\n${kw("FROM")} orders\n`;
    if (where.length) s += `${kw("WHERE")} ` + where.join(`\n  ${kw("AND")} `) + "\n";
    s += `${kw("ORDER BY")} ${SQLCOL[sort.key]} ${sort.dir.toUpperCase()}\n${kw("LIMIT")} ${size} ${kw("OFFSET")} ${(page - 1) * size};`;
    s += `\n<span class="cm">-- ${count} rows match the WHERE clause; LIMIT/OFFSET picks page ${page}.</span>`;
    return s;
  }

  function plainEnglish(f, sort, page, size, count) {
    const parts = [];
    if (f.zone !== "all") parts.push(`in ${OD.zoneLabel(f.zone, true)}`);
    if (f.status === "open") parts.push("that are still open");
    else if (f.status !== "all") parts.push(`with status ${f.status}`);
    if (f.priority !== "all") parts.push(`with ${f.priority} priority`);
    if (f.sla !== "all") parts.push(`whose SLA is “${f.sla}”`);
    if (f.q.trim()) parts.push(`whose ID or customer contains “${f.q.trim()}”`);
    const col = COLS.find((c) => c.key === sort.key).label;
    const from = count ? (page - 1) * size + 1 : 0, to = Math.min(count, page * size);
    return `Find orders ${parts.length ? parts.join(", ") : "(all of them)"}, sort by ${col} ${sort.dir === "asc" ? "ascending" : "descending"}, and show rows ${from}–${to} of ${count}.`;
  }

  function explanation(action, total, count, pages) {
    const u = U();
    if (!action) return `<span class="what">Try it:</span> type in the search box, pick a filter, click a column header or change page. This panel explains what each action did to the data.`;
    const range = count ? `${(u.page - 1) * u.pageSize + 1}–${Math.min(count, u.page * u.pageSize)}` : "0";
    switch (action.type) {
      case "search":
        return `<span class="what">Search “${esc(action.value)}”:</span> ${action.before} → <b>${count}</b> orders. Search keeps rows whose Order ID <em>or</em> customer name <em>contains</em> the text (upper/lower case doesn't matter). Matches are highlighted.`;
      case "filter":
        return `<span class="what">Filter ${esc(action.label)}:</span> ${action.before} → <b>${count}</b> orders. ${action.value === "all" ? "Choosing “All” removes this condition, so more rows come back." : "A filter keeps only rows that match <em>exactly</em>. With several filters, a row must match <em>all</em> of them (AND)."} The table went back to page 1 because the result changed.`;
      case "clear":
        return `<span class="what">Cleared all filters:</span> back to all <b>${total}</b> orders.`;
      case "sort":
        return `<span class="what">Sorted by ${esc(action.label)} (${action.dir === "asc" ? "ascending ▲" : "descending ▼"}):</span> still <b>${count}</b> orders. Sorting changes the <em>order</em>, never the count. ${action.key === "shipBy" && action.dir === "asc" ? "Earliest ship-by first means the most urgent orders are at the top." : "Click again to reverse."}`;
      case "page":
        return `<span class="what">Page ${u.page} of ${pages}:</span> showing rows ${range} of the same <b>${count}</b> matching orders. Pagination only changes which slice you see; nothing is filtered out. Smaller pages load faster and are easier to scan.`;
      case "pagesize":
        return `<span class="what">${u.pageSize} rows per page:</span> the ${count} matching orders now fit on <b>${pages}</b> page${pages === 1 ? "" : "s"}. Bigger pages mean less clicking but more scrolling.`;
      case "drill":
        return `<span class="what">Drill-down:</span> you arrived from ${esc(action.provenance)}. The filters were set for you, so you're looking at the <b>${count}</b> orders behind that number.`;
      default:
        return "";
    }
  }

  OD.views.orders = function () {
    const u = U();
    const f = u.filters;
    const all = OD.rows();
    const { rows: filtered, funnel } = OD.applyFilters(all, f);
    const sorted = OD.sortRows(filtered, u.sort);
    const pages = Math.max(1, Math.ceil(sorted.length / u.pageSize));
    if (u.page > pages) u.page = pages;
    const start = (u.page - 1) * u.pageSize;
    const pageRows = sorted.slice(start, start + u.pageSize);
    const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(label)}</option>`;
    const anyFilter = OD.FILTER_STEPS.some((s) => s.active(f[s.key]));

    const pageButtons = [];
    const win = new Set([1, pages, u.page - 1, u.page, u.page + 1]);
    let prev = 0;
    for (let p = 1; p <= pages; p++) {
      if (!win.has(p)) continue;
      if (p - prev > 1) pageButtons.push(`<span class="muted">…</span>`);
      pageButtons.push(`<button class="btn sm" data-page="${p}" ${p === u.page ? 'aria-current="page"' : ""} aria-label="Page ${p}">${p}</button>`);
      prev = p;
    }

    return `
    <div class="lesson-head">
      <div class="eyebrow">Lesson 1 of 4 · Dashboard Fundamentals</div>
      <h1>Tables, search, filters and pagination</h1>
      <p class="lead">A table is where operations people find the <em>specific</em> orders behind a problem. Search finds one thing, filters narrow a list, sorting brings the important rows to the top, and pagination keeps big lists fast and readable.</p>
    </div>
    <div class="layout">
      <div class="stack">
        <div class="keyidea"><span class="ico" aria-hidden="true">💡</span><div><p><strong>Key idea:</strong> search, filter, sort and paginate each do one different thing to the same list. <strong>Filter/search</strong> change <em>which</em> rows are in the result, <strong>sort</strong> changes their <em>order</em>, <strong>pagination</strong> changes which <em>slice</em> you see.</p></div></div>

        <div class="card">
          <div class="toolbar">
            <label class="field searchbox ${f.q.trim() ? "active" : ""}">Search
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input id="q" type="search" placeholder="Order ID or customer name…" value="${esc(f.q)}" autocomplete="off">
            </label>
            <label class="field ${f.status !== "all" ? "active" : ""}">Status
              <select data-filter="status">${opt("all", "All statuses", f.status)}${opt("open", "All open (not shipped)", f.status)}${C.STATUSES.map((s) => opt(s, s, f.status)).join("")}</select></label>
            <label class="field ${f.zone !== "all" ? "active" : ""}">Zone
              <select data-filter="zone">${opt("all", "All zones", f.zone)}${OD.ZONE_KEYS.map((z) => opt(z, OD.zoneLabel(z, true), f.zone)).join("")}</select></label>
            <label class="field ${f.priority !== "all" ? "active" : ""}">Priority
              <select data-filter="priority">${opt("all", "All priorities", f.priority)}${opt("Express", "Express", f.priority)}${opt("Standard", "Standard", f.priority)}</select></label>
            <label class="field ${f.sla !== "all" ? "active" : ""}">SLA
              <select data-filter="sla">${opt("all", "All SLA states", f.sla)}${OD.SLA_VALUES.filter((s) => s !== "—").map((s) => opt(s, s, f.sla)).join("")}</select></label>
            <button class="btn" data-clear ${anyFilter ? "" : "disabled"}>Clear all</button>
          </div>
          ${u.provenance ? `<div class="provenance" style="margin-top:10px">↪ Opened from <strong>${esc(u.provenance)}</strong> <button class="btn link small" data-clear>clear</button></div>` : ""}
          <div class="funnel" aria-label="How the filters narrow the result">
            ${funnel.map((st, i) => `${i ? '<span class="arrow" aria-hidden="true">→</span>' : ""}<span class="stage ${i === funnel.length - 1 ? "final" : ""}">${esc(st.label)}: <b>${st.count}</b></span>`).join("")}
            <span class="arrow" aria-hidden="true">→</span><span class="stage">showing ${sorted.length ? start + 1 : 0}–${Math.min(sorted.length, start + u.pageSize)}</span>
          </div>
          ${anyFilter ? `<div class="row" style="margin-top:8px">${OD.FILTER_STEPS.filter((s) => s.active(f[s.key])).map((s) => `<span class="chip">${esc(s.label(f[s.key]))}<button data-remove="${s.key}" aria-label="Remove ${esc(s.label(f[s.key]))}">✕</button></span>`).join("")}</div>` : ""}
          <div class="explain ${u.lastAction && u.lastAction.fresh ? "flash" : ""}" style="margin-top:12px" aria-live="polite" id="explain">${explanation(u.lastAction, all.length, sorted.length, pages)}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn sm" data-toggle-query aria-expanded="${u.showQuery}">${u.showQuery ? "Hide" : "Show"} this view as a query</button>
            <span class="small muted">${esc(plainEnglish(f, u.sort, u.page, u.pageSize, sorted.length))}</span>
          </div>
          ${u.showQuery ? `<pre class="query" style="margin-top:10px" aria-label="SQL-style query">${sqlFor(f, u.sort, u.page, u.pageSize, sorted.length)}</pre>
          <p class="small muted" style="margin:6px 0 0">Real dashboards send something like this to a database. The filters become <code>WHERE</code>, sorting becomes <code>ORDER BY</code>, and pagination becomes <code>LIMIT</code>/<code>OFFSET</code>.</p>` : ""}
        </div>

        <div class="card flush">
          <div class="scrollhint">Swipe the table sideways to see all columns →</div>
          <div class="tablewrap">
            <table class="data" aria-label="Orders">
              <thead><tr>${COLS.map((c) => {
                if (!c.key) return `<th>${c.label}</th>`;
                const active = u.sort.key === c.key;
                return `<th class="${c.num ? "num" : ""}" ${active ? `aria-sort="${u.sort.dir === "asc" ? "ascending" : "descending"}"` : ""}><button data-sort="${c.key}" title="Sort by ${c.label}">${c.label}<span class="sort-ind" aria-hidden="true">${active ? (u.sort.dir === "asc" ? "▲" : "▼") : "↕"}</span></button></th>`;
              }).join("")}</tr></thead>
              <tbody>
                ${pageRows.map((r) => `<tr data-id="${r.id}" tabindex="0" aria-label="Open ${r.id}">
                  <td class="mono">${highlight(r.id, f.q)}</td>
                  <td>${highlight(r.customer, f.q)}</td>
                  <td>${OD.fmtTime(r.placedAt)}</td>
                  <td><span class="zone-tag">${r.zone}</span> <span class="muted small">${C.ZONES[r.zone].category}</span></td>
                  <td>${OD.prioPill(r.priority)}</td>
                  <td class="num">${OD.fmtMoney(r.value)}</td>
                  <td>${OD.statusPill(r.status)}</td>
                  <td>${OD.fmtTime(r.shipBy)}</td>
                  <td>${OD.slaBadge(r, true)}</td></tr>`).join("")}
              </tbody>
            </table>
            ${pageRows.length ? "" : `<div class="empty"><p><strong>No orders match all of these conditions.</strong></p><p>An empty result is a valid answer, not an error. Remove a filter to widen the search.</p><button class="btn" data-clear>Clear all filters</button></div>`}
          </div>
          <div class="pager">
            <button class="btn sm" data-page="${u.page - 1}" ${u.page <= 1 ? "disabled" : ""}>‹ Prev</button>
            <div class="pages">${pageButtons.join("")}</div>
            <button class="btn sm" data-page="${u.page + 1}" ${u.page >= pages ? "disabled" : ""}>Next ›</button>
            <span>Page <b>${u.page}</b> of <b>${pages}</b></span>
            <span class="spacer"></span>
            <label class="row small">Rows per page
              <select class="input" data-pagesize>${[10, 25, 50].map((n) => `<option ${n === u.pageSize ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          </div>
        </div>

        ${OD.howItWorks("How it works: tables, filters and pagination", `
          <p><strong>The idea.</strong> Think of a library. <em>Search</em> is asking for a specific title. <em>Filters</em> are walking to the “Science → Space” shelf. <em>Sorting</em> is lining those books up by date. <em>Pagination</em> is looking at one shelf at a time instead of every book at once.</p>
          <div class="howgrid">
            <div><h4>Key terms</h4><dl class="terms">
              <dt>Row / column</dt><dd>One order / one attribute of every order.</dd>
              <dt>Search</dt><dd>Free-text “contains” match across chosen columns (here: ID and customer).</dd>
              <dt>Filter</dt><dd>Exact match on a column. Several filters = AND.</dd>
              <dt>Sort</dt><dd>Reorders rows by one column, ascending ▲ or descending ▼.</dd>
              <dt>Pagination</dt><dd>Shows the result in fixed-size slices (LIMIT / OFFSET).</dd>
              <dt>Drill-down</dt><dd>Opening the rows behind a summary number.</dd></dl></div>
            <div><h4>Good tables…</h4><ul>
              <li>Always show how many rows match (“38 of ${all.length}”).</li>
              <li>Show active filters as removable chips.</li>
              <li>Reset to page 1 when filters change.</li>
              <li>Default to a useful sort (newest, or most urgent first).</li>
              <li>Explain empty results instead of showing a blank screen.</li></ul>
              <h4 style="margin-top:10px">Watch out for</h4><ul>
              <li>Forgetting a filter is still on, then drawing the wrong conclusion.</li>
              <li>Reading page 1 only and assuming you've seen everything.</li></ul></div>
          </div>
          <p class="small muted">In production, filtering and paging usually happen in the database (server-side) because there can be millions of rows. This lab does it in your browser because ${all.length} rows is small.</p>`)}
      </div>
      <div class="side">${OD.renderActivity("orders")}</div>
    </div>`;
  };

  // ---- Interactions ----------------------------------------------------------------
  function setFilter(key, value, label) {
    const u = U();
    const before = OD.applyFilters(OD.rows(), u.filters).rows.length;
    u.filters[key] = value;
    u.page = 1;
    u.provenance = null;
    u.lastAction = { type: key === "q" ? "search" : "filter", key, value, label, before, fresh: true };
    trackFlags();
    OD.rerender();
  }
  function trackFlags() {
    const u = U(), f = u.filters, S = OD.store;
    if (f.q.trim().length >= 2) S.flags.l1_search = true;
    if (f.zone === "B") S.flags.l1_zoneB = true;
    if (f.zone === "B" && f.sla === "Overdue") S.flags.l1_overdueB = true;
    if (u.sort.key === "shipBy") S.flags.l1_sortShip = true;
    const anyFilter = OD.FILTER_STEPS.some((s) => s.active(f[s.key]));
    if (!anyFilter && u.page >= 2) S.flags.l1_page = true;
  }

  document.addEventListener("input", (e) => {
    if (e.target.id === "q" && OD.route === "orders") {
      const u = U();
      const before = u.lastAction && u.lastAction.type === "search" ? u.lastAction.before : OD.applyFilters(OD.rows(), u.filters).rows.length;
      u.filters.q = e.target.value;
      u.page = 1;
      u.provenance = null;
      u.lastAction = e.target.value.trim() ? { type: "search", value: e.target.value.trim(), before } : null;
      trackFlags();
      OD.rerender();
    }
  });
  document.addEventListener("change", (e) => {
    if (OD.route !== "orders") return;
    const t = e.target;
    if (t.matches("select[data-filter]")) {
      const key = t.getAttribute("data-filter");
      setFilter(key, t.value, `${key[0].toUpperCase() + key.slice(1)} = ${t.options[t.selectedIndex].text}`);
    }
    if (t.matches("select[data-pagesize]")) {
      U().pageSize = +t.value;
      U().page = 1;
      U().lastAction = { type: "pagesize", fresh: true };
      OD.rerender();
    }
  });
  document.addEventListener("click", (e) => {
    if (OD.route !== "orders") return;
    const t = e.target;
    const u = U();
    let b;
    if ((b = t.closest("[data-sort]"))) {
      const key = b.getAttribute("data-sort");
      if (u.sort.key === key) u.sort.dir = u.sort.dir === "asc" ? "desc" : "asc";
      else u.sort = { key, dir: key === "placedAt" || key === "value" || key === "items" ? "desc" : "asc" };
      u.page = 1;
      u.lastAction = { type: "sort", key, dir: u.sort.dir, label: COLS.find((c) => c.key === key).label, fresh: true };
      trackFlags();
      OD.rerender();
    } else if ((b = t.closest("[data-page]"))) {
      if (b.disabled) return;
      u.page = +b.getAttribute("data-page");
      u.lastAction = { type: "page", fresh: true };
      trackFlags();
      OD.rerender();
    } else if (t.closest("[data-clear]")) {
      u.filters = OD.DEFAULT_FILTERS();
      u.page = 1;
      u.provenance = null;
      u.lastAction = { type: "clear", fresh: true };
      OD.rerender();
    } else if ((b = t.closest("[data-remove]"))) {
      const key = b.getAttribute("data-remove");
      setFilter(key, key === "q" ? "" : "all", `${key} removed`);
    } else if (t.closest("[data-toggle-query]")) {
      u.showQuery = !u.showQuery;
      OD.setFlag("l1_query");
      OD.rerender();
    } else if ((b = t.closest("tr[data-id]"))) {
      OD.openOrder(b.getAttribute("data-id"));
    }
  });
  document.addEventListener("keydown", (e) => {
    if (OD.route === "orders" && e.key === "Enter" && e.target.matches("tr[data-id]")) OD.openOrder(e.target.getAttribute("data-id"));
  });
})();
