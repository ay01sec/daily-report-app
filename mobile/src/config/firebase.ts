import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is available in react-native environment
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log config (only in development)
if (__DEV__) {
  console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
    authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
    projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
    storageBucket: firebaseConfig.storageBucket ? 'SET' : 'MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'MISSING',
    appId: firebaseConfig.appId ? 'SET' : 'MISSING',
  });
}

// Validate config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing. Check environment variables.');
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);

  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // Auth already initialized or persistence not available
    auth = getAuth(app);
  }

  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Firebase の初期化に失敗しました。アプリを再起動してください。');
}

export { auth, db, storage };
export default app;
