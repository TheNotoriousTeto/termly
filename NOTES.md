# Implementation notes

Decisions and fixes made on top of [SPEC.md](SPEC.md). The web app copies the native SwiftUI version (kept in `~/Developer/UniPlannerSwift`) and includes every change made while building it.

## Carried over from the native app

**GPA**
- Grades are numbers from 0 to 100; decimals are allowed and a comma works as the decimal point.
- GPA is the credit-weighted average of non-binary courses, shown with exactly two decimals. The third decimal rounds up only when it is 8 or 9 (88.293 → 88.29, 78.447 → 78.44, 91.549 → 91.55, 63.278 → 63.28).
- Before anything is graded, the GPA shows "—".
- **Binary** courses get a Pass/Fail choice instead of a number, and never count toward any GPA.
- The course number field only accepts digits and stops at 8; a red hint shows while it's incomplete.
- The Add/Save button stays disabled until the form is valid.
- Semesters are listed newest first (year, then Summer → Spring → Winter).
- Deleting a semester also deletes its courses, and the confirmation says so.
- Editing a course or semester never warns about a "duplicate" of itself.

**Retaken courses** (added after the spec; a course is identified by its number)
- The same course can be added in a later semester with no warning. Adding it twice in the *same* semester is blocked with "Course Already Exists in …".
- Each semester's GPA and credit points always include its own attempt, with the values entered there.
- **Total GPA and Total Credit Points use only the latest attempt** (latest by semester date, not by entry order), including its credit points. If the old attempt had 5 points and the retake has 4, the old semester still counts 5, while the total counts 4. A lower retake grade still replaces the old one.
- Earlier attempts get a small red ↻ marker in the card's bottom-right corner. Tapping it says which semester the course was retaken in. The latest attempt has no marker.
- Backups may contain the same course in different semesters, but not twice in one semester.

**Tasks**
- The days list runs from Today through six days ahead.
- Tasks are sorted by importance, then points (highest first), then title.
- Points are optional (up to 5 digits). If no task that day has points, progress counts finished tasks instead.
- The default "Finish Before" time is 14:00. Times follow the phone's 12/24-hour setting.

**Fixes found while testing the native app**
- The year showed as "2,026" in the duplicate warning. Numbers here are always written without thousands separators, and a test covers it.
- The number keyboard had no way to close. On iPhone, Safari's own ✓ bar above the keyboard covers this, the form sheet resizes to stay above the keyboard, and the field you're typing in is scrolled into view.
- Header tiles are equal height.
- The ⋯ button is gray.

## New in the web version
- **Backup button** (top-left on the GPA and Tasks screens) opens a sheet with **Export Backup** (downloads `termly-backup-YYYY-MM-DD.json`) and **Import Backup**.
- Import checks the file thoroughly (bad terms, credit points, grades, dates, duplicate semesters or course numbers) and explains what's wrong.
- A valid backup **replaces** all data, after a "Replace All Data?" confirmation.
- Data is stored in `localStorage` (key `uniplanner.v1`), and the app asks the browser to keep it permanently. If stored data is ever unreadable, a copy is set aside instead of being overwritten.
- Tapping the active tab returns to its first screen, and each tab remembers where you were.
- Delete confirmations, menus and sheets are rebuilt in HTML to look like iOS. Dropdowns (year, credit points, day) open the iPhone's native wheel picker.

## Platform limits
- **No haptics.** Safari on iPhone doesn't let web pages vibrate.
- **The home-screen app has its own storage**, separate from Safari's. Data entered in a Safari tab doesn't appear in the installed app, and deleting the app from the home screen deletes its data. Export a backup now and then.
- **Open the installed app once while online** after adding it to the home screen. That first launch saves the offline copy; after that it works with no connection.
- **Updates appear on the second launch** after you publish: the app loads from its offline copy and quietly downloads the new version for next time.
- When a sheet is open, the dimmed background doesn't cover the status-bar strip. Covering it would make the clock unreadable in light mode.

## Testing
- `tests/run.sh` runs the logic tests from the terminal using macOS's built-in JavaScriptCore; nothing to install. `tests/index.html` runs the same tests in any browser.
- Checked by hand in a phone-sized browser (light and dark), and in the iOS Simulator: Safari, Add to Home Screen, full-screen launch, the real iOS keyboard, and offline launch with the server stopped.
