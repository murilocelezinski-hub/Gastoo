import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import { useFinance, accountName, creditCardName } from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';
import { fmtDate, nextOccurrenceDate, PERIOD_LABEL } from '../utils/recurrence';

function createRecurringStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: T.grayVLight,
    },
    title: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
    meta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginTop: 2 },
    sub: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.grayNeutral, marginTop: 2 },
    value: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.burnt },
    emptyBox: {
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: T.grayVLight,
    },
    emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
    emptySub: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.grayMed, marginTop: 6, lineHeight: 18 },
  });
}

export default function RecurringScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createRecurringStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { transactions, accounts, creditCards } = useFinance();

  const items = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => !t?.isTransfer && t?.tipo === 'saída' && t?.gastoTipo && t.gastoTipo !== 'nenhum' && t.periodicidade)
      .map((t) => {
        const next = nextOccurrenceDate(t, now);
        return {
          tx: t,
          next,
          nextLabel: next ? fmtDate(next) : '—',
        };
      })
      .sort((a, b) => {
        const at = a.next ? a.next.getTime() : Number.POSITIVE_INFINITY;
        const bt = b.next ? b.next.getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
      });
  }, [transactions]);

  return (
    <View style={styles.container}>
      <Header title="Recorrências" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom, gap: 12 }}>
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Nenhuma recorrência cadastrada</Text>
            <Text style={styles.emptySub}>
              Marque uma transação como "Fixo" ou "Parcelado" para ela aparecer aqui.
            </Text>
          </View>
        ) : null}

        {items.map(({ tx, nextLabel }) => {
          const where = `${accountName(accounts, tx.accountId)}${tx.creditCardId ? ` · ${creditCardName(creditCards, tx.creditCardId)}` : ''}`;
          const period = PERIOD_LABEL[tx.periodicidade] || tx.periodicidade;
          const kind = tx.gastoTipo === 'fixo' ? 'Fixo' : 'Parcelado';
          return (
            <TouchableOpacity
              key={String(tx.id)}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Detail', { tx })}
            >
              <CatIcon category={tx.categoria} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{tx.descricao}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {kind} · {period} · Próxima: {nextLabel}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>{where}</Text>
              </View>
              <Text style={styles.value}>-{fmt(Number(tx.valor) || 0)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
