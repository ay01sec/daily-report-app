const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();

/**
 * 企業作成時に自動で連番の企業IDを付与
 */
exports.assignCompanyCode = onDocumentCreated(
  {
    document: 'companies/{companyId}',
    region: 'asia-northeast1',
  },
  async (event) => {
    const companyId = event.params.companyId;
    const companyData = event.data.data();

    // 既にcompanyCodeが設定されている場合はスキップ
    if (companyData.companyCode) {
      console.log(`企業 ${companyId} は既にcompanyCodeを持っています: ${companyData.companyCode}`);
      return;
    }

    try {
      // カウンターを取得・更新（トランザクションで排他制御）
      const counterRef = db.collection('settings').doc('companyCodeCounter');

      const newCompanyCode = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        let nextCode = 0;
        if (counterDoc.exists) {
          nextCode = counterDoc.data().lastCode + 1;
        }

        // カウンターを更新
        transaction.set(counterRef, { lastCode: nextCode }, { merge: true });

        // 8桁のゼロ埋め文字列に変換
        return String(nextCode).padStart(8, '0');
      });

      // 企業ドキュメントにcompanyCodeを設定
      await db.collection('companies').doc(companyId).update({
        companyCode: newCompanyCode
      });

      console.log(`企業 ${companyId} に企業ID ${newCompanyCode} を割り当てました`);
    } catch (error) {
      console.error('企業ID割り当てエラー:', error);
    }
  }
);

/**
 * 時刻が現在時刻の±7分以内かチェック
 */
function isWithinTimeWindow(targetTime, currentTime, windowMinutes = 7) {
  const [targetHour, targetMin] = targetTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const targetMinutes = targetHour * 60 + targetMin;
  const currentMinutes = currentHour * 60 + currentMin;

  return Math.abs(targetMinutes - currentMinutes) <= windowMinutes;
}

/**
 * 現在時刻をHH:MM形式で取得（JST）
 */
function getCurrentTimeJST() {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + jstOffset * 60000);
  return `${String(jst.getHours()).padStart(2, '0')}:${String(jst.getMinutes()).padStart(2, '0')}`;
}

/**
 * 今日の日付をJSTで取得
 */
function getTodayJST() {
  const now = new Date();
  const jstOffset = 9 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utc + jstOffset * 60000);
  jst.setHours(0, 0, 0, 0);
  return jst;
}

/**
 * 日報未提出リマインダー（15分ごとに実行）
 */
exports.scheduledNotifications = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async (event) => {
    const currentTime = getCurrentTimeJST();
    const today = getTodayJST();
    const todayStart = Timestamp.fromDate(today);
    const todayEnd = Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1));

    console.log(`リマインダーチェック開始: ${currentTime}`);

    try {
      // 全企業を取得
      const companiesSnapshot = await db.collection('companies').get();

      for (const companyDoc of companiesSnapshot.docs) {
        const companyId = companyDoc.id;
        const companyData = companyDoc.data();
        const companyNotificationSettings = companyData.notificationSettings;

        // 企業の通知設定が無効な場合はスキップ
        if (!companyNotificationSettings?.enabled) continue;

        // 現在時刻が通知時刻に該当するかチェック
        const reminderTimes = companyNotificationSettings.reminderTimes || [];
        const shouldNotify = reminderTimes.some((time) =>
          isWithinTimeWindow(time, currentTime)
        );

        if (!shouldNotify) continue;

        // この企業のユーザーを取得
        const usersSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('users')
          .where('isActive', '==', true)
          .get();

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const fcmToken = userData.fcmToken;

          if (!fcmToken) continue;

          // このユーザーの今日の日報をチェック（サブコレクション）
          const reportsSnapshot = await db
            .collection('companies')
            .doc(companyId)
            .collection('dailyReports')
            .where('createdBy', '==', userId)
            .where('reportDate', '>=', todayStart)
            .where('reportDate', '<=', todayEnd)
            .get();

          // 日報が未提出（存在しない、draft、signed）の場合に通知
          let needsReminder = true;

          if (!reportsSnapshot.empty) {
            const report = reportsSnapshot.docs[0].data();
            if (report.status === 'submitted' || report.status === 'approved') {
              needsReminder = false;
            }
          }

          if (needsReminder) {
            try {
              await messaging.send({
                token: fcmToken,
                notification: {
                  title: '日報未提出',
                  body: '本日の日報がまだ提出されていません。',
                },
                data: {
                  type: 'reminder',
                  url: '/reports/new',
                },
                android: {
                  priority: 'high',
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                    },
                  },
                },
              });
              console.log(`リマインダー送信成功: ${userId}`);
            } catch (sendError) {
              console.error(`リマインダー送信失敗: ${userId}`, sendError);
            }
          }
        }
      }

      console.log('リマインダーチェック完了');
    } catch (error) {
      console.error('リマインダー処理エラー:', error);
    }
  }
);

/**
 * 日報差戻し通知（ステータスがrejectedに変更された時）
 */
exports.onReportRejected = onDocumentUpdated(
  {
    document: 'companies/{companyId}/dailyReports/{reportId}',
    region: 'asia-northeast1',
  },
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // ステータスがrejectedに変更された場合のみ処理
    if (beforeData.status === afterData.status || afterData.status !== 'rejected') {
      return;
    }

    const reportId = event.params.reportId;
    const companyId = event.params.companyId;
    const createdBy = afterData.createdBy;

    try {
      // 作成者のFCMトークンを取得
      const userDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(createdBy)
        .get();

      if (!userDoc.exists) {
        console.log('ユーザーが見つかりません:', createdBy);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log('FCMトークンがありません:', createdBy);
        return;
      }

      // 通知を送信
      await messaging.send({
        token: fcmToken,
        notification: {
          title: '日報が差戻しされました',
          body: `${afterData.siteName}の日報に修正が必要です。`,
        },
        data: {
          type: 'rejected',
          reportId: reportId,
          url: `/reports/${reportId}/edit`,
        },
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });

      console.log(`差戻し通知送信成功: ${createdBy}, レポート: ${reportId}`);
    } catch (error) {
      console.error('差戻し通知送信エラー:', error);
    }
  }
);

/**
 * カスタム通知（15分ごとに実行 - 日報リマインダーと同時に処理）
 */
exports.customNotifications = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'Asia/Tokyo',
    region: 'asia-northeast1',
  },
  async (event) => {
    const currentTime = getCurrentTimeJST();
    const now = new Date();
    const jstOffset = 9 * 60;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const jst = new Date(utc + jstOffset * 60000);
    const currentDayOfWeek = jst.getDay(); // 0=日, 1=月, ..., 6=土

    console.log(`カスタム通知チェック開始: ${currentTime}, 曜日: ${currentDayOfWeek}`);

    try {
      // 有効なカスタム通知を取得
      const notificationsSnapshot = await db
        .collection('customNotifications')
        .where('enabled', '==', true)
        .get();

      for (const notificationDoc of notificationsSnapshot.docs) {
        const notification = notificationDoc.data();

        // 時刻チェック
        if (!isWithinTimeWindow(notification.time, currentTime)) continue;

        // 曜日チェック
        if (notification.repeat === 'weekdays' && (currentDayOfWeek === 0 || currentDayOfWeek === 6)) {
          continue;
        }
        if (notification.repeat === 'custom' && !notification.customDays?.includes(currentDayOfWeek)) {
          continue;
        }

        const companyId = notification.companyId;
        const siteId = notification.siteId;
        const targetRoles = notification.targetRoles || ['user', 'manager', 'admin'];

        // 対象ユーザーを取得
        let usersQuery = db
          .collection('companies')
          .doc(companyId)
          .collection('users')
          .where('isActive', '==', true);

        const usersSnapshot = await usersQuery.get();

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const fcmToken = userData.fcmToken;

          if (!fcmToken) continue;
          if (!targetRoles.includes(userData.role)) continue;

          // siteIdが指定されている場合、ユーザーがその現場に関連しているかチェック
          // （この実装では簡略化のため、全ユーザーに送信）

          try {
            await messaging.send({
              token: fcmToken,
              notification: {
                title: '作業日報アプリ',
                body: notification.message,
              },
              data: {
                type: 'custom',
                notificationId: notificationDoc.id,
              },
              android: {
                priority: 'high',
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                  },
                },
              },
            });
            console.log(`カスタム通知送信成功: ${userDoc.id}`);
          } catch (sendError) {
            console.error(`カスタム通知送信失敗: ${userDoc.id}`, sendError);
          }
        }
      }

      console.log('カスタム通知チェック完了');
    } catch (error) {
      console.error('カスタム通知処理エラー:', error);
    }
  }
);
