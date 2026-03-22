/* ============================================
   QUIZ MASTER — utils.js  v3
   Utilities: shuffle, timers, audio, confetti,
   PDF (Bengali-safe), bookmarks (ID-based),
   streak, badges, leaderboard, adaptive engine
   ============================================ */

// ── SHUFFLE ──────────────────────────────────────────────
function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

// ── TIMER (Exam countdown) ───────────────────────────────
const TimerSystem = (() => {
  let _iv=null,_rem=0,_onTick=null,_onDone=null;
  function start(secs,onTick,onDone){
    stop(); _rem=secs;_onTick=onTick;_onDone=onDone;
    _iv=setInterval(()=>{ _rem--; _onTick?.(_rem); if(_rem<=0){stop();_onDone?.();} },1000);
  }
  function stop(){ if(_iv){clearInterval(_iv);_iv=null;} }
  function fmt(s){ return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
  function remaining(){ return _rem; }
  return { start, stop, fmt, remaining };
})();

// ── STOPWATCH (Practice elapsed) ────────────────────────
const Stopwatch = (() => {
  let _start=0,_elapsed=0,_iv=null,_onTick=null,_running=false;
  function start(onTick){
    stop(); _start=Date.now()-_elapsed; _onTick=onTick; _running=true;
    _iv=setInterval(()=>{ _elapsed=Date.now()-_start; _onTick?.(Math.floor(_elapsed/1000)); },1000);
  }
  function stop(){ if(_iv){clearInterval(_iv);_iv=null;} _running=false; }
  function reset(){ stop(); _elapsed=0; }
  function fmt(s){ const m=Math.floor(s/60),sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
  function totalSeconds(){ return Math.floor(_elapsed/1000); }
  function isRunning(){ return _running; }
  return { start, stop, reset, fmt, totalSeconds, isRunning };
})();

// ── AUDIO ────────────────────────────────────────────────
const AudioSystem = (() => {
  let ctx=null,_on=true;
  function _ctx(){ if(!ctx){try{ctx=new(window.AudioContext||window.webkitAudioContext)();}catch{return null;}} if(ctx.state==='suspended')ctx.resume(); return ctx; }
  function _tone(freq,type,dur,gain=0.28,delay=0){
    if(!_on)return; const c=_ctx(); if(!c)return;
    const o=c.createOscillator(),g=c.createGain();
    o.connect(g);g.connect(c.destination);
    o.type=type; o.frequency.setValueAtTime(freq,c.currentTime+delay);
    g.gain.setValueAtTime(0.001,c.currentTime+delay);
    g.gain.linearRampToValueAtTime(gain,c.currentTime+delay+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+delay+dur);
    o.start(c.currentTime+delay); o.stop(c.currentTime+delay+dur);
  }
  function playCorrect(){ _tone(523,'sine',.12,.22); _tone(659,'sine',.12,.22,0.1); _tone(784,'sine',.22,.28,0.2); }
  function playWrong()  { _tone(220,'sawtooth',.10,.14); _tone(175,'sawtooth',.15,.18,0.09); }
  function playClick()  { _tone(700,'sine',.06,.08); }
  function playSync()   { _tone(440,'sine',.08,.1); _tone(550,'sine',.1,.12,0.08); }
  function playStart()  { _tone(440,'sine',.1,.15); _tone(550,'sine',.1,.18,0.12); _tone(660,'sine',.2,.22,0.24); }
  function setEnabled(v){ _on=v; } function isEnabled(){ return _on; }
  return { playCorrect,playWrong,playClick,playSync,playStart,setEnabled,isEnabled };
})();

// ── CONFETTI ─────────────────────────────────────────────
const ConfettiSystem = (() => {
  const C=['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  let pts=[],raf=null;
  function create(cv){
    if(!cv)return; const ctx=cv.getContext('2d');
    cv.width=window.innerWidth; cv.height=window.innerHeight;
    pts=Array.from({length:160},()=>({x:Math.random()*cv.width,y:-10,r:Math.random()*7+4,color:C[~~(Math.random()*C.length)],vx:(Math.random()-.5)*4,vy:Math.random()*4+2,rot:Math.random()*360,rv:(Math.random()-.5)*7,shape:Math.random()>.5?'rect':'circle',a:1}));
    (function draw(){
      ctx.clearRect(0,0,cv.width,cv.height); let alive=false;
      pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.07;p.rot+=p.rv;if(p.y<cv.height+20)alive=true;if(p.y>cv.height-100)p.a=Math.max(0,p.a-.02);ctx.save();ctx.globalAlpha=p.a;ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;if(p.shape==='rect')ctx.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);else{ctx.beginPath();ctx.arc(0,0,p.r/2,0,Math.PI*2);ctx.fill();}ctx.restore();});
      if(alive)raf=requestAnimationFrame(draw);else stop(cv);
    })();
  }
  function stop(cv){ if(raf){cancelAnimationFrame(raf);raf=null;} cv?.getContext('2d').clearRect(0,0,cv.width,cv.height); }
  return { create,stop };
})();

// ── TOAST ────────────────────────────────────────────────
function showToast(msg,dur=2800){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t=Object.assign(document.createElement('div'),{className:'toast',textContent:msg});
  document.body.appendChild(t); setTimeout(()=>t.remove(),dur);
}

// ── CLIPBOARD ────────────────────────────────────────────
async function copyToClipboard(text){
  try{ await navigator.clipboard.writeText(text); }
  catch{ const ta=Object.assign(document.createElement('textarea'),{value:text,style:'position:fixed;opacity:0'});document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove(); }
  showToast('📋 Copied!');
}

// ── PDF EXPORT — Bengali-safe via canvas rasterization ───
// Strategy: render text on <canvas> using system Bengali font,
// then embed as image rows in PDF (avoids Mojibake from jsPDF's
// internal Latin-only font encoder).

async function exportToPDF(quizState, resultData) {
  if (!window.jspdf) { showToast('⚠️ PDF library not loaded'); return; }
  showToast('📄 Generating PDF…', 4000);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
  const PW=210, PH=297, ML=14, MR=14, CW=PW-ML-MR;
  let y=0;

  // ── helpers ──
  function newPage(){ doc.addPage(); y=ML; }
  function checkY(need=10){ if(y+need>PH-ML) newPage(); }

  // Render a text string to a canvas image and add to PDF
  // Returns height used in mm
  function addTextImage(text, fontPx, color, bgColor, bold, maxWidthMm){
    if(!text) return 0;
    const dpr=2; // retina
    const maxW=Math.round(maxWidthMm*3.7795*dpr); // mm→px approx
    const fontFam='Hind Siliguri,sans-serif';
    const weight=bold?'700':'400';

    // Measure wrapped lines
    const mc=document.createElement('canvas');
    const mctx=mc.getContext('2d');
    mctx.font=`${weight} ${fontPx*dpr}px ${fontFam}`;
    const words=text.split(' ');
    const lines=[]; let cur='';
    words.forEach(w=>{ const test=cur?cur+' '+w:w; if(mctx.measureText(test).width>maxW&&cur){lines.push(cur);cur=w;}else cur=test; });
    if(cur)lines.push(cur);

    const lineH=fontPx*dpr*1.55;
    const canvH=lines.length*lineH+fontPx*dpr*0.4;
    const cv=document.createElement('canvas');
    cv.width=maxW; cv.height=Math.ceil(canvH);
    const ctx=cv.getContext('2d');
    if(bgColor){ ctx.fillStyle=bgColor; ctx.fillRect(0,0,cv.width,cv.height); }
    ctx.font=`${weight} ${fontPx*dpr}px ${fontFam}`;
    ctx.fillStyle=color||'#1e1e3e';
    ctx.textBaseline='top';
    lines.forEach((l,i)=>ctx.fillText(l,0,i*lineH+fontPx*dpr*0.2));

    const imgData=cv.toDataURL('image/png');
    const imgHmm=(cv.height/dpr)*0.2646; // px→mm
    const imgWmm=maxWidthMm;
    checkY(imgHmm);
    doc.addImage(imgData,'PNG',ML,y,imgWmm,imgHmm);
    y+=imgHmm+1;
    return imgHmm+1;
  }

  // ── Header ──
  doc.setFillColor(99,102,241);
  doc.rect(0,0,PW,22,'F');
  doc.setFillColor(6,182,212);
  doc.rect(0,18,PW,4,'F');
  y=8;
  addTextImage('⚡ Quiz Master — Result Report', 12, '#ffffff', null, true, CW);
  y=26;

  // ── Summary box ──
  doc.setFillColor(240,240,255);
  doc.roundedRect(ML,y,CW,28,3,3,'F');
  const ySum=y+4;
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(60,60,100);
  const meta = quizState.meta || {};
  [
    `Class: ${meta.cls||'-'}   Subject: ${meta.subject||'-'}   Chapter: ${meta.chapter||'-'}`,
    `Mode: ${quizState.mode==='exam'?'Exam':'Practice'}   Difficulty: ${quizState.difficulty||'All'}   Questions: ${resultData.total}`,
    `Score: ${resultData.correct}/${resultData.total}  (${resultData.percent}%)   Correct: ${resultData.correct}  Wrong: ${resultData.wrong}  Skipped: ${resultData.skip}`,
    `Time: ${quizState.mode==='exam'?'Exam (5 min)':Stopwatch.fmt(resultData.timeTaken||0)+' elapsed'}`,
  ].forEach((l,i)=>{ doc.text(l,ML+3,ySum+i*6); });
  y+=32;

  // ── Questions ──
  checkY(8);
  doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,80);
  doc.text('Questions & Answers', ML, y); y+=6;

  for(let i=0;i<quizState.questions.length;i++){
    const q=quizState.questions[i];
    const ua=quizState.userAnswers[i];
    const skip=!ua||ua==='__skip__';
    const ok=!skip&&ua===q.correct;

    checkY(14);
    // Status dot
    doc.setFillColor(...(ok?[16,185,129]:skip?[148,163,184]:[239,68,68]));
    doc.circle(ML+2,y-1,2,'F');

    // Q number label (Latin — safe)
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(40,40,80);
    doc.text(`Q${i+1}.`,ML+5,y);

    // Question text — canvas render for Bengali
    const savedY=y; y+=1;
    addTextImage(q.question, 9, '#1e2040', null, true, CW-8);
    // Slight indent offset
    doc.setFont('helvetica','normal'); doc.setFontSize(8);

    // Options
    const optLabels={a:'A',b:'B',c:'C',d:'D'};
    for(const key of ['a','b','c','d']){
      const val=q.options[key]; if(!val) continue;
      checkY(7);
      const isCorrect=key===q.correct;
      const isWrong=key===ua&&!ok;
      const prefix=isCorrect?'✓ ':isWrong?'✗ ':'  ';
      const textCol=isCorrect?'#0d9e6e':isWrong?'#dc2626':'#505070';
      const bgCol=isCorrect?'#e6faf4':isWrong?'#fef2f2':null;
      if(bgCol){ doc.setFillColor(...(isCorrect?[230,250,244]:[254,242,242])); doc.roundedRect(ML+6,y-4,CW-6,6,1,1,'F'); }
      addTextImage(`${prefix}${optLabels[key]}. ${val}`, 8, textCol, null, isCorrect, CW-8);
    }

    // Explanation
    if(q.explanation){
      checkY(6);
      addTextImage(`💡 ${q.explanation}`, 7.5, '#6060a0', null, false, CW-8);
    }
    y+=2;
    // Divider
    checkY(2); doc.setDrawColor(220,220,235); doc.line(ML,y,ML+CW,y); y+=3;
  }

  // Footer
  const pages=doc.internal.getNumberOfPages();
  for(let p=1;p<=pages;p++){
    doc.setPage(p);
    doc.setFontSize(7.5); doc.setTextColor(160,160,180);
    doc.text(`Quiz Master  •  Page ${p}/${pages}  •  ধন্যবাদ! Thanks for playing ❤️`, ML, PH-6);
  }

  doc.save('quiz-master-result.pdf');
  showToast('✅ PDF saved!');
}

// ── SHARE TEXT ───────────────────────────────────────────
function generateShareText(r, state) {
  const e=r.percent>=80?'🏆':r.percent>=60?'👍':'💪';
  const meta=state.meta||{};
  const t=state.mode==='exam'?'Exam':'Practice';
  return `${e} Quiz Master Result\nClass: ${meta.cls||'-'} | ${meta.subject||'-'} | ${meta.chapter||'-'}\nMode: ${t} | Difficulty: ${state.difficulty||'All'}\nScore: ${r.correct}/${r.total} (${r.percent}%)\n✅ Correct: ${r.correct}  ❌ Wrong: ${r.wrong}\n\nধন্যবাদ! Thanks for playing Quiz Master ❤️`;
}

// ── DEBOUNCE ─────────────────────────────────────────────
function debounce(fn,ms){ let t; return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}; }

// ── STREAK ───────────────────────────────────────────────
const StreakSystem=(()=>{
  const KS='qm_streak',KL='qm_last';
  function update(){ const today=new Date().toDateString(),last=localStorage.getItem(KL); let s=parseInt(localStorage.getItem(KS)||'0'); if(last===today)return s; const y=new Date();y.setDate(y.getDate()-1);s=last===y.toDateString()?s+1:1;localStorage.setItem(KS,s);localStorage.setItem(KL,today);return s; }
  function get(){ return parseInt(localStorage.getItem('qm_streak')||'0'); }
  return{update,get};
})();

// ── BADGES ───────────────────────────────────────────────
const BadgeSystem=(()=>{
  const KEY='qm_badges';
  const DEFS={
    first_quiz:   {icon:'🎯',label:'First Quiz',   fn:(r,s)=>s.total>=1},
    perfect:      {icon:'⭐',label:'Perfect Score', fn:(r)=>r.percent===100},
    speedster:    {icon:'⚡',label:'Speedster',     fn:(r,s)=>s.mode==='exam'&&r.percent>=80},
    hard_hero:    {icon:'🔥',label:'Hard Hero',     fn:(r,s)=>s.difficulty==='hard'&&r.percent>=60},
    streak3:      {icon:'📅',label:'3-Day Streak',  fn:(r,s)=>(s.streak||0)>=3},
    bookworm:     {icon:'📚',label:'Bookworm',      fn:(r,s)=>BookmarkSystem.count()>=5},
  };
  function _e(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return[];} }
  function getStats(){ try{return JSON.parse(localStorage.getItem('qm_stats')||'{}');}catch{return{};} }
  function _ss(s){ localStorage.setItem('qm_stats',JSON.stringify(s)); }
  function check(r,state){
    const e=_e(),nb=[];
    const st=getStats(); st.totalQuizzes=(st.totalQuizzes||0)+1; if(r.percent>(st.bestPercent||0))st.bestPercent=r.percent; _ss(st);
    const ctx={...state,total:st.totalQuizzes,streak:StreakSystem.get()};
    Object.entries(DEFS).forEach(([k,d])=>{ if(!e.includes(k)&&d.fn(r,ctx)){e.push(k);nb.push({key:k,...d});} });
    localStorage.setItem(KEY,JSON.stringify(e)); return nb;
  }
  function getAllEarned(){ return _e().map(k=>({key:k,...(DEFS[k]||{})})); }
  return{check,getStats,getAllEarned};
})();

// ── LEADERBOARD ──────────────────────────────────────────
const Leaderboard=(()=>{
  const KEY='qm_lb',MAX=5;
  function add(e){ let b=get(); b.push(e); b.sort((a,b)=>b.percent-a.percent); b=b.slice(0,MAX); localStorage.setItem(KEY,JSON.stringify(b)); }
  function get(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return[];} }
  return{add,get};
})();

// ── BOOKMARK SYSTEM (ID-based, per chapter) ──────────────
const BookmarkSystem=(()=>{
  const KEY='qm_bookmarks_v3';
  // Stored: [{id,sheetId,chapter,subject,class,question,options,correct,explanation}]
  function _load(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]');}catch{return[];} }
  function _save(d){ try{localStorage.setItem(KEY,JSON.stringify(d));}catch{} }
  function get(){ return _load(); }
  function count(){ return _load().length; }
  function isBookmarked(id){ return _load().some(q=>q.id===id); }
  function toggle(question,meta){
    const marks=_load(); const idx=marks.findIndex(q=>q.id===question.id);
    if(idx===-1){ marks.push({..._slim(question),sheetId:meta?.sheetId,class:meta?.cls,subject:meta?.subject}); showToast('🔖 Bookmarked!'); }
    else{ marks.splice(idx,1); showToast('🗑️ Removed'); }
    _save(marks); return marks.length;
  }
  function remove(id){ _save(_load().filter(q=>q.id!==id)); }
  function syncFromSource(qs){ const marks=_load(); if(!marks.length)return; let ch=false; const up=marks.map(bm=>{ const live=qs.find(q=>q.id===bm.id); if(!live)return bm; const f={..._slim(live),sheetId:bm.sheetId,class:bm.class,subject:bm.subject}; if(JSON.stringify(f)!==JSON.stringify(bm)){ch=true;return f;} return bm;}); if(ch)_save(up); }
  function _slim(q){ return{id:q.id,chapter:q.chapter,difficulty:q.difficulty,question:q.question,options:q.options,correct:q.correct,explanation:q.explanation}; }
  return{get,count,isBookmarked,toggle,remove,syncFromSource};
})();

// ── ADAPTIVE ENGINE ──────────────────────────────────────
const AdaptiveEngine=(()=>{
  const KEY='qm_adaptive';
  function record(q,ok){ const d=_d(); const k=`${q.chapter||'?'}`; if(!d[k])d[k]={a:0,c:0}; d[k].a++;if(ok)d[k].c++;localStorage.setItem(KEY,JSON.stringify(d)); }
  function _d(){ try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return{};} }
  function selectQuestions(pool,count){
    const d=_d();
    if(!Object.keys(d).length) return shuffle(pool).slice(0,count);
    const w=[]; pool.forEach(q=>{ const k=q.chapter; const acc=d[k]?d[k].c/d[k].a:0.5; const wt=acc<0.4?3:acc<0.7?2:1; for(let i=0;i<wt;i++)w.push(q); });
    const seen=new Set(); return shuffle(w).filter(q=>seen.has(q.id)?false:(seen.add(q.id),true)).slice(0,count);
  }
  return{record,selectQuestions};
})();

// ── PROGRESS SAVE ────────────────────────────────────────
const ProgressSave=(()=>{
  const KEY='qm_progress_v3';
  function save(s){ try{localStorage.setItem(KEY,JSON.stringify(s));}catch{} }
  function load(){ try{const r=localStorage.getItem(KEY);return r?JSON.parse(r):null;}catch{return null;} }
  function clear(){ localStorage.removeItem(KEY); }
  return{save,load,clear};
})();
