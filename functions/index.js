const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const path = require('path');
const sgMail = require('@sendgrid/mail');
const { defineSecret } = require('firebase-functions/params');

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
                  title: '作業日報アプリ -CDS-',
                  body: '本日の作業日報がまだ送信されていません',
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
                title: '作業日報アプリ -CDS-',
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

/**
 * ユーザー削除（Admin権限が必要）
 * Firebase AuthとFirestoreの両方からユーザーを削除
 */
exports.deleteUser = onCall(
  {
    region: 'asia-northeast1',
  },
  async (request) => {
    // 認証チェック
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    const { targetUserId, companyId } = request.data;
    const callerUid = request.auth.uid;

    if (!targetUserId || !companyId) {
      throw new HttpsError('invalid-argument', 'targetUserIdとcompanyIdは必須です');
    }

    // 自分自身は削除不可
    if (callerUid === targetUserId) {
      throw new HttpsError('failed-precondition', '自分自身は削除できません');
    }

    try {
      // 呼び出し元がadminか確認
      const callerDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(callerUid)
        .get();

      if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
        throw new HttpsError('permission-denied', '管理者権限が必要です');
      }

      // 対象ユーザーが同じ企業に属しているか確認
      const targetUserDoc = await db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(targetUserId)
        .get();

      if (!targetUserDoc.exists) {
        throw new HttpsError('not-found', 'ユーザーが見つかりません');
      }

      // Firebase Authからユーザーを削除
      const auth = getAuth();
      await auth.deleteUser(targetUserId);

      // Firestoreからユーザードキュメントを削除
      await db
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(targetUserId)
        .delete();

      console.log(`ユーザー ${targetUserId} を削除しました (by ${callerUid})`);

      return { success: true, message: 'ユーザーを削除しました' };
    } catch (error) {
      console.error('ユーザー削除エラー:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', 'ユーザーの削除に失敗しました');
    }
  }
);

/**
 * 承認設定を解決（現場設定 > 企業設定のフォールバック）
 */
async function resolveApprovalSettings(companyId, siteId) {
  // 企業設定を取得
  const companyDoc = await db.collection('companies').doc(companyId).get();
  const companyData = companyDoc.data();
  const companySettings = companyData?.approvalSettings || { mode: 'manual', autoApprovalEmails: [] };

  if (!siteId) {
    return { mode: companySettings.mode, emails: companySettings.autoApprovalEmails || [] };
  }

  // 現場設定を取得
  const siteDoc = await db.collection('companies').doc(companyId)
    .collection('sites').doc(siteId).get();
  const siteSettings = siteDoc.data()?.approvalSettings;

  if (!siteSettings || siteSettings.mode === 'default') {
    return { mode: companySettings.mode, emails: companySettings.autoApprovalEmails || [] };
  }

  // 現場設定がautoで、メールが空なら企業設定のメールを使用
  const emails = (siteSettings.autoApprovalEmails?.length > 0)
    ? siteSettings.autoApprovalEmails
    : companySettings.autoApprovalEmails || [];

  return { mode: siteSettings.mode, emails };
}

/**
 * サイン画像をダウンロード
 */
async function downloadSignatureImage(imageUrl) {
  if (!imageUrl) return null;
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

/**
 * 日報PDFを生成（リファレンスレイアウト準拠）
 */
function generateReportPdf(reportData, companyData, signatureImageBuffer) {
  return new Promise((resolve, reject) => {
    const fontPath = path.join(__dirname, 'NotoSansJP-Regular.ttf');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.registerFont('NotoSansJP', fontPath);
    doc.font('NotoSansJP');

    const LEFT = 50;
    const RIGHT = 545;
    const WIDTH = RIGHT - LEFT;

    // 日付フォーマット
    const reportDate = reportData.reportDate?.toDate
      ? reportData.reportDate.toDate()
      : new Date(reportData.reportDate);
    const dateStr = `${reportDate.getMonth() + 1}月${reportDate.getDate()}日`;

    const submittedAt = reportData.submittedAt?.toDate
      ? reportData.submittedAt.toDate()
      : reportData.submittedAt ? new Date(reportData.submittedAt) : new Date();
    const reportDateStr = `${submittedAt.getMonth() + 1}月${submittedAt.getDate()}日`;

    // === 報告日 ===
    doc.fontSize(10).fillColor('#000000');
    doc.text(`報告日：${reportDateStr}`, LEFT, 50);
    doc.moveDown(0.5);

    // === ヘッダー2行構成 ===
    const headerTop = doc.y;
    const row1H = 55;        // 上段（元請確認欄）高さを大きく
    const row2H = 22;        // 下段（作業日報）通常高さ
    const labelW = 70;       // 「元請確認欄」「作業日報」列
    const signW = 200;       // サイン列
    const infoLabelW = 50;   // 「実施日」「作成者」列
    const col1 = LEFT;
    const col2 = LEFT + labelW;
    const col3 = col2 + signW;
    const col4 = col3 + infoLabelW;

    // 上段: 元請確認欄 | サイン | 実施日 | 日付
    doc.rect(col1, headerTop, WIDTH, row1H).stroke();
    doc.moveTo(col2, headerTop).lineTo(col2, headerTop + row1H).stroke();
    doc.moveTo(col3, headerTop).lineTo(col3, headerTop + row1H).stroke();
    doc.moveTo(col4, headerTop).lineTo(col4, headerTop + row1H).stroke();

    doc.fontSize(9);
    doc.text('元請確認欄', col1 + 4, headerTop + (row1H / 2) - 5);
    doc.text('実施日', col3 + 4, headerTop + (row1H / 2) - 5);
    doc.text(dateStr, col4 + 4, headerTop + (row1H / 2) - 5);

    // サイン画像（上段のみ: col2〜col3）
    if (signatureImageBuffer) {
      try {
        const sigPad = 4;
        doc.image(signatureImageBuffer, col2 + sigPad, headerTop + sigPad, {
          fit: [signW - sigPad * 2, row1H - sigPad * 2],
        });
      } catch (e) {
        console.error('サイン画像埋め込みエラー:', e);
      }
    }

    // 下段: 作業日報 | （空白） | 作成者 | 名前
    const row2Top = headerTop + row1H;
    doc.rect(col1, row2Top, WIDTH, row2H).stroke();
    doc.moveTo(col3, row2Top).lineTo(col3, row2Top + row2H).stroke();
    doc.moveTo(col4, row2Top).lineTo(col4, row2Top + row2H).stroke();

    doc.text('作業日報', col1 + 4, row2Top + 6);
    doc.text('作成者', col3 + 4, row2Top + 6);
    doc.text(reportData.createdByName || '', col4 + 4, row2Top + 6);

    // === 現場名 + 天候 ===
    const siteTop = row2Top + row2H + 10;
    const weatherMap = { sunny: '晴れ', cloudy: '曇り', rainy: '雨', snowy: '雪' };
    const weatherStr = weatherMap[reportData.weather] || '';
    doc.fontSize(11);
    doc.text('現場名', LEFT, siteTop, { continued: true });
    doc.text(`     ${reportData.siteName || ''}`);
    if (weatherStr) {
      doc.fontSize(10);
      doc.text(`天候：${weatherStr}`, LEFT, doc.y + 2);
    }
    doc.moveDown(0.5);

    // === 作業員テーブル ===
    const tableTop = doc.y;
    const colWidths = [100, 80, 80, 70, 165];
    const headers = ['氏名', '開始時間', '終了時間', '昼休憩なし', '備考及び作業内容'];
    const rowHeight = 22;
    const totalRows = 9; // 固定9行（リファレンス準拠）
    const workers = reportData.workers || [];

    // テーブルヘッダー背景
    doc.rect(LEFT, tableTop, WIDTH, rowHeight).stroke();
    doc.fontSize(9).fillColor('#000000');
    let x = LEFT;
    headers.forEach((header, i) => {
      doc.text(header, x + 3, tableTop + 6, { width: colWidths[i] - 6 });
      if (i < headers.length - 1) {
        doc.moveTo(x + colWidths[i], tableTop)
          .lineTo(x + colWidths[i], tableTop + rowHeight).stroke();
      }
      x += colWidths[i];
    });

    // テーブル行
    for (let row = 0; row < totalRows; row++) {
      const y = tableTop + rowHeight * (row + 1);
      doc.rect(LEFT, y, WIDTH, rowHeight).stroke();

      x = LEFT;
      const worker = workers[row];

      // 各列の区切り線
      for (let i = 0; i < colWidths.length - 1; i++) {
        x += colWidths[i];
        doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
      }

      if (worker) {
        x = LEFT;
        // 氏名
        doc.text(worker.name || '', x + 3, y + 6, { width: colWidths[0] - 6 });
        x += colWidths[0];
        // 開始時間
        doc.text(worker.startTime || '', x + 3, y + 6, { width: colWidths[1] - 6 });
        x += colWidths[1];
        // 終了時間
        doc.text(worker.endTime || '', x + 3, y + 6, { width: colWidths[2] - 6 });
        x += colWidths[2];
        // 昼休憩なしチェックボックス
        const cbX = x + (colWidths[3] / 2) - 6;
        const cbY = y + 5;
        doc.rect(cbX, cbY, 12, 12).stroke();
        if (worker.noLunchBreak) {
          doc.moveTo(cbX + 2, cbY + 6).lineTo(cbX + 5, cbY + 10)
            .lineTo(cbX + 10, cbY + 2).stroke();
        }
        x += colWidths[3];
        // 備考
        doc.text(worker.remarks || '', x + 3, y + 6, { width: colWidths[4] - 6 });
      } else {
        // 空行のチェックボックスのみ描画
        x = LEFT + colWidths[0] + colWidths[1] + colWidths[2];
        const cbX = x + (colWidths[3] / 2) - 6;
        const cbY = y + 5;
        doc.rect(cbX, cbY, 12, 12).stroke();
      }
    }

    // === 連絡事項 ===
    const notesTop = tableTop + rowHeight * (totalRows + 1) + 15;
    const notesHeight = 100;
    doc.rect(LEFT, notesTop, WIDTH, notesHeight).stroke();
    doc.fontSize(9).text('連絡事項', LEFT + 5, notesTop + 5);
    if (reportData.notes) {
      doc.fontSize(9).text(reportData.notes, LEFT + 10, notesTop + 22, {
        width: WIDTH - 20,
        height: notesHeight - 30,
      });
    }

    // === フッター（企業名）===
    doc.fontSize(10).text(
      companyData?.companyName || '',
      LEFT,
      notesTop + notesHeight + 15
    );

    doc.end();
  });
}

/**
 * 日報自動承認処理（ステータスがsubmittedに変更された時）
 */
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

exports.onAutoApproveReport = onDocumentUpdated(
  {
    document: 'companies/{companyId}/dailyReports/{reportId}',
    region: 'asia-northeast1',
    secrets: [sendgridApiKey],
  },
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    // ステータスが変更されていない場合はスキップ
    if (beforeData.status === afterData.status) {
      return;
    }

    const companyId = event.params.companyId;
    const reportId = event.params.reportId;

    // === Case 1: submitted → 自動承認モードならapprovedに変更 ===
    if (afterData.status === 'submitted') {
      try {
        const approvalConfig = await resolveApprovalSettings(companyId, afterData.siteId);

        if (approvalConfig.mode !== 'auto') {
          console.log(`手動承認モード: ${companyId}/${reportId}`);
          return;
        }

        console.log(`自動承認開始: ${companyId}/${reportId}`);

        const reportRef = db.collection('companies').doc(companyId)
          .collection('dailyReports').doc(reportId);
        await reportRef.update({
          status: 'approved',
          'approval.approvedBy': 'system',
          'approval.approvedByName': '自動承認',
          'approval.approvedAt': Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log(`自動承認完了: ${companyId}/${reportId}`);
        // メール送信はCase 2（approved検知時）で行う
      } catch (error) {
        console.error('自動承認エラー:', error);
      }
      return;
    }

    // === Case 2: approved → PDF生成 + メール送信（自動・手動共通） ===
    if (afterData.status === 'approved') {
      try {
        console.log(`承認メール送信開始: ${companyId}/${reportId}`);

        // 承認設定からメール送信先を取得
        const approvalConfig = await resolveApprovalSettings(companyId, afterData.siteId);
        const emails = approvalConfig.emails.filter(e => e && e.trim());

        if (emails.length === 0) {
          console.log(`メール送信先なし: ${companyId}/${reportId}`);
          return;
        }

        // サイン画像ダウンロード + PDF生成
        const companyDoc = await db.collection('companies').doc(companyId).get();
        const companyData = companyDoc.data();
        const signatureImageBuffer = await downloadSignatureImage(afterData.clientSignature?.imageUrl);
        const pdfBuffer = await generateReportPdf(afterData, companyData, signatureImageBuffer);

        // SendGrid APIでメール送信
        const reportDate = afterData.reportDate?.toDate
          ? afterData.reportDate.toDate()
          : new Date(afterData.reportDate);
        const dateStr = `${reportDate.getFullYear()}年${reportDate.getMonth() + 1}月${reportDate.getDate()}日`;

        const isAutoApproved = afterData.approval?.approvedBy === 'system';
        const approvalType = isAutoApproved ? '自動承認' : '承認';

        sgMail.setApiKey(sendgridApiKey.value());
        await sgMail.send({
          to: emails,
          from: 'labor-management-info@improve-biz.com',
          subject: `【日報】${afterData.siteName || ''} - ${dateStr}`,
          text: `${companyData?.companyName || ''}の日報が${approvalType}されました。\n\n現場: ${afterData.siteName || ''}\n実施日: ${dateStr}\n作成者: ${afterData.createdByName || ''}\n\nPDFを添付しています。`,
          attachments: [{
            filename: `日報_${afterData.siteName || ''}_${dateStr}.pdf`,
            content: pdfBuffer.toString('base64'),
            type: 'application/pdf',
            disposition: 'attachment',
          }],
        });

        console.log(`承認メール送信完了: ${emails.join(', ')} (${approvalType})`);
      } catch (error) {
        console.error('承認メール送信エラー:', error);
      }
    }
  }
);

/**
 * PDF一括ダウンロード（callable function）
 */
exports.generateBulkPdf = onCall(
  {
    region: 'asia-northeast1',
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    const { companyId, startDate, endDate } = request.data;
    if (!companyId || !startDate || !endDate) {
      throw new HttpsError('invalid-argument', 'companyId, startDate, endDateは必須です');
    }

    try {
      // 企業情報取得
      const companyDoc = await db.collection('companies').doc(companyId).get();
      const companyData = companyDoc.data();

      // 期間内の承認済み日報を取得
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const reportsSnap = await db.collection('companies').doc(companyId)
        .collection('dailyReports').get();

      const reports = reportsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          if (r.status !== 'approved' && r.status !== 'submitted') return false;
          if (!r.reportDate) return false;
          const rd = r.reportDate.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
          return rd >= start && rd <= end;
        })
        .sort((a, b) => {
          const da = a.reportDate?.toDate ? a.reportDate.toDate() : new Date(a.reportDate);
          const db2 = b.reportDate?.toDate ? b.reportDate.toDate() : new Date(b.reportDate);
          return da - db2;
        });

      if (reports.length === 0) {
        return { zipBase64: null, count: 0 };
      }

      // ZIP生成
      const zipBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.on('data', chunk => buffers.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(buffers)));
        archive.on('error', reject);

        const pdfPromises = reports.map(async (report) => {
          const signatureImageBuffer = await downloadSignatureImage(report.clientSignature?.imageUrl);
          const pdfBuffer = await generateReportPdf(report, companyData, signatureImageBuffer);

          const rd = report.reportDate?.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
          const dateStr = `${rd.getFullYear()}${String(rd.getMonth() + 1).padStart(2, '0')}${String(rd.getDate()).padStart(2, '0')}`;
          const fileName = `${dateStr}_${report.siteName || '不明'}_${report.createdByName || ''}.pdf`;

          archive.append(pdfBuffer, { name: fileName });
        });

        Promise.all(pdfPromises)
          .then(() => archive.finalize())
          .catch(reject);
      });

      return {
        zipBase64: zipBuffer.toString('base64'),
        count: reports.length,
      };
    } catch (error) {
      console.error('PDF一括生成エラー:', error);
      throw new HttpsError('internal', 'PDF一括生成に失敗しました');
    }
  }
);
