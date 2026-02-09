import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  message: {
    fontSize: 14,
    color: '#b91c1c',
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: '#dc2626',
    textDecorationLine: 'underline',
  },
});
