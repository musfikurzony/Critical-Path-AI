/* =========================================================
   app.js — loaded last. Wires up every panel and button, and
   orchestrates the full-page re-render after any data change.
   ========================================================= */
function renderUI(){
  renderSettingsUI();       // storage.js
  renderHolidaysUI();       // holiday.js
  renderPresetsUI();        // storage.js
  renderSeasonsInputUI();   // season.js
  renderSeasonalTableUI();  // season.js (also triggers ai.js smart checks)
  renderArchivesUI();       // storage.js
}

window.addEventListener('DOMContentLoaded', () => {
  const df = $('dateFormat');
  ['DD-MMM-YYYY','MM/DD/YYYY','DD/MM/YYYY'].forEach(x => { const o=document.createElement('option'); o.value=x; o.text=x; df.appendChild(o); });
  df.addEventListener('change', () => { saveData(); renderUI(); });

  loadData();

  // Tab nav (main)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      $('tab-'+btn.dataset.tab).classList.add('active');
    };
  });
  // Tab nav (sidebar)
  document.querySelectorAll('.side-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.side-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.side-panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      $('side-'+btn.dataset.side).classList.add('active');
    };
  });

  $('btnOriginCN').onclick = () => { $('btnOriginCN').classList.add('on'); $('btnOriginBD').classList.remove('on'); };
  $('btnOriginBD').onclick = () => { $('btnOriginBD').classList.add('on'); $('btnOriginCN').classList.remove('on'); };

  $('btnReset').onclick = () => { if(confirm('Reset all data to 2026 defaults? This clears custom holidays, seasons and lead times.')) resetToDefault(); };

  $('btnCalc').onclick = () => {
    const ad=$('scenA_date').value, at=$('scenA_type').value;
    const bd=$('scenB_date').value, bt=$('scenB_type').value;
    const cd=$('scenC_date').value;
    const dd=$('scenD_date').value;
    renderResult('resA', ad ? runCalc(ad, at) : null, 'A', 'acc-a');
    renderResult('resB', bd ? runCalc(bd, bt) : null, 'B', 'acc-b');
    renderResult('resC', cd ? runCalc(cd, 'garments') : null, 'C', 'acc-c');
    renderResult('resD', dd ? runCalc(dd, 'eta') : null, 'D', 'acc-d');
    $('statusIndicator').textContent = 'Calculated';
    setTimeout(()=> $('statusIndicator').textContent = 'Ready', 1800);
  };

  $('btnSaveLeads').onclick = () => {
    G.leadTimes = {
      orderToFabricETD: Number($('lt1').value),
      fabricETDToInhouse: Number($('lt2').value),
      inhouseToGarmentsETD: Number($('lt3').value),
      garmentsETDToETA: Number($('lt4').value),
      etaToCDD: Number($('lt5').value),
      origin: $('btnOriginCN').classList.contains('on') ? 'CN' : 'BD'
    };
    saveData(); renderUI(); toast('Lead times saved');
  };

  $('btnAddHol').onclick = () => {
    const n=$('holName').value, z=$('holZone').value, f=$('holFrom').value, t=$('holTo').value;
    if(n && f && t){
      G.holRanges.push({name:n, zone:z, from:f, to:t});
      rebuildHolidays(); saveData(); renderUI();
      $('holName').value=''; $('holFrom').value=''; $('holTo').value='';
      toast('Holiday range added');
    } else toast('Name, from and to are required');
  };

  $('btnSaveSeasons').onclick = () => { saveData(); renderUI(); toast('Seasonal dates saved'); };
  $('btnRefreshSeasons').onclick = () => { renderUI(); toast('Table refreshed'); };

  $('btnGenTemplate').onclick = () => {
    const y = $('genYear').value;
    if(y && y.length===4){
      if(confirm(`Overwrite active seasonal dates with the ${y} template?`)){
        G.seasons = {
          "SPRING-Q1":`${y}-01-25`,"SPRING-Q2":`${y}-02-25`,"SPRING-Q3":`${y}-03-25`,
          "SUMMER-Q1":`${y}-04-25`,"SUMMER-Q2":`${y}-05-25`,"SUMMER-Q3":`${y}-06-25`,
          "FALL-Q1":`${y}-07-25`,"FALL-Q2":`${y}-08-25`,"FALL-Q3":`${y}-09-25`,
          "HOLIDAY-Q1":`${y}-10-25`,"HOLIDAY-Q2":`${y}-11-25`,"HOLIDAY-Q3":`${y}-12-25`
        };
        saveData(); renderUI(); toast(`${y} template generated`);
      }
    } else toast('Enter a 4-digit year');
  };

  $('btnArchSave').onclick = () => {
    const n = $('archName').value;
    if(n){
      G.archives.push({ name:n, data:{ seasons:{...G.seasons}, leadTimes:{...G.leadTimes}, holRanges:[...G.holRanges] } });
      saveData(); renderUI(); $('archName').value=''; toast('Archived');
    } else toast('Enter a name for this archive');
  };

  $('btnSavePreset').onclick = () => {
    const n = $('presetName').value;
    if(n){
      G.presets.push({ name:n, leadTimes:{...G.leadTimes} });
      saveData(); renderUI(); $('presetName').value=''; toast(`Preset "${n}" saved`);
    } else toast('Enter a preset name');
  };

  $('btnExportConfig').onclick = () => exportConfigFile();
  $('fileImportConfig').addEventListener('change', (e) => importConfigFile(e.target));

  // seed initial results as empty state
  renderResult('resA', null, 'A', 'acc-a');
  renderResult('resB', null, 'B', 'acc-b');
  renderResult('resC', null, 'C', 'acc-c');
  renderResult('resD', null, 'D', 'acc-d');
});

/* ---------- PWA: best-effort offline caching ---------- */
// Silently does nothing if the hosting context doesn't allow it — safe either way.
// Errors are logged to the console only (never shown to the user) so this can be
// debugged via DevTools > Console / Application > Service Workers if needed.
(function registerServiceWorker(){
  try{
    if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('[SW] registered, scope:', reg.scope))
        .catch((err) => console.warn('[SW] registration failed:', err));
    }
  } catch(e){ console.warn('[SW] not supported in this context:', e); }
})();
