# Termly

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

**Live app:** https://thenotoriousteto.github.io/termly/

## Install on your iPhone

1. Open **https://thenotoriousteto.github.io/termly/** in **Safari** (not Chrome or another browser).
2. Tap the **⋯** button, then **Share → View More → Add to Home Screen**. Keep **Open as Web App** on, then tap **Add**.
3. **Open Termly from the home screen once while you're online**, and leave it open for about 10 seconds. That saves the offline copy; after that it works without a connection.

Your data lives only in the installed app. Use the **Backup** button (top-left) to export a copy now and then.

## Moving your data from an older install

If you already have Termly (or UniPlanner) on your home screen from an earlier address, your grades and tasks are stored inside that copy only. Move them before deleting it:

1. **In the old app:** tap **Backup** (top-left) → **Export Backup**, and save the file to **Files** (for example iCloud Drive).
2. **Install the new one** using the steps above, and open it once.
3. **In the new app:** tap **Backup** → **Import Backup**, pick the file you saved, then tap **Replace**.
4. Check that your semesters, courses and tasks are there, then delete the old icon: press and hold it → **Remove App** → **Delete from Home Screen**.

## Run it locally

From the project folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. The iOS Simulator's Safari can open that address too.

## Run the tests

```bash
./tests/run.sh
```

Or open http://localhost:8000/tests/ in any browser while the server is running.

## Publishing updates

The site is published with GitHub Pages from the `main` branch, folder `/ (root)`, so every push to `main` updates it within a minute or two.

1. Make your changes, and run `./tests/run.sh`.
2. In `sw.js`, bump `CACHE` (for example `uniplanner-v5` → `uniplanner-v6`) so installed copies fetch the new files.
3. Commit and push:

   ```bash
   git commit -am "Describe the change"
   ```

   ```bash
   git push
   ```

The installed app picks up the new version the second time you open it after the push.
