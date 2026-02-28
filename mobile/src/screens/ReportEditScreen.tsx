import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useReport } from '../hooks/useReport';
import Header from '../components/common/Header';
import ReportForm from '../components/report/ReportForm';
import SignatureModal from '../components/report/SignatureModal';
import SignatureDisplay from '../components/report/SignatureDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

type RootStackParamList = {
  Home: undefined;
  ReportEdit: { id: string };
  ReportDetail: { id: string };
};

type ReportEditScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReportEdit'>;
  route: RouteProp<RootStackParamList, 'ReportEdit'>;
};

export default function ReportEditScreen({ navigation, route }: ReportEditScreenProps) {
  const { id } = route.params;
  const { companyId } = useAuth();
  const { report, loading, error } = useReport(id);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentLocalReportId, setCurrentLocalReportId] = useState<string | null>(null);
  const [currentFormData, setCurrentFormData] = useState<any>(null);

  const handleSignatureRequest = (reportId: string | null, formData: any, localReportId: string) => {
    setCurrentLocalReportId(localReportId);
    setCurrentFormData(formData);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = (signedOffline?: boolean) => {
    setShowSignatureModal(false);
    if (signedOffline) {
      navigation.navigate('Home');
    }
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
  };

  const handleRedoSignature = async () => {
    Alert.alert(
      '確認',
      'サインをやり直しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'やり直す',
          style: 'destructive',
          onPress: async () => {
            try {
              if (report?.clientSignature?.imageUrl) {
                const url = report.clientSignature.imageUrl;
                const pathStart = url.indexOf('/o/') + 3;
                const pathEnd = url.indexOf('?');
                const encodedPath = url.substring(pathStart, pathEnd);
                const storagePath = decodeURIComponent(encodedPath);
                try {
                  await storage().ref(storagePath).delete();
                } catch (e) {
                  console.warn('署名画像の削除に失敗:', e);
                }
              }

              await firestore()
                .collection('companies')
                .doc(companyId!)
                .collection('dailyReports')
                .doc(id)
                .update({
                  'clientSignature.imageUrl': null,
                  'clientSignature.signedAt': null,
                  'clientSignature.signerName': null,
                  status: 'draft',
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            } catch (err) {
              console.error('サインやり直しエラー:', err);
              Alert.alert('エラー', 'エラーが発生しました');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    Alert.alert(
      '確認',
      'この日報を送信しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '送信する',
          onPress: async () => {
            setSubmitting(true);
            try {
              await firestore()
                .collection('companies')
                .doc(companyId!)
                .collection('dailyReports')
                .doc(id)
                .update({
                  status: 'submitted',
                  submittedAt: firestore.FieldValue.serverTimestamp(),
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });
              navigation.navigate('Home');
            } catch (err) {
              console.error('送信エラー:', err);
              Alert.alert('エラー', '送信に失敗しました');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveLater = () => {
    navigation.navigate('Home');
  };

  const handleSaved = () => {
    navigation.navigate('Home');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header />
        <LoadingSpinner />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.content}>
          <ErrorMessage message={error?.message || '日報が見つかりません'} />
          <TouchableOpacity
            style={styles.homeLink}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeLinkText}>ホームに戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isSigned = report.status === 'signed';
  const canEdit = report.status === 'draft' || report.status === 'rejected';

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {canEdit ? '日報編集' : 'サイン済み日報'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>戻る</Text>
          </TouchableOpacity>
        </View>

        {report.status === 'rejected' && report.rejection?.reason && (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedTitle}>差戻し理由</Text>
            <Text style={styles.rejectedReason}>{report.rejection.reason}</Text>
            {report.rejection.rejectedByName && (
              <Text style={styles.rejectedBy}>
                差戻し者: {report.rejection.rejectedByName}
              </Text>
            )}
          </View>
        )}

        {isSigned && report.clientSignature?.imageUrl && (
          <View style={styles.signedSection}>
            <SignatureDisplay
              imageUrl={report.clientSignature.imageUrl}
              signedAt={report.clientSignature.signedAt}
              signerName={report.clientSignature.signerName}
              onRedo={handleRedoSignature}
            />

            <View style={styles.submitSection}>
              <Text style={styles.submitTitle}>この日報を送信しますか？</Text>
              <View style={styles.submitButtons}>
                <TouchableOpacity
                  style={styles.laterButton}
                  onPress={handleSaveLater}
                >
                  <Text style={styles.laterButtonText}>あとで送信する</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>送信する</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {canEdit && (
          <ReportForm
            initialData={report}
            reportId={id}
            onSignatureRequest={handleSignatureRequest}
            onSaved={handleSaved}
          />
        )}

        {!canEdit && !isSigned && (
          <View style={styles.notEditable}>
            <Text style={styles.notEditableText}>この日報は編集できません</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ReportDetail', { id })}
            >
              <Text style={styles.detailLink}>詳細を見る</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {showSignatureModal && (
        <SignatureModal
          visible={showSignatureModal}
          reportId={id}
          localReportId={currentLocalReportId || undefined}
          siteName={report.siteName}
          reportDate={report.reportDate}
          formData={currentFormData}
          onComplete={handleSignatureComplete}
          onCancel={handleSignatureCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  backButton: {
    color: '#6b7280',
  },
  homeLink: {
    marginTop: 16,
  },
  homeLinkText: {
    color: '#2563eb',
  },
  rejectedBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rejectedTitle: {
    fontWeight: '500',
    color: '#991b1b',
  },
  rejectedReason: {
    fontSize: 14,
    color: '#b91c1c',
    marginTop: 4,
  },
  rejectedBy: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  signedSection: {
    marginBottom: 24,
  },
  submitSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 24,
  },
  submitTitle: {
    color: '#1e40af',
    fontWeight: '500',
    marginBottom: 16,
  },
  submitButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  laterButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  laterButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  notEditable: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  notEditableText: {
    color: '#6b7280',
  },
  detailLink: {
    color: '#2563eb',
    marginTop: 16,
  },
});
