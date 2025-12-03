import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const shouldUseEmulators =
  import.meta.env.DEV ||
  String(import.meta.env.VITE_USE_FIREBASE_EMULATORS ?? "")
    .trim()
    .toLowerCase() === "true";

if (shouldUseEmulators) {
  const globalScope = globalThis as typeof globalThis & {
    __FIREBASE_EMULATORS_CONNECTED__?: boolean;
  };

  if (!globalScope.__FIREBASE_EMULATORS_CONNECTED__) {
    const authHost = String(import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_HOST ?? "127.0.0.1");
    const authPort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? "9099");
    const firestoreHost = String(import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_HOST ?? "127.0.0.1");
    const firestorePort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT ?? "8081");
    const storageHost = String(import.meta.env.VITE_FIREBASE_EMULATOR_STORAGE_HOST ?? "127.0.0.1");
    const storagePort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_STORAGE_PORT ?? "9199");

    connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(db, firestoreHost, firestorePort);
    connectStorageEmulator(storage, storageHost, storagePort);
    globalScope.__FIREBASE_EMULATORS_CONNECTED__ = true;
  }
}

export { app };
