import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import { useFinance, accountName, creditCardName } from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';
import { fmtDate, nextOccurrenceDate, nextParcelInGroup, PERIOD_LABEL } from '../utils/recurrence';

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
    value: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
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
    const pool = transactions.filter(
      (t) => !t?.isTransfer && t?.tipo === 'saída' && t?.gastoTipo && t.gastoTipo !== 'nenhum' && t.periodicidade
    );
    const seenGroup = new Set();
    const rows = [];
    for (const t of pool) {
      if (t.gastoTipo === 'parcelado' && t.parcelaGrupoId) {
        if (seenGroup.has(t.parcelaGrupoId)) continue;
        const sibs = pool.filter((x) => String(x.parcelaGrupoId) === String(t.parcelaGrupoId));
        const rep = nextParcelInGroup(sibs, now) || t;
        seenGroup.add(t.parcelaGrupoId);
        const nextD = rep?.data ? rep.data : t.data;
        rows.push({ tx: rep, next: null, nextLabel: nextD, isParcelGroup: true, groupSize: rep.parcelaTotal });
        continue;
      }
      const next = nextOccurrenceDate(t, now);
      rows.push({
        tx: t,
        next,
        nextLabel: next ? fmtDate(next) : '—',
        isParcelGroup: false,
      });
    }
    return rows.sort((a, b) => {
      const parseRow = (r) => {
        if (r.next) return r.next.getTime();
        if (r.tx?.data) {
          const p = String(r.tx.data).split('/').map(Number);
          if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]).getTime();
        }
        return Number.POSITIVE_INFINITY;
      };
      return parseRow(a) - parseRow(b);
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

        {items.map(({ tx, nextLabel, isParcelGroup, groupSize }) => {
          const where = `${accountName(accounts, tx.accountId)}${tx.creditCardId ? ` · ${creditCardName(creditCards, tx.creditCardId)}` : ''}`;
          const period = PERIOD_LABEL[tx.periodicidade] || tx.periodicidade;
          const kind = tx.gastoTipo === 'fixo' ? 'Fixo' : 'Parcelado';
          const parcelInfo =
            isParcelGroup && tx?.parcelaIndice != null && (groupSize || tx.parcelaTotal)
              ? ` · ${tx.parcelaIndice}/${groupSize || tx.parcelaTotal}`
              : '';
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
                  {kind} · {period}
                  {parcelInfo} · Próxima: {nextLabel}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>{where}</Text>
              </View>
              <Text style={[styles.value, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
                {tx.tipo === 'entrada' ? '+' : '-'}{fmt(Number(tx.valor) || 0)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
