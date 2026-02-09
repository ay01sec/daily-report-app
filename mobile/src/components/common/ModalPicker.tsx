import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Option {
  label: string;
  value: string;
}

interface ModalPickerProps {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

export default function ModalPicker({
  selectedValue,
  onValueChange,
  options,
  placeholder = '選択してください',
  disabled = false,
  error = false,
}: ModalPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[
            styles.selectorText,
            !selectedValue && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>選択してください</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>閉じる</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === selectedValue && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === selectedValue && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.optionsList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorError: {
    borderColor: '#ef4444',
  },
  selectorDisabled: {
    backgroundColor: '#f3f4f6',
  },
  selectorText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  arrow: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 16,
    color: '#2563eb',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionItemSelected: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 16,
    color: '#2563eb',
  },
});
