import { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../context/AppPreferencesContext';
import { Header, CatIcon } from '../components/Shared';
import { useFinance, invoiceLabelPtBr } from '../context/FinanceContext';
import { fmt } from '../theme';
import { useResponsiveLayout } from '../utils/responsiveLayout';

export default function InvoiceDetailScreen({ navigation, route }) {
  const { invoiceKey, cardName } = route.params;
  const T = useThemeColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useFinance();
  const { isDesktop } = useResponsiveLayout();
  const styles = useMemo(() => createStyles(T, isDesktop), [T, isDesktop]);

  const items = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.creditCardId &&
          t.invoiceKey === invoiceKey &&
          !t.__virtualRecurring
      ),
    [transactions, invoiceKey]
  );

  const total = useMemo(() => items.reduce((s, t) => s + (t.tipo === 'saída' ? t.valor : -t.valor), 0), [items]);

  const label = invoiceLabelPtBr(invoiceKey);

  return (
    <View style={styles.container}>
      <Header title={`Fatura ${label}`} onBack={() => navigation.goBack()} />

      <View style={styles.summary}>
        <Text style={styles.cardName}>{cardName}</Text>
        <Text style={styles.totalLabel}>Total da fatura</Text>
        <Text style={styles.totalValue}>-{fmt(total)}</Text>
        <Text style={styles.itemCount}>{items.length} {items.length === 1 ? 'lançamento' : 'lançamentos'}</Text>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: isDesktop ? 40 : 20, paddingBottom: 40 + insets.bottom }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum gasto nesta fatura</Text>}
        renderItem={({ item: tx }) => (
          <TouchableOpacity
            style={styles.txRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Detail', { tx })}
          >
            <CatIcon category={tx.categoria} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>{tx.descricao}</Text>
              <Text style={styles.txMeta}>{tx.categoria} · {tx.data}</Text>
            </View>
            <Text style={[styles.txValue, { color: T.burnt }]}>
              -{fmt(tx.valor)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function createStyles(T, isDesktop) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },
    summary: {
      backgroundColor: T.white,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: T.grayVLight,
      paddingVertical: 20,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 4,
    },
    cardName: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed },
    totalLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, marginTop: 8 },
    totalValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 28, color: T.burnt },
    itemCount: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayNeutral },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    txDesc: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 15 : 14, color: T.graphite },
    txMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 15 : 14 },
    emptyText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: T.grayMed,
      textAlign: 'center',
      marginTop: 40,
    },
  });
}
