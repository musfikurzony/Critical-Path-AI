/* =========================================================
   export.js — everything that leaves the app: clipboard copies
   for email, and full-config backup/restore as a downloadable file.
   ========================================================= */
function copyToClipboard(text){
  // Try the classic execCommand approach first — this works reliably even inside
  // sandboxed iframes/previews where the async Clipboard API can be blocked.
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.left = '-9999px'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if(ok) return Promise.resolve();
  } catch(e){ /* fall through to Clipboard API */ }

  if(navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error('No copy method available'));
}

window.copyTA = (label) => {
  const res = window.taResults[label];
  if(!res) return;
  const text = taText(label, res);
  copyToClipboard(text)
    .then(() => toast(`${label} T&A copied — dates only, ready to paste`))
    .catch(() => toast('Copy failed — please select the text manually'));
};

window.copySeasonTable = () => {
  copyToClipboard(seasonTableText())
    .then(() => toast('Seasonal overview copied — dates only, ready to paste into Excel'))
    .catch(() => toast('Copy failed — please select the table manually'));
};

/* ---------- Full-config backup / restore ---------- */
// Protects against a colleague clearing their browser cache and losing every
// holiday, season, lead-time and archive they've set up — all of it lives in
// localStorage only, so this is the one way to move it between devices too.
window.exportConfigFile = () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    seasons: G.seasons,
    leadTimes: G.leadTimes,
    holRanges: G.holRanges,
    archives: G.archives,
    presets: G.presets
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = toISO(new Date());
  a.href = url; a.download = `sltc-config-backup-${stamp}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Config exported — save this file somewhere safe');
};

window.importConfigFile = (fileInput) => {
  const file = fileInput.files && fileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const data = JSON.parse(e.target.result);
      if(!data.seasons || !data.leadTimes || !Array.isArray(data.holRanges)) throw new Error('Not a valid backup file');
      if(!confirm('Import this config? It will replace your current lead times, holidays, seasons, presets and archives.')) return;
      G.seasons = data.seasons;
      G.leadTimes = data.leadTimes;
      G.holRanges = data.holRanges;
      G.archives = Array.isArray(data.archives) ? data.archives : [];
      G.presets = Array.isArray(data.presets) ? data.presets : [];
      rebuildHolidays(); saveData(); renderUI();
      toast('Config imported successfully');
    } catch(err){
      toast('Import failed — that file doesn\'t look like a valid backup');
    }
    fileInput.value = '';
  };
  reader.readAsText(file);
};
