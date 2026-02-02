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
import { auth, db } from '../firebase';

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

  // 企業コードで企業を検索
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
    // 1. 企業コードで企業を検索
    const company = await findCompanyByCode(companyCode);

    // 2. Firebase Authenticationでログイン
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. その企業にユーザーが存在するか確認
    const userDocRef = doc(db, 'companies', company.id, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await signOut(auth);
      throw new Error('この企業にユーザーが登録されていません');
    }

    const userData = userDocSnap.data();

    if (!userData.isActive) {
      await signOut(auth);
      throw new Error('このアカウントは無効化されています');
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

    return user;
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
