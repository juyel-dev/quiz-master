# ⚡ Quiz Master

A feature-rich, progressive web app for interactive quizzes with Bengali and English support.

---

## 🌟 Features

**Core**
- Fetches questions from Google Sheets CSV via PapaParse
- LocalStorage caching (1-hour TTL) for offline/fast load
- Practice Mode & Exam Mode (5-min countdown)
- Chapter and difficulty filtering (Easy / Medium / Hard)

**Quiz Engine**
- 5 random questions per session with shuffled options
- Keyboard shortcuts: `1-4` or `A-D` to answer, `Enter` / `→` to advance
- Progress bar, live score display
- 50:50 lifeline (one-time use)
- Explanation panel after each answer

**Advanced**
- 🔊 Web Audio API sound effects (no external files needed)
- ➖ Negative marking (-0.25 for Hard, toggleable)
- 🔖 Bookmark system — save questions, quiz from bookmarks
- 🧠 Adaptive engine — weights weak chapters in question selection
- 📊 Analytics — chapter-wise & difficulty-wise accuracy
- 🏆 Badge system (5 badge types), daily streak, local leaderboard
- 💾 Auto-saves progress — resumes after page refresh
- 🛡️ Anti-cheat — tab-switch warnings (3 strikes = auto-submit)
- 📄 PDF export via jsPDF
- 📤 Share result (native share API or clipboard fallback)

**PWA**
- Installable on mobile & desktop
- Offline support via Service Worker cache

---

## 📁 Project Structure

```
quiz-master/
├── index.html          # App shell, all 3 screens
├── styles.css          # Glassmorphism dark UI
├── app.js              # Main logic, state management
├── data.js             # CSV fetch, PapaParse, caching
├── utils.js            # Timer, audio, confetti, PDF, badges...
├── pwa/
│   ├── manifest.json
│   └── service-worker.js
└── assets/
    └── icons/          # Add icon-192.png & icon-512.png
```

---

## 🚀 Setup

**1. Clone**
```bash
git clone https://github.com/yourusername/quiz-master.git
cd quiz-master
```

**2. Serve locally** (required for PWA/SW)
```bash
# Python
python -m http.server 8080

# Node
npx serve .

# VS Code: Live Server extension
```

**3. Open** `http://localhost:8080`

---

## 📊 Google Sheets Format

Your sheet at:
```
https://docs.google.com/spreadsheets/d/1dJtuu61H_i1q_xL4--b4xsFtCVxzIi301bIDIAz1qdw
```

Must use this column layout:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| chapter | difficulty | question | option A | option B | option C | option D | correct (a/b/c/d) | explanation |

- **difficulty**: `easy`, `medium`, or `hard` (case-insensitive)
- **correct**: lowercase letter `a`, `b`, `c`, or `d`
- Share the sheet publicly (anyone with link can view)

---

## 🌐 Deployment

**GitHub Pages**
1. Push to `main` branch
2. Go to Settings → Pages → Source: `main` / `root`
3. Your app: `https://yourusername.github.io/quiz-master/`

**Netlify**
1. Drag & drop the `quiz-master/` folder into Netlify dashboard
2. Or connect GitHub repo for auto-deploy

**Vercel**
```bash
npx vercel
```

---

## 🎨 Customization

| What | Where |
|------|-------|
| Quiz size (default 5) | `QUIZ_SIZE` in `app.js` |
| Exam timer (default 5 min) | `EXAM_DURATION` in `app.js` |
| Cache duration (1 hour) | `CACHE_TTL` in `data.js` |
| Accent colors | CSS variables in `styles.css` |

---

## 📱 PWA Icons

Add your icons to `assets/icons/`:
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Generate from any PNG at [realfavicongenerator.net](https://realfavicongenerator.net).

---

## 🛠️ Tech Stack

- **Vanilla JavaScript** (ES6+, no frameworks)
- **Tailwind CSS** (CDN)
- **PapaParse** — CSV parsing
- **jsPDF** — PDF export
- **Lucide Icons** — icon set
- **Web Audio API** — sound effects
- **Canvas API** — confetti
- **Service Worker** — offline PWA

---

ধন্যবাদ! Thanks for playing Quiz Master ❤️
