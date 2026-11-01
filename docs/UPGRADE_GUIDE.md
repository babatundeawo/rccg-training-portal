# Upgrade guide: installing this update (for the site owner)

You do not need a terminal. Everything is clicking in **GitHub Desktop**, **File Explorer**, **github.com** and the **Firebase Console**. Take your time; nothing here can break the live site until you click **Merge**.

## What is new
Study streaks and a weekly view, resume where you stopped, bookmarks and private notes, an optional class leader view, an install prompt, a safe "new version ready" message, saving a track for offline use, a branded offline page, print-friendly studies, and cleaner scripture text (margin notes removed).

## A. GitHub website
1. Open https://github.com/babatundeawo/rccg-training-portal. You should see the file list.
2. The repository must be **Public** for free GitHub Pages. Check for the word *Public* next to the name. If it says *Private*, go to **Settings → General → Danger Zone → Change visibility → Make public**.

## B. GitHub Desktop and File Explorer
1. Open **GitHub Desktop**. Top left, **Current Repository** should say `rccg-training-portal`. If it is not listed: **File → Clone repository → URL** and paste the address from step A1.
2. Click **Fetch origin** (top bar) so you have the newest copy.
3. Click **Current Branch → New Branch**. Name it `upgrade-notes-streaks`. Click **Create Branch**. The top bar now shows that name.
4. **Show hidden folders.** Click **Repository → Show in Explorer**. In File Explorer click **View → Show → Hidden items** (Windows 11) or tick **Hidden items** on the View tab (Windows 10). A folder named `.github` should appear (slightly faded).
5. Extract the ZIP **into that folder**: right-click the ZIP → **Extract All…** → in the box replace the path with the repository folder path (shown in Explorer's address bar) → **Extract**. If Windows asks about existing files, choose **Replace the files in the destination**.
   - Check: the repository folder contains `index.html`, `offline.html`, `my-notes`, `leaders`, `.github`.
6. Back in GitHub Desktop, the left panel lists the changed files (roughly 60). Scan it. Do not worry about the number.
7. Bottom left, in **Summary**, type exactly:
   `Add notes, bookmarks, streaks, class leader view, install and offline upgrades`
8. Click **Commit to upgrade-notes-streaks**.
9. Click **Publish branch**, then **Create Pull Request** (it opens github.com).

## C. GitHub website again
1. On the pull request page click **Create pull request**. Wait: a yellow circle, then a green tick under **Checks** (about 2 minutes). A red cross means a check failed: click **Details** and send me the message.
2. Open **Settings → Pages → Build and deployment → Source** and make sure it says **GitHub Actions**.
3. **Settings → Code security**: switch on **Dependabot alerts**, **Secret scanning** and **Push protection**.
4. Optional preview: on the pull request open **Checks**, scroll to **Artifacts**, download **site-preview**.
5. Happy? Click **Merge pull request → Confirm merge**.
6. Open the **Actions** tab. The newest run named **Deploy to GitHub Pages** shows a yellow circle, then a **green tick**. Click the run, then the link under **deploy** to open the live site.
7. **Roll back** if needed: **Pull requests → Closed**, open the merged request, click **Revert**, then merge the new pull request that appears.

## D. Firebase Console (needed for notes sync and class leaders)
Follow `docs/FIREBASE_LOGIN_SETUP.md`, sections **B** (publish rules, required) and **C** (approve leaders). Do B before testing sign-in.

## E. Test on a phone
1. **Android Chrome**: open the site, use it on two different days. A banner **Keep it on your phone** appears; tap **Install**. Or menu (three dots) → **Install app**.
2. **iPhone Safari**: open the site → **Share** button → **Add to Home Screen** → **Add**. (The site also shows these steps from the footer link **Install the app**.)
3. **Offline**: open a track, tap **Save for offline**, wait for "Saved", turn on airplane mode, reopen the app and a study.
4. **Update**: after your next deployment, open the installed app twice; a message **A new version… Refresh** appears.

## F. Verification checklist
- Home page loads; after one study, **Your journey** shows a 1-day streak.
- Close the browser mid-study, reopen: the study continues at the same point.
- Bookmark icon on a point; **My notes** page lists it; a note you type is still there after a refresh.
- Sign in; on another device bookmarks and notes appear.
- Scripture pop-ups (for example Matthew 28:19) show the verse only, with no "or," or "Heb." notes.
- Dark theme works; **Ctrl+K** search works.

## G. Troubleshooting
1. **Blank page or missing styles**: Pages Source is not **GitHub Actions** (C2).
2. **404 on a study**: the old address was opened offline; reconnect and reload.
3. **`.github` folder missing after extract**: hidden items were off (B4). Redo B4 and B5.
4. **Actions shows a red cross**: click the run, then the red step, and copy the message.
5. **Old version still showing**: close and reopen the app, or tap **Refresh** on the update message.
6. **"Sign-in isn't enabled for this web address"**: Firebase → Authentication → Settings → Authorized domains, add `babatundeawo.github.io`.
7. **"Couldn't be saved to your account"**: publish the rules (D, section B).
8. **Leader page says not approved**: wrong UID or `active` not boolean true; the leader must also verify their email.
9. **Install banner never shows**: it appears from the second visit on a different day, never inside the study screen, and not once installed or dismissed (it returns after 30 days).
10. **Quota exceeded**: the free daily Firebase limit; wait until tomorrow. Device data is safe.

## H. Everyday updates in under five steps
1. GitHub Desktop → **Fetch origin**.
2. Edit the file (for example `assets/data/believers-manual/study-1.json`) in Notepad.
3. GitHub Desktop: type a summary → **Commit to main** → **Push origin**.
4. **Actions** tab: wait for the green tick. Done.
