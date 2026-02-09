import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useReport } from '../hooks/useReport';
import Header from '../components/common/Header';
import StatusBadge from '../components/common/StatusBadge';
import SignatureDisplay from '../components/report/SignatureDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { formatDate, formatDateTime } from '../utils/dateUtils';

type RootStackParamList = {
  Home: undefined;
  ReportEdit: { id: string };
  ReportDetail: { id: string };
};

type ReportDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReportDetail'>;
  route: RouteProp<RootStackParamList, 'ReportDetail'>;
};

const weatherLabels: Record<string, string> = {
  sunny: '☀️ 晴れ',
  cloudy: '☁️ 曇り',
  rainy: '🌧️ 雨',
  snowy: '❄️ 雪',
};

export default function ReportDetailScreen({ navigation, route }: ReportDetailScreenProps) {
  const { id } = route.params;
  const { report, loading, error } = useReport(id);
  const [showQrModal, setShowQrModal] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (report?.status === 'approved' && report?.qrCodeUrl) {
      if (prevStatusRef.current === 'submitted') {
        setShowQrModal(true);
      }
    }
    prevStatusRef.current = report?.status || null;
  }, [report?.status, report?.qrCodeUrl]);

  const openPdf = () => {
    if (report?.pdfUrl) {
      Linking.openURL(report.pdfUrl);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  const canEdit = report.status === 'draft' || report.status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>日報詳細</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>戻る</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <StatusBadge status={report.status || 'draft'} />
          {report.submittedAt && (
            <Text style={styles.submittedAt}>
              送信: {formatDateTime(report.submittedAt)}
            </Text>
          )}
        </View>

        {report.status === 'submitted' && (
          <View style={styles.waitingBanner}>
            <View style={styles.waitingContent}>
              <ActivityIndicator size="small" color="#2563eb" />
              <View style={styles.waitingTextContainer}>
                <Text style={styles.waitingTitle}>承認待ち</Text>
                <Text style={styles.waitingSubtitle}>
                  承認されるとQRコードが表示されます
                </Text>
              </View>
            </View>
          </View>
        )}

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

        {report.clientSignature?.imageUrl && (
          <SignatureDisplay
            imageUrl={report.clientSignature.imageUrl}
            signedAt={report.clientSignature.signedAt}
            signerName={report.clientSignature.signerName}
          />
        )}

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>実施日</Text>
            <Text style={styles.infoValue}>{formatDate(report.reportDate)}</Text>
          </View>
          {report.weather && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>天候</Text>
              <Text style={styles.infoValue}>
                {weatherLabels[report.weather] || report.weather}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>現場名</Text>
            <Text style={styles.infoValue}>{report.siteName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>作成者</Text>
            <Text style={styles.infoValue}>{report.createdByName}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>作業員</Text>
          <View style={styles.workersList}>
            {report.workers?.map((worker: any, index: number) => (
              <View key={index} style={styles.workerItem}>
                <Text style={styles.workerName}>{worker.name}</Text>
                <Text style={styles.workerTime}>
                  {worker.startTime} - {worker.endTime}
                  {worker.noLunchBreak && (
                    <Text style={styles.noLunch}> (昼休憩なし)</Text>
                  )}
                </Text>
                {worker.remarks && (
                  <Text style={styles.workerRemarks}>{worker.remarks}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {report.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>連絡事項</Text>
            <Text style={styles.notes}>{report.notes}</Text>
          </View>
        )}

        {report.photos && report.photos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>写真</Text>
            <View style={styles.photosGrid}>
              {report.photos.map((photo: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.photoContainer}
                  onPress={() => photo.url && Linking.openURL(photo.url)}
                >
                  <Image source={{ uri: photo.url }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {report.approval?.approvedAt && (
          <View style={styles.approvalCard}>
            <Text style={styles.approvalTitle}>承認情報</Text>
            <Text style={styles.approvalText}>
              承認者: {report.approval.approvedByName}
            </Text>
            <Text style={styles.approvalText}>
              承認日時: {formatDateTime(report.approval.approvedAt)}
            </Text>
          </View>
        )}

        {report.status === 'approved' && report.pdfUrl && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PDF・QRコード</Text>
            <View style={styles.pdfButtons}>
              <TouchableOpacity style={styles.pdfButton} onPress={openPdf}>
                <Text style={styles.pdfButtonText}>PDF表示</Text>
              </TouchableOpacity>
              {report.qrCodeUrl && (
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setShowQrModal(true)}
                >
                  <Text style={styles.qrButtonText}>QRコード</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {canEdit && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('ReportEdit', { id })}
          >
            <Text style={styles.editButtonText}>編集する</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QRコード</Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {report.qrCodeUrl && (
                <Image
                  source={{ uri: report.qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.qrHint}>
                このQRコードをスキャンすると{'\n'}日報PDFが表示されます
              </Text>
              <TouchableOpacity style={styles.modalPdfButton} onPress={openPdf}>
                <Text style={styles.modalPdfButtonText}>PDFを開く</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  submittedAt: {
    fontSize: 14,
    color: '#6b7280',
  },
  waitingBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  waitingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waitingTextContainer: {
    flex: 1,
  },
  waitingTitle: {
    fontWeight: '500',
    color: '#1e40af',
  },
  waitingSubtitle: {
    fontSize: 14,
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontWeight: '500',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontWeight: '500',
    color: '#111827',
  },
  workersList: {
    gap: 12,
  },
  workerItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  workerName: {
    fontWeight: '500',
    color: '#111827',
  },
  workerTime: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  noLunch: {
    color: '#ea580c',
  },
  workerRemarks: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  notes: {
    color: '#374151',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  approvalCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  approvalTitle: {
    fontWeight: '500',
    color: '#166534',
    marginBottom: 8,
  },
  approvalText: {
    fontSize: 14,
    color: '#15803d',
    marginBottom: 4,
  },
  pdfButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  qrButton: {
    flex: 1,
    backgroundColor: '#4b5563',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  qrButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 28,
    color: '#9ca3af',
    paddingHorizontal: 4,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  qrImage: {
    width: 224,
    height: 224,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  qrHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  modalPdfButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  modalPdfButtonText: {
    color: '#fff',
  },
});
