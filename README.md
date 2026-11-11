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
