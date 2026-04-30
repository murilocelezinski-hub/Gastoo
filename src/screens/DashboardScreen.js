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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Polygon, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { CreditCard } from 'phosphor-react';
import { ChevronRightIcon } from '../components/ActionIcons';
import { fmt, T } from '../theme';
import {
  useFinance,
  balanceForAccount,
  totalBalance,
  activeAccounts,
  activeCreditCards,
  invoiceKeyFromDateAndCloseDay,
  invoiceLabelPtBr,
  isTransactionEffectiveOnOrBefore,
  creditCardName,
} from '../context/FinanceContext';
import { CatIcon } from '../components/Shared';
import BankIcon from '../components/BankIcon';
import { AccountIcon } from '../components/AccountIcon';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { buildBalanceEvolutionSeries, parseBrDate } from '../utils/chart';
import { formatLastSync } from '../services/openFinanceService';
import { sortTransactionsByDate } from '../utils/txSort';
import { useResponsiveLayout, useMainLayoutDimensions } from '../utils/responsiveLayout';

const BALANCE_MODES = [
  { key: 'current_month', short: 'Mês' },
  { key: 'prev_month', short: 'Ant.' },
  { key: 'last_6m', short: '6 m' },
  { key: 'last_12m', short: '12 m' },
];

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const THIS_YEAR = new Date().getFullYear();

function offsetMonth(month, year, delta) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1; y += 1; }
  if (m < 1)  { m = 12; y -= 1; }
  return { month: m, year: y };
}

function monthLabel(month, year) {
  const name = MONTHS_PT[month - 1];
  return year !== THIS_YEAR ? `${name} ${year}` : name;
}

function formatTooltipDate(d) {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

function fmtYLabel(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${Math.round(v / 1_000)}k`;
  return `${Math.round(v)}`;
}

function niceYTicks(minV, maxV) {
  const range = maxV - minV;
  if (range === 0) return [minV];
  const roughStep = range / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
  let step = mag;
  for (const c of [1, 2, 2.5, 5, 10]) {
    if (c * mag >= roughStep) { step = c * mag; break; }
  }
  const start = Math.ceil(minV / step) * step;
  const ticks = [];
  for (let t = start; t <= maxV + step * 0.001; t += step) {
    ticks.push(Math.round(t * 1000) / 1000);
    if (ticks.length >= 4) break;
  }
  return ticks;
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
  defaultIndex,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  // defaultIndex vem de fora (ex: dia de hoje no modo mês); fallback = último ponto
  const resolvedDefault = defaultIndex != null ? defaultIndex : points.length - 1;
  const displayIndex = activeIndex !== null ? activeIndex : resolvedDefault;

  const geom = useMemo(() => {
    const padL = 6;
    const padR = 52; // espaço para labels do eixo Y (direita)
    const padT = 14;
    const padB = 4;
    const innerW = Math.max(width - padL - padR, 1);
    const innerH = Math.max(height - padT - padB, 1);
    if (!points.length) {
      return { padL, padR, padT, padB, innerW, innerH, coords: [], minV: 0, maxV: 1, span: 1, n: 1, yZero: 0, showZero: false, yTicks: [] };
    }
    const vals = points.map((p) => p.balance);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (maxV === minV) { minV -= 1; maxV += 1; }
    const span = maxV - minV;
    const n = Math.max(points.length - 1, 1);
    const coords = points.map((p, i) => {
      const x = padL + (i / n) * innerW;
      const y = padT + innerH - ((p.balance - minV) / span) * innerH;
      return { x, y };
    });
    const yZero = padT + innerH - ((0 - minV) / span) * innerH;
    const showZero = yZero >= padT && yZero <= padT + innerH;
    const yTicks = niceYTicks(minV, maxV);
    return { padL, padR, padT, padB, innerW, innerH, coords, minV, maxV, span, n, yZero, showZero, yTicks };
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
      <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: mutedColor, textAlign: 'center', paddingVertical: 20 }}>
        Sem dados neste período
      </Text>
    );
  }

  const { padL, padR, padT, innerW, innerH, coords, minV, maxV, span, yZero, showZero, yTicks } = geom;
  const linePointsStr = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPointsStr = [
    ...coords.map((c) => `${c.x},${c.y}`),
    `${coords[coords.length - 1].x},${padT + innerH}`,
    `${coords[0].x},${padT + innerH}`,
  ].join(' ');

  const activeCoord = coords[displayIndex];
  const activePt = points[displayIndex];

  return (
    <View style={{ width }}>
      <View {...panResponder.panHandlers} style={{ width, height }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Eixo Y: linhas de grade + labels */}
          {yTicks.map((tick) => {
            const yPos = padT + innerH - ((tick - minV) / span) * innerH;
            return (
              <React.Fragment key={tick}>
                <Line
                  x1={padL} y1={yPos} x2={padL + innerW} y2={yPos}
                  stroke={zeroColor} strokeWidth={0.5} strokeDasharray="3,5" opacity={0.4}
                />
                <SvgText
                  x={padL + innerW + 6} y={yPos + 3.5}
                  textAnchor="start" fontSize={9} fill={mutedColor}
                >
                  {fmtYLabel(tick)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Área preenchida */}
          <Polygon points={areaPointsStr} fill="url(#areaGrad)" />

          {/* Linha zero (destaque extra se cruzar zero) */}
          {showZero ? (
            <Line x1={padL} y1={yZero} x2={padL + innerW} y2={yZero}
              stroke={zeroColor} strokeWidth={1} strokeDasharray="3,5" />
          ) : null}

          {/* Linha principal */}
          <Polyline points={linePointsStr} fill="none" stroke={lineColor}
            strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Marcador do ponto ativo */}
          <Line x1={activeCoord.x} y1={padT} x2={activeCoord.x} y2={padT + innerH}
            stroke={lineColor} strokeWidth={1} opacity={activeIndex !== null ? 0.55 : 0.25} />
          <Circle cx={activeCoord.x} cy={activeCoord.y} r={7} fill={lineColor} opacity={0.2} />
          <Circle cx={activeCoord.x} cy={activeCoord.y} r={4} fill={lineColor} />
        </Svg>
      </View>

      {/* Tooltip sempre visível */}
      <View style={tooltipStyle} accessibilityLiveRegion="polite">
        <Text style={tooltipDateStyle} numberOfLines={1}>
          {formatTooltipDate(activePt.date)}
        </Text>
        <Text style={tooltipValueStyle}>
          {hidden ? mask : fmtMoney(activePt.balance)}
        </Text>
      </View>
    </View>
  );
}

const logo = require('../../assets/logo2.png');

function createStyles(T, isDesktop, isMobile) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.chocolate },
    logo: { width: 160, height: 48 },

    /* ── Header ── */
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 40 : 20,
      paddingBottom: 10,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: T.homeGlass,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },

    /* ── Sync row ── */
    syncRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isDesktop ? 40 : 20,
      paddingBottom: 8,
      gap: 6,
    },
    syncText: { fontFamily: 'Poppins_300Light', fontSize: 11, color: T.brandFgMuted },
    syncTextMuted: { fontFamily: 'Poppins_300Light', fontSize: 11, color: T.brandFgMuted, opacity: 0.55 },
    syncDot: { fontSize: 8, color: '#4CAF50' },
    syncLink: { marginLeft: 4 },
    syncLinkText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: T.orange },

    /* ── Layout principal ── */
    mainTwoCol: {
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: 'stretch',
      gap: isDesktop ? 20 : 0,
      paddingHorizontal: isDesktop ? 40 : 0,
      marginBottom: isDesktop ? 28 : 0,
    },
    leftCol: { flex: isDesktop ? 4 : undefined },
    rightCol: { flex: isDesktop ? 6 : undefined },

    /* ── Card de saldo (destaque premium) ── */
    saldoCard: {
      borderRadius: 28,
      overflow: 'hidden',
      marginHorizontal: isDesktop ? 0 : 16,
      marginBottom: isDesktop ? 0 : 20,
      shadowColor: '#FE5E03',
      shadowOpacity: 0.42,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
    },
    /* Camada base laranja — simula início do gradiente */
    saldoCardBase: {
      padding: isDesktop ? 32 : 28,
      backgroundColor: '#FE5E03',
    },
    /* Overlay amber no topo-esquerdo — simula gradiente diagonal */
    saldoCardOverlayTop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(254,181,6,0.28)',
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    /* Overlay escuro no canto inferior — profundidade */
    saldoCardOverlayBot: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(140,30,0,0.18)',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    saldoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    eyeBtn: { padding: 6, minHeight: 44, justifyContent: 'center' },
    eyeIcon: { fontSize: 18 },
    saldoLabel: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 14 : 13,
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.4,
    },
    /* Valor do saldo: Poppins Thin para ar sofisticado */
    saldoValue: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 52 : 42,
      color: '#FFFFFF',
      marginVertical: 6,
      letterSpacing: -1,
    },
    miniSection: {
      flexDirection: 'row',
      gap: 0,
      marginBottom: 16,
      alignItems: 'stretch',
    },
    miniBlock: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.12)',
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    miniBlockSep: { width: 8 },
    miniLabel: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 11 : 10,
      color: 'rgba(255,255,255,0.65)',
      marginBottom: 2,
    },
    miniValue: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 16 : 14,
    },

    /* Navegação de mês dentro do card */
    monthMiniNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.18)',
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    monthMiniArrowBtn: { padding: 4, minHeight: 44, justifyContent: 'center' },
    monthMiniArrow: {
      fontSize: 22,
      color: 'rgba(255,255,255,0.9)',
      fontFamily: 'Poppins_600SemiBold',
      lineHeight: 24,
    },
    monthMiniLabel: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
      color: '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },

    /* ── Box do gráfico ── */
    chartBox: {
      backgroundColor: T.homeGlass,
      borderRadius: 24,
      padding: isDesktop ? 24 : 18,
      marginHorizontal: isDesktop ? 0 : 16,
      marginBottom: isDesktop ? 0 : 20,
      flex: isDesktop ? 1 : undefined,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    chartHead: { marginBottom: 12 },
    chartTitle: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 15 : 13,
      color: T.brandFgMuted,
      marginBottom: 10,
      letterSpacing: 0.2,
    },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    filterChipOn: { backgroundColor: 'rgba(254,94,3,0.15)' },
    filterChipText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.brandFgMuted },
    filterChipTextOn: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: T.orange },
    chartLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 2,
      gap: 2,
    },
    chartLabelMini: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 9,
      color: T.brandFgMuted,
      flex: 1,
      textAlign: 'center',
    },
    chartScrubReadout: {
      marginTop: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: T.homeGlass,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    chartTooltipDate: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, flex: 1 },
    chartTooltipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.orange, flexShrink: 0 },

    /* ── Seção de contas/cartões ── */
    sectionLabel: {
      fontFamily: 'Poppins_300Light',
      fontSize: 11,
      color: T.brandFgMuted,
      marginBottom: 10,
      marginHorizontal: isDesktop ? 40 : 20,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    accountsSection: { marginBottom: isDesktop ? 28 : 20 },
    accountsRow: {
      paddingHorizontal: isDesktop ? 40 : 16,
      gap: isDesktop ? 14 : 10,
      paddingBottom: 4,
      flexDirection: 'row',
      flexWrap: isDesktop ? 'wrap' : 'nowrap',
    },
    accountCard: {
      minHeight: 90,
      width: isDesktop ? 160 : 136,
      borderRadius: 20,
      padding: isDesktop ? 16 : 14,
      gap: 6,
      backgroundColor: T.homeGlass,
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    accountCardActive: {
      backgroundColor: 'rgba(254,94,3,0.16)',
      shadowColor: '#FE5E03',
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    accountCardIcon: { fontSize: isDesktop ? 32 : 28, color: T.orange },
    accountCardIconContainer: { marginBottom: 4 },
    accountCardName: {
      fontFamily: 'Poppins_400Regular',
      fontSize: isDesktop ? 12 : 11,
      color: T.brandFgMuted,
      marginTop: 2,
    },
    accountCardNameActive: { color: T.brandFg },
    accountCardBalance: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 14 : 13,
      color: T.brandFgMuted,
    },
    accountCardBalanceActive: { color: T.orange },

    /* ── Transações recentes ── */
    recentSection: {
      marginTop: isDesktop ? 8 : 12,
      marginBottom: isDesktop ? 28 : 20,
    },
    recentSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginHorizontal: isDesktop ? 40 : 20,
      marginBottom: 12,
    },
    recentSectionTitle: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 15 : 13,
      color: T.brandFgMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    recentSeeAll: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 12,
      color: T.orange,
      minHeight: 44,
      textAlignVertical: 'center',
      lineHeight: 44,
    },
    recentTxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: isDesktop ? 14 : 15,
      marginHorizontal: isDesktop ? 40 : 16,
      marginBottom: 4,
      backgroundColor: T.homeGlass,
      borderRadius: 16,
      paddingHorizontal: 14,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    recentTxDesc: {
      fontFamily: 'Poppins_400Regular',
      fontSize: isDesktop ? 14 : 13,
      color: T.brandFg,
    },
    recentTxMeta: {
      fontFamily: 'Poppins_300Light',
      fontSize: isDesktop ? 11 : 10,
      color: T.brandFgMuted,
      marginTop: 2,
    },
    recentTxValue: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 14 : 13,
    },
    recentInvoiceChevron: {
      fontFamily: 'Poppins_300Light',
      fontSize: 18,
      color: T.brandFgMuted,
      opacity: 0.45,
    },

    /* ── FAB ── */
    fab: {
      position: 'absolute',
      bottom: isDesktop ? 40 : 28,
      right: isDesktop ? 40 : 20,
      width: isDesktop ? 64 : 60,
      height: isDesktop ? 64 : 60,
      borderRadius: isDesktop ? 32 : 30,
      backgroundColor: '#FE5E03',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FE5E03',
      shadowOpacity: 0.55,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
    },
    fabText: {
      fontSize: isDesktop ? 32 : 30,
      color: '#FFFFFF',
      fontFamily: 'Poppins_300Light',
      marginTop: -2,
      lineHeight: isDesktop ? 36 : 34,
    },
  });
}

function AccountCardItem({ account, isActive, isDesktop, onPress, styles, hidden, balance, hidden: maskValue, mask, T }) {
  const iconColor = isActive ? T.orange : T.brandFgMuted;
  return (
    <TouchableOpacity
      style={[styles.accountCard, isActive && styles.accountCardActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.accountCardIconContainer}>
        <AccountIcon accountName={account.name} size={isDesktop ? 26 : 24} color={iconColor} />
      </View>
      <View>
        <Text style={[styles.accountCardName, isActive && styles.accountCardNameActive]}>{account.name}</Text>
        <Text style={[styles.accountCardBalance, isActive && styles.accountCardBalanceActive]}>
          {maskValue ? mask : balance}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RecentTransactions({ transactions, creditCards, selectedAccount, selectedCard, accounts, hidden, mask, styles, T, navigation }) {
  const recentTxs = useMemo(() => {
    let base;
    if (selectedCard) {
      // Agrupa por invoiceKey para o cartão selecionado
      const invoiceGroups = {};
      for (const t of transactions) {
        if (String(t.creditCardId) !== String(selectedCard)) continue;
        if (!isTransactionEffectiveOnOrBefore(t)) continue;
        if (t.isTransfer) continue;
        const key = t.invoiceKey || t.data?.split('/').reverse().join('-') || '';
        if (!invoiceGroups[key]) {
          invoiceGroups[key] = {
            creditCardId: t.creditCardId,
            invoiceKey: t.invoiceKey || key,
            valor: 0,
            count: 0,
            data: t.data,
          };
        }
        invoiceGroups[key].valor += t.valor;
        invoiceGroups[key].count += 1;
        if (t.data > invoiceGroups[key].data) invoiceGroups[key].data = t.data;
      }
      base = Object.values(invoiceGroups).map((g) => ({
        ...g,
        descricao: `Fatura cartão ${invoiceLabelPtBr(g.invoiceKey)}`,
        categoria: 'Cartão de Crédito',
        cardLabel: creditCardName(creditCards, g.creditCardId),
        tipo: 'saída',
        isInvoiceGroup: true,
      }));
    } else {
      base = transactions.filter((t) => {
        if (!isTransactionEffectiveOnOrBefore(t)) return false;
        if (selectedAccount) return t.accountId === selectedAccount;
        return true;
      });
    }
    return [...base]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
      .slice(0, 10);
  }, [transactions, creditCards, selectedAccount, selectedCard]);

  const sectionTitle = useMemo(() => {
    if (selectedCard) {
      const card = creditCards.find((c) => String(c.id) === String(selectedCard));
      return `Transações — ${card?.name ?? 'Cartão'}`;
    }
    if (selectedAccount) {
      const acc = accounts.find((a) => a.id === selectedAccount);
      return `Transações — ${acc?.name ?? 'Conta'}`;
    }
    return 'Transações recentes';
  }, [selectedCard, selectedAccount, creditCards, accounts]);

  return (
    <View style={styles.recentSection}>
      <View style={styles.recentSectionHeader}>
        <Text style={styles.recentSectionTitle}>{sectionTitle}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('History')} hitSlop={8} activeOpacity={0.7}>
          <Text style={styles.recentSeeAll}>Ver todas</Text>
        </TouchableOpacity>
      </View>
      {recentTxs.length === 0 ? (
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, marginHorizontal: 20 }}>
          Nenhuma transação encontrada.
        </Text>
      ) : null}
      {recentTxs.map((tx, idx) => {
        if (tx.isInvoiceGroup) {
          return (
            <TouchableOpacity
              key={tx.invoiceKey || idx}
              style={styles.recentTxRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceKey: tx.invoiceKey, cardName: tx.cardLabel })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: T.orange, alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={22} weight="fill" color={T.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentTxDesc} numberOfLines={1}>{tx.descricao}</Text>
                <Text style={styles.recentTxMeta}>
                  {tx.cardLabel} {tx.cardLabel && '·'} {tx.count} {tx.count === 1 ? 'gasto' : 'gastos'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text style={[styles.recentTxValue, { color: '#EF4444' }]}>{hidden ? mask : `-${fmt(tx.valor)}`}</Text>
                <Text style={[styles.recentInvoiceChevron, { opacity: 0.5 }]}>›</Text>
              </View>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity
            key={tx.id || idx}
            style={styles.recentTxRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Detail', { tx })}
          >
            <CatIcon category={tx.categoria} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recentTxDesc} numberOfLines={1}>{tx.descricao}</Text>
              <Text style={styles.recentTxMeta}>{tx.categoria}{tx.data ? ` · ${tx.data}` : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', flexDirection: 'row', flexShrink: 0 }}>
              <Text style={[styles.recentTxValue, { color: tx.tipo === 'entrada' ? '#22C55E' : '#EF4444' }]}>
                {tx.tipo === 'entrada' ? '+' : '-'}{hidden ? mask : fmt(tx.valor)}
              </Text>
              {tx.origin?.type === 'openFinance' ? (
                <BankIcon bankName={tx.origin.bankName} bankColor={tx.origin.bankColor} bankInitial={tx.origin.bankInitial} size={16} />
              ) : tx.origin?.type === 'notification' ? (
                <Text style={{ fontSize: 10, marginLeft: 4 }}>🔔</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const T = useThemeColors();
  const { profile, transactionListOrder } = useAppPreferences();
  const { isDesktop, isMobile } = useResponsiveLayout();
  const styles = useMemo(() => createStyles(T, isDesktop, isMobile), [T, isDesktop, isMobile]);
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { accounts, creditCards, transactions, isSyncing } = useFinance();
  const [lastSync, setLastSync] = useState(null);
  const act = activeAccounts(accounts);
  const activeIds = useMemo(() => new Set(act.map((a) => a.id)), [act]);
  const cardsAct = useMemo(() => activeCreditCards(creditCards), [creditCards]);
  const [hidden, setHidden] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [balanceMode, setBalanceMode] = useState('current_month');
  const [inOutMonth, setInOutMonth] = useState(() => new Date().getMonth() + 1);
  const [inOutYear, setInOutYear] = useState(() => new Date().getFullYear());
  const mask = '••••••';

  const prevInOut = offsetMonth(inOutMonth, inOutYear, -1);
  const nextInOut = offsetMonth(inOutMonth, inOutYear, +1);
  const goInOut = ({ month, year }) => { setInOutMonth(month); setInOutYear(year); };

  const currentInvoiceKey = useMemo(() => {
    if (!selectedCard) return null;
    const card = creditCards.find((c) => String(c.id) === String(selectedCard));
    if (!card) return null;
    // Usa o mês/ano selecionado no filtro, não a data de hoje
    const refDate = new Date(inOutYear, inOutMonth - 1, 15);
    return invoiceKeyFromDateAndCloseDay(refDate, card.diaFechamento);
  }, [creditCards, selectedCard, inOutMonth, inOutYear]);

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

  // Desktop: right col is 60% of (winW - 80px padding - 24px gap), minus chart padding (48px)
  const chartW = isDesktop
    ? Math.max(300, Math.floor((winW - 104) * 0.6) - 48)
    : Math.max(260, winW - 72);
  const chartH = isDesktop ? 220 : 148;

  // Índice padrão do gráfico: no modo "mês atual" aponta para hoje; nos demais, último ponto
  const chartDefaultIndex = useMemo(() => {
    if (balanceMode !== 'current_month') return balanceSeries.length - 1;
    const todayIdx = new Date().getDate() - 1; // série começa no dia 1 = índice 0
    return Math.min(todayIdx, balanceSeries.length - 1);
  }, [balanceMode, balanceSeries.length]);

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

  const baseTotals = selectedCard
    ? (() => {
        const card = creditCards.find((c) => String(c.id) === String(selectedCard));
        const ik = currentInvoiceKey;
        if (!card || !ik) return [];
        return transactions.filter((t) => {
          if (String(t.creditCardId) !== String(selectedCard)) return false;
          const txIk = txInvoiceKeyForCard(t, card);
          if (txIk !== ik) return false;
          return isTransactionEffectiveOnOrBefore(t);
        });
      })()
    : selectedAccount
      ? transactions.filter(
          (t) => t.accountId === selectedAccount && isTransactionEffectiveOnOrBefore(t)
        )
      : transactions.filter(
          (t) => activeIds.has(t.accountId) && isTransactionEffectiveOnOrBefore(t)
        );

  const monthFilteredTotals = useMemo(() => {
    if (selectedCard) return baseTotals;
    return baseTotals.filter((t) => {
      const p = t.data?.split('/');
      if (!p || p.length !== 3) return false;
      return parseInt(p[1], 10) === inOutMonth && parseInt(p[2], 10) === inOutYear;
    });
  }, [baseTotals, selectedCard, inOutMonth, inOutYear]);

  const totalIn = monthFilteredTotals.filter((t) => t.tipo === 'entrada' && !t.isTransfer).reduce((a, t) => a + t.valor, 0);
  const totalOut = monthFilteredTotals.filter((t) => t.tipo === 'saída' && !t.isTransfer).reduce((a, t) => a + t.valor, 0);

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
        if (!isTransactionEffectiveOnOrBefore(t)) continue;
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

      {/* Indicador de sincronização Open Finance */}
      {isSyncing ? (
        <View style={styles.syncRow}>
          <ActivityIndicator size="small" color={T.orange} />
          <Text style={styles.syncText}>Sincronizando...</Text>
        </View>
      ) : lastSync ? (
        <View style={styles.syncRow}>
          <Text style={styles.syncDot}>●</Text>
          <Text style={styles.syncText}>{formatLastSync(lastSync)}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OpenFinanceOnboarding')} style={styles.syncLink}>
            <Text style={styles.syncLinkText}>Gerenciar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.syncRow, { flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => navigation.navigate('OpenFinanceOnboarding')}>
          <Text style={styles.syncTextMuted}>Conectar banco</Text>
          <ChevronRightIcon size={14} color={T.brandFgMuted} />
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {/* SALDO CARD — Destaque central (hierarquia máxima) */}
        <View style={styles.mainTwoCol}>
          <View style={styles.leftCol}>
            <View style={[styles.saldoCard, saldo < 0 && { shadowColor: T.burnt }]}>
              <View style={styles.saldoCardBase}>
                {/* Camadas de gradiente simulado: amber no topo, escuro na base */}
                <View style={styles.saldoCardOverlayTop} pointerEvents="none" />
                <View style={styles.saldoCardOverlayBot} pointerEvents="none" />

                {/* Cabeçalho: label + olho */}
                <View style={styles.saldoHeader}>
                  <Text style={styles.saldoLabel}>{saldoLabel}</Text>
                  <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={12} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{hidden ? '👁' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Valor principal — tipografia thin sofisticada */}
                <Text style={styles.saldoValue} numberOfLines={1} adjustsFontSizeToFit>
                  {hidden ? mask : fmt(saldo)}
                </Text>

                {/* Blocos de entradas/saídas */}
                <View style={styles.miniSection}>
                  <View style={styles.miniBlock}>
                    <Text style={styles.miniLabel}>{selectedCard ? 'Créditos' : 'Entradas'}</Text>
                    <Text style={[styles.miniValue, { color: '#86EFAC' }]}>
                      {hidden ? mask : `+${fmt(totalIn)}`}
                    </Text>
                  </View>
                  <View style={styles.miniBlockSep} />
                  <View style={styles.miniBlock}>
                    <Text style={styles.miniLabel}>{selectedCard ? 'Compras' : 'Saídas'}</Text>
                    <Text style={[styles.miniValue, { color: '#FCA5A5' }]}>
                      {hidden ? mask : `-${fmt(totalOut)}`}
                    </Text>
                  </View>
                </View>

                {/* Navegação de mês */}
                <View style={styles.monthMiniNav}>
                  <TouchableOpacity onPress={() => goInOut(prevInOut)} hitSlop={12} style={styles.monthMiniArrowBtn}>
                    <Text style={styles.monthMiniArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.monthMiniLabel}>{monthLabel(inOutMonth, inOutYear)}</Text>
                  <TouchableOpacity onPress={() => goInOut(nextInOut)} hitSlop={12} style={styles.monthMiniArrowBtn}>
                    <Text style={styles.monthMiniArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.rightCol}>
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
                defaultIndex={chartDefaultIndex}
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
          </View>
        </View>

        {/* CONTAS */}
        {act.length > 0 ? (
          <View style={styles.accountsSection}>
            <Text style={styles.sectionLabel}>Contas</Text>
            {isDesktop ? (
              <View style={styles.accountsRow}>
                {act.map((ac) => {
                  const isActive = !selectedCard && selectedAccount === ac.id;
                  const bal = balanceForAccount(accounts, transactions, ac.id);
                  return (
                    <AccountCardItem
                      key={ac.id}
                      account={ac}
                      isActive={isActive}
                      isDesktop={isDesktop}
                      onPress={() => {
                        setSelectedCard(null);
                        setSelectedAccount(ac.id);
                      }}
                      styles={styles}
                      balance={fmt(bal)}
                      hidden={hidden}
                      mask={mask}
                      T={T}
                    />
                  );
                })}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
                {act.map((ac) => {
                  const isActive = !selectedCard && selectedAccount === ac.id;
                  const bal = balanceForAccount(accounts, transactions, ac.id);
                  return (
                    <AccountCardItem
                      key={ac.id}
                      account={ac}
                      isActive={isActive}
                      isDesktop={isDesktop}
                      onPress={() => {
                        setSelectedCard(null);
                        setSelectedAccount(ac.id);
                      }}
                      styles={styles}
                      balance={fmt(bal)}
                      hidden={hidden}
                      mask={mask}
                      T={T}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* CARTÕES */}
        <View style={styles.accountsSection}>
          <Text style={styles.sectionLabel}>Cartões</Text>
          {cardsAct.length > 0 ? (
            isDesktop ? (
              <View style={styles.accountsRow}>
                {cardsAct.map((c) => {
                  const isActive = selectedCard && String(selectedCard) === String(c.id);
                  const total = invoiceTotalsByCard.get(String(c.id)) || 0;
                  return (
                    <AccountCardItem
                      key={c.id}
                      account={c}
                      isActive={isActive}
                      isDesktop={isDesktop}
                      onPress={() => {
                        setSelectedAccount(null);
                        setSelectedCard(c.id);
                      }}
                      styles={styles}
                      balance={fmt(total)}
                      hidden={hidden}
                      mask={mask}
                      T={T}
                    />
                  );
                })}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
                {cardsAct.map((c) => {
                  const isActive = selectedCard && String(selectedCard) === String(c.id);
                  const total = invoiceTotalsByCard.get(String(c.id)) || 0;
                  return (
                    <AccountCardItem
                      key={c.id}
                      account={c}
                      isActive={isActive}
                      isDesktop={isDesktop}
                      onPress={() => {
                        setSelectedAccount(null);
                        setSelectedCard(c.id);
                      }}
                      styles={styles}
                      balance={fmt(total)}
                      hidden={hidden}
                      mask={mask}
                      T={T}
                    />
                  );
                })}
              </ScrollView>
            )
          ) : (
            <Text
              style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, marginHorizontal: 20, marginBottom: 4 }}
            >
              Nenhum cartão cadastrado. Em Perfil → Cartões de crédito você pode adicionar.
            </Text>
          )}
        </View>

        {/* Transações recentes */}
        <RecentTransactions
          transactions={transactions}
          creditCards={creditCards}
          selectedAccount={selectedAccount}
          selectedCard={selectedCard}
          accounts={accounts}
          hidden={hidden}
          mask={mask}
          styles={styles}
          T={T}
          navigation={navigation}
        />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('NewTransaction')}
        accessibilityLabel="Nova transação"
        accessibilityRole="button"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
