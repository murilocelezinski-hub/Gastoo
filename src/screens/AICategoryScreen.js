import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { T, fmt } from '../theme';
import { categorizeTransaction } from '../services/ai';
import { useFinance } from '../context/FinanceContext';

export default function AICategoryScreen({ navigation, route }) {
  const { txData, excludeCategories } = route.params;
  const { addTransaction, showToast } = useFinance();
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await categorizeTransaction(txData.descricao, txData.valor);
      setSuggestion(result.category);
      setLoading(false);
    })();
  }, []);

  const handleConfirm = () => {
    const newTx = {
      ...txData,
      categoria: suggestion.name,
      obs: '',
      criado_por_ia: true,
    };
    addTransaction(newTx);
    showToast('Transação salva! ✓');
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={T.orange} />
          <Text style={styles.loadingTitle}>Analisando com IA...</Text>
          <Text style={styles.loadingSubtitle}>Categorizando "{txData.descricao}"</Text>
        </View>
      ) : suggestion ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Sugestão da IA</Text>

          <View style={[styles.catIcon, { backgroundColor: suggestion.color }]}>
            <Text style={{ fontSize: 36 }}>{suggestion.icon}</Text>
          </View>

          <Text style={styles.catName}>{suggestion.name}</Text>
          <Text style={styles.txInfo}>
            {txData.descricao} · {fmt(txData.valor)}
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.correctBtn}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ManualCategory', {
                  txData,
                  excludeCategories: excludeCategories || ['Transferência'],
                  returnTo: null,
                })
              }
            >
              <Text style={styles.correctBtnText}>Corrigir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.chocolate,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingBox: { alignItems: 'center', gap: 16 },
  loadingTitle: { fontFamily: 'Poppins_300Light', fontSize: 16, color: T.white },
  loadingSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed },
  resultBox: { alignItems: 'center', width: '100%' },
  resultLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed, marginBottom: 16 },
  catIcon: {
    width: 72,
    height: 72,
    borderRadius: 72 * 0.23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  catName: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: T.white, marginBottom: 6 },
  txInfo: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
  correctBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  correctBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.white },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: T.orange,
    alignItems: 'center',
    shadowColor: T.orange,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.white },
});
