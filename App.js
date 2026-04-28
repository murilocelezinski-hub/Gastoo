import React, { useCallback } from 'react';
import { Platform, Text, View } from 'react-native';
import Svg, { Path, Rect, Circle, Polyline, Line } from 'react-native-svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Poppins_100Thin, Poppins_300Light, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import * as SplashScreenExpo from 'expo-splash-screen';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import { AppPreferencesProvider, useAppPreferences, useThemeColors } from './src/context/AppPreferencesContext';
import { Toast } from './src/components/Shared';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import DetailScreen from './src/screens/DetailScreen';
import NewTransactionScreen from './src/screens/NewTransactionScreen';
import AICategoryScreen from './src/screens/AICategoryScreen';
import ManualCategoryScreen from './src/screens/ManualCategoryScreen';
import ProjectionScreen from './src/screens/ProjectionScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import CreditCardsScreen from './src/screens/CreditCardsScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import ProfileMenuScreen from './src/screens/ProfileMenuScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import CategoriesSettingsScreen from './src/screens/CategoriesSettingsScreen';
import SpendingGoalsScreen from './src/screens/SpendingGoalsScreen';
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';

SplashScreenExpo.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

function ToastHost() {
  const { toast } = useFinance();
  return <Toast message={toast || ''} show={!!toast} />;
}

function ThemedStatusBar() {
  const { themeMode } = useAppPreferences();
  return <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />;
}

function AppNavigation() {
  const { ready: financeReady } = useFinance();
  const { ready: prefsReady } = useAppPreferences();
  const ready = financeReady && prefsReady;
  const [fontsLoaded] = useFonts({
    Poppins_100Thin,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_600SemiBold,
  });

  const onLayoutReady = useCallback(async () => {
    if (fontsLoaded && ready) {
      await SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  // Sem backend de usuários: abre direto no app. Com auth: trocar para initialRouteName="Splash" no Stack abaixo.
  return (
    <View
      style={{
        flex: 1,
        ...(Platform.OS === 'web' ? { minHeight: '100vh', backgroundColor: '#000' } : null),
      }}
    >
      <NavigationContainer onReady={onLayoutReady}>
        <ThemedStatusBar />
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          initialRouteName="Main"
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" options={{ animation: 'fade' }}>
            {() => <MainTabs />}
          </Stack.Screen>
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Detail" component={DetailScreen} />
          <Stack.Screen name="NewTransaction" component={NewTransactionScreen} />
          <Stack.Screen name="AICategory" component={AICategoryScreen} />
          <Stack.Screen name="ManualCategory" component={ManualCategoryScreen} />
          <Stack.Screen name="Reports" component={ProjectionScreen} />
          <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="CreditCards" component={CreditCardsScreen} />
          <Stack.Screen name="Recurring" component={RecurringScreen} />
          <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
          <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <ToastHost />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <FinanceProvider>
        <AppPreferencesProvider>
          <AppNavigation />
        </AppPreferencesProvider>
      </FinanceProvider>
    </SafeAreaProvider>
  );
}

const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 16 : 10);
  const theme = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.chocolate,
          borderTopColor: theme.homeHairline,
          height: (Platform.OS === 'web' ? 64 : 56) + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarActiveTintColor: theme.orange,
        tabBarInactiveTintColor: theme.brandFgMuted,
        tabBarLabelStyle: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: -2 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color }) => (
            // Ícone casa — linha fina minimalista
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
              <Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color }) => (
            // Ícone lista — linha fina minimalista
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} strokeWidth={1.6} />
              <Line x1="7" y1="9" x2="17" y2="9" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
              <Line x1="7" y1="13" x2="14" y2="13" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ProjectionScreen}
        options={{
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ color }) => (
            // Ícone barras empilhadas — linha fina minimalista
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="13" width="4" height="8" rx="1" stroke={color} strokeWidth={1.6} />
              <Rect x="10" y="8" width="4" height="13" rx="1" stroke={color} strokeWidth={1.6} />
              <Rect x="17" y="4" width="4" height="17" rx="1" stroke={color} strokeWidth={1.6} />
            </Svg>
          ),
        }}
      />
      <Tab.Screen
        name="SpendingGoalsTab"
        component={SpendingGoalsScreen}
        options={{
          tabBarLabel: 'Metas',
          tabBarIcon: ({ color }) => (
            // Ícone alvo/meta — linha fina minimalista
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.6} />
              <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={1.6} />
              <Circle cx="12" cy="12" r="1.5" fill={color} />
            </Svg>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
