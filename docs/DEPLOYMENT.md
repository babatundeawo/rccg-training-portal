# Deployment (for the site owner)

Everything here is done on github.com in your browser. Nothing needs to be installed.

## One-time setup
1. Open the repository → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Settings → Code security** and switch on **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** and **Push protection**.

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
