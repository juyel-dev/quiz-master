/* ============================================
   QUIZ MASTER — app.js  v3
   Master+Chapter architecture, question count
   selector, practice stopwatch, exam countdown
   ============================================ */
'use strict';
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/quiz-master/service-worker.js', { scope: '/quiz-master/' })
      .then(reg => console.log('Service Worker OK'))
      .catch(err => console.log('Service Worker Problem: ' + err));
  });
}

// ── APP STATE ────────────────────────────────────────────
const App = {
  // Selection
  cls:       '',
  subject:   '',
  chapter:   '',
  sheetId:   '',
  difficulty:'all',
  mode:      'practice',
  qCount:    10,
  negMark:   false,
  sound:     true,

  // Quiz runtime
  questions: [], userAnswers: [], currentIndex: 0,
  score: 0, lifelineUsed: false, quizActive: false, tabWarnings: 0,

  // Nav history
  _history: [],

  // Result
  resultData: null,

  // For PDF meta
  get meta(){ return { cls:this.cls, subject:this.subject, chapter:this.chapter }; }
};

// ── BOOT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  lucide.createIcons();
  _showRaw('home');

  // Restore prefs
  App.sound   = localStorage.getItem('qm_sound')   !== 'false';
  App.negMark = localStorage.getItem('qm_neg')     === 'true';
  App.mode    = localStorage.getItem('qm_mode')    || 'practice';
  App.qCount  = parseInt(localStorage.getItem('qm_qcount') || '10');
  App.language = localStorage.getItem('qm_lang')   || 'en';

  document.getElementById('tog-sound').checked   = App.sound;
  document.getElementById('tog-negative').checked = App.negMark;
  AudioSystem.setEnabled(App.sound);
  setMode(App.mode, true);
  setLanguage(App.language, true);

  // Listeners
  document.getElementById('tog-sound').addEventListener('change', e   => { App.sound=e.target.checked; AudioSystem.setEnabled(e.target.checked); localStorage.setItem('qm_sound',e.target.checked); });
  document.getElementById('tog-negative').addEventListener('change', e => { App.negMark=e.target.checked; localStorage.setItem('qm_neg',e.target.checked); });
  document.getElementById('inp-qcount').addEventListener('input', e   => { App.qCount=Math.max(1,parseInt(e.target.value)||5); _updatePoolCount(); });
  document.addEventListener('keydown', _handleKey);
  document.addEventListener('visibilitychange', _handleVisibility);
  window.addEventListener('beforeunload', _handleUnload);
  window.addEventListener('popstate', () => navigateBack());

  // Load master
  try {
    await loadMaster();
    document.getElementById('home-loading').classList.add('hidden');
    document.getElementById('home-form').classList.remove('hidden');
    initHomeDropdowns();
    _initStats();
    _checkResume();
  } catch(err) {
    document.getElementById('home-loading').classList.add('hidden');
    document.getElementById('home-error').classList.remove('hidden');
    document.getElementById('txt-error').textContent = err.message || 'Master sheet not accessible';
  }

  setTimeout(() => lucide.createIcons(), 200);
});

// ── SHEET UPDATE CALLBACKS ───────────────────────────────
function onMasterSheetUpdated(rows) {
  _syncBanner(`Master updated — ${rows.length} chapters`, '#06b6d4');
  initHomeDropdowns();
}
function onChapterSheetUpdated(sheetId, qs) {
  if (sheetId === App.sheetId) {
    _syncBanner(`Chapter updated — ${qs.length} questions`, '#10b981');
    if (App.sound) AudioSystem.playSync();
  }
}

// ── NAVIGATION ───────────────────────────────────────────
function navigateTo(name, push=true) {
  if (push) { App._history.push(name); history.pushState({screen:name},'',''); }
  _showRaw(name);
}
function navigateBack() {
  if (App.quizActive) { _showExitModal(); return; }
  App._history.pop();
  const prev = App._history[App._history.length-1];
  _showRaw(prev||'home');
  if (!prev || prev==='home') { _initStats(); }
}
function _showRaw(name) {
  ['home','loading-chapter','quiz','result'].forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (!el) return;
    el.classList.toggle('hidden', s!==name);
    el.classList.toggle('active', s===name);
  });
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.classList.toggle('hidden', name==='home');
  setTimeout(()=>lucide.createIcons(), 50);
}
function showScreen(n){ navigateTo(n,true); }

// ── HOME — CASCADING DROPDOWNS ───────────────────────────
function initHomeDropdowns() {
  const classes = getClasses();
  const selCls  = document.getElementById('sel-class');
  const prev    = selCls?.value;

  if (!selCls) return;
  selCls.innerHTML = `<option value="">${App.language==='bn'?'— ক্লাস বেছে নিন —':'— Select Class —'}</option>`;
  classes.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c; selCls.appendChild(o);
  });
  if (prev && [...selCls.options].some(o=>o.value===prev)) { selCls.value=prev; _onClassChange(false); }

  // Cache age
  const ca = document.getElementById('cache-age');
  if (ca) ca.textContent = 'Data: ' + getMasterCacheAge();

  _updateBookmarkBadge();
  _renderLeaderboard();
}

function _onClassChange(resetBelow=true) {
  App.cls = document.getElementById('sel-class')?.value || '';
  if (resetBelow) { App.subject=''; App.chapter=''; App.sheetId=''; }

  const subjects = App.cls ? getSubjects(App.cls) : [];
  const selSub   = document.getElementById('sel-subject');
  selSub.innerHTML = `<option value="">${App.language==='bn'?'— বিষয় —':'— Subject —'}</option>`;
  subjects.forEach(s => { const o=document.createElement('option'); o.value=s;o.textContent=s; selSub.appendChild(o); });
  if (!resetBelow && App.subject) { selSub.value=App.subject; _onSubjectChange(false); }

  _resetChapterDropdown();
  _updatePoolCount();
  _updateStartBtn();
}

function _onSubjectChange(resetBelow=true) {
  App.subject = document.getElementById('sel-subject')?.value || '';
  if (resetBelow) { App.chapter=''; App.sheetId=''; }

  const chapters = (App.cls && App.subject) ? getChapters(App.cls, App.subject) : [];
  const selCh    = document.getElementById('sel-chapter');
  selCh.innerHTML = `<option value="">${App.language==='bn'?'— অধ্যায় —':'— Chapter —'}</option>`;
  chapters.forEach(({chapter,sheetId}) => {
    const o=document.createElement('option'); o.value=sheetId; o.dataset.chapter=chapter;
    o.textContent=chapter; selCh.appendChild(o);
  });
  if (!resetBelow && App.sheetId) { selCh.value=App.sheetId; _onChapterChange(); }

  _updatePoolCount();
  _updateStartBtn();
}

function _onChapterChange() {
  const sel = document.getElementById('sel-chapter');
  App.sheetId = sel?.value || '';
  App.chapter = sel?.selectedOptions[0]?.dataset.chapter || '';
  _updatePoolCount();
  _updateStartBtn();

  // Preload chapter in background for snappier UX
  if (App.sheetId) {
    loadChapter(App.sheetId)
      .then(qs => { _updatePoolCount(); })
      .catch(() => {});
  }
}

function _resetChapterDropdown() {
  const sel = document.getElementById('sel-chapter');
  if (sel) sel.innerHTML = `<option value="">${App.language==='bn'?'— অধ্যায় —':'— Chapter —'}</option>`;
}

function _updatePoolCount() {
  const el = document.getElementById('q-pool-count');
  if (!el) return;
  if (!App.sheetId) { el.textContent=''; return; }
  const pool = filterByDifficulty(App.difficulty);
  const avail= pool.length;
  const want  = App.qCount;
  const actual= Math.min(want, avail);
  const lang  = App.language;
  if (!avail) {
    el.textContent = lang==='bn' ? 'প্রশ্ন লোড হচ্ছে…' : 'Loading questions…';
  } else {
    el.textContent = lang==='bn'
      ? `${avail}টি প্রশ্ন পাওয়া গেছে — ${actual}টি নেওয়া হবে`
      : `${avail} available — ${actual} will be selected`;
  }
}

function _updateStartBtn() {
  const btn = document.getElementById('btn-generate');
  if (!btn) return;
  btn.disabled = !App.sheetId;
  btn.style.opacity = App.sheetId ? '1' : '0.5';
}

// ── STATS ────────────────────────────────────────────────
function _initStats() {
  const stats  = BadgeSystem.getStats();
  const streak = StreakSystem.get();
  const bar    = document.getElementById('streak-bar');
  if (bar && (streak>0||stats.bestPercent>0)) {
    bar.classList.remove('hidden');
    document.getElementById('streak-count').textContent = `${streak} day${streak!==1?'s':''}`;
    document.getElementById('best-score').textContent   = `${stats.bestPercent||0}%`;
  }
  _updateBookmarkBadge();
  _renderLeaderboard();
}

function _updateBookmarkBadge() {
  const n = BookmarkSystem.count();
  document.getElementById('bookmark-count').textContent = n;
}

function _renderLeaderboard() {
  const board = Leaderboard.get();
  const card  = document.getElementById('leaderboard-card');
  const list  = document.getElementById('leaderboard-list');
  if (!list) return;
  if (!board.length) { card?.classList.add('hidden'); return; }
  card?.classList.remove('hidden');
  const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
  list.innerHTML = board.map((e,i)=>`
    <div class="lb-item">
      <span>${medals[i]||i+1}</span>
      <span class="text-slate-300 text-xs flex-1 mx-2 truncate">${e.chapter||e.name||'Quiz'}</span>
      <span class="text-white font-bold text-sm">${e.percent}%</span>
      <span class="text-slate-500 text-xs ml-2">${e.score}</span>
    </div>`).join('');
  setTimeout(()=>lucide.createIcons(),50);
}

// ── MODE / LANGUAGE ──────────────────────────────────────
function setMode(mode, silent=false) {
  App.mode = mode;
  localStorage.setItem('qm_mode', mode);
  document.getElementById('mode-practice')?.classList.toggle('active', mode==='practice');
  document.getElementById('mode-exam')?.classList.toggle('active', mode==='exam');
  // Show/hide timer hint
  const hint = document.getElementById('exam-timer-hint');
  if (hint) hint.classList.toggle('hidden', mode!=='exam');
  const timerRow = document.getElementById('practice-timer-row');
  if (timerRow) timerRow.classList.toggle('hidden', mode!=='practice');
  if (!silent) AudioSystem.playClick();
}

function setLanguage(lang, silent=false) {
  App.language = lang;
  localStorage.setItem('qm_lang', lang);
  document.getElementById('btn-lang-en')?.classList.toggle('active', lang==='en');
  document.getElementById('btn-lang-bn')?.classList.toggle('active', lang==='bn');
  document.querySelectorAll('[data-lang-en]').forEach(el => {
    el.textContent = lang==='bn'
      ? (el.getAttribute('data-lang-bn')||el.getAttribute('data-lang-en'))
      : el.getAttribute('data-lang-en');
  });
  if (!silent) showToast(lang==='bn'?'🇧🇩 বাংলায় পরিবর্তন':'🇬🇧 Switched to English');
}

function _onDifficultyChange() {
  App.difficulty = document.getElementById('sel-difficulty')?.value || 'all';
  _updatePoolCount();
}

// ── QUIZ START ───────────────────────────────────────────
async function startQuiz(questionsOverride=null) {
  if (!App.sheetId && !questionsOverride) { showToast('⚠️ Please select a chapter first'); return; }

  // Show chapter loading screen
  if (!questionsOverride) {
    navigateTo('loading-chapter');
    try {
      await loadChapter(App.sheetId);
    } catch(err) {
      showToast('❌ ' + err.message);
      navigateTo('home'); return;
    }
  }

  const pool = questionsOverride || filterByDifficulty(App.difficulty);
  if (!pool.length) { showToast('⚠️ No questions for this filter'); navigateTo('home'); return; }

  App.qCount = parseInt(document.getElementById('inp-qcount')?.value || App.qCount);
  const count    = Math.min(App.qCount, pool.length);
  const selected = AdaptiveEngine.selectQuestions(pool, count);

  // Shuffle options per question + remap correct key
  App.questions = selected.map(q => {
    const entries  = Object.entries(q.options).filter(([,v])=>v);
    const shuffled = shuffle(entries);
    const opts={}, keyMap={};
    shuffled.forEach(([ok,val],i)=>{ const nk=['a','b','c','d'][i]; opts[nk]=val; keyMap[ok]=nk; });
    return { ...q, options:opts, correct:keyMap[q.correct] };
  });

  App.currentIndex = 0;
  App.userAnswers  = new Array(App.questions.length).fill(null);
  App.score        = 0;
  App.lifelineUsed = false;
  App.quizActive   = true;
  App.tabWarnings  = 0;

  Stopwatch.reset();

  navigateTo('quiz');
  _renderQ();

  // Timers
  const timerEl  = document.getElementById('timer-display');
  const swEl     = document.getElementById('stopwatch-display');

  if (App.mode === 'exam') {
    timerEl?.classList.remove('hidden');
    swEl?.classList.add('hidden');
    TimerSystem.start(300,
      r => { const t=document.getElementById('timer-text'); if(t)t.textContent=TimerSystem.fmt(r); if(r<=60)timerEl?.classList.add('warning'); },
      () => { showToast('⏰ Time\'s up!'); submitQuiz(true); }
    );
  } else {
    timerEl?.classList.add('hidden');
    swEl?.classList.remove('hidden');
    Stopwatch.start(s => { const t=document.getElementById('sw-text'); if(t)t.textContent=Stopwatch.fmt(s); });
  }

  if (App.sound) AudioSystem.playStart();
  _saveProgress();
}

// ── QUESTION RENDER ──────────────────────────────────────
function _renderQ() {
  const q=App.questions[App.currentIndex], total=App.questions.length, idx=App.currentIndex;

  // Animate card
  const card=document.getElementById('question-card');
  card?.classList.remove('question-enter'); void card?.offsetWidth;
  card?.classList.add('question-enter');

  // Progress
  const pct=((idx+1)/total)*100;
  const pb=document.getElementById('progress-bar');
  if(pb) pb.style.width=pct+'%';
  const qc=document.getElementById('q-counter');
  if(qc) qc.textContent=App.language==='bn'?`প্রশ্ন ${idx+1} / ${total}`:`Question ${idx+1} of ${total}`;

  // Meta chips
  document.getElementById('q-chapter-tag').textContent = q.chapter||'';
  const badge=document.getElementById('q-difficulty-badge');
  if(badge){ badge.textContent={easy:'Easy',medium:'Medium',hard:'Hard'}[q.difficulty]; badge.className=`diff-badge ${q.difficulty}`; }
  const scoreEl=document.getElementById('q-score-live');
  if(scoreEl) scoreEl.textContent=App.language==='bn'?`স্কোর: ${App.score}`:`Score: ${App.score}`;
  const idChip=document.getElementById('q-id-chip');
  if(idChip) idChip.textContent=q.id;

  // Question text
  document.getElementById('question-text').textContent = q.question;

  // Options
  const grid=document.getElementById('options-grid');
  grid.innerHTML='';
  const labels=['A','B','C','D'];
  Object.entries(q.options).forEach(([key,text],i)=>{
    if(!text)return;
    const btn=document.createElement('button');
    btn.className='option-btn'; btn.dataset.key=key;
    btn.innerHTML=`<span class="option-label">${labels[i]}</span><span class="option-text">${text}</span>`;
    btn.addEventListener('click',()=>_selectAnswer(key));
    grid.appendChild(btn);
  });

  // Panels
  document.getElementById('explanation-panel').classList.add('hidden');
  document.getElementById('btn-show-answer').classList.toggle('hidden', App.mode!=='practice');
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-submit').classList.add('hidden');
  document.getElementById('btn-lifeline').disabled = App.lifelineUsed;

  // Prev button visibility
  const prevBtn=document.getElementById('btn-prev');
  if(prevBtn) prevBtn.disabled=(idx===0);

  _refreshBookmarkBtn(q.id);
  lucide.createIcons();
}

// ── ANSWER ───────────────────────────────────────────────
function _selectAnswer(key) {
  if (App.userAnswers[App.currentIndex]!==null) return;
  const q=App.questions[App.currentIndex], ok=key===q.correct;
  App.userAnswers[App.currentIndex]=key;
  if(ok) App.score++;
  else if(App.negMark && q.difficulty==='hard') App.score=Math.max(0,App.score-.25);
  if(App.sound) ok?AudioSystem.playCorrect():AudioSystem.playWrong();
  AdaptiveEngine.record(q,ok);
  _revealOpts(key,q.correct);
  if(q.explanation){ document.getElementById('explanation-text').textContent=q.explanation; document.getElementById('explanation-panel').classList.remove('hidden'); }
  _showActionBtns();
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  _saveProgress();
  lucide.createIcons();
}

function _revealOpts(sel,cor) {
  document.querySelectorAll('.option-btn').forEach(btn=>{
    const k=btn.dataset.key;
    if(k===cor) btn.classList.add('correct');
    else if(k===sel&&sel!==cor) btn.classList.add('wrong');
  });
}

function _showActionBtns() {
  const isLast=App.currentIndex===App.questions.length-1;
  document.getElementById('btn-show-answer').classList.add('hidden');
  document.getElementById('btn-next').classList.toggle('hidden',isLast);
  document.getElementById('btn-submit').classList.toggle('hidden',!isLast);
}

function showAnswer() {
  const q=App.questions[App.currentIndex];
  if(App.userAnswers[App.currentIndex]===null) App.userAnswers[App.currentIndex]='__skip__';
  _revealOpts(null,q.correct);
  if(q.explanation){ document.getElementById('explanation-text').textContent=q.explanation; document.getElementById('explanation-panel').classList.remove('hidden'); }
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  _showActionBtns();
}

// ── NAVIGATION ───────────────────────────────────────────
function nextQuestion() {
  if(App.currentIndex<App.questions.length-1){ App.currentIndex++; _renderQ(); _saveProgress(); }
}

function prevQuestion() {
  if(App.currentIndex<=0) return;
  App.currentIndex--;
  _renderQ();
  const q=App.questions[App.currentIndex], ans=App.userAnswers[App.currentIndex];
  if(ans && ans!=='__skip__'){ _revealOpts(ans,q.correct); document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true); _showActionBtns(); document.getElementById('btn-show-answer').classList.add('hidden'); if(q.explanation){document.getElementById('explanation-text').textContent=q.explanation;document.getElementById('explanation-panel').classList.remove('hidden');} }
  else if(ans==='__skip__'){ _revealOpts(null,q.correct); document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true); _showActionBtns(); }
}

// ── 50-50 ────────────────────────────────────────────────
function use5050() {
  if(App.lifelineUsed||App.userAnswers[App.currentIndex]!==null)return;
  const cor=App.questions[App.currentIndex].correct;
  const wrongs=shuffle(Array.from(document.querySelectorAll('.option-btn')).filter(b=>b.dataset.key!==cor)).slice(0,2);
  wrongs.forEach(b=>b.classList.add('eliminated'));
  App.lifelineUsed=true;
  document.getElementById('btn-lifeline').disabled=true;
  showToast('🎯 Two wrong options removed!');
  AudioSystem.playClick();
}

// ── BOOKMARK ─────────────────────────────────────────────
function bookmarkCurrent() {
  const q=App.questions[App.currentIndex];
  BookmarkSystem.toggle(q, App.meta);
  _refreshBookmarkBtn(q.id);
  _updateBookmarkBadge();
}

function _refreshBookmarkBtn(id) {
  const btn=document.getElementById('btn-bookmark-cur'); if(!btn)return;
  const marked=BookmarkSystem.isBookmarked(id);
  btn.style.color=marked?'#818cf8':'';
  btn.style.borderColor=marked?'#6366f1':'';
}

// ── KEYBOARD ─────────────────────────────────────────────
function _handleKey(e) {
  if(!App.quizActive)return;
  const map={'1':'a','2':'b','3':'c','4':'d','a':'a','b':'b','c':'c','d':'d','A':'a','B':'b','C':'c','D':'d'};
  if(map[e.key]&&App.userAnswers[App.currentIndex]===null){ _selectAnswer(map[e.key]); return; }
  const onInput=e.target.closest('input,select,textarea');
  if(onInput)return;
  if(e.key==='ArrowRight'||e.key==='Enter'){
    if(!document.getElementById('btn-next').classList.contains('hidden')) nextQuestion();
    else if(!document.getElementById('btn-submit').classList.contains('hidden')) submitQuiz();
  }
  if(e.key==='ArrowLeft') prevQuestion();
  if(e.key==='Escape') _showExitModal();
}

// ── EXIT ─────────────────────────────────────────────────
function exitQuiz()  { _showExitModal(); }
function _showExitModal(){ document.getElementById('modal-exit')?.classList.remove('hidden'); }
function cancelExit(){ document.getElementById('modal-exit')?.classList.add('hidden'); }
function _doExitQuiz(){
  TimerSystem.stop(); Stopwatch.stop();
  App.quizActive=false; ProgressSave.clear();
  document.getElementById('modal-exit')?.classList.add('hidden');
  navigateTo('home');
  _initStats();
}

// ── SUBMIT ───────────────────────────────────────────────
function submitQuiz(auto=false) {
  TimerSystem.stop(); Stopwatch.stop();
  App.quizActive=false; ProgressSave.clear();
  StreakSystem.update();

  let correct=0,wrong=0,skip=0;
  const chMap={}, diffMap={};
  App.questions.forEach((q,i)=>{
    const ans=App.userAnswers[i], ch=q.chapter||'?', dif=q.difficulty;
    if(!chMap[ch])chMap[ch]={correct:0,total:0}; chMap[ch].total++;
    if(!diffMap[dif])diffMap[dif]={correct:0,total:0}; diffMap[dif].total++;
    if(!ans||ans==='__skip__') skip++;
    else if(ans===q.correct){correct++;chMap[ch].correct++;diffMap[dif].correct++;}
    else wrong++;
  });

  const total=App.questions.length, percent=Math.round((correct/total)*100);
  App.resultData={ correct,wrong,skip,total,percent,score:App.score,chMap,diffMap,timeTaken:Stopwatch.totalSeconds() };

  const nb=BadgeSystem.check(App.resultData, App);
  Leaderboard.add({ chapter:App.chapter||'Quiz', name:'You', score:`${correct}/${total}`, percent, date:new Date().toLocaleDateString() });

  navigateTo('result');
  _renderResult(nb);
}

// ── RESULT ───────────────────────────────────────────────
function _renderResult(nb=[]) {
  const r=App.resultData;
  const lang=App.language;
  const [emoji,title]=r.percent===100?['🏆',lang==='bn'?'নিখুঁত!':'Perfect!']:r.percent>=80?['🎯',lang==='bn'?'চমৎকার!':'Excellent!']:r.percent>=60?['👍',lang==='bn'?'ভালো!':'Good Job!']:['📚',lang==='bn'?'আরো পড়ো!':'Keep Practicing!'];
  document.getElementById('result-emoji').textContent=emoji;
  document.getElementById('result-title').textContent=title;
  document.getElementById('stat-correct').textContent=r.correct;
  document.getElementById('stat-wrong').textContent=r.wrong;
  document.getElementById('stat-skip').textContent=r.skip;
  document.getElementById('final-score-text').textContent=`${r.correct} / ${r.total}`;
  document.getElementById('score-percent').textContent=`${r.percent}%`;

  // Show time taken
  const timeEl=document.getElementById('result-time');
  if(timeEl){ const t=App.mode==='exam'?`${300-TimerSystem.remaining()}s used`:Stopwatch.fmt(r.timeTaken)+' elapsed'; timeEl.textContent=t; }

  // Show meta
  const metaEl=document.getElementById('result-meta');
  if(metaEl) metaEl.textContent=`${App.cls} › ${App.subject} › ${App.chapter}`;

  // Animate ring
  setTimeout(()=>{ const c=document.getElementById('score-circle'); if(c){c.style.transition='stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)';c.style.strokeDashoffset=314-(r.percent/100)*314;} },120);

  if(r.percent>=80) setTimeout(()=>ConfettiSystem.create(document.getElementById('confetti-canvas')),400);

  // Badges
  const allBadges=BadgeSystem.getAllEarned();
  document.getElementById('badges-earned').innerHTML=allBadges.map(b=>`<span class="achieve-badge">${b.icon||'🏅'} ${b.label||b.key}</span>`).join('');
  if(nb.length) setTimeout(()=>nb.forEach(b=>showToast(`🏅 New badge: ${b.label}!`)),800);

  // Chapter accuracy
  document.getElementById('chapter-accuracy').innerHTML=Object.entries(r.chMap).map(([ch,s])=>{
    const pct=s.total?Math.round(s.correct/s.total*100):0;
    return `<div class="mb-2"><div class="flex justify-between text-xs mb-1"><span class="text-slate-300 truncate max-w-[70%]">${ch}</span><span class="text-slate-400">${s.correct}/${s.total} (${pct}%)</span></div><div class="analytics-bar"><div class="analytics-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');

  _renderReviewList();
  document.getElementById('btn-retry-wrong').disabled=r.wrong===0;
  lucide.createIcons();
}

function _renderReviewList() {
  document.getElementById('review-list').innerHTML=App.questions.map((q,i)=>{
    const ans=App.userAnswers[i],skip=!ans||ans==='__skip__',ok=!skip&&ans===q.correct;
    return `<div class="review-item ${skip?'skip-item':ok?'correct-item':'wrong-item'}">
      <div class="flex items-start gap-2">
        <span class="text-sm shrink-0">${skip?'⬜':ok?'✅':'❌'}</span>
        <div class="flex-1 min-w-0">
          <span class="text-slate-600 text-xs font-mono">${q.id}</span>
          <p class="text-xs text-slate-300 leading-relaxed my-0.5">${q.question}</p>
          <div class="flex flex-wrap gap-2 text-xs">
            <span class="text-emerald-400">✓ ${q.options[q.correct]}</span>
            ${!skip&&!ok?`<span class="text-red-400">✗ ${q.options[ans]||'?'}</span>`:''}
          </div>
          ${q.explanation?`<p class="text-xs text-slate-500 mt-1">💡 ${q.explanation}</p>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── RETRY / NEW ──────────────────────────────────────────
function retryWrong() {
  const wrongQs=App.questions.filter((q,i)=>{const a=App.userAnswers[i];return a&&a!=='__skip__'&&a!==q.correct;});
  if(!wrongQs.length){showToast('🎉 No wrong answers!');return;}
  ConfettiSystem.stop(document.getElementById('confetti-canvas'));
  startQuiz(wrongQs);
}
function newQuiz() {
  ConfettiSystem.stop(document.getElementById('confetti-canvas'));
  navigateTo('home'); _initStats();
}

// ── PDF / SHARE ──────────────────────────────────────────
function exportPDF()   { if(App.resultData) exportToPDF({...App},{...App.resultData}); }
function shareResult() { const txt=generateShareText(App.resultData,App); navigator.share?navigator.share({title:'Quiz Master',text:txt}).catch(()=>copyToClipboard(txt)):copyToClipboard(txt); }

// ── BOOKMARKS MODAL ──────────────────────────────────────
function showBookmarks() {
  const marks=BookmarkSystem.get(), list=document.getElementById('bookmarks-list'), qBtn=document.getElementById('btn-quiz-bookmarks');
  if(!marks.length){
    list.innerHTML=`<p class="text-center text-slate-400 text-sm py-6">${App.language==='bn'?'কোনো সংরক্ষিত প্রশ্ন নেই':'No bookmarked questions yet'}</p>`;
    qBtn?.classList.add('hidden');
  } else {
    list.innerHTML=marks.map((q,i)=>`
      <div class="bookmark-item">
        <div class="flex items-start gap-2">
          <span class="text-slate-500 text-xs font-mono shrink-0 w-12">${q.id}</span>
          <p class="text-xs text-slate-300 flex-1 leading-relaxed">${q.question}</p>
          <button onclick="removeBookmark('${q.id}')" class="text-red-400 hover:text-red-300 text-xs shrink-0">✕</button>
        </div>
        <p class="text-xs text-slate-600 mt-1 pl-14">${q.class||''}${q.subject?' › '+q.subject:''} › ${q.chapter||''}</p>
      </div>`).join('');
    qBtn?.classList.remove('hidden');
  }
  document.getElementById('modal-bookmarks').classList.remove('hidden');
}
function closeBookmarks()  { document.getElementById('modal-bookmarks').classList.add('hidden'); }
function removeBookmark(id){ BookmarkSystem.remove(id); showBookmarks(); _updateBookmarkBadge(); }
function startBookmarkQuiz(){ closeBookmarks(); const m=BookmarkSystem.get(); if(m.length)startQuiz(m); }

// ── ANTI-CHEAT ───────────────────────────────────────────
function _handleVisibility() {
  if(!App.quizActive||App.mode!=='exam'||!document.hidden)return;
  App.tabWarnings++;
  document.getElementById('tab-warn-count').textContent=`Warning ${App.tabWarnings}/3`;
  document.getElementById('modal-tabwarn').classList.remove('hidden');
  if(App.tabWarnings>=3) setTimeout(()=>{document.getElementById('modal-tabwarn').classList.add('hidden');submitQuiz(true);},2000);
}
function dismissTabWarn(){ document.getElementById('modal-tabwarn').classList.add('hidden'); }

// ── BEFOREUNLOAD ─────────────────────────────────────────
function _handleUnload(e){ if(App.quizActive){e.preventDefault();e.returnValue='';} }

// ── PROGRESS ─────────────────────────────────────────────
function _saveProgress() {
  if(!App.quizActive)return;
  ProgressSave.save({cls:App.cls,subject:App.subject,chapter:App.chapter,sheetId:App.sheetId,difficulty:App.difficulty,mode:App.mode,qCount:App.qCount,questions:App.questions,currentIndex:App.currentIndex,userAnswers:App.userAnswers,score:App.score,lifelineUsed:App.lifelineUsed});
}
function _checkResume() {
  const saved=ProgressSave.load(); if(!saved)return;
  const msg=App.language==='bn'?'আগের কুইজ চালিয়ে যাবেন?':'Resume previous quiz?';
  if(confirm(msg)){
    Object.assign(App,saved,{quizActive:true});
    navigateTo('quiz'); _renderQ();
    const ans=App.userAnswers[App.currentIndex];
    if(ans&&ans!=='__skip__'){_revealOpts(ans,App.questions[App.currentIndex].correct);document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);_showActionBtns();}
    if(App.mode==='exam'){
      const te=document.getElementById('timer-display'); te?.classList.remove('hidden');
      TimerSystem.start(Math.max(30,300-App.currentIndex*30),r=>{const t=document.getElementById('timer-text');if(t)t.textContent=TimerSystem.fmt(r);if(r<=60)te?.classList.add('warning');},()=>submitQuiz(true));
    } else {
      const se=document.getElementById('stopwatch-display'); se?.classList.remove('hidden');
      Stopwatch.start(s=>{const t=document.getElementById('sw-text');if(t)t.textContent=Stopwatch.fmt(s);});
    }
  } else { ProgressSave.clear(); }
}

// ── SYNC BANNER ──────────────────────────────────────────
function _syncBanner(msg, color='#10b981') {
  document.querySelectorAll('.sync-banner').forEach(e=>e.remove());
  const b=document.createElement('div'); b.className='sync-banner';
  b.style.borderColor=color+'55'; b.style.color=color; b.style.background=color+'1a';
  b.innerHTML=`<span>🔄</span><span>${msg}</span><button onclick="this.parentElement.remove()" class="sync-dismiss">✕</button>`;
  document.body.appendChild(b); setTimeout(()=>b.remove(),6000);
}
