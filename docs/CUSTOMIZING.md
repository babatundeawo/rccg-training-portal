# Customizing (for the site owner)

You can edit any file on GitHub: open it, click the pencil icon, change it, then **Commit changes** (choose a new branch and open a pull request if you want to preview first).

| To change | Edit |
|---|---|
| Colours | `assets/css/tokens.css` (the `:root` block for light, `[data-theme="dark"]` for dark) |
| Study text, questions | `assets/data/<track>/*.json` |
| Track titles, card text | `assets/data/modules.json` |
| Church logo | replace `assets/img/rccg-logo.png` (keep the name) |
| Site address | the `DEFAULT_SITE` value at the top of `scripts/build.mjs` |

## Scripture markers
Write `{{ps 33:6|Psalm 33:6}}` in study text to make a tappable verse. Several verses can be joined with commas, e.g. `{{lk 21:8,lk 21:9|Luke 21:8-9}}`. Verses come from `assets/data/kjv-verses.json`.

## Tests
Questions live in each track's JSON file with `question`, `options` and `correctIndex` (0 is the first option).

After you commit, the checks run on their own. If one fails, the message tells you which file and line.
