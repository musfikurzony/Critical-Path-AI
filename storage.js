/* =========================================================
   storage.js — the G data model, localStorage persistence,
   and the sidebar panels that read/write it directly:
   Lead times, Sourcing profiles (presets), Archives.
   ========================================================= */
const DEFAULTS = {
  seasons: { "SPRING-Q1":"2026-01-05","SPRING-Q2":"2026-02-05","SPRING-Q3":"2026-03-05","SUMMER-Q1":"2026-04-05","SUMMER-Q2":"2026-05-05","SUMMER-Q3":"2026-06-05","FALL-Q1":"2026-07-05","FALL-Q2":"2026-08-05","FALL-Q3":"2026-09-05","HOLIDAY-Q1":"2026-10-05","HOLIDAY-Q2":"2026-11-05","HOLIDAY-Q3":"2026-12-05" },
  leadTimes: { orderToFabricETD:60, fabricETDToInhouse:30, inhouseToGarmentsETD:45, garmentsETDToETA:60, etaToCDD:14, origin:'CN' },
  holidays: [
    {name:'1st Eid', zone:'BD', from:'2026-03-18', to:'2026-03-29'},
    {name:'2nd Eid', zone:'BD', from:'2026-05-23', to:'2026-05-31'},
    {name:'CNY', zone:'CN', from:'2026-02-03', to:'2026-03-03'},
    {name:'Golden Oct', zone:'CN', from:'2026-10-01', to:'2026-10-07'}
  ]
};

let G = { seasons:{}, leadTimes:{}, holRanges:[], holDays:[], archives:[], presets:[] };

function saveData(){
  localStorage.setItem('sltc_data', JSON.stringify(G));
  localStorage.setItem('sltc_fmt', $('dateFormat').value);
}

function loadData(){
  try {
    const raw = localStorage.getItem('sltc_data');
    if(raw){
      const data = JSON.parse(raw);
      if(data.seasons && data.leadTimes && Array.isArray(data.holRanges)){
        G = data;
        if(!Array.isArray(G.archives)) G.archives = [];
        if(!Array.isArray(G.presets)) G.presets = [];
        for(let k in G.leadTimes) G.leadTimes[k] = (k==='origin') ? G.leadTimes[k] : Number(G.leadTimes[k]);
      } else throw new Error('Corrupt data');
    } else resetToDefault();
  } catch(e){
    console.error(e);
    resetToDefault();
  }
  const f = localStorage.getItem('sltc_fmt');
  if(f) $('dateFormat').value = f;
  rebuildHolidays();
  renderUI();
}

function resetToDefault(){
  G.seasons = {...DEFAULTS.seasons};
  G.leadTimes = {...DEFAULTS.leadTimes};
  G.holRanges = JSON.parse(JSON.stringify(DEFAULTS.holidays));
  G.archives = G.archives || [];
  G.presets = G.presets || [];
  rebuildHolidays();
  saveData();
  renderUI();
  toast('Reset to 2026 defaults');
}

/* ---------- Lead times / origin panel ---------- */
function renderSettingsUI(){
  $('lt1').value = G.leadTimes.orderToFabricETD;
  $('lt2').value = G.leadTimes.fabricETDToInhouse;
  $('lt3').value = G.leadTimes.inhouseToGarmentsETD;
  $('lt4').value = G.leadTimes.garmentsETDToETA;
  $('lt5').value = G.leadTimes.etaToCDD;
  const origin = G.leadTimes.origin || 'CN';
  $('btnOriginCN').classList.toggle('on', origin==='CN');
  $('btnOriginBD').classList.toggle('on', origin==='BD');
}

/* ---------- Sourcing profiles (lead-time presets) ---------- */
function renderPresetsUI(){
  const pl = $('listPresets'); pl.innerHTML='';
  if(G.presets.length===0) pl.innerHTML = '<div class="empty-note">No saved presets yet.</div>';
  G.presets.forEach((p,i) => {
    const row = document.createElement('div'); row.className='list-row';
    row.innerHTML = `
      <div class="lr-main">
        <div class="lr-title">${p.name}</div>
        <div class="lr-sub">${p.leadTimes.orderToFabricETD}/${p.leadTimes.fabricETDToInhouse}/${p.leadTimes.inhouseToGarmentsETD}/${p.leadTimes.garmentsETDToETA}/${p.leadTimes.etaToCDD} · ${p.leadTimes.origin}</div>
      </div>
      <div class="lr-actions">
        <button class="btn-xs" onclick="doLoadPreset(${i})">Load</button>
        <button class="btn-xs btn-danger" onclick="doDelPreset(${i})">✕</button>
      </div>`;
    pl.appendChild(row);
  });
}
window.doLoadPreset = (i) => {
  G.leadTimes = { ...G.leadTimes, ...JSON.parse(JSON.stringify(G.presets[i].leadTimes)) };
  saveData(); renderUI(); toast(`Preset "${G.presets[i].name}" applied`);
};
window.doDelPreset = (i) => { if(confirm('Delete this preset?')){ G.presets.splice(i,1); saveData(); renderUI(); } };

/* ---------- Archives (full-config snapshots) ---------- */
function renderArchivesUI(){
  const al = $('listArchives'); al.innerHTML='';
  if(G.archives.length===0) al.innerHTML='<div class="empty-note">No archives yet.</div>';
  G.archives.forEach((a,i) => {
    const row = document.createElement('div'); row.className='list-row';
    row.innerHTML = `<div class="lr-main"><div class="lr-title">${a.name}</div></div>
      <div class="lr-actions"><button class="btn-xs" onclick="doLoadArch(${i})">Load</button><button class="btn-xs btn-danger" onclick="doDelArch(${i})">✕</button></div>`;
    al.appendChild(row);
  });
}
window.doLoadArch = (i) => {
  if(confirm('Load this archive? It will replace current lead times, holidays and seasons.')){
    const a = G.archives[i].data;
    G.seasons = {...a.seasons}; G.leadTimes = {...a.leadTimes}; G.holRanges = [...a.holRanges];
    rebuildHolidays(); saveData(); renderUI(); toast('Archive loaded');
  }
};
window.doDelArch = (i) => { if(confirm('Delete this archive?')){ G.archives.splice(i,1); saveData(); renderUI(); } };
