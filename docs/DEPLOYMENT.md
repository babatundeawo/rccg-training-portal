# Deployment (for the site owner)

Everything here is done on github.com in your browser. Nothing needs to be installed.

## One-time setup
1. Open the repository → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Settings → Code security** and switch on **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** and **Push protection**.

## Updating from GitHub Desktop
1. **Current Branch → New Branch**, name it (for example `update`), click **Create Branch**.
2. Extract the ZIP over the repository folder (choose **Replace the files** if Windows asks). Turn on **View → Show → Hidden items** in File Explorer first, so the `.github` folder is included.
3. Back in GitHub Desktop, check the changed files list, type a summary, click **Commit to update**, then **Publish branch**, then **Create Pull Request**.
4. Review on github.com as below. For a new empty repository you may push straight to `main`.

## Reviewing and merging the redesign
1. Open the **Pull requests** tab and click the one titled *Premium redesign*.
2. Click the **Checks** tab. When everything is green, scroll to **Artifacts** and download **site-preview** (a zip of the finished site). Unzip it and open `index.html` through any simple viewer, or just review the *Files changed* tab.
3. Happy? Click **Merge pull request → Confirm merge**. The live site updates in about two minutes.

## Checking a deployment
Open the **Actions** tab. A green tick on *Deploy to GitHub Pages* means the site is live. A red cross means nothing was published and the old site is still up; click the run to see which step failed.

## Rolling back
Open **Pull requests → Closed**, open the merged pull request, and click **Revert**. Merge the revert pull request that appears.

## Custom domain
**Settings → Pages → Custom domain**, enter the domain, follow GitHub's DNS instructions, and tick **Enforce HTTPS**. The site's addresses adapt automatically.

## Updates
Dependabot opens pull requests for tool and action updates. Merge them when the checks are green.

## How visitors receive an update
The site checks for a new version each time it is opened. When one is ready, a message says **A new version of the Learning Path is ready** with a **Refresh** button. Nobody is interrupted mid-study.

## Honest limits of GitHub Pages
- GitHub Pages cannot send security headers or real 301 redirects. The site uses a Content Security Policy `<meta>` tag instead.
- There is no automatic preview of a pull request. Download the **site-preview** artifact from the Checks tab, or merge and revert if needed.
