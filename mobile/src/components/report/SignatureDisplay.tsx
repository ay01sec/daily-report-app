import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDateTime } from '../../utils/dateUtils';

interface SignatureDisplayProps {
  imageUrl?: string | null;
  signedAt?: any;
  signerName?: string | null;
  onRedo?: () => void;
}

export default function SignatureDisplay({
  imageUrl,
  signedAt,
  signerName,
  onRedo,
}: SignatureDisplayProps) {
  if (!imageUrl) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>元請確認欄: 未署名</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>元請確認欄</Text>
        {onRedo && (
          <TouchableOpacity onPress={onRedo}>
            <Text style={styles.redoButton}>サインをやり直す</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      <View style={styles.info}>
        {signedAt && (
          <Text style={styles.infoText}>署名日時: {formatDateTime(signedAt)}</Text>
        )}
        {signerName && (
          <Text style={styles.infoText}>署名者: {signerName}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  redoButton: {
    fontSize: 14,
    color: '#2563eb',
  },
  imageContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
  },
  image: {
    width: '100%',
    height: 96,
  },
  info: {
    marginTop: 8,
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
