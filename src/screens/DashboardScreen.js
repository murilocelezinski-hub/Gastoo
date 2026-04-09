import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { CatIcon } from '../components/Shared';
import {
  useFinance,
  balanceForAccount,
  totalBalance,
  activeAccounts,
} from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';
import { buildChartData } from '../utils/chart';

const logo = require('../../assets/logo.png');

function createStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.chocolate },
    logo: { width: 120, height: 36 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountsSection: { marginBottom: 16 },
    accountsRow: { paddingHorizontal: 20, gap: 10 },
    accountCard: {
      width: 120,
      borderRadius: 16,
      padding: 14,
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    accountCardActive: {
      backgroundColor: 'rgba(240,80,0,0.15)',
      borderColor: T.orange,
    },
    accountCardIcon: { fontSize: 20 },
    accountCardName: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 11,
      color: T.grayMed,
      marginTop: 2,
    },
    accountCardNameActive: { color: '#fff' },
    accountCardBalance: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
      color: T.graySilver,
    },
    accountCardBalanceActive: { color: T.orange },
    saldoCard: {
      backgroundColor: T.orange,
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 20,
      marginBottom: 20,
      shadowColor: T.orange,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    saldoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eyeBtn: { padding: 4 },
    eyeIcon: { fontSize: 16 },
    saldoLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    saldoValue: { fontFamily: 'Poppins_100Thin', fontSize: 32, color: '#fff', marginVertical: 4 },
    miniLabel: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.6)' },
    miniValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
    chartBox: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 20,
    },
    chartTitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graySilver, marginBottom: 14 },
    chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
    chartCol: { alignItems: 'center', gap: 4 },
    chartLabel: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.grayMed },
    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 2 },
    legendText: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.grayMed },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 12,
    },
    recentTitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.graySilver },
    seeAllText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.orange },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      marginHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    txDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#fff' },
    txDate: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: T.orange,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.orange,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabText: { fontSize: 28, color: '#fff', fontFamily: 'Poppins_600SemiBold', marginTop: -2 },
  });
}

export default function DashboardScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { accounts, transactions } = useFinance();
  const act = activeAccounts(accounts);
  const activeIds = useMemo(() => new Set(act.map((a) => a.id)), [act]);
  const [hidden, setHidden] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const mask = '••••••';

  const chartTx = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount)
    : transactions.filter((t) => activeIds.has(t.accountId));
  const chartData = buildChartData(chartTx);
  const maxVal = Math.max(...chartData.map((d) => Math.max(d.income, d.expense)), 1);

  const filtered = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount)
    : transactions.filter((t) => activeIds.has(t.accountId));

  const baseTotals = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount)
    : transactions.filter((t) => activeIds.has(t.accountId));
  const totalIn = baseTotals
    .filter((t) => t.tipo === 'entrada' && !t.isTransfer)
    .reduce((a, t) => a + t.valor, 0);
  const totalOut = baseTotals
    .filter((t) => t.tipo === 'saída' && !t.isTransfer)
    .reduce((a, t) => a + t.valor, 0);

  const saldo = selectedAccount
    ? balanceForAccount(accounts, transactions, selectedAccount)
    : totalBalance(accounts, transactions);

  const saldoLabel = selectedAccount
    ? accounts.find((a) => a.id === selectedAccount)?.name ?? 'Conta'
    : 'Saldo geral';

  return (
    <View style={styles.container}>
      <View style={[styles.headerRow, { paddingTop: Math.max(52, 12 + insets.top) }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('ProfileMenu')}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18 }}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <View style={styles.accountsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            <TouchableOpacity
              style={styles.accountCard}
              onPress={() => navigation.navigate('ProfileMenu')}
              activeOpacity={0.7}
            >
              <Text style={styles.accountCardIcon}>⚙️</Text>
              <Text style={styles.accountCardName}>Perfil</Text>
              <Text style={[styles.accountCardBalance, { fontSize: 11 }]}>Ajustes</Text>
            </TouchableOpacity>

            {act.length > 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.accountCard, !selectedAccount && styles.accountCardActive]}
                  onPress={() => setSelectedAccount(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountCardIcon}>🌐</Text>
                  <Text style={[styles.accountCardName, !selectedAccount && styles.accountCardNameActive]}>Geral</Text>
                  <Text style={[styles.accountCardBalance, !selectedAccount && styles.accountCardBalanceActive]}>
                    {hidden ? mask : fmt(totalBalance(accounts, transactions))}
                  </Text>
                </TouchableOpacity>

                {act.map((ac) => {
                  const isActive = selectedAccount === ac.id;
                  const bal = balanceForAccount(accounts, transactions, ac.id);
                  return (
                    <TouchableOpacity
                      key={ac.id}
                      style={[styles.accountCard, isActive && styles.accountCardActive]}
                      onPress={() => setSelectedAccount(ac.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountCardIcon}>{ac.icon}</Text>
                      <Text style={[styles.accountCardName, isActive && styles.accountCardNameActive]}>{ac.name}</Text>
                      <Text style={[styles.accountCardBalance, isActive && styles.accountCardBalanceActive]}>
                        {hidden ? mask : fmt(bal)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : null}
          </ScrollView>
        </View>

        <View style={[styles.saldoCard, saldo < 0 && { borderWidth: 2, borderColor: T.burnt }]}>
          <View style={styles.saldoHeader}>
            <Text style={styles.saldoLabel}>{saldoLabel}</Text>
            <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={12} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{hidden ? '👁' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.saldoValue}>{hidden ? mask : fmt(saldo)}</Text>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View>
              <Text style={styles.miniLabel}>Entradas</Text>
              <Text style={[styles.miniValue, { color: T.gold }]}>{hidden ? mask : `+${fmt(totalIn)}`}</Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>Saídas</Text>
              <Text style={[styles.miniValue, { color: '#FFB899' }]}>{hidden ? mask : `-${fmt(totalOut)}`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartBox}>
          <Text style={styles.chartTitle}>Últimos 6 meses</Text>
          <View style={styles.chartRow}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.chartCol}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100 }}>
                  <View
                    style={{
                      width: 10,
                      height: (d.income / maxVal) * 100,
                      backgroundColor: T.gold,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                      opacity: 0.5,
                    }}
                  />
                  <View
                    style={{
                      width: 10,
                      height: (d.expense / maxVal) * 100,
                      backgroundColor: T.orange,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                </View>
                <Text style={styles.chartLabel}>{d.month}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: T.gold, opacity: 0.5 }]} />
              <Text style={styles.legendText}>Entradas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: T.orange }]} />
              <Text style={styles.legendText}>Saídas</Text>
            </View>
          </View>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Transações recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllText}>Ver todas →</Text>
          </TouchableOpacity>
        </View>

        {filtered.slice(0, 5).map((tx) => (
          <TouchableOpacity
            key={tx.id}
            style={styles.txRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Detail', { tx })}
          >
            <CatIcon category={tx.categoria} size={38} />
            <View style={{ flex: 1 }}>
              <Text style={styles.txDesc} numberOfLines={1}>
                {tx.descricao}
              </Text>
              <Text style={styles.txDate}>{tx.data}</Text>
            </View>
            <Text style={[styles.txValue, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
              {tx.tipo === 'entrada' ? '+' : '-'}
              {fmt(tx.valor)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => navigation.navigate('NewTransaction')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
