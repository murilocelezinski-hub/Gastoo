import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';
import { syncBankData } from '../services/openFinanceService';
import { BANKS } from '../utils/mockDataHelpers';
import { useFinance } from '../context/FinanceContext';

const CONNECT_MESSAGES = [
  { delay: 0,    text: 'Conectando ao banco...' },
  { delay: 1000, text: 'Criptografando dados...' },
  { delay: 2200, text: 'Importando extratos...' },
];

export default function OpenFinanceOnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addTransaction, setIsSyncing, accounts } = useFinance();
  const [step, setStep] = useState('select');
  const [selectedBank, setSelectedBank] = useState(null);
  const [connectingMessage, setConnectingMessage] = useState('');

  function startConnection(bank) {
    setSelectedBank(bank);
    setStep('connecting');
    setConnectingMessage(CONNECT_MESSAGES[0].text);

    CONNECT_MESSAGES.slice(1).forEach(({ delay, text }) => {
      setTimeout(() => setConnectingMessage(text), delay);
    });

    setTimeout(async () => {
      await syncBankData(bank, addTransaction, setIsSyncing, accounts[0]?.id);
      navigation.navigate('Main');
    }, 3200);
  }

  if (step === 'connecting' && selectedBank) {
    return (
      <View style={styles.connectingContainer}>
        <View style={[styles.bankCircleLg, { backgroundColor: selectedBank.color }]}>
          <Text style={styles.bankInitialLg}>{selectedBank.initial}</Text>
        </View>
        <ActivityIndicator size="large" color={T.orange} style={{ marginTop: 24 }} />
        <Text style={styles.connectingMsg}>{connectingMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(52, 12 + insets.top) }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} activeOpacity={0.7}>
          <Text style={styles.backBtn}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Conectar banco</Text>
      </View>
      <Text style={styles.subtitle}>
        Selecione seu banco para importar transações automaticamente
      </Text>
      <FlatList
        data={BANKS}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bankCard}
            activeOpacity={0.75}
            onPress={() => startConnection(item)}
          >
            <View style={[styles.bankCircle, { backgroundColor: item.color }]}>
              <Text style={styles.bankInitial}>{item.initial}</Text>
            </View>
            <Text style={styles.bankName}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.offWhite ?? '#F7F7F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
  },
  backBtn: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: T.orange,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: T.graphite ?? '#333333',
  },
  subtitle: {
    fontFamily: 'Poppins_300Light',
    fontSize: 13,
    color: T.brandFgMuted ?? '#888',
    paddingHorizontal: 16,
    marginBottom: 20,
    lineHeight: 20,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 32,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  bankCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.grayVLight ?? '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  bankCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInitial: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  bankName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: T.graphite ?? '#333333',
  },
  connectingContainer: {
    flex: 1,
    backgroundColor: T.offWhite ?? '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bankCircleLg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankInitialLg: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  connectingMsg: {
    fontFamily: 'Poppins_300Light',
    fontSize: 14,
    color: T.brandFgMuted ?? '#888',
    textAlign: 'center',
    marginTop: 16,
  },
});
