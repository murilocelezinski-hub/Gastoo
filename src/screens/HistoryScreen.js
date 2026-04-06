import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, fmt, CATEGORIES } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import { useFinance } from '../context/FinanceContext';

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { transactions } = useFinance();
  const [filter, setFilter] = useState('Todos');
  const cats = ['Todos', ...CATEGORIES.map((c) => c.name)];
  const filtered =
    filter === 'Todos' ? transactions : transactions.filter((t) => t.categoria === filter);

  return (
    <View style={styles.container}>
      <Header title="Histórico" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {cats.map((c) => (
          <TouchableOpacity key={c} onPress={() => setFilter(c)} style={[styles.pill, filter === c && styles.pillActive]}>
            <Text style={[styles.pillText, filter === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 + insets.bottom }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada</Text>}
        renderItem={({ item: tx }) => (
          <TouchableOpacity
            style={styles.txRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Detail', { tx })}
          >
            <CatIcon category={tx.categoria} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {tx.descricao}
              </Text>
              <Text style={styles.txMeta}>
                {tx.categoria} · {tx.data}
              </Text>
            </View>
            <Text style={[styles.txValue, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
              {tx.tipo === 'entrada' ? '+' : '-'}
              {fmt(tx.valor)}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.offWhite },
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
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
