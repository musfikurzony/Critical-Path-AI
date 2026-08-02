/* =========================================================
   ai.js — "Smart Checks": rule-based heuristics that scan the
   active seasonal plan for things worth a second look.

   Honesty note: this is plain arithmetic over the same runCalc()
   engine everything else uses — no machine learning, no external
   model. It's named ai.js because it's the natural home for any
   future smarter planning assistance, but today it's transparent,
   inspectable rules:
     1) Outlier span check — flags a season whose total
        Order Due → CDD duration is notably longer/shorter than
        the average across your active seasons.
     2) Order-Due clustering check — flags seasons whose Order Due
        dates land close together, which usually means overlapping
        production windows and possible factory capacity strain.
   ========================================================= */
function computeSmartChecks(){
  const seasons = Object.keys(G.seasons).filter(k => !!G.seasons[k]);
  if(seasons.length < 2) return [];

  const rows = seasons.map(k => {
    const res = runCalc(G.seasons[k], 'backward');
    return { season:k, orderDue:res.stages.orderDue, cdd:res.stages.cdd, span: diffDays(res.stages.orderDue, res.stages.cdd) };
  });

  const warnings = [];

  // 1) Outlier span check
  const avgSpan = rows.reduce((sum,r) => sum+r.span, 0) / rows.length;
  rows.forEach(r => {
    const deviation = Math.abs(r.span - avgSpan) / avgSpan;
    if(deviation > 0.15){
      const dir = r.span > avgSpan ? 'longer' : 'shorter';
      warnings.push(`<b>${r.season}</b>: critical path is ${r.span}d — ${Math.round(deviation*100)}% ${dir} than the ${Math.round(avgSpan)}d average across your active seasons.`);
    }
  });

  // 2) Order-Due clustering check (possible factory capacity strain)
  const sorted = [...rows].sort((a,b) => a.orderDue - b.orderDue);
  for(let i=0; i<sorted.length-1; i++){
    const gap = diffDays(sorted[i].orderDue, sorted[i+1].orderDue);
    if(gap >= 0 && gap < 21){
      warnings.push(`<b>${sorted[i].season}</b> and <b>${sorted[i+1].season}</b> have Order Due dates only ${gap}d apart — overlapping production windows may strain factory capacity.`);
    }
  }

  return warnings;
}

function renderSmartChecksUI(){
  const box = $('smartChecksBox');
  if(!box) return;
  const warnings = computeSmartChecks();
  if(warnings.length === 0){
    box.innerHTML = '<div class="empty-note">No timing conflicts or outliers detected across the active seasons.</div>';
  } else {
    box.innerHTML = warnings.map(w => `<div class="smart-check-row">⚠️ ${w}</div>`).join('');
  }
}
