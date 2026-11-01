# Sign-in, progress sync and class leaders: Firebase setup (for the site owner)

Firebase is the free (Spark plan) service that stores sign-ins and saved progress. Everything below is done by clicking in the Firebase website and the GitHub website. You never run a command. **Never add a billing card**: this site is built to stay on the free plan.

**What is stored, and who can see it**

| Data | Where | Who can read it |
|---|---|---|
| Study progress, days studied, name, email | `progress` | The learner. Class leaders **only if the learner turned on "Share my progress with my class leaders"** |
| Notes, bookmarks, reading position | `private` | Only the learner. Never leaders, never you |
| Who is a class leader | `leaders` | Only that person (to check their own status). Only you can add them, in the console |

## A. First-time setup (skip steps you already did)
1. Go to https://console.firebase.google.com and open your project **rccg-training-portal**. You should see the project dashboard.
2. Left menu **Build → Authentication → Sign-in method**. Enable **Email/Password** and **Google**. Each should show *Enabled*.
3. **Authentication → Settings → Authorized domains**. Make sure `babatundeawo.github.io` is in the list (add your own domain too if you have one). If it is missing, sign-in shows "not enabled for this web address".
4. **Build → Firestore Database**. If you see *Create database*, click it, choose **Production mode** and any nearby location, then **Enable**.

## B. Publish the new security rules (required for this update)
1. **Firestore Database → Rules** tab.
2. Select everything in the box and delete it.
3. Open `FIRESTORE_RULES.txt` in the repository (on github.com, click the file, then the **Copy raw file** button). Paste it into the box.
4. Click **Publish**. You should see "Rules published". Until you do this, notes and bookmarks will not sync (they still work on the phone), and you will see a "couldn't sync" message after signing in.

## C. Approve a class leader
Do this for each person who should see class progress. They must first create an account on the site and **verify their email** (Google sign-in is already verified).
1. Ask the leader to sign in on the site once.
2. Firebase: **Authentication → Users**. Find their email and copy the value in the **User UID** column.
3. **Firestore Database → Data → Start collection** (first time) or **+ Start collection**. Collection ID: `leaders`. Click **Next**.
4. **Document ID**: paste the leader's UID. Add one field: name `active`, type **boolean**, value **true**. Click **Save**.
5. The leader opens the site, signs in, and the account window now shows **Class leader view**. To remove a leader, delete their document or set `active` to false.

Learners appear on the leader page only after they switch on **Share my progress with my class leaders** in their account window. Leaders see name, email, study counts, streak and last study day. Please tell your learners this before they switch it on.

## D. Keep the settings out of the code (recommended)
The web settings are not passwords (the rules protect the data), but it is cleaner to keep them in GitHub.
1. Firebase: gear icon → **Project settings → General → Your apps** → copy the web app's config values.
2. GitHub: your repository → **Settings → Secrets and variables → Actions → New repository secret**. Add one secret per line (name on the left, value from Firebase):
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`.
3. If you skip this, the values already in `assets/js/firebase-config.js` are used and the site still works.
4. Google Cloud console → **APIs & Services → Credentials** → open the browser key → **Website restrictions** → add `https://babatundeawo.github.io/*`.
5. Recommended: **Firebase → App Check** and register the web app with reCAPTCHA, to slow down abuse. Turn on enforcement only after you have tested sign-in.

## E. Test it
1. Open the live site on your phone. Tap **Sign in → Create account**, then verify the email.
2. Study one point, bookmark it, write a note. Sign in on another device: the bookmark and note should appear on **My notes**.
3. In the account window switch on **Share my progress…**. Sign in as an approved leader: the learner appears on **Class leaders**.
4. Switch it off again: the learner disappears from the leader list after a refresh.

## Free-plan limits you could realistically reach
The Spark plan allows 50,000 document reads and 20,000 writes per day in Firestore, and 1 GiB stored. Each sign-in reads 2 documents; each study session writes 1 or 2. The leader page reads one document per sharing learner each time it opens. A class of a few hundred learners is comfortably inside the limits. If a limit is reached, new saves pause until the next day. Study, notes and bookmarks still work on the device, and nothing is lost.

## If something fails
| Message or symptom | Fix |
|---|---|
| "Sign-in isn't enabled for this web address" (`auth/unauthorized-domain`) | Step A3 |
| "Your progress couldn't be saved to your account" (`permission-denied`) | Step B: rules not published, or copied incompletely |
| Leader page says "not approved" | Step C: wrong UID, `active` is not boolean true, or the leader has not verified their email |
| Leader page is empty | No learner has switched on sharing yet |
| "API key not valid" (`auth/invalid-api-key`) | Step D values are wrong, or the website restriction is missing your domain |
| Google pop-up blocked | Allow pop-ups for the site; the site falls back to a redirect |
| "Quota exceeded" | Free daily limit reached. Wait until tomorrow |

## Words explained
- **Firestore**: the database where saved data lives.
- **Rules**: instructions that decide who can read or write each piece of data.
- **UID**: a long code that identifies one signed-in person.
- **Secret**: a value stored privately in GitHub and added to the site when it is built.

## What never to share or commit
Never paste a **service account** file, a **private key** or an **admin** password into GitHub, a chat or an issue. If one leaks, delete it in Google Cloud → IAM → Service accounts → Keys immediately.
