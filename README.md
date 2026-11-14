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

## Student workspace redesign

A compact sidebar workspace replaces the previous student tabs and oversized duplicate empty states. Overview shows genuine attempt counts, aggregate attempted-answer accuracy, Monday–Sunday activity and incorrect answers awaiting review. Weekly goals and reviewed flags are stored on this device; submitted attempts remain in Firestore. Revision entries refer to the original paper's question numbers; no question content or explanation is invented. New attempts with saved answer keys support revision; older attempts may not.

Research inputs: Testbook's test series and review features (https://testbook.com/free-live-tests-and-quizzes) and Embibe's diagnostic test analysis (https://www.embibe.com/in-en/best-education-content/tests-that-not-just-evaluate-but-also-diagnose/). This update implements a practical subset, not feature parity with those platforms. AI tutoring, content libraries, proctoring, secure account roles and cohort rankings are not implemented.

## Upload and publish a test

1. Open **Create a test**. Enter the title, duration and question count.
2. Select **Upload PDF** and choose the question paper (valid PDF, up to 20 MB), or choose **Use a link**.
3. Under **Answer key**, import the JSON file. The key must contain every question, e.g. `{"1":"A","2":"C"}`. PDF answer keys are reference documents, not machine imports.
4. Click **Publish test**. PDF transfer shows progress. Publishing reports success only after Firestore acknowledges the write.

If a request times out, keep the form open and retry. Retries reuse the same Firestore document ID, preventing duplicate tests. A timed-out Firestore write can still complete later; timeout does not cancel a queued write. Uploaded PDFs are reused on retry. Leaving the form cancels active PDF uploads.

### Firebase setup

Enable Cloud Storage for the same Firebase project and set `VITE_FIREBASE_STORAGE_BUCKET` in Vercel, then redeploy. Storage may require a billing-enabled project; check the Firebase console. The app writes question PDFs to `test-papers/{testId}/paper.pdf`. Firestore writes tests to `artifacts/neet-cbt-portal/public/data/tests/{testId}`. Rules must permit the intended account to write to these paths and candidates to read question papers. Do not solve permissions by opening all writes to the public.

The existing username/password screen is a client-side role selector backed by anonymous Firebase authentication, **not trusted server-side admin authorization**. Configure a real Firebase admin identity/claim before using admin-only production rules. This upload change does not grant users an admin claim or change your deployed rules. Permission failures now appear inline instead of leaving the publish button indefinitely busy.

## Individual questions from PDF

Choose **Individual questions → Extract questions & options**, then review and edit the detected text and A–D options. Set the question count to match the paper and confirm the review checkbox before publishing. The candidate sees separate selectable options plus an original PDF region to preserve diagrams and mathematical notation. New structured tests store extracted text with the test. Existing tests remain in PDF + OMR mode; recreate them to import structured content.

The parser supports numbered, single-column text PDFs with A–D or (A)–(D) option labels. It does not perform OCR. Scans, multi-column papers, rotated pages, image-only options, and unusual numbering require PDF + OMR mode or a reformatted text PDF. Always compare the import to the source. Link imports and source-image rendering require a PDF URL that permits cross-origin access. Direct PDF upload is preferred. Source regions are rendered with PDF.js in the browser; use Open paper if the original cannot render.

The duration field now keeps a text editing buffer, allowing clearing and replacing minutes without spinner/wheel changes. Range validation happens on publish. The Aurora theme applies dark surfaces and muted violet/blue accents across the login, authoring, dashboard, analytics, and exam screens, with reduced-motion support.
