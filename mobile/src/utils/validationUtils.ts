interface Worker {
  employeeId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  noLunchBreak?: boolean;
  remarks?: string;
}

interface ReportData {
  reportDate?: string;
  siteId?: string;
  workers?: Worker[];
}

interface WorkerErrors {
  employeeId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
}

interface ValidationErrors {
  reportDate?: string;
  siteId?: string;
  workers?: string;
  workerErrors?: (WorkerErrors | undefined)[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export function validateReport(data: ReportData): ValidationResult {
  const errors: ValidationErrors = {};

  if (!data.reportDate) {
    errors.reportDate = '実施日を選択してください';
  }

  if (!data.siteId) {
    errors.siteId = '現場を選択してください';
  }

  if (!data.workers || data.workers.length === 0) {
    errors.workers = '作業員を1名以上追加してください';
  } else {
    const workerErrors: (WorkerErrors | undefined)[] = [];
    data.workers.forEach((worker, index) => {
      const err: WorkerErrors = {};
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

export function validateWorker(worker: Worker): { isValid: boolean; errors: WorkerErrors } {
  const errors: WorkerErrors = {};

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
