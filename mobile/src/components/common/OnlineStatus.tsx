import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOfflineStorage } from '../../hooks/useOfflineStorage';

export default function OnlineStatus() {
  const { online, syncing, pendingCount } = useOfflineStorage();

  if (online && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[styles.container, online ? styles.warning : styles.error]}>
      {!online ? (
        <Text style={[styles.text, online ? styles.warningText : styles.errorText]}>
          オフラインモード - データはローカルに保存されます
        </Text>
      ) : syncing ? (
        <Text style={[styles.text, styles.warningText]}>同期中...</Text>
      ) : pendingCount > 0 ? (
        <Text style={[styles.text, styles.warningText]}>
          未同期の下書きが {pendingCount} 件あります
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  warning: {
    backgroundColor: '#fef3c7',
  },
  error: {
    backgroundColor: '#fee2e2',
  },
  text: {
    fontSize: 14,
  },
  warningText: {
    color: '#92400e',
  },
  errorText: {
    color: '#991b1b',
  },
});
