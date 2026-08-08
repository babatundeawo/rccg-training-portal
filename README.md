# RCCG Learning Path

An interactive, mobile-first companion site replacing the printed Believers' Class, Baptismal Class, and Workers-in-Training manuals — built as a static site for GitHub Pages.

## What's here

```
index.html                     Homepage — three module cards
assets/
  css/tokens.css                Design tokens (colors, type scale, spacing)
  css/base.css                  All shared component styles
  js/app.js                     Nav drawer, progress tracking, scripture reveal, card reveal
  js/quiz.js                    Test engine: randomized papers, scoring, WhatsApp share
  img/rccg-logo.png             Placeholder logo — REPLACE with the real one (see below)
  data/kjv-verses.json          ~1,730 KJV verses referenced across the three manuals
  data/<module>/index.json      Study list for a module
  data/<module>/study-N.json    Structured content for one study
  data/<module>/quiz-bank.json  Question bank for that module's test

believers-manual/  index.html (study list) + reader.html (study reader)
baptismal-manual/  same pattern
workers-in-training/  same pattern

test-believers/    Candidate registration + 30-question randomized quiz + WhatsApp share
test-baptismal/    same pattern
test-workers/      same pattern (includes an extra Unit/Department field)
```

Each module's `reader.html` is a single reusable template — it reads `?study=N` from the
URL and renders whichever `study-N.json` file matches. To edit a study's wording, edit its
JSON file directly; you never need to touch the HTML/JS for content changes.

## 1. Replace the logo

The real RCCG logo couldn't be auto-downloaded (network sandboxing during the build blocked
image CDNs). Grab it here — one click, official, CC BY-SA 4.0:

https://commons.wikimedia.org/wiki/File:Rccg_logo.png

Save it as `assets/img/rccg-logo.png`, replacing the placeholder monogram that's there now.

## 2. Deploy to GitHub Pages

1. Create a new repo (or use an existing one) and push this folder's contents to it.
2. In the repo settings → Pages, set the source to the branch/folder you pushed (e.g. `main`, root).
3. GitHub will give you a URL like `https://<username>.github.io/<repo>/` — that's the site.

No build step, no dependencies to install — it's plain HTML/CSS/JS.

## 3. Scripture reveal — how it works

Any scripture reference is marked in a study's JSON as:
```
{{key1,key2|Display Label}}
```
`key1`/`key2` are lookup keys into `kjv-verses.json` (e.g. `"jo 3:16"`), and `Display Label`
is what the reader sees before tapping. If a key doesn't exist in the verse database, the
tag quietly falls back to plain, non-tappable text — it will never show the wrong verse.

If you add new content with new scripture references by hand, follow the same `{{...|...}}`
pattern, or run the reference parser again (see "Regenerating content" below).

## 4. Test / exam environment

Each `test-*/index.html` is self-contained:
- Candidate fills in name, date of birth, phone (Workers-in-Training also asks for
  unit/department).
- 30 questions are drawn at random from that module's `quiz-bank.json`, with answer options
  also shuffled, so each candidate's paper differs.
- On submit, a WhatsApp share button opens with the result pre-formatted — the invigilator
  or candidate picks the RCCG group chat and sends. (Browsers can't silently auto-post to
  WhatsApp groups — this is the standard, reliable way to get a pre-filled message there in
  one tap.)

**To add more questions:** open the relevant `quiz-bank.json` and add objects in the same
shape: `{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0 }`. The engine
automatically includes new questions in the random draw — no code changes needed.

**Current bank sizes:** Believers' Class 24, Baptismal Class 35, Workers-in-Training 32.
All were written directly from the verified manual content. Feel free to expand them —
more questions in the bank means less repetition across candidates on test day.

## 5. Regenerating content from the source PDFs

If the source manuals are ever updated, the conversion pipeline that built this site's
content lives in three scripts (not included in this folder, but easy to reconstruct if
needed): a scripture-reference parser, a content-to-JSON converter, and a per-manual
extractor that knows each manual's section boundaries. Ask for these if you need to
regenerate content from a revised PDF.

## 6. Progress tracking

Progress (which studies a candidate/student has completed) is stored in the browser's
`localStorage`, per device. It's not synced across devices — this matches the "local-only,
laptop-based" deployment style used elsewhere in this kind of project.
