# Running the Ionic App

## Start the development server

Open PowerShell and run:

```powershell
Set-Location "C:\IOT_2\Midterm_Project\dailytaskmanager"
npm install
ionic serve
```

Then open `http://localhost:8100` in a browser.

## What was updated

- Dependencies were installed with `npm install` because the local dependency tree was incomplete.
- `ionic.config.json` was already present, so `ionic init` was not needed.
- Firebase was already declared in `package.json` and installed as `firebase@12.19.0`.
- Firebase Realtime Database is configured through the local `.env` file using the `VITE_FIREBASE_*` variables read by `src/firebase.ts`.
- Add the Realtime Database URL to `.env` as `VITE_FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.<region>.firebasedatabase.app`.
- The command must be run inside `dailytaskmanager`, where `ionic.config.json` and `package.json` are located.

## Common issue

Running `ionic serve` from `C:\IOT_2\Midterm_Project` produces `ionic serve can only be run in an Ionic project directory`. Change into the `dailytaskmanager` folder first.

The Vite `__dirname` message is only a warning and does not prevent the app from running.

## Enable Realtime Database

In the Firebase Console, open the project, choose **Build > Realtime Database**, click **Create Database**, select a location, and create the database. Copy its URL into `VITE_FIREBASE_DATABASE_URL` in `.env`, then restart `ionic serve`.

The app now stores tasks under the Realtime Database path `/tasks`. Firestore is no longer used by the task service or task list.

Notes are stored under `/notes`. Authentication is not required. Publish `database.rules.json` as the Realtime Database rules. The Notes page supports list/card/grid views, search, sorting, favorites, pinning, trash, restore, permanent deletion, and multi-selection.

The Daily Task Manager now searches task title, description, priority, and status. Use the Sort control to order tasks by due date, title, priority, or status. Both tasks and notes use the configured Realtime Database.

Tasks now support a Trash view. Deleting a task sets `isDeleted` instead of removing it immediately; use **Trash > Restore** or **Permanently delete** as needed. Existing tasks without `isDeleted` remain visible in All Tasks.

## Building the Android APK

Because `.env` is intentionally excluded from Git, add one GitHub repository secret named `FIREBASE_ENV` before running the APK workflow. Its value must be the complete seven-line `.env` content. The workflow writes that secret to `.env` before `npm run build`. Without it, the Android bundle has no Firebase configuration and the app can appear blank at startup.