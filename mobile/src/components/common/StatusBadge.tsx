import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
}

const statusConfig: Record<string, StatusConfig> = {
  draft: { label: '下書き', backgroundColor: '#f3f4f6', textColor: '#4b5563' },
  signed: { label: 'サイン済み', backgroundColor: '#fef3c7', textColor: '#b45309' },
  submitted: { label: '送信完了', backgroundColor: '#dbeafe', textColor: '#1d4ed8' },
  approved: { label: '承認済み', backgroundColor: '#dcfce7', textColor: '#15803d' },
  rejected: { label: '差戻し', backgroundColor: '#fee2e2', textColor: '#b91c1c' },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});
