# FinanceEN 🇹🇼

**Practical Finance English for International Students in Taiwan**

> 420 vocabulary cards · 9 topic sections · Spaced repetition · No login · Works offline

Live demo: [kennkeitarotw.github.io/FinanceMiniProject](https://kennkeitarotw.github.io/FinanceMiniProject/)

---

## What it teaches

Finance English that actually matters for life in Taiwan:

| Section | Cards | Who it's for |
|---------|-------|-------------|
| 💴 Daily Money | 60 | Everyone — EasyCard, invoices, cashback |
| 🏦 Banking in Taiwan | 60 | Opening accounts, transfers, SWIFT |
| 💼 Student & Work Finance | 60 | Salary, NHI, labor insurance, ARC |
| 📊 Business & Finance Class | 60 | Finance courses, P/E ratio, IPO |
| 📈 Investing | 60 | ETFs, compound interest, SRS, crypto |
| 💬 Grammar Patterns | 60 | Real sentences for banks and landlords |
| 🛡️ Insurance | 20 | NHI, premiums, claims |
| 📱 Fintech & Digital Finance | 20 | LINE Pay, neobanks, open banking |
| 🧾 Personal Finance & Tax | 20 | Filing taxes in May, VAT, brackets |

---

## Features

- **Spaced repetition (SM-2)** — Hard / Got it / Easy rates cards and schedules next review
- **Streak system with freeze** — Miss a day, use a 🧊 freeze to protect your streak
- **Difficulty tiers** — Beginner / Intermediate / Advanced filter in study mode
- **Quiz mode** — Stratified sampling ensures every section is covered per session
- **Grammar challenge mode** — See Chinese, recall the English phrase
- **Shareable score card** — Download a PNG to share on LINE
- **Real-life scenarios** — Cards grouped by situation (opening a bank account, tax season)
- **Onboarding flow** — 5-card starter session, level selection
- **Offline-ready** — No backend, no login, progress saved in localStorage

---

## Tech stack

- Vanilla HTML / CSS / JavaScript — zero dependencies
- GitHub Pages — free hosting
- localStorage — all progress stored client-side
- Canvas API — score card generation

---

## Found a mistake?

All Traditional Chinese (正體中文). If you spot a wrong pinyin, translation, or Taiwan-specific detail:

👉 [Submit feedback](https://forms.gle/FinanceENFeedback)

---

## Project structure

```
financeen/
├── index.html        Homepage + section navigator
├── onboard.html      First-time onboarding + level selection
├── study.html        Flashcard session with SRS
├── browse.html       Searchable vocabulary reference
├── quiz.html         10-question quiz with stratified sampling
├── progress.html     Badges, streaks, hard words, section progress
├── 404.html          Friendly error page
├── data.js           420 vocab cards + 80 quiz questions (single clean array)
├── app.js            All application logic (SM-2, streaks, badges, share)
├── styles.css        Dark theme design system
└── og-image.svg      Social sharing preview image
```

---

## Deploy to GitHub Pages

1. Fork or clone this repo
2. Go to Settings → Pages → Source: Deploy from branch → main → / (root)
3. Your app is live at `yourusername.github.io/repo-name/`

No build step. No npm. No config.

