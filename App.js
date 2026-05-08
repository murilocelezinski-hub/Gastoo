import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Poppins_100Thin, Poppins_300Light, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { House, Clock, Sparkle, UserCircle } from 'phosphor-react';
import * as SplashScreenExpo from 'expo-splash-screen';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import { AppPreferencesProvider, useAppPreferences, useThemeColors } from './src/context/AppPreferencesContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Toast } from './src/components/Shared';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
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
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';
import OpenFinanceOnboardingScreen from './src/screens/OpenFinanceOnboardingScreen';

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
  const { user, loading: authLoading } = useAuth();
  const ready = financeReady && prefsReady && !authLoading;
  const navigationRef = useRef(null);
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

  useEffect(() => {
    if (!ready || !fontsLoaded) return;
    if (navigationRef.current) {
      if (user) {
        navigationRef.current.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
  }, [user, ready, fontsLoaded]);

  if (!fontsLoaded || !ready) return null;

  const initialRoute = user ? 'Main' : 'Login';

  return (
    <View
      style={{
        flex: 1,
        ...(Platform.OS === 'web' ? { minHeight: '100vh', backgroundColor: '#000' } : null),
      }}
    >
      <NavigationContainer
        ref={navigationRef}
        onReady={onLayoutReady}
        documentTitle={{
          formatter: (options, route) => options?.title || route?.name || 'Gastoo',
        }}
      >
        <ThemedStatusBar />
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          initialRouteName={initialRoute}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Main" options={{ animation: 'fade', title: 'Gastoo' }}>
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
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
          <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
          <Stack.Screen name="OpenFinanceOnboarding" component={OpenFinanceOnboardingScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
      <ToastHost />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FinanceProvider>
          <AppPreferencesProvider>
            <AppNavigation />
          </AppPreferencesProvider>
        </FinanceProvider>
      </AuthProvider>
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
            <House size={22} weight="fill" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: ({ color }) => (
            <Clock size={22} weight="fill" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ProjectionScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ color }) => (
            <Sparkle size={22} weight="fill" color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileMenuScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => (
            <UserCircle size={22} weight="fill" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
