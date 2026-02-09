import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import OnlineStatus from './OnlineStatus';

type RootStackParamList = {
  Home: undefined;
  Help: undefined;
  Login: undefined;
};

export default function Header() {
  const { userInfo, companyInfo, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleHelp = () => {
    navigation.navigate('Help');
  };

  return (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <View style={styles.leftContainer}>
            <Text style={styles.title}>作業日報</Text>
            {companyInfo && (
              <Text style={styles.companyName}>{companyInfo.companyName}</Text>
            )}
          </View>
          <View style={styles.rightContainer}>
            {userInfo && (
              <Text style={styles.userName} numberOfLines={1}>
                {userInfo.displayName || userInfo.email}
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleHelp}>
              <Text style={styles.buttonText}>ヘルプ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleLogout}>
              <Text style={styles.buttonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <OnlineStatus />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2563eb',
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  companyName: {
    fontSize: 12,
    color: '#bfdbfe',
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  userName: {
    fontSize: 12,
    color: '#bfdbfe',
    maxWidth: 80,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
  },
});
