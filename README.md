# UniPlanner

A GPA calculator and weekly task manager for university students, built as an installable web app for iPhone. It's plain HTML, CSS and JavaScript with no frameworks, no backend and no accounts. Your data never leaves your phone, and it works offline once installed.

- [SPEC.md](SPEC.md): the original specification
- [NOTES.md](NOTES.md): decisions, fixes and platform limits

## Files

```
index.html             the app page (iOS web-app meta tags, manifest, icons)
styles.css             iOS look, light and dark mode, safe areas
js/logic.js            GPA math, validation, dates, task order, backups (no UI)
js/app.js              screens, navigation, sheets, menus, alerts, storage
sw.js                  service worker for offline use
manifest.webmanifest   install info: name, icons, standalone display
icons/                 icon.svg plus 180/192/512 PNGs
tests/                 logic tests (terminal + browser)
.nojekyll              tells GitHub Pages to serve files as they are
```

## Run it locally

```bash
cd ~/Developer/GPAWebApp
```

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The iOS Simulator's Safari can open that address too.

## Run the tests

```bash
./tests/run.sh
```

Or open http://localhost:8000/tests/ in any browser while the server is running.

## Publish on GitHub Pages

You only do this once. The address will be `https://<your-username>.github.io/GPAWebApp/`.

1. **Create the repository.** On github.com, click **+ → New repository**. Name it `GPAWebApp`, make it **Public** (free GitHub Pages needs a public repo), and leave "Add a README", ".gitignore" and "license" all unticked so the repo starts empty. Click **Create repository**.
2. **Connect this folder to it** (replace `<your-username>`):

   ```bash
   git -C ~/Developer/GPAWebApp remote add origin https://github.com/<your-username>/GPAWebApp.git
   ```

3. **Upload the code.** The first time, Git asks you to sign in to GitHub: a browser window, or a username plus a *personal access token* instead of your password.

   ```bash
   git -C ~/Developer/GPAWebApp push -u origin main
   ```

4. **Turn on Pages.** In the repo, open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to **main**, folder **/ (root)**, then **Save**.
5. **Wait about a minute.** Refresh the Pages settings until it shows "Your site is live at …". Open that address on your computer first to check it loads.

## Install on your iPhone

1. Open the GitHub Pages address in **Safari**.
2. Tap the **⋯** / share menu, then **Share → View More → Add to Home Screen**. Keep **Open as Web App** on, then tap **Add**.
3. **Open UniPlanner from the home screen once while you're online.** That saves the offline copy. After that it works without a connection.

Your data lives only in the installed app. Use the **Backup** button (top-left) to export a copy now and then.

## Publishing updates

1. Make your changes, and run `./tests/run.sh`.
2. In `sw.js`, bump `CACHE` (for example `uniplanner-v1` → `uniplanner-v2`).
3. Commit and push:

   ```bash
   git -C ~/Developer/GPAWebApp commit -am "Describe the change"
   ```

   ```bash
   git -C ~/Developer/GPAWebApp push
   ```

The installed app picks up the new version the second time you open it after the push.
