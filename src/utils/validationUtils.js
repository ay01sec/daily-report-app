/**
 * 労働時間を分単位で計算（翌日終了対応）
 * @param {string} startTime - 開始時間（HH:mm形式）
 * @param {string} endTime - 終了時間（HH:mm形式）
 * @param {boolean} noLunchBreak - 昼休憩なしフラグ
 * @param {number} lunchBreakMinutes - 昼休憩時間（分）デフォルト60分
 * @returns {number} 労働時間（分）
 */
export function calculateWorkingMinutes(startTime, endTime, noLunchBreak = false, lunchBreakMinutes = 60) {
  if (!startTime || !endTime) return 0;

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let start = startH * 60 + startM;
  let end = endH * 60 + endM;

  // 終了時間が開始時間より早い場合、翌日終了として計算
  if (end <= start) {
    end += 24 * 60; // 24時間を加算
  }

  let workMinutes = end - start;

  // 昼休憩を差し引く
  if (!noLunchBreak && workMinutes > lunchBreakMinutes) {
    workMinutes -= lunchBreakMinutes;
  }

  return workMinutes;
}

/**
 * 時間の整合性をチェック
 * 終了時間が開始時間より早い場合は翌日終了と判定（警告なし）
 * @param {string} startTime - 開始時間
 * @param {string} endTime - 終了時間
 * @returns {{ isValid: boolean, isNextDay: boolean, message?: string }}
 */
export function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) {
    return { isValid: false, isNextDay: false, message: '時間を入力してください' };
  }

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  // 終了時間が開始時間より早い場合は翌日終了
  const isNextDay = end <= start;

  return { isValid: true, isNextDay };
}

export function validateReport(data) {
  const errors = {};

  if (!data.reportDate) {
    errors.reportDate = '実施日を選択してください';
  }

  if (!data.siteId) {
    errors.siteId = '現場を選択してください';
  }

  if (!data.workers || data.workers.length === 0) {
    errors.workers = '作業員を1名以上追加してください';
  } else {
    const workerErrors = [];
    data.workers.forEach((worker, index) => {
      const err = {};
      if (!worker.employeeId) {
        err.employeeId = '氏名を選択してください';
      } else if (worker.employeeId === '__other__' && !worker.name?.trim()) {
        err.name = '氏名を入力してください';
      }
      if (!worker.startTime) {
        err.startTime = '開始時間を入力してください';
      }
      if (!worker.endTime) {
        err.endTime = '終了時間を入力してください';
      }
      if (Object.keys(err).length > 0) {
        workerErrors[index] = err;
      }
    });
    if (workerErrors.some((e) => e)) {
      errors.workerErrors = workerErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateWorker(worker) {
  const errors = {};

  if (!worker.employeeId) {
    errors.employeeId = '氏名を選択してください';
  } else if (worker.employeeId === '__other__' && !worker.name?.trim()) {
    errors.name = '氏名を入力してください';
  }
  if (!worker.startTime) {
    errors.startTime = '開始時間を入力してください';
  }
  if (!worker.endTime) {
    errors.endTime = '終了時間を入力してください';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
