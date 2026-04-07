import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
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

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer onReady={onLayoutReady}>
        <ThemedStatusBar />
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          initialRouteName="Splash"
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
          <Stack.Screen name="Projection" component={ProjectionScreen} />
          <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
          <Stack.Screen name="Accounts" component={AccountsScreen} />
          <Stack.Screen name="CreditCards" component={CreditCardsScreen} />
          <Stack.Screen name="Recurring" component={RecurringScreen} />
          <Stack.Screen name="ProfileMenu" component={ProfileMenuScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="CategoriesSettings" component={CategoriesSettingsScreen} />
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
  const bottomPad = Math.max(insets.bottom, 10);
  const T = useThemeColors();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.chocolate,
          borderTopColor: 'rgba(255,255,255,0.08)',
          height: 56 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarActiveTintColor: T.orange,
        tabBarInactiveTintColor: T.grayMed,
        tabBarLabelStyle: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Histórico',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="ProjectionTab"
        component={ProjectionScreen}
        options={{
          tabBarLabel: 'Projeção',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
