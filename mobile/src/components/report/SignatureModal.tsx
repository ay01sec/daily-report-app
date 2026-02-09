import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateWithDay } from '../../utils/dateUtils';

interface SignatureModalProps {
  visible: boolean;
  reportId: string;
  siteName?: string;
  reportDate?: any;
  onComplete: () => void;
  onCancel: () => void;
}

export default function SignatureModal({
  visible,
  reportId,
  siteName,
  reportDate,
  onComplete,
  onCancel,
}: SignatureModalProps) {
  const signatureRef = useRef<SignatureViewRef>(null);
  const [saving, setSaving] = useState(false);
  const { companyId } = useAuth();

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleComplete = () => {
    signatureRef.current?.readSignature();
  };

  const handleOK = async (signature: string) => {
    if (!signature) {
      Alert.alert('エラー', 'サインを入力してください');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(signature);
      const blob = await response.blob();

      const timestamp = Date.now();
      const storagePath = `signatures/${companyId}/${reportId}/${timestamp}.png`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'companies', companyId!, 'dailyReports', reportId), {
        'clientSignature.imageUrl': downloadUrl,
        'clientSignature.signedAt': Timestamp.now(),
        'clientSignature.signerName': null,
        status: 'signed',
        updatedAt: serverTimestamp(),
      });

      onComplete();
    } catch (err) {
      console.error('サイン保存エラー:', err);
      Alert.alert('エラー', 'サインの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      '確認',
      'サインを中断しますか？',
      [
        { text: 'いいえ', style: 'cancel' },
        { text: 'はい', onPress: onCancel },
      ]
    );
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      padding: 0;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      margin: 0;
      padding: 0;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>元請確認サイン</Text>
          <TouchableOpacity onPress={handleCancel} disabled={saving}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>現場名: {siteName}</Text>
          <Text style={styles.infoText}>実施日: {formatDateWithDay(reportDate)}</Text>
        </View>

        <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleOK}
            onEmpty={() => Alert.alert('エラー', 'サインを入力してください')}
            webStyle={webStyle}
            backgroundColor="white"
            penColor="black"
            minWidth={2}
            maxWidth={2.5}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
            disabled={saving}
          >
            <Text style={styles.clearButtonText}>クリア</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.completeButton, saving && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.completeButtonText}>サイン完了</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.notes}>
          <Text style={styles.noteText}>※ デバイスを元請担当者にお渡しください</Text>
          <Text style={styles.noteText}>※ サイン後「サイン完了」を押してください</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 28,
    color: '#9ca3af',
    paddingHorizontal: 8,
  },
  info: {
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
  },
  signatureContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  notes: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
