import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SectionList, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header, CatIcon } from '../components/Shared';
import BankIcon from '../components/BankIcon';
import { useFinance, invoiceLabelPtBr, creditCardName } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { sortTransactionsByDate } from '../utils/txSort';
import { useResponsiveLayout } from '../utils/responsiveLayout';
import { addPeriod, fmtDate } from '../utils/recurrence';
import { parseBrDate } from '../utils/chart';
import { getAccountBank } from '../utils/accountBank';
import PhosphorIconByName from '../components/PhosphorIconByName';

const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const TIPO_OPTIONS = [
  { key: 'todos',   label: 'Todos'     },
  { key: 'entrada', label: 'Receitas'  },
  { key: 'saída',   label: 'Despesas'  },
];

function offsetMonth(month, year, delta) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m = 1;  y += 1; }
  if (m < 1)  { m = 12; y -= 1; }
  return { month: m, year: y };
}

const CURRENT_YEAR = new Date().getFullYear();

function monthLabel(month, year) {
  const name = MONTHS_PT[month - 1];
  return year !== CURRENT_YEAR ? `${name} ${year}` : name;
}

export default function HistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const T = useThemeColors();
  const styles = useMemo(() => createHistoryStyles(T), [T]);
  const { transactions, creditCards, accounts } = useFinance();
  const { transactionListOrder, categories } = useAppPreferences();
  const { isDesktop } = useResponsiveLayout();

  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1); // 1-12
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [catFilter,  setCatFilter]  = useState('Todos');
  const [bankFilter, setBankFilter] = useState('Todos');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  // null = menu raiz; 'categoria' | 'banco' = submenu de opções
  const [filterSubmenu, setFilterSubmenu] = useState(null);

  const filtersActiveCount =
    (catFilter !== 'Todos' ? 1 : 0) + (bankFilter !== 'Todos' ? 1 : 0);

  const closeFilterMenu = () => {
    setFilterMenuOpen(false);
    setFilterSubmenu(null);
  };

  const prev = offsetMonth(selMonth, selYear, -1);
  const next = offsetMonth(selMonth, selYear, +1);

  const goTo = ({ month, year }) => { setSelMonth(month); setSelYear(year); };

  // 1. filtro por mês (inclui fixos projetados)
  const byMonth = useMemo(() => {
    const out = [];
    const monthStart = new Date(selYear, selMonth - 1, 1);
    const monthEnd = new Date(selYear, selMonth, 0);

    for (const t of transactions) {
      if (!t?.data || typeof t.data !== 'string') continue;

      const p = t.data.split('/');
      const inSelectedMonth = p.length === 3 && parseInt(p[1], 10) === selMonth && parseInt(p[2], 10) === selYear;
      if (inSelectedMonth) out.push(t);

      if (t.isTransfer) continue;
      if (t.gastoTipo !== 'fixo') continue;
      if (!t.periodicidade) continue;

      const base = parseBrDate(t.data);
      if (!base || Number.isNaN(base.getTime())) continue;

      let d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      let guard = 0;
      while (d < monthStart && guard < 500) {
        d = addPeriod(d, t.periodicidade);
        guard++;
      }

      guard = 0;
      while (d <= monthEnd && guard < 800) {
        const dBr = fmtDate(d);
        if (!(inSelectedMonth && dBr === t.data)) {
          out.push({
            ...t,
            id: `${t.id}-fx-${selYear}-${String(selMonth).padStart(2, '0')}-${dBr}`,
            data: dBr,
            __virtualRecurring: true,
            __virtualSourceId: t.id,
          });
        }
        d = addPeriod(d, t.periodicidade);
        guard++;
      }
    }

    return out;
  }, [transactions, selMonth, selYear]);

  // 2. agrupa gastos de cartão por invoiceKey em itens sintéticos "Fatura cartão [mês]"
  const byMonthWithInvoices = useMemo(() => {
    const invoiceGroups = {};
    const nonCard = [];

    for (const t of byMonth) {
      if (t.creditCardId && t.invoiceKey && !t.isTransfer) {
        const key = `${t.creditCardId}::${t.invoiceKey}`;
        if (!invoiceGroups[key]) {
          invoiceGroups[key] = {
            id: `invoice-group-${key}`,
            __invoiceGroup: true,
            creditCardId: t.creditCardId,
            invoiceKey: t.invoiceKey,
            tipo: 'saída',
            valor: 0,
            count: 0,
            // usa a data mais recente do grupo para ordenação
            data: t.data,
          };
        }
        invoiceGroups[key].valor += t.valor;
        invoiceGroups[key].count += 1;
        if (t.data > invoiceGroups[key].data) invoiceGroups[key].data = t.data;
      } else {
        nonCard.push(t);
      }
    }

    const invoiceItems = Object.values(invoiceGroups).map((g) => ({
      ...g,
      descricao: `Fatura cartão ${invoiceLabelPtBr(g.invoiceKey)}`,
      categoria: 'Cartão de Crédito',
      cardLabel: creditCardName(creditCards, g.creditCardId),
    }));

    return [...nonCard, ...invoiceItems];
  }, [byMonth, creditCards]);

  // 3. filtro por tipo
  const byTipo = useMemo(() => {
    if (tipoFilter === 'todos') return byMonthWithInvoices;
    return byMonthWithInvoices.filter((t) => !t.isTransfer && t.tipo === tipoFilter);
  }, [byMonthWithInvoices, tipoFilter]);

  // 4. filtro por categoria
  const byCat = useMemo(() =>
    catFilter === 'Todos' ? byTipo : byTipo.filter((t) => t.categoria === catFilter),
    [byTipo, catFilter]
  );

  // 5. filtro por banco (Open Finance)
  const filtered = useMemo(() => {
    if (bankFilter === 'Todos') return byCat;
    return byCat.filter((t) => t.origin?.type === 'openFinance' && t.origin?.bankName === bankFilter);
  }, [byCat, bankFilter]);

  // lista de bancos disponíveis nas transações do mês
  const banksAvailable = useMemo(() => {
    const map = new Map();
    for (const t of byMonthWithInvoices) {
      if (t.origin?.type === 'openFinance' && t.origin?.bankName) {
        if (!map.has(t.origin.bankName)) {
          map.set(t.origin.bankName, {
            name: t.origin.bankName,
            color: t.origin.bankColor,
            initial: t.origin.bankInitial,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [byMonthWithInvoices]);

  const ordered = useMemo(
    () => sortTransactionsByDate(filtered, transactionListOrder),
    [filtered, transactionListOrder]
  );

  // resumo do mês — exclui transferências
  const totalEntradas = useMemo(() => byMonth.reduce((s, t) => !t.isTransfer && t.tipo === 'entrada' ? s + t.valor : s, 0), [byMonth]);
  const totalSaidas   = useMemo(() => byMonth.reduce((s, t) => !t.isTransfer && t.tipo === 'saída'   ? s + t.valor : s, 0), [byMonth]);
  const saldo = totalEntradas - totalSaidas;

  const cats = ['Todos', ...categories.map((c) => c.name)];

  // Agrupa transações por rótulo de data (Hoje, Ontem, dd/mm/yyyy)
  const groupedSections = useMemo(() => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const yestStr = `${String(yesterday.getDate()).padStart(2,'0')}/${String(yesterday.getMonth()+1).padStart(2,'0')}/${yesterday.getFullYear()}`;

    const map = {};
    const order = [];
    for (const tx of ordered) {
      const rawDate = tx.data || '';
      let label = rawDate;
      if (rawDate === todayStr) label = 'Hoje';
      else if (rawDate === yestStr) label = 'Ontem';
      else {
        const p = rawDate.split('/');
        if (p.length === 3) {
          const dd = p[0];
          const mm = parseInt(p[1], 10);
          const yyyy = parseInt(p[2], 10);
          const monthName = MONTHS_PT[mm - 1] || '';
          label = yyyy === CURRENT_YEAR ? `${dd} de ${monthName}` : `${dd} de ${monthName} ${yyyy}`;
        }
      }
      if (!map[label]) { map[label] = []; order.push(label); }
      map[label].push(tx);
    }
    return order.map((title) => ({ title, data: map[title] }));
  }, [ordered]);

  return (
    <View style={styles.container}>
      <Header
        title="Histórico"
        right={
          <TouchableOpacity
            onPress={() => setFilterMenuOpen(true)}
            hitSlop={12}
            style={{ padding: 6 }}
            activeOpacity={0.7}
          >
            <PhosphorIconByName name="FunnelSimple" size={20} color={T.brandFg} />
            {filtersActiveCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filtersActiveCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* ── navegador de mês ── */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => goTo(prev)} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrowText}>{'<'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goTo(prev)} style={styles.navSide} activeOpacity={0.6}>
          <Text style={styles.navSideText}>{monthLabel(prev.month, prev.year)}</Text>
        </TouchableOpacity>

        <View style={styles.navCurrent}>
          <Text style={styles.navCurrentText}>{monthLabel(selMonth, selYear)}</Text>
        </View>

        <TouchableOpacity onPress={() => goTo(next)} style={styles.navSide} activeOpacity={0.6}>
          <Text style={styles.navSideText}>{monthLabel(next.month, next.year)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => goTo(next)} style={styles.navArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.navArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── resumo do mês ── */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, { color: T.positive }]}>+{fmt(totalEntradas)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, { color: T.negative }]}>-{fmt(totalSaidas)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Saldo</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {saldo < 0 && (
              <PhosphorIconByName name="WarningCircle" size={14} color="#E53935" style={{ marginRight: 3 }} />
            )}
            <Text style={[styles.summaryValue, { color: saldo >= 0 ? T.positive : T.negative }]}>
              {saldo >= 0 ? '+' : ''}{fmt(saldo)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── toggle tipo ── */}
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

      {/* ── chips de filtros ativos (clean: só aparecem quando há filtro) ── */}
      {filtersActiveCount > 0 && (
        <View style={styles.activeChipsRow}>
          {catFilter !== 'Todos' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{catFilter}</Text>
              <TouchableOpacity onPress={() => setCatFilter('Todos')} hitSlop={8}>
                <PhosphorIconByName name="X" size={12} color={T.white} />
              </TouchableOpacity>
            </View>
          )}
          {bankFilter !== 'Todos' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>{bankFilter}</Text>
              <TouchableOpacity onPress={() => setBankFilter('Todos')} hitSlop={8}>
                <PhosphorIconByName name="X" size={12} color={T.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── menu de filtros (3 pontos) ── */}
      <Modal
        visible={filterMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeFilterMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeFilterMenu}>
          <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
            {filterSubmenu === null && (
              <>
                <Text style={styles.menuTitle}>Filtros</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setFilterSubmenu('categoria')}
                  activeOpacity={0.6}
                >
                  <PhosphorIconByName name="Tag" size={18} color={T.graphite} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuItemText}>Filtrar por categoria</Text>
                    {catFilter !== 'Todos' && (
                      <Text style={styles.menuItemSub}>{catFilter}</Text>
                    )}
                  </View>
                  <PhosphorIconByName name="CaretRight" size={14} color={T.grayNeutral} />
                </TouchableOpacity>

                <View style={styles.menuDivider} />

                <TouchableOpacity
                  style={[styles.menuItem, banksAvailable.length === 0 && styles.menuItemDisabled]}
                  onPress={() => banksAvailable.length > 0 && setFilterSubmenu('banco')}
                  activeOpacity={banksAvailable.length === 0 ? 1 : 0.6}
                >
                  <PhosphorIconByName name="Bank" size={18} color={banksAvailable.length === 0 ? T.grayNeutral : T.graphite} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuItemText, banksAvailable.length === 0 && styles.menuItemTextDisabled]}>
                      Filtrar por banco
                    </Text>
                    {bankFilter !== 'Todos' ? (
                      <Text style={styles.menuItemSub}>{bankFilter}</Text>
                    ) : banksAvailable.length === 0 ? (
                      <Text style={styles.menuItemSub}>Sem bancos neste mês</Text>
                    ) : null}
                  </View>
                  {banksAvailable.length > 0 && (
                    <PhosphorIconByName name="CaretRight" size={14} color={T.grayNeutral} />
                  )}
                </TouchableOpacity>

                {filtersActiveCount > 0 && (
                  <>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setCatFilter('Todos');
                        setBankFilter('Todos');
                        closeFilterMenu();
                      }}
                      activeOpacity={0.6}
                    >
                      <PhosphorIconByName name="ArrowCounterClockwise" size={18} color={T.orange} />
                      <Text style={[styles.menuItemText, { color: T.orange }]}>Limpar filtros</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {filterSubmenu === 'categoria' && (
              <>
                <View style={styles.submenuHeader}>
                  <TouchableOpacity onPress={() => setFilterSubmenu(null)} hitSlop={8}>
                    <PhosphorIconByName name="CaretLeft" size={18} color={T.graphite} />
                  </TouchableOpacity>
                  <Text style={styles.menuTitle}>Categoria</Text>
                  <View style={{ width: 18 }} />
                </View>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {cats.map((c) => {
                    const active = catFilter === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={styles.optionRow}
                        onPress={() => {
                          setCatFilter(c);
                          closeFilterMenu();
                        }}
                        activeOpacity={0.6}
                      >
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{c}</Text>
                        {active && <PhosphorIconByName name="Check" size={16} color={T.orange} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {filterSubmenu === 'banco' && (
              <>
                <View style={styles.submenuHeader}>
                  <TouchableOpacity onPress={() => setFilterSubmenu(null)} hitSlop={8}>
                    <PhosphorIconByName name="CaretLeft" size={18} color={T.graphite} />
                  </TouchableOpacity>
                  <Text style={styles.menuTitle}>Banco</Text>
                  <View style={{ width: 18 }} />
                </View>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      setBankFilter('Todos');
                      closeFilterMenu();
                    }}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.optionText, bankFilter === 'Todos' && styles.optionTextActive]}>
                      Todos
                    </Text>
                    {bankFilter === 'Todos' && <PhosphorIconByName name="Check" size={16} color={T.orange} />}
                  </TouchableOpacity>
                  {banksAvailable.map((b) => {
                    const active = bankFilter === b.name;
                    return (
                      <TouchableOpacity
                        key={b.name}
                        style={styles.optionRow}
                        onPress={() => {
                          setBankFilter(b.name);
                          closeFilterMenu();
                        }}
                        activeOpacity={0.6}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <BankIcon bankName={b.name} bankColor={b.color} bankInitial={b.initial} size={18} />
                          <Text style={[styles.optionText, active && styles.optionTextActive]}>{b.name}</Text>
                        </View>
                        {active && <PhosphorIconByName name="Check" size={16} color={T.orange} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── lista agrupada por data (Hoje, Ontem, dd/mm/yyyy) ── */}
      <SectionList
        style={{ flex: 1 }}
        sections={groupedSections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: isDesktop ? 40 : 16, paddingBottom: 100 + insets.bottom }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhuma transação encontrada</Text>}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionDateLabel}>{title}</Text>
        )}
        renderItem={({ item: tx }) => {
          if (tx.__invoiceGroup) {
            const card = creditCards.find((c) => c.id === tx.creditCardId);
            const bank = getAccountBank(accounts, card?.accountId);
            return (
              <TouchableOpacity
                style={[styles.txRow, isDesktop && styles.txRowDesktop]}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('InvoiceDetail', {
                    invoiceKey: tx.invoiceKey,
                    cardName: tx.cardLabel,
                  })
                }
              >
                <View style={styles.invoiceIcon}>
                  {bank ? (
                    <BankIcon bankName={bank.bankName} bankColor={bank.bankColor} bankInitial={bank.bankInitial} size={20} />
                  ) : (
                    <BankIcon bankInitial="C" size={20} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txDesc, isDesktop && styles.txDescDesktop]} numberOfLines={1}>
                    {tx.descricao}
                  </Text>
                  <Text style={[styles.txMeta, isDesktop && styles.txMetaDesktop]}>
                    {tx.cardLabel} · {tx.count} {tx.count === 1 ? 'gasto' : 'gastos'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.txValue, isDesktop && styles.txValueDesktop, { color: T.negative }]}>
                    -{fmt(tx.valor)}
                  </Text>
                  <Text style={styles.invoiceChevron}>{'>'}</Text>
                </View>
              </TouchableOpacity>
            );
          }
          const bank = getAccountBank(accounts, tx.accountId);
          return (
            <TouchableOpacity
              style={[styles.txRow, isDesktop && styles.txRowDesktop]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Detail', { tx })}
            >
              <CatIcon category={tx.categoria} size={isDesktop ? 48 : 40} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, isDesktop && styles.txDescDesktop]} numberOfLines={1}>{tx.descricao}</Text>
                <Text style={[styles.txMeta, isDesktop && styles.txMetaDesktop]}>
                  {tx.categoria}{bank?.bankName ? ` · ${bank.bankName}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {tx.origin?.type === 'openFinance' ? (
                  <View style={styles.txOriginIcon}>
                    <BankIcon
                      bankName={tx.origin.bankName}
                      bankColor={tx.origin.bankColor}
                      bankInitial={tx.origin.bankInitial}
                      size={16}
                    />
                  </View>
                ) : null}
                <Text style={[styles.txValue, isDesktop && styles.txValueDesktop, { color: tx.tipo === 'entrada' ? T.positive : T.negative }]}>
                  {tx.tipo === 'entrada' ? '+' : '-'}{fmt(tx.valor)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function createHistoryStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },

    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: T.offWhite,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    navArrow: { paddingHorizontal: 6 },
    navArrowText: { fontSize: 18, color: T.orange, fontFamily: 'Poppins_600SemiBold' },
    navSide: { flex: 1, alignItems: 'center' },
    navSideText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayNeutral },
    navCurrent: {
      flex: 1.4,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: T.orange,
      borderRadius: 24,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: 'rgba(254,94,3,0.08)',
    },
    navCurrentText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.orange },

    summary: {
      flexDirection: 'row',
      backgroundColor: T.white,
      marginHorizontal: 20,
      marginTop: 14,
      marginBottom: 2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.grayVLight,
      paddingVertical: 12,
    },
    summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
    summaryDivider: { width: 1, backgroundColor: T.grayVLight, marginVertical: 4 },
    summaryLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    summaryValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },

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
    filterRow: { paddingHorizontal: 20, paddingVertical: 10, gap: 8 },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    pillActive: { backgroundColor: T.orange, borderColor: T.orange },
    pillBank: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pillText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
    pillTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.white },
    txOriginIcon: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.04)',
      alignItems: 'center', justifyContent: 'center',
    },

    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    txRowDesktop: {
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    txDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.graphite },
    txDescDesktop: { fontSize: 15 },
    txMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed },
    txMetaDesktop: { fontSize: 12 },
    txValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
    txValueDesktop: { fontSize: 15 },
    emptyText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: T.grayMed,
      textAlign: 'center',
      marginTop: 40,
    },
    invoiceIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(254,94,3,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    invoiceIconText: { fontSize: 18 },
    invoiceChevron: { fontSize: 11, color: T.grayNeutral, fontFamily: 'Poppins_400Regular' },
    // ── menu de filtros (3 pontos) ──
    filterBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 14,
      height: 14,
      paddingHorizontal: 3,
      borderRadius: 7,
      backgroundColor: T.orange,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 9,
      color: T.white,
      lineHeight: 12,
    },
    activeChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    activeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      backgroundColor: T.orange,
    },
    activeChipText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 11,
      color: T.white,
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 60,
      paddingHorizontal: 12,
    },
    menuCard: {
      width: 260,
      backgroundColor: T.white,
      borderRadius: 14,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 8,
    },
    menuTitle: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13,
      color: T.graphite,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    menuItemDisabled: { opacity: 0.5 },
    menuItemText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.graphite,
    },
    menuItemTextDisabled: { color: T.grayNeutral },
    menuItemSub: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 11,
      color: T.grayMed,
      marginTop: 1,
    },
    menuDivider: {
      height: 1,
      backgroundColor: T.grayVLight,
      marginHorizontal: 10,
    },
    submenuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 11,
    },
    optionText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.graphite,
    },
    optionTextActive: {
      fontFamily: 'Poppins_600SemiBold',
      color: T.orange,
    },
    // Rótulo de agrupamento por data (Hoje, Ontem, dd/mm/yyyy)
    sectionDateLabel: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
      color: T.graphite,
      marginTop: 20,
      marginBottom: 4,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
      letterSpacing: 0.3,
    },
  });
}
