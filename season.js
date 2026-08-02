/* =========================================================
   season.js — seasonal CDD inputs, template generator, and the
   12-season critical-path overview table.
   ========================================================= */
window.doUpdateSeason = (k, val) => { G.seasons[k] = val; saveData(); };

/* ---------- Season date inputs (sidebar) ---------- */
function renderSeasonsInputUI(){
  const sl = $('divSeasonsInputs'); sl.innerHTML='';
  Object.keys(G.seasons).forEach(k => {
    const item = document.createElement('div'); item.className='season-item';
    item.innerHTML = `<label>${k}</label><input type="date" value="${G.seasons[k]}" onchange="doUpdateSeason('${k}',this.value)">`;
    sl.appendChild(item);
  });
}

/* ---------- Seasonal overview table ---------- */
function renderSeasonalTableUI(){
  // Each date cell shows the day-gap back to the previous (later) column,
  // same "+Nd" language as the T&A Planner, so imbalanced spans are easy to spot at a glance.
  const tb = $('tblSeasons').querySelector('tbody'); tb.innerHTML='';
  const dateCell = (dateVal, days) => `<div class="date-main">${fmt(dateVal)}</div>${days!=null ? `<div class="day-sub">-${days}d</div>` : ''}`;
  Object.keys(G.seasons).forEach(k => {
    const iso = G.seasons[k];
    if(!iso) return;
    const res = runCalc(iso, 'backward');
    const s = res.stages, d = res.days;
    let rems = [];
    if(res.impact.cn && res.impact.cn.length>2) rems.push(`${G.leadTimes.origin||'CN'}: ${res.impact.cn}`);
    if(res.impact.cnAvoid) rems.push(res.impact.cnAvoid);
    if(res.impact.bd && res.impact.bd.length>2) rems.push(`BD: ${res.impact.bd}`);
    if(res.impact.garment) rems.push(res.impact.garment);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${k}</td>
      <td class="mono">${dateCell(iso, null)}</td>
      <td class="mono">${dateCell(s.eta, d.l5)}</td>
      <td class="mono">${dateCell(s.garmentsETD, d.l4)}</td>
      <td class="mono">${dateCell(s.inhouse, d.l3)}</td>
      <td class="mono">${dateCell(s.fabricETD, d.l2)}</td>
      <td class="mono">${dateCell(s.orderDue, d.l1)}</td>
      <td style="white-space:normal;">${rems.join(' | ')||'-'}</td>`;
    tb.appendChild(tr);
  });

  // Rule-based sanity scan over the same data (see ai.js) — no extra recalculation needed.
  if(typeof renderSmartChecksUI === 'function') renderSmartChecksUI();
}

/* ---------- Customer-facing (dates-only) text used by the Copy table button ---------- */
function seasonTableText(){
  const originZone = G.leadTimes.origin || 'CN';
  const header = ['Season','CDD','ETA','Ex-BD ETD','Fabric In-house','Fabric ETD','Order Due','Remarks'];
  const rows = [header.join('\t')];
  Object.keys(G.seasons).forEach(k => {
    const iso = G.seasons[k];
    if(!iso) return;
    const res = runCalc(iso, 'backward');
    const s = res.stages;
    let rems = [];
    if(res.impact.cn && res.impact.cn.length>2) rems.push(`${originZone}: ${res.impact.cn}`);
    if(res.impact.cnAvoid) rems.push(res.impact.cnAvoid);
    if(res.impact.bd && res.impact.bd.length>2) rems.push(`BD: ${res.impact.bd}`);
    if(res.impact.garment) rems.push(res.impact.garment);
    rows.push([k, fmt(iso), fmt(s.eta), fmt(s.garmentsETD), fmt(s.inhouse), fmt(s.fabricETD), fmt(s.orderDue), rems.join(' | ')||'-'].join('\t'));
  });
  return rows.join('\n');
}
