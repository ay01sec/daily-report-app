import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// React Native Firebase SDKはgoogle-services.json/GoogleService-Info.plistから
// 自動的に設定を読み込むため、手動での初期化は不要

// Firestoreインスタンス
const db = firestore();

// Storageインスタンス
const storageInstance = storage();

export { db, storageInstance as storage };
