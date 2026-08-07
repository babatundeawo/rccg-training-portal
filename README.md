# RCCG Interactive Training Portal

Official interactive learning website for the **Redeemed Christian Church of God (RCCG)** — converting three printed training manuals into a guided, immersive digital experience.

## 📚 Three Tracks

| Track | Studies | Exam |
|-------|---------|------|
| Believers' Manual | 8 studies | 35-question bank, 30 selected |
| Baptismal Manual | 15 studies | 35-question bank, 30 selected |
| Workers-in-Training | 16 sections | 35-question bank, 30 selected |

## ✨ Features

- **Card-by-card progressive reveal** — one idea at a time, never a wall of text
- **"You Are Here" navigation map** — slide-out drawer showing full study journey with checkmarks
- **Scripture reveal system** — tap any Bible reference to see the full NKJV verse inline (offline-first, cloud fallback)
- **Check-Your-Understanding prompts** — interactive questions before completing each study
- **LocalStorage progress tracking** — remembers your completion across sessions
- **Memory verse highlights** — gold-themed callout cards for key scriptures
- **Accordion panels** and **callout boxes** for structured content presentation

## 📝 Certification Exams

Each track has a dedicated exam environment:
- Candidate registration (Name, DOB, Phone; Workers adds Department)
- **30 questions randomized** from a 35+ question bank — no two candidates see the same paper
- **Shuffled answer options** per candidate
- **30-minute countdown timer** with pulse warning at 60 seconds
- **Score calculation** with 70% pass threshold
- **WhatsApp result sharing** — pre-fills a formatted result card for sending to the RCCG invigilation group

## 🏗️ Project Structure

```
rccg-training-portal/
├── index.html                        # Portal home with track selector
├── assets/
│   ├── css/
│   │   └── styles.css               # Unified design system
│   ├── js/
│   │   ├── app.js                   # Core engine (study viewer, quiz, progress)
│   │   ├── scriptures.js            # Offline NKJV scripture database
│   │   ├── quizzes.js               # Exam question banks (all 3 tracks)
│   │   ├── content-believers.js     # Believers' Manual content
│   │   ├── content-baptismal.js     # Baptismal Manual content
│   │   └── content-workers.js       # Workers-in-Training content
│   └── images/
│       └── rccg_logo.png            # Locally hosted official RCCG logo
├── believers-manual/
│   ├── index.html                   # Track dashboard
│   ├── study.html                   # Interactive study viewer
│   └── quiz.html                    # Certification exam
├── baptismal-manual/
│   ├── index.html
│   ├── study.html
│   └── quiz.html
└── workers-in-training/
    ├── index.html
    ├── study.html
    └── quiz.html
```

## 🚀 Deployment to GitHub Pages

1. Push this folder to a GitHub repository (e.g. `rccg-training-portal`)
2. Go to **Settings → Pages** in your GitHub repo
3. Set source to **main branch / root folder**
4. Your site will be live at: `https://yourusername.github.io/rccg-training-portal/`

## 🛠️ Tech Stack

- **HTML5** (semantic, SEO-optimized)
- **Vanilla CSS** (mobile-first, glassmorphism, Google Fonts)
- **Vanilla JavaScript** (ES6, no frameworks, no build step required)
- **LocalStorage** (offline progress persistence)
- **Bible API** (`bible-api.com`) as cloud fallback for scripture verses

## 📖 Design System

- **Fonts**: Inter (UI), Playfair Display (headings & scripture)
- **Colors**: Deep Royal Blue `#0a2540` (primary), Sky Blue `#0070f3` (Believers accent), Steel Blue `#0284c7` (Baptismal accent), Warm Gold `#d97706` (Workers accent)
- **Components**: Card decks, progress bars, drawers, modals, accordions, memory verse boxes, CYU prompts

---
*Developed for RCCG training ministry use. RCCG logo is used under Creative Commons (Wikimedia Commons).*
