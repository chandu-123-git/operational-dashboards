/* app.js — router, rendering and state preservation between re-renders. */
(function () {
  const OD = window.OD;
  const ROUTES = { "": "start", orders: "orders", business: "business", live: "live", roles: "roles" };
  OD.route = "start";

  // Re-rendering replaces the lesson's HTML. To keep the experience smooth we
  // remember focus, caret position, unsaved activity answers, open <details>
  // and scroll positions, then restore them.
  function capture(main) {
    const st = { radios: {}, inputs: {}, details: [], scroll: {} };
    main.querySelectorAll('input[type="radio"]:checked').forEach((r) => (st.radios[r.name] = r.value));
    main.querySelectorAll('input[id^="in-"]').forEach((i) => (st.inputs[i.id] = i.value));
    main.querySelectorAll("details").forEach((d, i) => d.open && st.details.push(i));
    main.querySelectorAll(".log, .changes, .side").forEach((el, i) => (st.scroll[i] = el.scrollTop));
    const a = document.activeElement;
    if (a && main.contains(a)) {
      st.focusId = a.id || null;
      st.focusSel = a.getAttribute("data-page") ? `[data-page="${a.getAttribute("data-page")}"]` : a.getAttribute("data-sort") ? `[data-sort="${a.getAttribute("data-sort")}"]` : null;
      if (a.selectionStart != null) { try { st.sel = [a.selectionStart, a.selectionEnd]; } catch (e) { /* not a text field */ } }
    }
    return st;
  }
  function restore(main, st) {
    for (const n in st.radios) { const r = main.querySelector(`input[name="${n}"][value="${st.radios[n]}"]`); if (r) r.checked = true; }
    for (const id in st.inputs) { const i = document.getElementById(id); if (i && document.activeElement !== i) i.value = st.inputs[id]; }
    const ds = main.querySelectorAll("details");
    st.details.forEach((i) => ds[i] && (ds[i].open = true));
    main.querySelectorAll(".log, .changes, .side").forEach((el, i) => { if (st.scroll[i]) el.scrollTop = st.scroll[i]; });
    let f = st.focusId ? document.getElementById(st.focusId) : st.focusSel ? main.querySelector(st.focusSel) : null;
    if (f) { f.focus({ preventScroll: true }); if (st.sel && f.setSelectionRange) { try { f.setSelectionRange(st.sel[0], st.sel[1]); } catch (e) { /* ignore */ } } }
  }

  let raf = null;
  OD.rerender = function () {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = null; render(); });
  };
  // While a student has a dropdown or threshold box focused (and isn't
  // actively changing it), live ticks wait so the control isn't replaced
  // under their cursor.
  let lastUserAct = 0;
  ["change", "click", "input", "keydown"].forEach((t) => document.addEventListener(t, () => (lastUserAct = Date.now()), true));
  function render() {
    const main = document.getElementById("main");
    const a = document.activeElement;
    if (a && main.contains(a) && (a.tagName === "SELECT" || a.matches("input[data-threshold]")) && Date.now() - lastUserAct > 400) {
      setTimeout(OD.rerender, 500);
      return;
    }
    const st = capture(main);
    OD.hideTip && OD.hideTip();
    main.innerHTML = OD.views[OD.route]();
    if (OD.after && OD.after[OD.route]) OD.after[OD.route]();
    restore(main, st);
    if (OD.ui.lastAction) OD.ui.lastAction.fresh = false;
    OD.renderSimChip();
    document.querySelectorAll(".mainnav a").forEach((a) => a.classList.toggle("active", a.getAttribute("data-route") === OD.route));
  }

  function onRoute() {
    const key = location.hash.replace(/^#\/?/, "").split("?")[0];
    const next = ROUTES[key] || "start";
    const changed = next !== OD.route;
    OD.route = next;
    OD.closeDrawer();
    render();
    if (changed) { window.scrollTo(0, 0); document.getElementById("main").focus({ preventScroll: true }); }
    document.title = { start: "OrderOps Lab: Learn Operational Dashboards", orders: "1 · Tables: OrderOps Lab", business: "2 · KPIs & Charts: OrderOps Lab", live: "3 · Live & Alerts: OrderOps Lab", roles: "4 · Roles: OrderOps Lab" }[next];
  }

  OD.subscribe(() => OD.rerender());
  window.addEventListener("hashchange", onRoute);
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(OD.rerender, 150); });

  OD.reset();
  onRoute();
})();
