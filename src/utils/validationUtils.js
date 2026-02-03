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
