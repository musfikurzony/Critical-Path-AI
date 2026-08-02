/* =========================================================
   scenario.js — the critical-path calculation engine
   (Scenarios A/B forward+backward, C middle-out from Garments
   ETD, D middle-out from ETA) and the T&A result rendering.
   ========================================================= */
function subProdDays(startISO, days, zone){
  let d = parseISO(startISO), rem = days;
  while(rem > 0){ d = subDays(d,1); if(!isHol(toISO(d), zone)) rem--; }
  return d;
}
function addProdDays(startISO, days, zone){
  let d = parseISO(startISO), c = 0;
  while(c < days){ d = addDays(d,1); if(!isHol(toISO(d), zone)) c++; }
  return d;
}
function snapSunday(d, direction){
  const base = new Date(d);
  const wd = base.getDay();
  if(wd === 0) return base;
  const prev = subDays(base, wd);
  const next = addDays(base, 7-wd);
  if(direction === 'forward'){
    if(Math.abs((base-prev)/(864e5)) <= 2) return prev;
    return next;
  } else {
    if(wd === 6) return next;
    return prev;
  }
}
function adjustETD(d, direction){
  let etd = snapSunday(d, direction);
  while(isEid(toISO(etd))){ etd = (direction==='backward') ? subDays(etd,7) : addDays(etd,7); }
  return etd;
}
function adjustInhouse(d){
  const x = new Date(d);
  while(x.getDay()===5 || x.getDay()===6 || isHol(toISO(x),'BD')) x.setDate(x.getDate()+1);
  return x;
}

function runCalc(inputISO, type){
  const R = { stages:{}, impact:{}, days:{} };
  const LT = G.leadTimes;
  const FAB_ZONE = LT.origin || 'CN';

  if(type === 'forward'){
    const od = parseISO(inputISO);
    const fabricETD = addProdDays(inputISO, LT.orderToFabricETD, FAB_ZONE);
    let inhouse = adjustInhouse(addDays(fabricETD, LT.fabricETDToInhouse));

    let rawFinish = addProdDays(toISO(inhouse), LT.inhouseToGarmentsETD, 'BD');
    let etd = adjustETD(rawFinish, 'forward');
    const eid = getEidName(toISO(snapSunday(rawFinish,'forward')));
    if(eid) R.impact.garment = `Delayed due to ${eid} (+7 days)`;

    const eta = addDays(etd, LT.garmentsETDToETA);
    const cdd = addDays(eta, LT.etaToCDD);

    R.stages = { orderDue:od, fabricETD, inhouse, garmentsETD:etd, eta, cdd };
    R.impact.cn = getHolSummary(toISO(addDays(od,1)), toISO(fabricETD), FAB_ZONE);
    R.impact.bd = getHolSummary(toISO(addDays(inhouse,1)), toISO(etd), 'BD');

  } else {
    let etd, eta, cdd;
    if(type === 'backward'){
      cdd = parseISO(inputISO);
      eta = subDays(cdd, LT.etaToCDD);
      const targetETD = subDays(eta, LT.garmentsETDToETA);
      etd = adjustETD(targetETD, 'backward');
      const eid = getEidName(toISO(snapSunday(targetETD,'backward')));
      if(eid) R.impact.garment = `Avoided ${eid} (Ship -7 days early)`;
    } else if(type === 'eta'){
      eta = parseISO(inputISO);
      cdd = addDays(eta, LT.etaToCDD);
      const targetETD = subDays(eta, LT.garmentsETDToETA);
      etd = adjustETD(targetETD, 'backward');
      const eid = getEidName(toISO(snapSunday(targetETD,'backward')));
      if(eid) R.impact.garment = `Avoided ${eid} (Ship -7 days early)`;
    } else {
      etd = parseISO(inputISO);
      eta = addDays(etd, LT.garmentsETDToETA);
      cdd = addDays(eta, LT.etaToCDD);
      if(isEid(inputISO)) R.impact.garment = `Warning: selected date falls on Eid`;
    }

    let inhouse = subProdDays(toISO(etd), LT.inhouseToGarmentsETD, 'BD');
    while(inhouse.getDay()===5 || inhouse.getDay()===6 || isHol(toISO(inhouse),'BD')) inhouse = subDays(inhouse,1);

    let fabETD = subDays(inhouse, LT.fabricETDToInhouse);
    const targetFabETD = fabETD;
    if(isHol(toISO(fabETD), FAB_ZONE)){
      const hName = getHolName(toISO(fabETD), FAB_ZONE);
      while(isHol(toISO(fabETD), FAB_ZONE)) fabETD = subDays(fabETD,1);
      R.impact.cnAvoid = `Avoided ${hName} (Ship -${diffDays(fabETD, targetFabETD)} days early)`;
    }

    let od = subProdDays(toISO(fabETD), LT.orderToFabricETD, FAB_ZONE);
    while(od.getDay()===0 || od.getDay()===6 || isHol(toISO(od), FAB_ZONE)) od = subDays(od,1);

    R.stages = { orderDue:od, fabricETD:fabETD, inhouse, garmentsETD:etd, eta, cdd };
    R.impact.cn = getHolSummary(toISO(addDays(od,1)), toISO(fabETD), FAB_ZONE);
    R.impact.bd = getHolSummary(toISO(addDays(inhouse,1)), toISO(etd), 'BD');
  }

  const S = R.stages;
  R.days = {
    l1: diffDays(S.orderDue, S.fabricETD),
    l2: diffDays(S.fabricETD, S.inhouse),
    l3: diffDays(S.inhouse, S.garmentsETD),
    l4: diffDays(S.garmentsETD, S.eta),
    l5: diffDays(S.eta, S.cdd)
  };
  return R;
}

/* ---------- T&A result rendering + copy text ---------- */
window.taResults = {};

function taText(label, res){
  // Customer-facing copy: dates only — no internal day-count figures.
  const s = res.stages, imp = res.impact;
  const fabNote = imp.cnAvoid || (imp.cn && imp.cn.length>2 ? imp.cn : '');
  const garNote = imp.garment || (imp.bd && imp.bd.length>2 ? imp.bd : '');
  return [
    `T&A — Scenario ${label}  (Fabric Origin: ${G.leadTimes.origin||'CN'})`,
    `----------------------------------------`,
    `Order Due            : ${fmt(s.orderDue)}`,
    `Fabric ETD           : ${fmt(s.fabricETD)}${fabNote ? '  — '+fabNote : ''}`,
    `Fabric In-house      : ${fmt(s.inhouse)}`,
    `Garments ETD (Ex-BD) : ${fmt(s.garmentsETD)}${garNote ? '  — '+garNote : ''}`,
    `ETA USA              : ${fmt(s.eta)}`,
    `CDD                  : ${fmt(s.cdd)}`
  ].join('\n');
}

function renderResult(id, res, label, accentClass){
  const div = $(id);
  window.taResults[label] = res;
  const headerHtml = `
    <div class="ta-header ${accentClass}">
      <span>T&amp;A — Scenario ${label}</span>
      ${res ? `<button class="btn-copy" onclick="copyTA('${label}')">📋 Copy T&amp;A</button>` : ''}
    </div>`;
  if(!res){ div.innerHTML = headerHtml + '<div class="ta-body"><div class="empty-note">Enter a date above and click "Calculate all".</div></div>'; return; }

  const s = res.stages, d = res.days, imp = res.impact;
  const originZone = G.leadTimes.origin || 'CN';

  let fabricNote = imp.cn && imp.cn.length>2 ? imp.cn : '';
  if(imp.cnAvoid) fabricNote = (fabricNote ? fabricNote+' | ' : '') + imp.cnAvoid;
  let garmentNote = imp.bd && imp.bd.length>2 ? imp.bd : '';
  if(imp.garment) garmentNote = (garmentNote ? garmentNote+' | ' : '') + imp.garment;

  const nodes = [
    { label:'Order due', date:s.orderDue, days:null, note:null, cls:'' },
    { label:'Fabric ETD', date:s.fabricETD, days:d.l1, note: imp.cnAvoid || (imp.cn && imp.cn.length>2 ? imp.cn : null), cls: originZone==='CN' ? 'origin-cn' : 'origin-bd' },
    { label:'Fabric in-house', date:s.inhouse, days:d.l2, note:null, cls:'' },
    { label:'Garments ETD', date:s.garmentsETD, days:d.l3, note: imp.garment || (imp.bd && imp.bd.length>2 ? imp.bd : null), cls: imp.garment ? 'warn' : '' },
    { label:'ETA USA', date:s.eta, days:d.l4, note:null, cls:'' },
    { label:'CDD', date:s.cdd, days:d.l5, note:null, cls:'' },
  ];

  const routeHtml = nodes.map(n => `
    <div class="route-node ${n.cls}">
      <div class="route-dot"></div>
      <div class="route-label">${n.label}</div>
      <div class="route-date">${fmt(n.date)}</div>
      <div class="route-days">${n.days!==null ? '+'+n.days+'d' : '—'}</div>
      ${n.note ? `<div class="route-note">${n.note}</div>` : ''}
    </div>
  `).join('');

  const tableRows = `
    <tr><td>Order due</td><td class="mono">${fmt(s.orderDue)}</td><td>-</td><td>-</td></tr>
    <tr><td>Fabric ETD</td><td class="mono">${fmt(s.fabricETD)}</td><td>${d.l1}</td><td class="${fabricNote?'hol':''}">${fabricNote||'-'}</td></tr>
    <tr><td>Fabric in-house</td><td class="mono">${fmt(s.inhouse)}</td><td>${d.l2}</td><td>-</td></tr>
    <tr><td>Garments ETD (Ex-BD)</td><td class="mono">${fmt(s.garmentsETD)}</td><td>${d.l3}</td><td class="${garmentNote?'hol':''}">${garmentNote||'-'}</td></tr>
    <tr><td>ETA USA</td><td class="mono">${fmt(s.eta)}</td><td>${d.l4}</td><td>-</td></tr>
    <tr><td>CDD</td><td class="mono">${fmt(s.cdd)}</td><td>${d.l5}</td><td>-</td></tr>
  `;

  div.innerHTML = headerHtml + `
    <div class="ta-body">
      <div class="route-wrap">
        <div class="route"><div class="route-line"></div>${routeHtml}</div>
      </div>
      <div class="stat-chips">
        <div class="chip">Order → ETD <b>${diffDays(s.orderDue, s.garmentsETD)}d</b></div>
        <div class="chip">Order → CDD <b>${diffDays(s.orderDue, s.cdd)}d</b></div>
      </div>
      <details class="detail-toggle">
        <summary>View detailed stage table</summary>
        <table>
          <thead><tr><th>Stage</th><th>Date</th><th>Days</th><th>Holiday impact</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </details>
    </div>
  `;
}
