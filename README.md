# Focus — NEET Practice

React + Vite practice workspace, deployed to Vercel with Firebase Authentication and Firestore.

## Setup

Install with `npm ci`, then copy `.env.example` to `.env.local` and fill in the Firebase web app settings. Enable Anonymous authentication and client account creation. Create a Firestore database and configure access rules for your intended users. Start with `npm run dev`; production output is `dist` from `npm run build`.

Set the same environment variables in Vercel for each deployment environment and redeploy after changing them. Web configuration is public; never add Admin SDK credentials to VITE variables.

## Features

- Full-width responsive layout, system typography, reduced-motion support, visible keyboard focus.
- Optional fullscreen test mode, answer palette, mark for review and clear controls.
- +4 / -1 / 0 scoring; absolute deadline timer and automatic submission using current answers.
- Device-local draft recovery, including the deadline, answers and question position. Re-enter the same test after signing in to resume. Leaving does not pause time.
- Firestore attempt storage with stable attempt IDs for idempotent retries; local drafts are removed only after save confirmation.
- Performance charts, searchable attempt library, CSV export and answer review. Older attempts without saved answer keys show that limitation explicitly.
- Clear startup, authentication, Firestore and submission errors.

## Important deployment limitations

The inherited username/password screen remains a **demo role selector**, not secure authentication. Its credentials and the answer keys are visible in browser code/data. Anonymous Firebase users do not establish admin/student identities. Filtering history by student name is display filtering, not authorization. Before using this for real examinations or private student records, replace it with persistent Firebase accounts, server-issued roles, server-side grading and reviewed Firestore rules. Do not use open read/write rules in production.

Drafts are local to one browser, not synced across devices. Fullscreen and tab-switch counts are convenience features, not proctoring or anti-cheating enforcement. PDF servers may prevent embedding; use a compatible HTTPS PDF source or a physical paper. Firestore data and provider settings must be configured in Firebase; a GitHub push does not deploy those settings.

## Checks

`npm run build`, `npm run lint`, `npm test`.

## Session behavior

The existing demo login now remembers the selected user on this device for seven days. Passwords are never stored in local storage. Explicit logout clears the remembered session. Blocked storage falls back to a tab-only session and shows a message. Refresh restores the dashboard; re-enter a test to resume its saved draft and original deadline. This does not change the demo authentication/security limitations above.

## Focus interface update

Dashboard, test creation, exam controls and analytics share the light/sage palette. Login copy is shorter. Added test search and sorting, all/unanswered/review question filters, answer progress, previous/next navigation, keyboard shortcuts (A–D, arrow keys, R), a separate paper link, and incorrect/skipped answer review. Answer keys must be complete before publishing; bulk-import validation is visible. Duplicate history cards have been removed.

Keyboard shortcuts are inactive while using form controls or submission confirmation. PDF iframes handle their own keyboard events. Browser testing remains required on the deployed app, including fullscreen and embedded PDFs.

## Build maintenance

- Use Node 24.12+ within the 24.x release line (`nvm install 24 && nvm use 24` if using nvm).
- Separate React, Firebase Auth and Firestore chunks remove the 500 kB bundle warning without increasing the warning threshold. Analytics remain lazy-loaded.
- Vercel commands unset the unsupported inherited `npm_config_cache_dir` / `npm_config_cache-dir` variables before starting npm. If a Vercel-level warning persists before those commands, remove that setting in the Vercel environment or raise it with Vercel.
- `allowScripts` explicitly denies the two optional postinstall scripts: Firebase's hosting-config autoload is unused (the app reads VITE variables), and protobufjs's script only checks version naming. No global script-suppression flag is used.
- A targeted `@grpc/grpc-js` override to the patched 1.x line addresses the audit findings. The app uses Firestore's browser transport, not its Node gRPC transport.
- Firebase 13.2.0 includes Crashlytics, which brings deprecated OpenTelemetry trace packages. They are not imported by this application. These upstream install deprecation warnings remain until Firebase updates its dependency tree; replacing them with API-incompatible packages would not be a safe fix.

Validation for this update: production build, lint, 11 unit tests, and npm audit (0 known vulnerabilities at preparation time). Firebase permissions and live fullscreen/PDF behavior are not covered by these checks.
