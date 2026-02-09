import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Picker } from '@react-native-picker/picker';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/common/Header';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

type RootStackParamList = {
  Home: undefined;
  ReportNew: undefined;
  ReportEdit: { id: string };
  ReportDetail: { id: string };
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface Report {
  id: string;
  reportDate?: any;
  siteName?: string;
  status?: string;
  createdAt?: any;
}

function getEncouragementMessage() {
  const hour = new Date().getHours();
  if (hour < 10) return '今日も一日頑張りましょう！';
  if (hour < 12) return '午前の作業お疲れ様です！';
  if (hour < 14) return 'お昼休憩はとれましたか？';
  if (hour < 16) return '午後も引き続き頑張りましょう！';
  return 'お疲れ様です。日報の提出をお忘れなく！';
}

function SubmissionStatusBanner({
  reports,
  companyInfo,
}: {
  reports: Report[];
  companyInfo: any;
}) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  const todayReport = reports.find((r) => {
    if (!r.reportDate) return false;
    const d = r.reportDate.toDate ? r.reportDate.toDate() : new Date(r.reportDate);
    return format(d, 'yyyy-MM-dd') === todayStr;
  });

  const isSubmitted = todayReport && (todayReport.status === 'submitted' || todayReport.status === 'approved');
  const deadline = companyInfo?.reportDeadline || '18:00';
  const [deadlineH, deadlineM] = deadline.split(':').map(Number);
  const isPastDeadline = now.getHours() > deadlineH || (now.getHours() === deadlineH && now.getMinutes() >= deadlineM);

  if (isSubmitted) {
    return (
      <View style={styles.bannerGreen}>
        <Text style={styles.bannerGreenTitle}>本日の日報は提出済みです</Text>
        <Text style={styles.bannerGreenText}>
          PDF・QRコードを確認するには、下の一覧から該当の日報をタップしてください
        </Text>
      </View>
    );
  }

  if (isPastDeadline) {
    return (
      <View style={styles.bannerOrange}>
        <Text style={styles.bannerOrangeTitle}>提出期限を過ぎています</Text>
        <Text style={styles.bannerOrangeText}>本日の日報がまだ提出されていません</Text>
      </View>
    );
  }

  return (
    <View style={styles.bannerBlue}>
      <Text style={styles.bannerBlueTitle}>{getEncouragementMessage()}</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { currentUser, companyId, companyInfo } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchReports = useCallback(async () => {
    if (!companyId || !currentUser) return;

    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const reportsRef = collection(db, 'companies', companyId, 'dailyReports');
      const q = query(
        reportsRef,
        where('createdBy', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Report))
        .filter((report) => {
          if (!report.reportDate) return false;
          const reportDate = report.reportDate.toDate ? report.reportDate.toDate() : new Date(report.reportDate);
          return reportDate >= startDate && reportDate <= endDate;
        })
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

      setReports(data);
    } catch (error) {
      console.error('日報取得エラー:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId, currentUser, selectedMonth]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'M月d日(E)', { locale: ja });
  };

  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      options.push({ value, label });
    }
    return options;
  };

  const rejectedReports = reports.filter((r) => r.status === 'rejected');

  const handleReportPress = (report: Report) => {
    if (report.status === 'draft' || report.status === 'rejected' || report.status === 'signed') {
      navigation.navigate('ReportEdit', { id: report.id });
    } else {
      navigation.navigate('ReportDetail', { id: report.id });
    }
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={[styles.reportCard, item.status === 'rejected' && styles.reportCardRejected]}
      onPress={() => handleReportPress(item)}
    >
      <View style={styles.reportCardContent}>
        <View>
          <Text style={styles.reportDate}>{formatDate(item.reportDate)}</Text>
          <Text style={styles.reportSite}>{item.siteName}</Text>
          {item.status === 'rejected' && (
            <Text style={styles.reportRejectedText}>修正が必要です</Text>
          )}
        </View>
        <StatusBadge status={item.status || 'draft'} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.content}>
        {!loading && (
          <SubmissionStatusBanner reports={reports} companyInfo={companyInfo} />
        )}

        {rejectedReports.length > 0 && (
          <View style={styles.rejectedBanner}>
            <Text style={styles.rejectedBannerTitle}>! 差戻しされた日報があります</Text>
            <Text style={styles.rejectedBannerText}>
              {rejectedReports.length}件の日報に修正が必要です
            </Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              style={styles.picker}
            >
              {generateMonthOptions().map((opt) => (
                <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            style={styles.newButton}
            onPress={() => navigation.navigate('ReportNew')}
          >
            <Text style={styles.newButtonText}>+ 新規作成</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingSpinner />
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>この月の日報はありません</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReportNew')}>
              <Text style={styles.emptyStateLink}>新しい日報を作成する</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={reports}
            renderItem={renderReport}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  bannerGreen: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bannerGreenTitle: {
    fontWeight: '500',
    color: '#166534',
  },
  bannerGreenText: {
    fontSize: 14,
    color: '#15803d',
    marginTop: 8,
  },
  bannerOrange: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bannerOrangeTitle: {
    fontWeight: '500',
    color: '#9a3412',
  },
  bannerOrangeText: {
    fontSize: 14,
    color: '#c2410c',
    marginTop: 4,
  },
  bannerBlue: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bannerBlueTitle: {
    fontWeight: '500',
    color: '#1e40af',
  },
  rejectedBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rejectedBannerTitle: {
    fontWeight: '500',
    color: '#991b1b',
  },
  rejectedBannerText: {
    fontSize: 14,
    color: '#b91c1c',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginRight: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  newButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reportCardRejected: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reportCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  reportSite: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  reportRejectedText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    marginBottom: 16,
  },
  emptyStateLink: {
    color: '#2563eb',
    fontWeight: '500',
  },
});
