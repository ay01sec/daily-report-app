import { generateTimeOptions } from '../../utils/dateUtils';

const timeOptions = generateTimeOptions();

export default function WorkerRow({
  worker,
  index,
  employees,
  onChange,
  onRemove,
  errors,
  canRemove,
  isNameLocked = false,
}) {
  const handleChange = (field, value) => {
    onChange(index, { ...worker, [field]: value });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">作業員 {index + 1}</span>
        {canRemove && !isNameLocked && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            削除
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">氏名</label>
        <select
          value={worker.employeeId || ''}
          disabled={isNameLocked}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__other__') {
              onChange(index, {
                ...worker,
                employeeId: '__other__',
                name: '',
              });
            } else {
              const emp = employees.find((em) => em.id === val);
              onChange(index, {
                ...worker,
                employeeId: val,
                name: emp ? emp.fullName : '',
              });
            }
          }}
          className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors?.employeeId ? 'border-red-500' : 'border-gray-300'
          } ${isNameLocked ? 'bg-gray-100' : ''}`}
        >
          <option value="">選択してください</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.fullName}
            </option>
          ))}
          <option value="__other__">その他</option>
        </select>
        {errors?.employeeId && (
          <p className="text-red-500 text-xs mt-1">{errors.employeeId}</p>
        )}
      </div>

      {worker.employeeId === '__other__' && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">氏名（自由入力）</label>
          <input
            type="text"
            value={worker.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="氏名を入力"
            className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors?.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">開始時間</label>
          <select
            value={worker.startTime || ''}
            onChange={(e) => handleChange('startTime', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.startTime ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">--:--</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors?.startTime && (
            <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">終了時間</label>
          <select
            value={worker.endTime || ''}
            onChange={(e) => handleChange('endTime', e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.endTime ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">--:--</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors?.endTime && (
            <p className="text-red-500 text-xs mt-1">{errors.endTime}</p>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id={`noLunch-${index}`}
          checked={worker.noLunchBreak || false}
          onChange={(e) => handleChange('noLunchBreak', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor={`noLunch-${index}`} className="ml-2 text-sm text-gray-700">
          昼休憩なし
        </label>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">備考及び作業内容</label>
        <input
          type="text"
          value={worker.remarks || ''}
          onChange={(e) => handleChange('remarks', e.target.value)}
          placeholder="作業内容を入力"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
