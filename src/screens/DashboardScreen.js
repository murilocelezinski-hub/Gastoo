import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { fmt } from '../theme';
import { CatIcon } from '../components/Shared';
import {
  useFinance,
  balanceForAccount,
  totalBalance,
  activeAccounts,
  activeCreditCards,
  invoiceKeyFromDateAndCloseDay,
  invoiceLabelPtBr,
} from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { buildBalanceEvolutionSeries } from '../utils/chart';
import { sortTransactionsByDate } from '../utils/txSort';
import { useResponsiveLayout, useMainLayoutDimensions } from '../utils/responsiveLayout';

const BALANCE_MODES = [
  { key: 'current_month', short: 'Mês' },
  { key: 'prev_month', short: 'Ant.' },
  { key: 'last_6m', short: '6 m' },
  { key: 'last_12m', short: '12 m' },
];

function formatTooltipDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

function parseBrDate(s) {
  if (!s) return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function BalanceLineChart({
  points,
  width,
  height,
  lineColor,
  zeroColor,
  mutedColor,
  fmtMoney,
  hidden,
  mask,
  tooltipStyle,
  tooltipDateStyle,
  tooltipValueStyle,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const geom = useMemo(() => {
    const padL = 2;
    const padR = 4;
    const padT = 6;
    const padB = 4;
    const innerW = Math.max(width - padL - padR, 1);
    const innerH = Math.max(height - padT - padB, 1);
    if (!points.length) {
      return { padL, padR, padT, padB, innerW, innerH, coords: [], minV: 0, maxV: 1, span: 1, n: 1, yZero: 0, showZero: false };
    }
    const vals = points.map((p) => p.balance);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (maxV === minV) {
      minV -= 1;
      maxV += 1;
    }
    const span = maxV - minV;
    const n = Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => {
      const x = padL + (i / n) * innerW;
      const y = padT + innerH - ((p.balance - minV) / span) * innerH;
      return { x, y };
    });
    const yZero = padT + innerH - ((0 - minV) / span) * innerH;
    const showZero = yZero >= padT && yZero <= padT + innerH;
    return { padL, padR, padT, padB, innerW, innerH, coords, minV, maxV, span, n, yZero, showZero };
  }, [points, width, height]);

  const xToIndex = useCallback(
    (x) => {
      if (!points.length) return null;
      const { padL, innerW } = geom;
      const nSeg = Math.max(points.length - 1, 1);
      const t = (x - padL) / innerW;
      const i = Math.round(t * nSeg);
      return Math.max(0, Math.min(points.length - 1, i));
    },
    [geom, points.length]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => points.length > 0,
        onMoveShouldSetPanResponder: () => points.length > 0,
        onPanResponderGrant: (e) => setActiveIndex(xToIndex(e.nativeEvent.locationX)),
        onPanResponderMove: (e) => setActiveIndex(xToIndex(e.nativeEvent.locationX)),
        onPanResponderRelease: () => setActiveIndex(null),
        onPanResponderTerminate: () => setActiveIndex(null),
      }),
    [points.length, xToIndex]
  );

  if (!points.length) {
    return (
      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: mutedColor, textAlign: 'center' }}>
        Sem dados neste período
      </Text>
    );
  }

  const { padL, padR, padT, innerW, innerH, coords, yZero, showZero } = geom;
  const pointsStr = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const scrub = activeIndex !== null && coords[activeIndex];
  const pt = scrub ? points[activeIndex] : null;

  return (
    <View style={{ width }}>
      <View {...panResponder.panHandlers} style={{ width, height }}>
        <Svg width={width} height={height}>
          {showZero ? (
            <Line
              x1={padL}
              y1={yZero}
              x2={width - padR}
              y2={yZero}
              stroke={zeroColor}
              strokeWidth={1}
              strokeDasharray="3,5"
            />
          ) : null}
          <Polyline
            points={pointsStr}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {scrub ? (
            <>
              <Line
                x1={coords[activeIndex].x}
                y1={padT}
                x2={coords[activeIndex].x}
                y2={padT + innerH}
                stroke={lineColor}
                strokeWidth={1}
                opacity={0.45}
              />
              <Circle cx={coords[activeIndex].x} cy={coords[activeIndex].y} r={6} fill={lineColor} opacity={0.35} />
              <Circle cx={coords[activeIndex].x} cy={coords[activeIndex].y} r={4} fill={lineColor} />
            </>
          ) : null}
        </Svg>
      </View>
      {scrub && pt ? (
        <View style={tooltipStyle} accessibilityLiveRegion="polite">
          <Text style={tooltipDateStyle} numberOfLines={1}>
            {formatTooltipDate(pt.date)}
          </Text>
          <Text style={tooltipValueStyle}>
            {hidden ? mask : fmtMoney(pt.balance)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const logo = require('../../assets/logo.png');

function createStyles(T, isDesktop, isMobile) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.chocolate },
    logo: { width: 120, height: 36 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 40 : 20,
      paddingBottom: 8,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: T.homeGlass,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    accountsSection: { marginBottom: isDesktop ? 24 : 16 },
    accountsRow: { paddingHorizontal: isDesktop ? 40 : 20, gap: isDesktop ? 16 : 10 },
    accountCard: {
      width: isDesktop ? 160 : 120,
      borderRadius: 16,
      padding: isDesktop ? 16 : 14,
      gap: 4,
      backgroundColor: T.homeGlass,
      borderWidth: 1.5,
      borderColor: T.homeHairline,
    },
    accountCardActive: {
      backgroundColor: 'rgba(240,80,0,0.18)',
      borderColor: T.orange,
    },
    accountCardIcon: { fontSize: isDesktop ? 24 : 20 },
    accountCardName: {
      fontFamily: 'Poppins_400Regular',
      fontSize: isDesktop ? 12 : 11,
      color: T.brandFgMuted,
      marginTop: 2,
    },
    accountCardNameActive: { color: T.brandFg },
    accountCardBalance: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 15 : 13,
      color: T.brandFgMuted,
    },
    accountCardBalanceActive: { color: T.orange },
    saldoCard: {
      backgroundColor: T.orange,
      borderRadius: 20,
      padding: isDesktop ? 32 : 24,
      marginHorizontal: isDesktop ? 40 : 20,
      marginBottom: isDesktop ? 28 : 20,
      shadowColor: T.orange,
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      maxWidth: isDesktop ? 600 : 'auto',
    },
    saldoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eyeBtn: { padding: 4 },
    eyeIcon: { fontSize: 16 },
    saldoLabel: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 14 : 12, color: 'rgba(255,255,255,0.7)' },
    saldoValue: { fontFamily: 'Poppins_100Thin', fontSize: isDesktop ? 48 : 32, color: '#fff', marginVertical: 4 },
    miniLabel: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 11 : 10, color: 'rgba(255,255,255,0.6)' },
    miniValue: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 18 : 15 },
    chartBox: {
      backgroundColor: T.homeGlass,
      borderRadius: 16,
      padding: isDesktop ? 24 : 16,
      marginHorizontal: isDesktop ? 40 : 20,
      marginBottom: isDesktop ? 28 : 20,
      maxWidth: isDesktop ? 800 : 'auto',
    },
    chartHead: { marginBottom: 10 },
    chartTitle: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 15 : 13, color: T.brandFgMuted, marginBottom: 8 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    filterChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: T.homeHairline,
      backgroundColor: 'transparent',
    },
    filterChipOn: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.12)' },
    filterChipText: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.brandFgMuted },
    filterChipTextOn: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: T.orange },
    chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2, gap: 2 },
    chartLabelMini: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.brandFgMuted, flex: 1, textAlign: 'center' },
    chartScrubReadout: {
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.14)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: T.homeHairline,
    },
    chartTooltipDate: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, flex: 1 },
    chartTooltipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.orange, flexShrink: 0 },
    recentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: isDesktop ? 40 : 20,
      marginBottom: 12,
    },
    recentTitle: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 16 : 14, color: T.brandFgMuted },
    seeAllText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.orange },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: isDesktop ? 14 : 10,
      marginHorizontal: isDesktop ? 40 : 20,
      paddingHorizontal: isDesktop ? 12 : 0,
      borderBottomWidth: 1,
      borderBottomColor: T.homeHairline,
    },
    txDesc: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 15 : 14, color: T.brandFg },
    txDate: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 12 : 11, color: T.brandFgMuted },
    txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 15 : 14 },
    fab: {
      position: 'absolute',
      bottom: isDesktop ? 40 : 24,
      right: isDesktop ? 40 : 20,
      width: isDesktop ? 64 : 56,
      height: isDesktop ? 64 : 56,
      borderRadius: isDesktop ? 32 : 28,
      backgroundColor: T.orange,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: T.orange,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabText: { fontSize: isDesktop ? 32 : 28, color: '#fff', fontFamily: 'Poppins_600SemiBold', marginTop: -2 },
  });
}

export default function DashboardScreen({ navigation }) {
  const T = useThemeColors();
  const { profile, transactionListOrder } = useAppPreferences();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const styles = useMemo(() => createStyles(T, isDesktop, isMobile), [T, isDesktop, isMobile]);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { accounts, creditCards, transactions } = useFinance();
  const act = activeAccounts(accounts);
  const activeIds = useMemo(() => new Set(act.map((a) => a.id)), [act]);
  const cardsAct = useMemo(() => activeCreditCards(creditCards), [creditCards]);
  const [hidden, setHidden] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [balanceMode, setBalanceMode] = useState('current_month');
  const mask = '••••••';

  const currentInvoiceKey = useMemo(() => {
    if (!selectedCard) return null;
    const card = creditCards.find((c) => String(c.id) === String(selectedCard));
    if (!card) return null;
    return invoiceKeyFromDateAndCloseDay(new Date(), card.diaFechamento);
  }, [creditCards, selectedCard]);

  const txInvoiceKeyForCard = useCallback((tx, card) => {
    if (!tx || !card) return null;
    if (tx.invoiceKey) return tx.invoiceKey;
    const d = parseBrDate(tx.data);
    if (!d) return null;
    return invoiceKeyFromDateAndCloseDay(d, card.diaFechamento);
  }, []);

  const balanceSeries = useMemo(
    () => buildBalanceEvolutionSeries(accounts, transactions, selectedAccount, balanceMode, new Date()),
    [accounts, transactions, selectedAccount, balanceMode]
  );

  const chartW = isDesktop ? Math.min(760, winW - 160) : Math.max(260, winW - 72);
  const chartH = isDesktop ? 220 : 148;

  const labelIndexes = useMemo(() => {
    const len = balanceSeries.length;
    if (len === 0) return [];
    const maxLabels = Math.min(14, Math.max(6, Math.floor(chartW / 30)));
    if (len <= maxLabels) return balanceSeries.map((_, i) => i);
    const idx = [];
    for (let k = 0; k < maxLabels; k++) {
      idx.push(Math.round((k / (maxLabels - 1)) * (len - 1)));
    }
    return [...new Set(idx)].sort((a, b) => a - b);
  }, [balanceSeries, chartW]);

  const xAxisFontSize = useMemo(() => {
    const n = labelIndexes.length;
    if (n > 11) return 7;
    if (n > 8) return 8;
    return 9;
  }, [labelIndexes.length]);

  const filtered = selectedCard
    ? (() => {
        const card = creditCards.find((c) => String(c.id) === String(selectedCard));
        const ik = currentInvoiceKey;
        if (!card || !ik) return [];
        return transactions.filter((t) => {
          if (String(t.creditCardId) !== String(selectedCard)) return false;
          const txIk = txInvoiceKeyForCard(t, card);
          return txIk === ik;
        });
      })()
    : selectedAccount
      ? transactions.filter((t) => t.accountId === selectedAccount)
      : transactions.filter((t) => activeIds.has(t.accountId));

  const orderedRecent = useMemo(
    () => sortTransactionsByDate(filtered, transactionListOrder).slice(0, 5),
    [filtered, transactionListOrder]
  );

  const baseTotals = selectedCard
    ? filtered
    : selectedAccount
      ? transactions.filter((t) => t.accountId === selectedAccount)
      : transactions.filter((t) => activeIds.has(t.accountId));

  const totalIn = baseTotals.filter((t) => t.tipo === 'entrada' && !t.isTransfer).reduce((a, t) => a + t.valor, 0);
  const totalOut = baseTotals.filter((t) => t.tipo === 'saída' && !t.isTransfer).reduce((a, t) => a + t.valor, 0);

  const invoiceTotal = useMemo(() => {
    if (!selectedCard) return 0;
    return baseTotals
      .filter((t) => !t.isTransfer)
      .reduce((sum, t) => sum + (t.tipo === 'saída' ? t.valor : -t.valor), 0);
  }, [baseTotals, selectedCard]);

  const invoiceTotalsByCard = useMemo(() => {
    const today = new Date();
    const out = new Map();
    for (const c of cardsAct) {
      const ik = invoiceKeyFromDateAndCloseDay(today, c.diaFechamento);
      let total = 0;
      for (const t of transactions) {
        if (String(t.creditCardId) !== String(c.id)) continue;
        if (!ik) continue;
        const txIk = txInvoiceKeyForCard(t, c);
        if (txIk !== ik) continue;
        if (t.isTransfer) continue;
        total += t.tipo === 'saída' ? t.valor : -t.valor;
      }
      out.set(String(c.id), total);
    }
    return out;
  }, [cardsAct, transactions, txInvoiceKeyForCard]);

  const saldo = selectedCard
    ? -invoiceTotal
    : selectedAccount
      ? balanceForAccount(accounts, transactions, selectedAccount)
      : totalBalance(accounts, transactions);

  const saldoLabel = selectedCard
    ? `Fatura ${invoiceLabelPtBr(currentInvoiceKey)}`
    : selectedAccount
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
          {profile.avatarUri ? (
            <Image source={{ uri: profile.avatarUri }} style={{ width: 36, height: 36 }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 18 }}>👤</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        <View style={styles.accountsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {act.length > 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.accountCard, !selectedAccount && !selectedCard && styles.accountCardActive]}
                  onPress={() => {
                    setSelectedAccount(null);
                    setSelectedCard(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountCardIcon}>🌐</Text>
                  <Text style={[styles.accountCardName, !selectedAccount && styles.accountCardNameActive]}>Geral</Text>
                  <Text style={[styles.accountCardBalance, !selectedAccount && styles.accountCardBalanceActive]}>
                    {hidden ? mask : fmt(totalBalance(accounts, transactions))}
                  </Text>
                </TouchableOpacity>

                {act.map((ac) => {
                  const isActive = !selectedCard && selectedAccount === ac.id;
                  const bal = balanceForAccount(accounts, transactions, ac.id);
                  return (
                    <TouchableOpacity
                      key={ac.id}
                      style={[styles.accountCard, isActive && styles.accountCardActive]}
                      onPress={() => {
                        setSelectedCard(null);
                        setSelectedAccount(ac.id);
                      }}
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

                {cardsAct.map((c) => {
                  const isActive = selectedCard && String(selectedCard) === String(c.id);
                  const total = invoiceTotalsByCard.get(String(c.id)) || 0;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.accountCard, isActive && styles.accountCardActive]}
                      onPress={() => {
                        setSelectedAccount(null);
                        setSelectedCard(c.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountCardIcon}>{c.icon}</Text>
                      <Text style={[styles.accountCardName, isActive && styles.accountCardNameActive]}>{c.name}</Text>
                      <Text style={[styles.accountCardBalance, isActive && styles.accountCardBalanceActive]}>
                        {hidden ? mask : fmt(total)}
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
              <Text style={styles.miniLabel}>{selectedCard ? 'Créditos' : 'Entradas'}</Text>
              <Text style={[styles.miniValue, { color: T.gold }]}>{hidden ? mask : `+${fmt(totalIn)}`}</Text>
            </View>
            <View>
              <Text style={styles.miniLabel}>{selectedCard ? 'Compras' : 'Saídas'}</Text>
              <Text style={[styles.miniValue, { color: '#FFB899' }]}>{hidden ? mask : `-${fmt(totalOut)}`}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chartBox}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>Evolução do saldo</Text>
            <View style={styles.filterRow}>
              {BALANCE_MODES.map(({ key, short }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setBalanceMode(key)}
                  style={[styles.filterChip, balanceMode === key && styles.filterChipOn]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterChipText, balanceMode === key && styles.filterChipTextOn]}>{short}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <BalanceLineChart
            points={balanceSeries}
            width={chartW}
            height={chartH}
            lineColor={T.orange}
            zeroColor={T.brandFgMuted}
            mutedColor={T.brandFgMuted}
            fmtMoney={fmt}
            hidden={hidden}
            mask={mask}
            tooltipStyle={styles.chartScrubReadout}
            tooltipDateStyle={styles.chartTooltipDate}
            tooltipValueStyle={styles.chartTooltipValue}
          />
          {balanceSeries.length > 0 ? (
            <View style={styles.chartLabels}>
              {labelIndexes.map((i) => (
                <Text
                  key={i}
                  style={[styles.chartLabelMini, { fontSize: xAxisFontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {balanceSeries[i]?.label}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>{selectedCard ? 'Transações da fatura atual' : 'Transações recentes'}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')}>
            <Text style={styles.seeAllText}>Ver todas →</Text>
          </TouchableOpacity>
        </View>

        {orderedRecent.map((tx) => (
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
