# Customizing (for the site owner)

You can edit any file on GitHub: open it, click the pencil icon, change it, then **Commit changes** (choose a new branch and open a pull request if you want to preview first).

| To change | Edit |
|---|---|
| Colours | `assets/css/tokens.css` (the `:root` block for light, `[data-theme="dark"]` for dark) |
| Study text, questions | `assets/data/<track>/*.json` |
| Track titles, card text | `assets/data/modules.json` |
| Church logo | replace `assets/img/rccg-logo.png` (keep the name) |
| Install and update messages | `assets/js/install.js` and `assets/js/app.js` |
| Maximum note length, bookmark limit | top of the notes section in `assets/js/store.js` |
| Site address | the `DEFAULT_SITE` value at the top of `scripts/build.mjs` |

## Scripture markers
Write `{{ps 33:6|Psalm 33:6}}` in study text to make a tappable verse. Several verses can be joined with commas, e.g. `{{lk 21:8,lk 21:9|Luke 21:8-9}}`. Verses come from `assets/data/kjv-verses.json`.

## Tests
Questions live in each track's JSON file with `question`, `options` and `correctIndex` (0 is the first option).

After you commit, the checks run on their own. If one fails, the message tells you which file and line.

## Scripture text
`assets/data/kjv-verses.json` holds only the verse text itself. Margin notes (such as "Heb. empty out"), Psalm title lines and epistle sign-off lines were removed. If you add a verse, paste the plain verse text only.

## Notes, bookmarks, streaks and class leaders
- Notes, bookmarks and the reading position are saved on the device, and in the learner's account when signed in. See `docs/FIREBASE_LOGIN_SETUP.md` for the rules and how to approve leaders.
- A streak is the number of days in a row someone studied. It stays alive until a whole day is missed.

## PWA icons and screenshots
Icons are in `assets/img/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`). Replace a file with a new one of the same size and name. `screenshot-wide.png` (1280x800) and `screenshot-narrow.png` (390x844) appear in the phone's install window; replace them if the design changes.
