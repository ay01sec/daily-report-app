import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import ModalPicker from '../common/ModalPicker';
import { generateTimeOptions } from '../../utils/dateUtils';
import { Employee } from '../../hooks/useEmployees';

const timeOptions = generateTimeOptions();
const timePickerOptions = [
  { value: '', label: '--:--' },
  ...timeOptions.map((t) => ({ value: t, label: t })),
];

interface Worker {
  employeeId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  noLunchBreak?: boolean;
  remarks?: string;
}

interface WorkerErrors {
  employeeId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
}

interface WorkerRowProps {
  worker: Worker;
  index: number;
  employees: Employee[];
  onChange: (index: number, worker: Worker) => void;
  onRemove: (index: number) => void;
  errors?: WorkerErrors;
  canRemove: boolean;
  isNameLocked?: boolean;
  canEdit?: boolean;
}

export default function WorkerRow({
  worker,
  index,
  employees,
  onChange,
  onRemove,
  errors,
  canRemove,
  isNameLocked = false,
  canEdit = true,
}: WorkerRowProps) {
  const handleChange = (field: keyof Worker, value: any) => {
    onChange(index, { ...worker, [field]: value });
  };

  const handleEmployeeChange = (value: string) => {
    if (value === '__other__') {
      onChange(index, {
        ...worker,
        employeeId: '__other__',
        name: '',
      });
    } else {
      const emp = employees.find((em) => em.id === value);
      onChange(index, {
        ...worker,
        employeeId: value,
        name: emp ? emp.fullName : '',
      });
    }
  };

  const employeeOptions = [
    { value: '', label: '選択してください' },
    ...employees.map((emp) => ({ value: emp.id, label: emp.fullName })),
    { value: '__other__', label: 'その他（手入力）' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>作業員 {index + 1}</Text>
        {canRemove && !isNameLocked && canEdit && (
          <TouchableOpacity onPress={() => onRemove(index)}>
            <Text style={styles.deleteButton}>削除</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>氏名</Text>
        {isNameLocked ? (
          <View style={styles.lockedInput}>
            <Text style={styles.lockedText}>{worker.name || 'ログインユーザー'}</Text>
          </View>
        ) : (
          <ModalPicker
            selectedValue={worker.employeeId || ''}
            onValueChange={handleEmployeeChange}
            options={employeeOptions}
            placeholder="選択してください"
            disabled={!canEdit}
            error={!!errors?.employeeId}
          />
        )}
        {errors?.employeeId && (
          <Text style={styles.errorText}>{errors.employeeId}</Text>
        )}
      </View>

      {worker.employeeId === '__other__' && (
        <View style={styles.field}>
          <Text style={styles.label}>氏名（自由入力）</Text>
          <TextInput
            style={[styles.input, errors?.name && styles.errorBorder]}
            value={worker.name || ''}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="氏名を入力"
            editable={canEdit}
          />
          {errors?.name && (
            <Text style={styles.errorText}>{errors.name}</Text>
          )}
        </View>
      )}

      <View style={styles.timeRow}>
        <View style={styles.timeField}>
          <Text style={styles.label}>開始時間</Text>
          <ModalPicker
            selectedValue={worker.startTime || ''}
            onValueChange={(value) => handleChange('startTime', value)}
            options={timePickerOptions}
            placeholder="--:--"
            disabled={!canEdit}
            error={!!errors?.startTime}
          />
          {errors?.startTime && (
            <Text style={styles.errorText}>{errors.startTime}</Text>
          )}
        </View>

        <View style={styles.timeField}>
          <Text style={styles.label}>終了時間</Text>
          <ModalPicker
            selectedValue={worker.endTime || ''}
            onValueChange={(value) => handleChange('endTime', value)}
            options={timePickerOptions}
            placeholder="--:--"
            disabled={!canEdit}
            error={!!errors?.endTime}
          />
          {errors?.endTime && (
            <Text style={styles.errorText}>{errors.endTime}</Text>
          )}
        </View>
      </View>

      <View style={styles.switchRow}>
        <Switch
          value={worker.noLunchBreak || false}
          onValueChange={(value) => {
            if (canEdit) handleChange('noLunchBreak', value);
          }}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={worker.noLunchBreak ? '#2563eb' : '#f4f4f5'}
          disabled={!canEdit}
        />
        <Text style={styles.switchLabel}>昼休憩なし</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>備考及び作業内容</Text>
        <TextInput
          style={styles.input}
          value={worker.remarks || ''}
          onChangeText={(text) => handleChange('remarks', text)}
          placeholder="作業内容を入力"
          editable={canEdit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  deleteButton: {
    fontSize: 14,
    color: '#ef4444',
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: '#4b5563',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  lockedInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  lockedText: {
    fontSize: 16,
    color: '#374151',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeField: {
    flex: 1,
    gap: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
  },
  errorBorder: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
});
