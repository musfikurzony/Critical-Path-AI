/* =========================================================
   holiday.js — the CN/BD holiday calendar: expanding date ranges,
   lookups used by the calculation engine, and the Holidays panel.
   ========================================================= */
function rebuildHolidays(){
  G.holDays = [];
  G.holRanges.forEach(r => {
    rangeDates(r.from, r.to).forEach(d => {
      if(!G.holDays.some(h => h.date===d && h.zone===r.zone)){
        G.holDays.push({ date:d, zone:r.zone, name:r.name });
      }
    });
  });
}
function isHol(dISO, zone){ return G.holDays.some(h => h.date===dISO && (!zone || h.zone===zone)); }
function isEid(dISO){ return G.holDays.some(h => h.date===dISO && h.zone==='BD' && (h.name.toLowerCase().includes('eid'))); }
function getEidName(dISO){ const h = G.holDays.find(h => h.date===dISO && h.zone==='BD' && h.name.toLowerCase().includes('eid')); return h?h.name:null; }
function getHolName(dISO, zone){ const h = G.holDays.find(h => h.date===dISO && h.zone===zone); return h?h.name:'Holiday'; }
function getHolSummary(aISO, bISO, zone){
  const summ = {};
  G.holDays.filter(h => {
    const hd=parseISO(h.date), ad=parseISO(aISO), bd=parseISO(bISO);
    return hd>=ad && hd<=bd && (!zone || h.zone===zone);
  }).forEach(h => { summ[h.name||'Other'] = (summ[h.name||'Other']||0)+1; });
  return Object.keys(summ).map(k => `${k} (+${summ[k]} days)`).join(' | ');
}

/* ---------- Holidays panel ---------- */
function renderHolidaysUI(){
  // sorted earliest-first by start date; edit/remove still target the real index
  const hl = $('listRanges'); hl.innerHTML='';
  if(G.holRanges.length===0) hl.innerHTML = '<div class="empty-note">No holiday ranges yet.</div>';
  const holOrder = G.holRanges.map((h,i)=>i).sort((a,b)=> G.holRanges[a].from.localeCompare(G.holRanges[b].from));
  holOrder.forEach(i => {
    const h = G.holRanges[i];
    const row = document.createElement('div'); row.className='list-row';
    row.innerHTML = `
      <div class="lr-main">
        <div class="lr-title"><span class="zone-badge ${h.zone.toLowerCase()}">${h.zone}</span>${h.name}</div>
        <div class="lr-sub">${h.from} → ${h.to}</div>
      </div>
      <div class="lr-actions">
        <button class="btn-xs" onclick="doEditHol(${i})">Edit</button>
        <button class="btn-xs btn-danger" onclick="doRemoveHol(${i})">✕</button>
      </div>`;
    hl.appendChild(row);
  });
  const hld = $('listDates'); hld.innerHTML='';
  [...G.holDays].sort((a,b)=>a.date.localeCompare(b.date)).forEach(h => {
    hld.innerHTML += `<div>${h.date} <span class="zone-badge ${h.zone.toLowerCase()}">${h.zone}</span>${h.name}</div>`;
  });
}
window.doRemoveHol = (i) => { if(confirm('Remove this holiday range?')){ G.holRanges.splice(i,1); rebuildHolidays(); saveData(); renderUI(); toast('Removed'); } };
window.doEditHol = (i) => {
  const h = G.holRanges[i];
  $('holName').value = h.name; $('holZone').value = h.zone; $('holFrom').value = h.from; $('holTo').value = h.to;
  G.holRanges.splice(i,1); rebuildHolidays(); saveData(); renderUI();
  toast('Loaded into the form — edit, then click Add');
};
