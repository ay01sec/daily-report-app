import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, requestNotificationPermission } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // FCMトークンを登録
  async function registerFCMToken(userId, companyDocId) {
    console.log('=== PWA FCMトークン登録開始 ===');
    console.log('userId:', userId);
    console.log('companyDocId:', companyDocId);

    try {
      // ブラウザが通知をサポートしているか確認
      if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('このブラウザは通知をサポートしていません');
        return;
      }

      // 既に拒否されている場合はスキップ
      if (Notification.permission === 'denied') {
        console.log('通知が拒否されています');
        return;
      }

      // FCMトークンを取得
      console.log('FCMトークンを取得中...');
      const token = await requestNotificationPermission();
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
        console.log('FCMトークンが取得できませんでした（許可されていないか、VAPIDキーが未設定）');
      }

      console.log('=== PWA FCMトークン登録完了 ===');
    } catch (error) {
      console.error('FCMトークン登録エラー:', error);
    }
  }

  // 企業コードで企業を検索（未認証でも可能）
  async function findCompanyByCode(companyCode) {
    const companiesRef = collection(db, 'companies');
    const q = query(companiesRef, where('companyCode', '==', companyCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('企業IDが見つかりません');
    }

    const companyDoc = snapshot.docs[0];
    return {
      id: companyDoc.id,
      ...companyDoc.data()
    };
  }

  // 企業コード + メールアドレス + パスワードでログイン
  async function login(companyCode, email, password) {
    // 1. 先に企業コードで企業を検索（未認証状態で検証）
    const company = await findCompanyByCode(companyCode);

    // 2. Firebase Authenticationでログイン
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    try {
      // 3. その企業にユーザーが存在するか確認
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

      if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
        await signOut(auth);
        throw new Error('日報アプリへのアクセス権限がありません');
      }

      // 4. 最終ログイン日時を更新
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp()
      });

      // 5. 状態を更新
      setCompanyId(company.id);
      setCompanyInfo(company);
      setUserInfo({
        id: user.uid,
        ...userData
      });

      // 企業コードをローカルストレージに保存（次回ログイン時の利便性向上）
      localStorage.setItem('lastCompanyCode', companyCode);

      // FCMトークンを登録
      await registerFCMToken(user.uid, company.id);

      return user;
    } catch (error) {
      // エラー時はログアウトして再スロー
      await signOut(auth);
      throw error;
    }
  }

  // パスワードリセットメールを送信
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  async function logout() {
    setUserInfo(null);
    setCompanyId(null);
    setCompanyInfo(null);
    await signOut(auth);
  }

  async function fetchUserInfo(uid) {
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

          if (!['admin', 'office', 'manager', 'site_manager'].includes(userData.role)) {
            throw new Error('日報アプリへのアクセス権限がありません');
          }

          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp()
          });

          setCompanyId(companyDoc.id);
          setCompanyInfo({
            id: companyDoc.id,
            ...companyDoc.data()
          });
          setUserInfo({
            id: uid,
            ...userData
          });

          // FCMトークンを登録（アプリ起動時）
          await registerFCMToken(uid, companyDoc.id);

          return {
            companyId: companyDoc.id,
            companyInfo: companyDoc.data(),
            userInfo: userData
          };
        }
      }

      throw new Error('ユーザー情報が見つかりません');
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error);
      throw error;
    }
  }

  function isAdmin() {
    return userInfo?.role === 'admin';
  }

  function isManagerOrAbove() {
    return ['admin', 'office', 'manager', 'site_manager'].includes(userInfo?.role);
  }

  // サービス制限チェック（expired または suspended の場合は制限）
  function isServiceRestricted() {
    const status = companyInfo?.billing?.status;
    return ['expired', 'suspended'].includes(status);
  }

  // 課金ステータス取得
  function getBillingStatus() {
    return companyInfo?.billing?.status || 'trial';
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

  const value = {
    currentUser,
    userInfo,
    companyId,
    companyInfo,
    login,
    logout,
    resetPassword,
    isAdmin,
    isManagerOrAbove,
    isServiceRestricted,
    getBillingStatus,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
