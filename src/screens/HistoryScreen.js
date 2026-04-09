import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, fmt, CATEGORIES } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import { useFinance } from '../context/FinanceContext';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function groupByMonth(txList) {
  const map = {};
  txList.forEach((tx) => {
    const parts = tx.data.split('/'); // DD/MM/YYYY
    const key = parts.length === 3 ? `${parts[2]}-${parts[1]}` : 'Desconhecido';
    if (!map[key]) map[key] = [];
    map[key].push(tx);
  });
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [year, month] = key.split('-');
      const label = key === 'Desconhecido' ? 'Desconhecido' : `${MONTHS_PT[parseInt(month, 10) - 1]} ${year}`;
      const total = map[key].reduce((sum, t) => sum + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);
      return { key, label, total, data: map[key] };
    });
}

const TIPO_OPTIONS = [
  { key: 'todos', label: 'Todos' },
  { key: 'entrada', label: 'Receitas' },
  { key: 'saída', label: 'Despesas' },
];

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { transactions } = useFinance();
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [filter, setFilter] = useState('Todos');
  const cats = ['Todos', ...CATEGORIES.map((c) => c.name)];

  const byTipo = tipoFilter === 'todos' ? transactions : transactions.filter((t) => t.tipo === tipoFilter);
  const filtered = filter === 'Todos' ? byTipo : byTipo.filter((t) => t.categoria === filter);

  const groups = groupByMonth(filtered);

  const listData = groups.flatMap((g) => [
    { type: 'header', key: `h-${g.key}`, label: g.label, total: g.total },
    ...g.data.map((tx) => ({ type: 'tx', key: String(tx.id), tx })),
  ]);

  return (
    <View style={styles.container}>
      <Header title="Histórico" />

      <View style={styles.tipoToggle}>
        {TIPO_OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => setTipoFilter(o.key)}
            style={[styles.tipoBtn, tipoFilter === o.key && styles.tipoBtnActive]}
          >
            <Text style={[styles.tipoText, tipoFilter === o.key && styles.tipoTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {cats.map((c) => (
          <TouchableOpacity key={c} onPress={() => setFilter(c)} style={[styles.pill, filter === c && styles.pillActive]}>
            <Text style={[styles.pillText, filter === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        style={{ flex: 1 }}
        data={listData}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada</Text>}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>{item.label}</Text>
                <Text style={[styles.monthTotal, { color: item.total >= 0 ? T.gold : T.burnt }]}>
                  {item.total >= 0 ? '+' : ''}{fmt(item.total)}
                </Text>
              </View>
            );
          }
          const { tx } = item;
          return (
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
              <Text style={[styles.txValue, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
                {tx.tipo === 'entrada' ? '+' : '-'}{fmt(tx.valor)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.offWhite },
  tipoToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: T.graySilver,
  },
  tipoBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: T.white },
  tipoBtnActive: { backgroundColor: T.orange },
  tipoText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite },
  tipoTextActive: { color: T.white },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.graySilver,
  },
  pillActive: { backgroundColor: T.orange, borderColor: T.orange },
  pillText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
  pillTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.white },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: T.offWhite,
  },
  monthLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite },
  monthTotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.grayVLight,
  },
  txDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.graphite },
  txMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
  txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: T.grayMed,
    textAlign: 'center',
    marginTop: 40,
  },
});
