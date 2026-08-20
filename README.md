# RCCG Learning Path

An interactive, mobile-first companion site replacing the printed Believers' Class, Baptismal Class, and Workers-in-Training manuals - built as a static site for GitHub Pages.

**Live:** https://babatundeawo.github.io/rccg-training-portal/

**Tech stack:** vanilla HTML/CSS/JavaScript (no build step, no framework), JSON as the content format, Firebase Authentication + Cloud Firestore for optional cross-device progress sync.

## What's here

```
index.html                     Homepage - three module cards
assets/
  css/tokens.css                Design tokens (colors, type scale, spacing)
  css/base.css                  All shared component styles
  js/app.js                     Nav drawer, progress tracking, scripture reveal, card reveal
  js/quiz.js                    Test engine: randomized papers, scoring, WhatsApp share
  js/auth.js, firebase-config.js, account-ui.js   Login and cross-device progress sync
  img/rccg-logo.png             Placeholder logo - REPLACE with the real one (see below)
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

Each module's `reader.html` is a single reusable template - it reads `?study=N` from the
URL and renders whichever `study-N.json` file matches. To edit a study's wording, edit its
JSON file directly; you never need to touch the HTML/JS for content changes.

## 1. Deploy to GitHub Pages

1. Create a new repo (or use an existing one) and push this folder's contents to it.
2. In the repo settings → Pages, set the source to the branch/folder you pushed (e.g. `main`, root).
3. GitHub will give you a URL like `https://<username>.github.io/<repo>/` - that's the site.

No build step, no dependencies to install - it's plain HTML/CSS/JS.

## 2. Scripture reveal - how it works

Any scripture reference is marked in a study's JSON as:
```
{{key1,key2|Display Label}}
```
`key1`/`key2` are lookup keys into `kjv-verses.json` (e.g. `"jo 3:16"`), and `Display Label`
is what the reader sees before tapping. If a key doesn't exist in the verse database, the
tag quietly falls back to plain, non-tappable text - it will never show the wrong verse.

If you add new content with new scripture references by hand, follow the same `{{...|...}}`
pattern, or run the reference parser again (see "Regenerating content" below).

## 3. Test / exam environment

Each `test-*/index.html` is self-contained:
- Candidate fills in name, date of birth, phone (Workers-in-Training also asks for
 unit/department).
- 30 questions are drawn at random from that module's `quiz-bank.json`, with answer options
 also shuffled, so each candidate's paper differs.
- A **15-minute countdown timer** starts the moment the test begins, shown at the top of the
 quiz. It turns red in the last minute. If time runs out before the candidate finishes, the
 test **auto-submits** with whatever was answered so far (unanswered questions count as
 incorrect), and the result screen notes it was auto-submitted.
- On submit, a WhatsApp share button opens with the result pre-formatted - the invigilator
 or candidate picks the RCCG group chat and sends. (Browsers can't silently auto-post to
 WhatsApp groups - this is the standard, reliable way to get a pre-filled message there in
 one tap.)

**To add more questions:** open the relevant `quiz-bank.json` and add objects in the same
shape: `{ "question": "...", "options": ["a","b","c","d"], "correctIndex": 0 }`. The engine
automatically includes new questions in the random draw - no code changes needed.

**Current bank sizes:** Believers' Class 24, Baptismal Class 35, Workers-in-Training 32.
All were written directly from the verified manual content. Feel free to expand them - 
more questions in the bank means less repetition across candidates on test day.

## 4. Regenerating content from the source PDFs

If the source manuals are ever updated, the conversion pipeline that built this site's
content lives in three scripts (not included in this folder, but easy to reconstruct if
needed): a scripture-reference parser, a content-to-JSON converter, and a per-manual
extractor that knows each manual's section boundaries. Ask for these if you need to
regenerate content from a revised PDF.

## 5. Login and cross-device progress

Progress is stored in the browser's `localStorage` by default (per device, no
account needed). Signing in adds cross-device sync on top of that, backed by
Firebase:

- `assets/js/firebase-config.js` holds the project's Firebase config (already
 filled in for the `rccg-training-portal` project).
- `assets/js/auth.js` handles sign-up, sign-in (email/password and Google),
 and sync: on sign-in, it merges whatever's in `localStorage` with the
 person's saved progress in Firestore (a union of completed studies, so
 nothing done as a guest is lost), then keeps both in sync from then on.
- `assets/js/account-ui.js` renders the "Sign in" button in the nav and the
 sign-in/sign-up modal, on every page.
- `FIRESTORE_RULES.txt` (repo root) contains the security rules to paste into
 Firebase Console -> Firestore Database -> Rules. This is what actually
 restricts each person to only reading/writing their own progress document -
 the config file's keys alone don't provide security, the rules do.

If a person never signs in, everything works exactly as before - local only,
no account required.
