/* =========================================================
   utils.js — shared helpers (DOM shortcut, date math, toast, formatting)
   Loaded first: every other module relies on these.
   ========================================================= */
const $ = (id) => document.getElementById(id);
const pad = (n) => n<10 ? '0'+n : ''+n;
const toISO = (d) => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseISO = (s) => { const p=s.split('-'); return new Date(p[0],p[1]-1,p[2]); };
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+Number(n)); return x; };
const subDays = (d,n) => addDays(d,-n);
const diffDays = (a,b) => {
  const da=(typeof a==='string')?parseISO(a):a;
  const db=(typeof b==='string')?parseISO(b):b;
  return Math.round((db-da)/(1000*60*60*24));
};
const rangeDates = (a,b) => {
  const s=new Date(a), e=new Date(b), arr=[];
  for(let x=new Date(s); x<=e; x.setDate(x.getDate()+1)) arr.push(toISO(new Date(x)));
  return arr;
};
const toast = (msg) => {
  const t = $('toast'); t.textContent = msg; t.className = "show";
  setTimeout(() => t.className = t.className.replace("show",""), 2800);
};
function fmt(d){
  if(!d) return '-';
  const x = (typeof d==='string') ? parseISO(d) : new Date(d);
  const dd=pad(x.getDate()), mm=pad(x.getMonth()+1), yyyy=x.getFullYear();
  const mmm=x.toLocaleString('en-US',{month:'short'});
  const f = $('dateFormat').value;
  if(f==='DD-MMM-YYYY') return `${dd}-${mmm}-${yyyy}`;
  if(f==='MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  return `${dd}/${mm}/${yyyy}`;
}
