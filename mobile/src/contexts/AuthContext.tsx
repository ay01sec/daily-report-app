import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import functions, { firebase as firebaseFunctions } from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { getSnapshotExists, getSnapshotData } from '../utils/firestoreUtils';

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
  currentUser: FirebaseAuthTypes.User | null;
  userInfo: UserInfo | null;
  companyId: string | null;
  companyInfo: CompanyInfo | null;
  login: (companyCode: string, email: string, password: string) => Promise<FirebaseAuthTypes.User>;
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
  const [currentUser, setCurrentUser] = useState<FirebaseAuthTypes.User | null>(null);
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
        const userDocRef = firestore().collection('companies').doc(companyDocId).collection('users').doc(userId);
        const userDocSnap = await userDocRef.get();
        const currentToken = getSnapshotData(userDocSnap)?.fcmToken;

        if (currentToken === token) {
          console.log('FCMトークンは既に最新です');
        } else {
          // Firestoreにトークンを保存
          await userDocRef.update({
            fcmToken: token,
            fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
          });
          console.log('FCMトークンを保存しました（新規/更新）');
        }
      } else {
        console.log('FCMトークンが取得できませんでした');
      }

      // トークン更新時のリスナーを設定
      messaging().onTokenRefresh(async (newToken) => {
        console.log('FCMトークンが更新されました:', newToken.substring(0, 30) + '...');
        const userDocRef = firestore().collection('companies').doc(companyDocId).collection('users').doc(userId);
        await userDocRef.update({
          fcmToken: newToken,
          fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log('更新されたFCMトークンを保存しました');
      });

      console.log('=== FCMトークン登録完了 ===');
    } catch (error) {
      console.error('プッシュ通知の登録エラー:', error);
    }
  }

  // Custom Claimを設定するヘルパー関数（asia-northeast1リージョン指定）
  async function ensureCustomClaim(user: FirebaseAuthTypes.User): Promise<void> {
    try {
      // asia-northeast1リージョンを指定（正しい構文）
      const functionsAsia = firebaseFunctions.app().functions('asia-northeast1');
      const setClaimFn = functionsAsia.httpsCallable('setCompanyClaim');
      const result = await setClaimFn({});
      console.log('Custom Claim設定結果:', result.data);

      // トークンを強制リフレッシュして新しいClaimを取得
      if ((result.data as any)?.updated) {
        await user.getIdToken(true);
        console.log('IDトークンをリフレッシュしました');
      }
    } catch (claimError) {
      console.warn('Custom Claim設定に失敗:', claimError);
      // ユーザーに通知（写真アップロードなどで問題が発生する可能性あり）
      Alert.alert(
        '注意',
        '認証情報の設定に失敗しました。写真のアップロードで問題が発生する場合は、再度ログインしてください。',
        [{ text: 'OK' }]
      );
    }
  }

  async function findCompanyByCode(companyCode: string): Promise<CompanyInfo> {
    const snapshot = await firestore()
      .collection('companies')
      .where('companyCode', '==', companyCode)
      .get();

    if (snapshot.empty) {
      throw new Error('企業IDが見つかりません');
    }

    const companyDoc = snapshot.docs[0];
    return {
      id: companyDoc.id,
      ...getSnapshotData(companyDoc),
    } as CompanyInfo;
  }

  async function login(companyCode: string, email: string, password: string): Promise<FirebaseAuthTypes.User> {
    const company = await findCompanyByCode(companyCode);
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    try {
      const userDocRef = firestore().collection('companies').doc(company.id).collection('users').doc(user.uid);
      const userDocSnap = await userDocRef.get();

      if (!getSnapshotExists(userDocSnap)) {
        await auth().signOut();
        throw new Error('この企業IDに登録されていないユーザーです');
      }

      const userData = getSnapshotData(userDocSnap);

      if (!userData?.isActive) {
        await auth().signOut();
        throw new Error('このアカウントは無効化されています');
      }

      // site_manager以上のロールでログイン可能（manager は旧ロール名で互換性維持）
      if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
        await auth().signOut();
        throw new Error('日報アプリへのアクセス権限がありません');
      }

      await userDocRef.update({
        lastLoginAt: firestore.FieldValue.serverTimestamp(),
      });

      setCompanyId(company.id);
      setCompanyInfo(company);
      setUserInfo({
        id: user.uid,
        ...userData,
      } as UserInfo);

      await AsyncStorage.setItem('lastCompanyCode', companyCode);

      // Custom Claimを設定（Storage Securityのため）
      await ensureCustomClaim(user);

      // プッシュ通知を登録
      await registerForPushNotifications(user.uid, company.id);

      return user;
    } catch (error) {
      await auth().signOut();
      throw error;
    }
  }

  async function resetPassword(email: string): Promise<void> {
    await auth().sendPasswordResetEmail(email);
  }

  async function logout(): Promise<void> {
    setUserInfo(null);
    setCompanyId(null);
    setCompanyInfo(null);
    await auth().signOut();
  }

  async function fetchUserInfo(uid: string): Promise<void> {
    try {
      console.log('[fetchUserInfo] 開始 uid:', uid);
      const companiesSnapshot = await firestore().collection('companies').get();
      console.log('[fetchUserInfo] 企業数:', companiesSnapshot.docs.length);

      for (const companyDoc of companiesSnapshot.docs) {
        console.log('[fetchUserInfo] 企業チェック:', companyDoc.id);
        const userDocRef = firestore().collection('companies').doc(companyDoc.id).collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        const docExists = getSnapshotExists(userDocSnap);
        console.log('[fetchUserInfo] ユーザー存在:', docExists);
        if (docExists) {
          const userData = getSnapshotData(userDocSnap);
          console.log('[fetchUserInfo] userData:', JSON.stringify(userData));
          console.log('[fetchUserInfo] isActive:', userData?.isActive, 'type:', typeof userData?.isActive);

          if (!userData?.isActive) {
            console.log('[fetchUserInfo] isActiveチェック失敗 - 値:', userData?.isActive);
            throw new Error('このアカウントは無効化されています');
          }

          // site_manager以上のロールでログイン可能（manager は旧ロール名で互換性維持）
          if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
            throw new Error('日報アプリへのアクセス権限がありません');
          }

          await userDocRef.update({
            lastLoginAt: firestore.FieldValue.serverTimestamp(),
          });

          setCompanyId(companyDoc.id);
          setCompanyInfo({
            id: companyDoc.id,
            ...getSnapshotData(companyDoc),
          } as CompanyInfo);
          setUserInfo({
            id: uid,
            ...userData,
          } as UserInfo);

          // Custom Claimを設定（Storage Securityのため）
          const currentUser = auth().currentUser;
          if (currentUser) {
            await ensureCustomClaim(currentUser);
          }

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
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
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
