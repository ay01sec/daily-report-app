import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { auth, db } from '../config/firebase';

interface UserInfo {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

interface CompanyInfo {
  id: string;
  companyName?: string;
  companyCode?: string;
  reportDeadline?: string;
  [key: string]: any;
}

interface AuthContextType {
  currentUser: User | null;
  userInfo: UserInfo | null;
  companyId: string | null;
  companyInfo: CompanyInfo | null;
  login: (companyCode: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAdmin: () => boolean;
  isManagerOrAbove: () => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// 通知のデフォルト設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function AuthProvider({ children, fallback }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // プッシュ通知の許可をリクエストしてトークンを保存
  async function registerForPushNotifications(userId: string, companyDocId: string): Promise<void> {
    console.log('=== FCMトークン登録開始 ===');
    console.log('userId:', userId);
    console.log('companyDocId:', companyDocId);

    try {
      // 物理デバイスでのみ動作
      if (!Device.isDevice) {
        console.log('プッシュ通知はシミュレーターでは利用できません');
        return;
      }
      console.log('デバイスチェック: OK（物理デバイス）');

      // iOSの場合、通知許可をリクエスト
      if (Platform.OS === 'ios') {
        console.log('iOS: 通知許可をリクエスト中...');
        const authStatus = await messaging().requestPermission();
        console.log('iOS: 通知許可ステータス:', authStatus);
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('プッシュ通知の許可が拒否されました');
          return;
        }
        console.log('iOS: 通知許可OK');
      }

      // Androidの場合、通知チャンネルを設定
      if (Platform.OS === 'android') {
        console.log('Android: 通知チャンネルを設定中...');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('Android: 通知チャンネル設定OK');
      }

      // FCMトークンを取得
      console.log('FCMトークンを取得中...');
      const token = await messaging().getToken();
      console.log('FCMトークン取得:', token ? `${token.substring(0, 30)}...` : 'null');

      if (token) {
        // 現在のFirestoreのトークンを確認
        const userDocRef = doc(db, 'companies', companyDocId, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        const currentToken = userDocSnap.data()?.fcmToken;

        if (currentToken === token) {
          console.log('FCMトークンは既に最新です');
        } else {
          // Firestoreにトークンを保存
          await updateDoc(userDocRef, {
            fcmToken: token,
            fcmTokenUpdatedAt: serverTimestamp(),
          });
          console.log('FCMトークンを保存しました（新規/更新）');
        }
      } else {
        console.log('FCMトークンが取得できませんでした');
      }

      // トークン更新時のリスナーを設定
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCMトークンが更新されました:', newToken.substring(0, 30) + '...');
        const userDocRef = doc(db, 'companies', companyDocId, 'users', userId);
        await updateDoc(userDocRef, {
          fcmToken: newToken,
          fcmTokenUpdatedAt: serverTimestamp(),
        });
        console.log('更新されたFCMトークンを保存しました');
      });

      console.log('=== FCMトークン登録完了 ===');
    } catch (error) {
      console.error('プッシュ通知の登録エラー:', error);
    }
  }

  async function findCompanyByCode(companyCode: string): Promise<CompanyInfo> {
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('companyCode', '==', companyCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('企業IDが見つかりません');
    }

    const companyDoc = snapshot.docs[0];
    return {
      id: companyDoc.id,
      ...companyDoc.data(),
    } as CompanyInfo;
  }

  async function login(companyCode: string, email: string, password: string): Promise<User> {
    const company = await findCompanyByCode(companyCode);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
      const userDocRef = doc(db, 'companies', company.id, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await signOut(auth);
        throw new Error('この企業IDに登録されていないユーザーです');
      }

      const userData = userDocSnap.data();

      if (!userData.isActive) {
        await signOut(auth);
        throw new Error('このアカウントは無効化されています');
      }

      // site_manager以上のロールでログイン可能（manager は旧ロール名で互換性維持）
      if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
        await signOut(auth);
        throw new Error('日報アプリへのアクセス権限がありません');
      }

      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      });

      setCompanyId(company.id);
      setCompanyInfo(company);
      setUserInfo({
        id: user.uid,
        ...userData,
      } as UserInfo);

      await AsyncStorage.setItem('lastCompanyCode', companyCode);

      // プッシュ通知を登録
      await registerForPushNotifications(user.uid, company.id);

      return user;
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  }

  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  async function logout(): Promise<void> {
    setUserInfo(null);
    setCompanyId(null);
    setCompanyInfo(null);
    await signOut(auth);
  }

  async function fetchUserInfo(uid: string): Promise<void> {
    try {
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);

      for (const companyDoc of companiesSnapshot.docs) {
        const userDocRef = doc(db, 'companies', companyDoc.id, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          if (!userData.isActive) {
            throw new Error('このアカウントは無効化されています');
          }

          // site_manager以上のロールでログイン可能（manager は旧ロール名で互換性維持）
          if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
            throw new Error('日報アプリへのアクセス権限がありません');
          }

          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
          });

          setCompanyId(companyDoc.id);
          setCompanyInfo({
            id: companyDoc.id,
            ...companyDoc.data(),
          } as CompanyInfo);
          setUserInfo({
            id: uid,
            ...userData,
          } as UserInfo);

          // プッシュ通知を登録
          await registerForPushNotifications(uid, companyDoc.id);

          return;
        }
      }

      throw new Error('ユーザー情報が見つかりません');
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error);
      throw error;
    }
  }

  function isAdmin(): boolean {
    return userInfo?.role === 'admin';
  }

  function isManagerOrAbove(): boolean {
    return userInfo?.role === 'admin' || userInfo?.role === 'manager';
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          await fetchUserInfo(user.uid);
        } catch (error) {
          console.error('ユーザー情報の取得に失敗:', error);
          await logout();
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userInfo,
    companyId,
    companyInfo,
    login,
    logout,
    resetPassword,
    isAdmin,
    isManagerOrAbove,
    loading,
  };

  if (loading) {
    return <>{fallback}</>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
