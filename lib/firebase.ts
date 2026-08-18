import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function hasFirebaseConfig(cfg: typeof firebaseConfig): boolean {
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

// Next.js may evaluate modules during build-time typechecking/prerender. If the
// admin app is being built without Firebase env vars (common in local shells),
// avoid initializing Firebase eagerly so builds don't fail with auth/invalid-api-key.
export const firebaseApp =
  DEV_AUTH || !hasFirebaseConfig(firebaseConfig)
    ? (undefined as unknown as ReturnType<typeof getApp>)
    : getApps().length
      ? getApp()
      : initializeApp(firebaseConfig);

export const auth =
  DEV_AUTH || !hasFirebaseConfig(firebaseConfig)
    ? (undefined as unknown as ReturnType<typeof getAuth>)
    : getAuth(firebaseApp);
