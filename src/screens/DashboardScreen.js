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
import Svg, { Polyline, Polygon, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
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
} from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { buildBalanceEvolutionSeries, parseBrDate } from '../utils/chart';
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
    sectionLabel: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 12,
      color: T.brandFgMuted,
      marginBottom: 8,
      marginHorizontal: isDesktop ? 40 : 20,
      letterSpacing: 0.3,
    },
    accountsRow: {
      paddingHorizontal: isDesktop ? 40 : 20,
      gap: isDesktop ? 16 : 10,
      paddingBottom: 4,
      flexDirection: 'row',
      flexWrap: isDesktop ? 'wrap' : 'nowrap',
    },
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
      backgroundColor: 'rgba(254,94,3,0.18)',
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
    mainTwoCol: {
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: isDesktop ? 'stretch' : 'stretch',
      gap: isDesktop ? 24 : 0,
      paddingHorizontal: isDesktop ? 40 : 0,
      marginBottom: isDesktop ? 28 : 0,
    },
    leftCol: {
      flex: isDesktop ? 4 : undefined,
    },
    rightCol: {
      flex: isDesktop ? 6 : undefined,
    },
    saldoCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginHorizontal: isDesktop ? 0 : 20,
      marginBottom: isDesktop ? 0 : 20,
      shadowColor: T.orange,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      flex: isDesktop ? 1 : undefined,
    },
    saldoCardGradient: {
      padding: isDesktop ? 28 : 24,
      // Simula gradiente com camadas: fundo laranja + sobreposição escurecida no canto
      backgroundColor: T.orange,
    },
    saldoCardGradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(180,40,0,0.22)',
      borderRadius: 20,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: isDesktop ? 16 : 12,
      marginHorizontal: isDesktop ? 0 : 20,
      marginBottom: isDesktop ? 0 : 16,
    },
    quickBtn: {
      flex: 1,
      height: 52,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
    },
    quickBtnEntrada: {
      backgroundColor: 'rgba(254,181,6,0.12)',
      borderColor: T.amber,
    },
    quickBtnSaida: {
      backgroundColor: 'rgba(254,94,3,0.08)',
      borderColor: T.orange,
    },
    quickBtnText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 14 : 13,
    },
    saldoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eyeBtn: { padding: 4 },
    eyeIcon: { fontSize: 16 },
    saldoLabel: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 14 : 12, color: 'rgba(255,255,255,0.7)' },
    saldoValue: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 44 : 32, color: T.white, marginVertical: 4 },
    miniLabel: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 11 : 10, color: 'rgba(255,255,255,0.6)' },
    miniValue: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 18 : 15 },
    chartBox: {
      backgroundColor: T.homeGlass,
      borderRadius: 16,
      padding: isDesktop ? 24 : 16,
      marginHorizontal: isDesktop ? 0 : 20,
      marginBottom: isDesktop ? 0 : 20,
      flex: isDesktop ? 1 : undefined,
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
    filterChipOn: { borderColor: T.orange, backgroundColor: 'rgba(254,94,3,0.12)' },
    filterChipText: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.brandFgMuted },
    filterChipTextOn: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: T.orange },
    chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2, gap: 2 },
    chartLabelMini: { fontFamily: 'Poppins_400Regular', fontSize: 9, color: T.brandFgMuted, flex: 1, textAlign: 'center' },
    chartScrubReadout: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: T.homeGlass,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: T.homeHairline,
    },
    chartTooltipDate: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFgMuted, flex: 1 },
    chartTooltipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.orange, flexShrink: 0 },
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
    fabText: { fontSize: isDesktop ? 32 : 28, color: T.white, fontFamily: 'Poppins_600SemiBold', marginTop: -2 },
    monthMiniNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    monthMiniArrowBtn: { padding: 4 },
    monthMiniArrow: { fontSize: 20, color: 'rgba(255,255,255,0.9)', fontFamily: 'Poppins_600SemiBold', lineHeight: 22 },
    monthMiniLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.white, flex: 1, textAlign: 'center' },
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      >
        {act.length > 0 ? (
          <View style={styles.accountsSection}>
            <Text style={styles.sectionLabel}>Contas</Text>
            {isDesktop ? (
              <View style={styles.accountsRow}>
              <TouchableOpacity
                style={[styles.accountCard, !selectedAccount && !selectedCard && styles.accountCardActive]}
                onPress={() => {
                  setSelectedAccount(null);
                  setSelectedCard(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.accountCardIcon}>🌐</Text>
                <Text style={[styles.accountCardName, !selectedAccount && !selectedCard && styles.accountCardNameActive]}>
                  Geral
                </Text>
                <Text
                  style={[
                    styles.accountCardBalance,
                    !selectedAccount && !selectedCard && styles.accountCardBalanceActive,
                  ]}
                >
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
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
                {/* Cards mobile scrollable */}
                <TouchableOpacity
                  style={[styles.accountCard, !selectedAccount && !selectedCard && styles.accountCardActive]}
                  onPress={() => {
                    setSelectedAccount(null);
                    setSelectedCard(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountCardIcon}>🌐</Text>
                  <Text style={[styles.accountCardName, !selectedAccount && !selectedCard && styles.accountCardNameActive]}>
                    Geral
                  </Text>
                  <Text
                    style={[
                      styles.accountCardBalance,
                      !selectedAccount && !selectedCard && styles.accountCardBalanceActive,
                    ]}
                  >
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
              </ScrollView>
            )}
          </View>
        ) : null}

        <View style={styles.accountsSection}>
          <Text style={styles.sectionLabel}>Cartões</Text>
          {cardsAct.length > 0 ? (
            isDesktop ? (
              <View style={styles.accountsRow}>
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
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
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

        <View style={styles.mainTwoCol}>
          {/* Left column: Saldo card com gradiente */}
          <View style={styles.leftCol}>
            <View style={[styles.saldoCard, saldo < 0 && { borderWidth: 2, borderColor: T.burnt }]}>
              {/* Camada de gradiente simulada */}
              <View style={styles.saldoCardGradient}>
                <View style={styles.saldoCardGradientOverlay} pointerEvents="none" />
                <View style={styles.saldoHeader}>
                  <Text style={styles.saldoLabel}>{saldoLabel}</Text>
                  <TouchableOpacity onPress={() => setHidden(!hidden)} hitSlop={12} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{hidden ? '👁' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.saldoValue}>{hidden ? mask : fmt(saldo)}</Text>
                <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                  <View>
                    <Text style={styles.miniLabel}>{selectedCard ? 'Créditos' : 'Entradas'}</Text>
                    <Text style={[styles.miniValue, { color: T.gold }]}>{hidden ? mask : `+${fmt(totalIn)}`}</Text>
                  </View>
                  <View>
                    <Text style={styles.miniLabel}>{selectedCard ? 'Compras' : 'Saídas'}</Text>
                    <Text style={[styles.miniValue, { color: T.warmWhite }]}>{hidden ? mask : `-${fmt(totalOut)}`}</Text>
                  </View>
                </View>
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

            {/* Botões de ação rápida: Entrada e Saída */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickBtnEntrada]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('NewTransaction', { defaultKind: 'receita' })}
                accessibilityLabel="Nova entrada"
              >
                <Text style={[styles.quickBtnText, { color: T.amberDark }]}>+ Entrada</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, styles.quickBtnSaida]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('NewTransaction', { defaultKind: 'despesa' })}
                accessibilityLabel="Nova saída"
              >
                <Text style={[styles.quickBtnText, { color: T.orange }]}>- Saída</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right column: Chart */}
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
