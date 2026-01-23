# Welcome to my project

## Project info

**URL**: https://homebase-finder.vercel.app/

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i
npm install firebase
npm npm install -g firebase-tools

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev

# (Optional) Start with Firebase emulators (persisting data between restarts).
npm run dev:emulators
```
## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Working with Firebase emulators

- Run `npm run emulators` to launch the Firebase emulators with state persisted in `.firebase-data/` (storage uploads and Firestore docs survive restarts).
- Use `npm run dev:emulators` to start Vite alongside the emulators for local development.
- Set `VITE_USE_FIREBASE_EMULATORS=true` in your `.env.local` if you need the app to connect to the emulators outside of `npm run dev` (for example when running `npm run preview`).
- Adjust emulator host/port via `VITE_FIREBASE_EMULATOR_*` env vars if your setup uses non-default ports.