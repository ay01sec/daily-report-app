import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportNewScreen from '../screens/ReportNewScreen';
import ReportEditScreen from '../screens/ReportEditScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import HelpScreen from '../screens/HelpScreen';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  ReportNew: undefined;
  ReportEdit: { id: string };
  ReportDetail: { id: string };
  Help: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { currentUser } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {currentUser ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ReportNew" component={ReportNewScreen} />
            <Stack.Screen name="ReportEdit" component={ReportEditScreen} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
