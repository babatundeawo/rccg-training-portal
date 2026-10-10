# Sign-in and progress sync: Firebase setup (for the site owner)

Sign-in is optional for visitors. Setting it up is done in the Firebase website; no installs needed.

1. Go to https://console.firebase.google.com and open your project (the one this site already uses).
2. **Build → Authentication → Sign-in method**: enable **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains**: make sure `babatundeawo.github.io` (and your custom domain, if any) is listed.
4. **Build → Firestore Database**: create the database if none exists (production mode).
5. Open the **Rules** tab, delete what is there, paste the entire contents of `FIRESTORE_RULES.txt` from this repository, and click **Publish**.
6. **Project settings → General → Your apps**: copy the web app's config values.
7. *Optional, recommended:* keep them out of the code. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**, and add `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`. If you skip this, the values already committed in `assets/js/firebase-config.js` are used.
8. In Google Cloud console → **APIs & Services → Credentials**, open the browser API key and under **Website restrictions** add `https://babatundeawo.github.io/*`.
9. *Recommended later:* turn on **App Check** (Firebase console → App Check) with reCAPTCHA to block abuse.
10. Re-run the deployment: **Actions → Deploy to GitHub Pages → Run workflow**.
11. Visit the site, sign up with a test email, complete a study, sign in on a second device, and confirm your progress follows you.

## If something fails
| Message | Fix |
|---|---|
| "This domain is not authorized" | Step 3 |
| "Missing or insufficient permissions" | Step 5: rules not published |
| Google pop-up closes immediately | Allow pop-ups, or try again (the site falls back to a redirect) |
| "API key not valid" | Step 6/7 values are wrong, or step 8 restriction is missing your domain |

## What NOT to share
Never paste a **service account** file, a **private key**, or an **admin** password into GitHub, a chat or an issue. The web config values above are not secret, but admin credentials are. If one leaks, delete it in Google Cloud → IAM → Service accounts → Keys immediately.
