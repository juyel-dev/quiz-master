/* ============================================
   QUIZ MASTER — data.js  v3
   Master CSV architecture + Lazy chapter load
   ============================================
   MASTER CSV columns:
     A=sheetId  B=sheetName  C=class  D=subject  E=chapter  F=csvLink

   CHAPTER CSV columns:
     A=id  B=chapter  C=difficulty  D=question
     E=optA  F=optB  G=optC  H=optD  I=correct  J=explanation
   ============================================ */

// ── CONFIG ──────────────────────────────────────────────
const MASTER_CSV_LINK = 'https://docs.google.com/spreadsheets/d/1dJtuu61H_i1q_xL4--b4xsFtCVxzIi301bIDIAz1qdw/export?format=csv';

const DC = {
  MASTER_KEY:      'qm_master_v1',
  MASTER_HASH_KEY: 'qm_master_hash',
  MASTER_TS_KEY:   'qm_master_ts',
  CHAPTER_PREFIX:  'qm_ch_',   // + sheetId
  CHAPTER_HASH:    'qm_chh_',  // + sheetId
  POLL_MS:         5 * 60 * 1000,
};

// ── State ────────────────────────────────────────────────
let _masterData    = [];   // array of master rows
let _chapterCache  = {};   // sheetId → questions[]
let _pollTimer     = null;
let _currentSheet  = null; // currently loaded chapter sheet meta

// ── MASTER LOAD ──────────────────────────────────────────
async function loadMaster() {
  const cached = _readLS(DC.MASTER_KEY);
  if (cached) {
    _masterData = cached;
    console.log(`[Master] Cache: ${_masterData.length} entries`);
    _bgFetchMaster();        // silently check for updates
  } else {
    await _bgFetchMaster(true);
  }
  _startMasterPoll();
  return _masterData;
}

async function _bgFetchMaster(blocking = false) {
  const p = new Promise((res, rej) => {
    Papa.parse(_cacheBust(MASTER_CSV_LINK), {
      download: true, header: false, skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          const raw     = data.map(r => r.join('\x1F')).join('\x1E');
          const newHash = _djb2(raw);
          const oldHash = localStorage.getItem(DC.MASTER_HASH_KEY) || '';
          if (newHash === oldHash && _masterData.length) { res(_masterData); return; }

          const rows = _parseMasterRows(data);
          if (!rows.length) throw new Error('Master sheet empty or inaccessible');
          const wasChange = _masterData.length > 0;
          _masterData = rows;
          _writeLS(DC.MASTER_KEY, rows);
          localStorage.setItem(DC.MASTER_HASH_KEY, newHash);
          localStorage.setItem(DC.MASTER_TS_KEY, Date.now());
          if (wasChange) { console.log('[Master] 🔄 Updated'); _onMasterUpdated(); }
          else            { console.log(`[Master] ✅ Loaded ${rows.length} entries`); }
          res(rows);
        } catch (e) { rej(e); }
      },
      error: e => rej(new Error('Master sheet not accessible'))
    });
  });
  if (blocking) return p;
  p.catch(e => console.warn('[Master] bg fetch failed:', e.message));
}

function _parseMasterRows(rows) {
  const out = []; const seen = new Set();
  rows.forEach((r, i) => {
    if (i === 0) { const f = (r[0]||'').toLowerCase(); if (['sheetid','id',''].includes(f)) return; }
    if (r.length < 6) return;
    const sheetId   = (r[0]||'').trim();
    const sheetName = (r[1]||'').trim();
    const cls       = (r[2]||'').trim();
    const subject   = (r[3]||'').trim();
    const chapter   = (r[4]||'').trim();
    const csvLink   = (r[5]||'').trim();
    if (!sheetId || !cls || !subject || !chapter || !csvLink) return;
    if (seen.has(sheetId)) { console.warn('[Master] Dup sheetId:', sheetId); return; }
    seen.add(sheetId);
    out.push({ sheetId, sheetName, class: cls, subject, chapter, csvLink });
  });
  return out;
}

function _onMasterUpdated() {
  try { if (typeof onMasterSheetUpdated === 'function') onMasterSheetUpdated(_masterData); } catch {}
}

// ── MASTER POLL ──────────────────────────────────────────
function _startMasterPoll() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(() => {
    console.log('[Master] ⏱ polling…');
    _bgFetchMaster(false);
  }, DC.POLL_MS);
}

// ── CHAPTER LAZY LOAD ────────────────────────────────────
async function loadChapter(sheetId) {
  const meta = _masterData.find(r => r.sheetId === sheetId);
  if (!meta) throw new Error(`Unknown sheetId: ${sheetId}`);
  _currentSheet = meta;

  // Serve from cache instantly, then bg-sync
  const cached = _readLS(DC.CHAPTER_PREFIX + sheetId);
  if (cached && cached.length) {
    _chapterCache[sheetId] = cached;
    console.log(`[Chapter] Cache: ${cached.length} q for ${sheetId}`);
    _bgFetchChapter(meta, false);
    return cached;
  }
  return await _bgFetchChapter(meta, true);
}

async function _bgFetchChapter(meta, blocking) {
  const { sheetId, csvLink } = meta;
  const p = new Promise((res, rej) => {
    Papa.parse(_cacheBust(csvLink), {
      download: true, header: false, skipEmptyLines: true,
      complete: ({ data }) => {
        try {
          const raw  = data.map(r => r.join('\x1F')).join('\x1E');
          const newH = _djb2(raw), oldH = localStorage.getItem(DC.CHAPTER_HASH + sheetId) || '';
          const current = _chapterCache[sheetId];
          if (newH === oldH && current?.length) { res(current); return; }
          const qs = _parseChapterRows(data);
          if (!qs.length) throw new Error('Chapter sheet has no valid questions');
          const wasChange = !!current?.length;
          _chapterCache[sheetId] = qs;
          _writeLS(DC.CHAPTER_PREFIX + sheetId, qs);
          localStorage.setItem(DC.CHAPTER_HASH + sheetId, newH);
          // Sync bookmarks on update
          try { BookmarkSystem.syncFromSource(qs); } catch {}
          if (wasChange) { console.log(`[Chapter] 🔄 ${sheetId} updated`); _onChapterUpdated(sheetId, qs); }
          res(qs);
        } catch (e) { rej(e); }
      },
      error: e => rej(new Error('Chapter CSV not accessible: ' + e.message))
    });
  });
  if (blocking) return p;
  p.catch(e => console.warn('[Chapter] bg fetch failed:', e.message));
  return _chapterCache[sheetId] || [];
}

function _parseChapterRows(rows) {
  const out = []; const seen = new Set();
  rows.forEach((r, i) => {
    if (i === 0) { const f = (r[0]||'').toLowerCase(); if (['id','q_id',''].includes(f)) return; }
    if (r.length < 9) return;
    const id   = (r[0]||'').trim();
    const ch   = (r[1]||'General').trim();
    const diff = (r[2]||'medium').trim().toLowerCase();
    const q    = (r[3]||'').trim();
    const oA   = (r[4]||'').trim(), oB = (r[5]||'').trim();
    const oC   = (r[6]||'').trim(), oD = (r[7]||'').trim();
    const cor  = (r[8]||'').trim().toLowerCase();
    const exp  = (r[9]||'').trim();
    if (!id || !q || !oA || !oB || !cor) return;
    if (seen.has(id)) { console.warn('[Chapter] Dup ID:', id); return; }
    seen.add(id);
    out.push({
      id, chapter: ch,
      difficulty: ['easy','medium','hard'].includes(diff) ? diff : 'medium',
      question: q, options: { a:oA, b:oB, c:oC, d:oD },
      correct: ['a','b','c','d'].includes(cor) ? cor : 'a', explanation: exp
    });
  });
  return out;
}

function _onChapterUpdated(sheetId, qs) {
  try { if (typeof onChapterSheetUpdated === 'function') onChapterSheetUpdated(sheetId, qs); } catch {}
}

// ── PUBLIC MASTER FILTERS ────────────────────────────────
function getClasses()  { return [...new Set(_masterData.map(r => r.class).filter(Boolean))].sort(); }

function getSubjects(cls) {
  return [...new Set(_masterData.filter(r => r.class === cls).map(r => r.subject))].sort();
}

function getChapters(cls, subject) {
  return _masterData.filter(r => r.class === cls && r.subject === subject).map(r => ({
    chapter: r.chapter, sheetId: r.sheetId, sheetName: r.sheetName
  }));
}

function getMasterEntry(cls, subject, chapter) {
  return _masterData.find(r => r.class === cls && r.subject === subject && r.chapter === chapter) || null;
}

// ── PUBLIC CHAPTER FILTERS ───────────────────────────────
function getCurrentQuestions()           { return _chapterCache[_currentSheet?.sheetId] || []; }
function getQuestionById(id)             { return getCurrentQuestions().find(q => q.id === id) || null; }
function getDifficulties()               { return [...new Set(getCurrentQuestions().map(q => q.difficulty))].sort(); }
function filterByDifficulty(diff)        { const qs = getCurrentQuestions(); return diff === 'all' ? qs : qs.filter(q => q.difficulty === diff); }

// ── HELPERS ──────────────────────────────────────────────
function _cacheBust(url) { return url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now(); }
function _djb2(s) { let h=5381; for(let i=0;i<s.length;i++){h=((h<<5)+h)^s.charCodeAt(i);h=h>>>0;} return h.toString(36); }
function _readLS(k)    { try { const r=localStorage.getItem(k); return r?JSON.parse(r):null; } catch{return null;} }
function _writeLS(k,v) { try { localStorage.setItem(k,JSON.stringify(v)); } catch(e){ console.warn('[Cache] write failed'); } }

function getMasterCacheAge() {
  const ts = localStorage.getItem(DC.MASTER_TS_KEY);
  if (!ts) return 'never';
  const ms = Date.now()-parseInt(ts);
  if (ms<60000) return 'just now';
  if (ms<3600000) return Math.floor(ms/60000)+'m ago';
  return Math.floor(ms/3600000)+'h ago';
}

function clearAllCache() {
  Object.keys(localStorage).filter(k => k.startsWith('qm_')).forEach(k => localStorage.removeItem(k));
}

// ── RETRY ────────────────────────────────────────────────
async function retryMasterLoad() {
  clearAllCache();
  const eEl = document.getElementById('home-error');
  const lEl = document.getElementById('home-loading');
  eEl?.classList.add('hidden'); lEl?.classList.remove('hidden');
  try {
    await loadMaster();
    lEl?.classList.add('hidden');
    document.getElementById('home-form')?.classList.remove('hidden');
    if (typeof initHomeDropdowns === 'function') initHomeDropdowns();
  } catch(err) {
    lEl?.classList.add('hidden'); eEl?.classList.remove('hidden');
    const t = document.getElementById('txt-error'); if(t) t.textContent = err.message;
  }
}
