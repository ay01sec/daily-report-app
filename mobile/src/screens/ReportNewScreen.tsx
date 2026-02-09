import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Header from '../components/common/Header';
import ReportForm from '../components/report/ReportForm';
import SignatureModal from '../components/report/SignatureModal';

type RootStackParamList = {
  Home: undefined;
  ReportNew: undefined;
  ReportEdit: { id: string };
};

type ReportNewScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReportNew'>;
};

interface FormData {
  reportDate: string;
  siteId: string;
  siteName: string;
  weather: string;
  workers: any[];
  notes: string;
  photos: any[];
}

export default function ReportNewScreen({ navigation }: ReportNewScreenProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [currentLocalReportId, setCurrentLocalReportId] = useState<string | null>(null);
  const [currentFormData, setCurrentFormData] = useState<FormData | null>(null);

  const handleSignatureRequest = (reportId: string | null, formData: FormData, localReportId: string) => {
    setCurrentReportId(reportId);
    setCurrentLocalReportId(localReportId);
    setCurrentFormData(formData);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = (signedOffline?: boolean) => {
    setShowSignatureModal(false);
    if (signedOffline) {
      // オフラインで署名完了した場合はホームに戻る
      navigation.navigate('Home');
    } else if (currentReportId) {
      navigation.replace('ReportEdit', { id: currentReportId });
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSignatureCancel = () => {
    setShowSignatureModal(false);
    if (currentReportId) {
      navigation.replace('ReportEdit', { id: currentReportId });
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSaved = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>新規日報作成</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>戻る</Text>
          </TouchableOpacity>
        </View>
        <ReportForm
          onSignatureRequest={handleSignatureRequest}
          onSaved={handleSaved}
        />
      </View>

      {showSignatureModal && (
        <SignatureModal
          visible={showSignatureModal}
          reportId={currentReportId || ''}
          localReportId={currentLocalReportId || undefined}
          siteName={currentFormData?.siteName}
          reportDate={currentFormData?.reportDate}
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
});
