import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fmt, T } from '../theme';
import { categorizeTransaction } from '../services/ai';
import { useFinance } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { getCategoryIcon } from '../components/CategoryIcons';

function createAICategoryStyles(T) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: T.chocolate,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingBox: { alignItems: 'center', gap: 16 },
    loadingTitle: { fontFamily: 'Poppins_300Light', fontSize: 16, color: T.brandFg },
    loadingSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed },
    resultBox: { alignItems: 'center', width: '100%' },
    resultLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed, marginBottom: 16 },
    catIcon: {
      width: 72,
      height: 72,
      // Circular conforme Design System
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    catName: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: T.brandFg, marginBottom: 6 },
    txInfo: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed, marginBottom: 4 },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
    correctBtn: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.homeHairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    correctBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.brandFg },
    confirmBtn: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      backgroundColor: T.orange,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.orange,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    confirmBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.white },
  });
}

export default function AICategoryScreen({ navigation, route }) {
  const { txData, excludeCategories } = route.params;
  const T = useThemeColors();
  const styles = useMemo(() => createAICategoryStyles(T), [T]);
  const { categories } = useAppPreferences();
  const { addTransaction, addInstallmentTransactions, showToast } = useFinance();
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const [hasError, setHasError] = useState(false);

  const goManual = () =>
    navigation.navigate('ManualCategory', {
      txData,
      excludeCategories: excludeCategories || ['Transferência'],
      returnTo: null,
    });

  useEffect(() => {
    const controller = new AbortController();
    // Aborta automaticamente após 10 segundos para evitar loading infinito
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    (async () => {
      setLoading(true);
      setHasError(false);
      try {
        const result = await categorizeTransaction(txData.descricao, txData.valor, categories, controller.signal);
        setSuggestion(result.category);
        setLoading(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setLoading(false);
          setHasError(true);
        }
      }
    })();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [txData.descricao, txData.valor, categories]);

  const handleConfirm = () => {
    const newTx = {
      ...txData,
      categoria: suggestion.name,
      obs: '',
      criado_por_ia: true,
    };
    if (newTx.gastoTipo === 'parcelado') {
      addInstallmentTransactions(newTx);
      showToast('Parcelas salvas! ✓');
    } else {
      addTransaction(newTx);
      showToast('Transação salva! ✓');
    }
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
      ) : hasError ? (
        <View style={styles.resultBox}>
          <Text style={[styles.catName, { fontSize: 16 }]}>Não foi possível categorizar</Text>
          <Text style={[styles.txInfo, { marginTop: 8, textAlign: 'center' }]}>
            Verifique sua conexão e tente novamente, ou escolha a categoria manualmente.
          </Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.correctBtn} activeOpacity={0.7} onPress={goManual}>
              <Text style={styles.correctBtnText}>Escolher categoria</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : suggestion ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Sugestão da IA</Text>

          <View style={[styles.catIcon, { backgroundColor: suggestion.color }]}>
            {(() => { const Icon = getCategoryIcon(suggestion.name); return <Icon size={36} color="#fff" />; })()}
          </View>

          <Text style={styles.catName}>{suggestion.name}</Text>
          <Text style={styles.txInfo}>
            {txData.descricao} · {fmt(txData.valor)}
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.correctBtn}
              activeOpacity={0.7}
              onPress={goManual}
              accessibilityLabel="Corrigir categoria sugerida"
            >
              <Text style={styles.correctBtnText}>Corrigir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm} accessibilityLabel="Confirmar categoria sugerida">
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}
