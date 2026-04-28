import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../context/AppPreferencesContext';
import { Header, PrimaryButton, CatIcon } from '../components/Shared';
import { useFinance, activeAccounts, activeCreditCards, invoiceKeyFromDateAndCloseDay, invoiceLabelPtBr } from '../context/FinanceContext';
import { PERIOD_LABEL } from '../utils/recurrence';
import { parseBrDate } from '../utils/chart';
import BrCalendarModal from '../components/BrCalendarModal';

const PARCELA_NUMS = Array.from({ length: 365 }, (_, i) => i + 1);

function formatBrDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function invoiceKeyShift(key, deltaMonths) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return key;
  const yy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const d = new Date(yy, mm - 1, 1);
  d.setMonth(d.getMonth() + deltaMonths);
  const y2 = d.getFullYear();
  const m2 = String(d.getMonth() + 1).padStart(2, '0');
  return `${y2}-${m2}`;
}

function createEditTransactionStyles(T) {
  return StyleSheet.create({
    form: { flexGrow: 1, padding: 20, gap: 16 },
    blockText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: T.grayMed, lineHeight: 22 },
    toggle: {
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: T.orange },
    toggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
    toggleTextActive: { color: T.white },
    field: {},
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.charcoal, marginBottom: 6 },
    input: {
      backgroundColor: T.white,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: 'Poppins_400Regular',
      fontSize: 15,
      color: T.graphite,
    },
    valueInput: { paddingLeft: 60, fontSize: 24, fontFamily: 'Poppins_600SemiBold' },
    currencyPrefix: {
      position: 'absolute',
      left: 16,
      top: 16,
      zIndex: 1,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 24,
      color: T.grayMed,
    },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: T.white,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      padding: 12,
    },
    catName: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, color: T.graphite },
    catChange: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.orange },
    accountRow: { gap: 8, paddingVertical: 2 },
    accountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      backgroundColor: T.white,
    },
    accountPillActive: { borderColor: T.orange, backgroundColor: 'rgba(254,94,3,0.06)' },
    accountIcon: { fontSize: 16 },
    accountText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
    accountTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
    datePill: {
      backgroundColor: T.white,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      paddingHorizontal: 16,
      paddingVertical: 14,
      justifyContent: 'center',
    },
    dateText: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: T.graphite },
    installmentRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
    installmentCol: { flex: 1 },
    installmentLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: T.charcoal, marginBottom: 6 },
    installmentScroll: {
      maxHeight: 200,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      borderRadius: 12,
      backgroundColor: T.white,
    },
    installPick: {
      paddingVertical: 10,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    installPickText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
    installPickTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
    lockedHint: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite, lineHeight: 20 },
  });
}

export default function EditTransactionScreen({ navigation, route }) {
  const T = useThemeColors();
  const styles = useMemo(() => createEditTransactionStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { tx } = route.params;
  const { accounts, creditCards, updateTransaction, addInstallmentTransactions, deleteTransaction, showToast } = useFinance();
  const act = useMemo(() => activeAccounts(accounts), [accounts]);
  const cardsAct = useMemo(() => activeCreditCards(creditCards), [creditCards]);
  const accountPickerList = useMemo(() => {
    const cur = accounts.find((a) => a.id === tx.accountId);
    if (!cur) return act;
    if (act.some((a) => a.id === cur.id)) return act;
    return [...act, cur];
  }, [act, accounts, tx.accountId]);
  const cardPickerList = useMemo(() => {
    const cur = creditCards.find((c) => String(c.id) === String(tx.creditCardId));
    if (!cur) return cardsAct;
    if (cardsAct.some((c) => c.id === cur.id)) return cardsAct;
    return [...cardsAct, cur];
  }, [cardsAct, creditCards, tx.creditCardId]);

  const [tipo, setTipo] = useState(tx.tipo);
  const [valor, setValor] = useState(String(tx.valor));
  const [descricao, setDescricao] = useState(tx.descricao);
  const [data, setData] = useState(tx.data);
  const [dataObj, setDataObj] = useState(() => parseBrDate(tx.data) || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [obs, setObs] = useState(tx.obs || '');
  const [categoria, setCategoria] = useState(tx.categoria);
  const [accountId, setAccountId] = useState(tx.accountId || accounts[0]?.id);
  const [creditCardId, setCreditCardId] = useState(tx.creditCardId || null);
  const [invoiceKey, setInvoiceKey] = useState(tx.invoiceKey || null);
  const [invoiceManual, setInvoiceManual] = useState(Boolean(tx.invoiceKeyManual));
  const [gastoTipo, setGastoTipo] = useState(tx.gastoTipo || 'nenhum');
  const [periodicidade, setPeriodicidade] = useState(tx.periodicidade || 'mensal');
  const [numParcelas, setNumParcelas] = useState(
    () => (tx.parcelaTotal != null ? tx.parcelaTotal : 12)
  );
  const valorRef = useRef(null);
  const lockedParcelGroup = Boolean(tx.parcelaGrupoId);
  const prevCardIdRef = useRef(tx.creditCardId || null);

  useEffect(() => {
    if (route.params?.selectedCategory) {
      setCategoria(route.params.selectedCategory);
    }
  }, [route.params?.selectedCategory]);

  useEffect(() => {
    const t = setTimeout(() => valorRef.current?.focus?.(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleValor = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setValor(num === '0.00' ? '' : num);
  };

  const onPickDate = (_, selected) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (!selected) return;
    setDataObj(selected);
    setData(formatBrDate(selected));
  };

  const invoiceKeyAuto = useMemo(() => {
    if (!creditCardId) return null;
    const card = creditCards.find((c) => String(c.id) === String(creditCardId));
    if (!card) return null;
    return invoiceKeyFromDateAndCloseDay(dataObj, card.diaFechamento);
  }, [creditCardId, creditCards, dataObj]);

  useEffect(() => {
    if (!creditCardId) {
      setInvoiceKey(null);
      setInvoiceManual(false);
      prevCardIdRef.current = null;
      return;
    }
    const prev = prevCardIdRef.current;
    const cardChanged = prev != null && String(prev) !== String(creditCardId);
    if (cardChanged) {
      // A seleção manual de fatura não deve “vazar” entre cartões.
      setInvoiceManual(false);
      setInvoiceKey(invoiceKeyAuto || null);
    } else if (invoiceKeyAuto && !invoiceManual) {
      setInvoiceKey(invoiceKeyAuto);
    }
    prevCardIdRef.current = creditCardId;
  }, [creditCardId, invoiceKeyAuto, invoiceManual]);

  const displayValor = valor ? parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

  const PERIODS = [
    { key: 'diaria', label: 'Diária' },
    { key: 'semanal', label: 'Semanal' },
    { key: 'quinzenal', label: 'Quinzenal' },
    { key: 'mensal', label: 'Mensal' },
    { key: 'bimensal', label: 'Bimensal' },
    { key: 'trimestral', label: 'Trimestral' },
    { key: 'semestral', label: 'Semestral' },
    { key: 'anual', label: 'Anual' },
  ];

  const handleSave = () => {
    if (gastoTipo === 'parcelado' && !lockedParcelGroup) {
      const base = {
        ...tx,
        tipo,
        valor: parseFloat(valor),
        descricao: descricao.trim(),
        data,
        obs,
        categoria,
        accountId,
        creditCardId: creditCardId || null,
        gastoTipo: 'parcelado',
        periodicidade,
        numParcelas,
        criado_por_ia: tx.criado_por_ia,
      };
      if (creditCardId) {
        base.invoiceKey = invoiceKey || invoiceKeyAuto;
        base.invoiceKeyManual = invoiceManual;
      }
      addInstallmentTransactions(base);
      deleteTransaction(tx);
      showToast('Parcelas salvas! ✓');
      navigation.navigate('Main');
      return;
    }

    const updated = {
      ...tx,
      tipo,
      valor: parseFloat(valor),
      descricao: descricao.trim(),
      data,
      obs,
      categoria,
      accountId,
      creditCardId: creditCardId || null,
    };
    if (creditCardId) {
      updated.invoiceKey = invoiceKey || invoiceKeyAuto;
      updated.invoiceKeyManual = invoiceManual;
    } else {
      delete updated.invoiceKey;
      delete updated.invoiceKeyManual;
    }
    if (gastoTipo === 'nenhum') {
      updated.gastoTipo = 'nenhum';
      delete updated.periodicidade;
      delete updated.numParcelas;
      delete updated.parcelaGrupoId;
      delete updated.parcelaIndice;
      delete updated.parcelaTotal;
    } else if (gastoTipo === 'fixo') {
      updated.gastoTipo = 'fixo';
      updated.periodicidade = periodicidade;
      delete updated.numParcelas;
      delete updated.parcelaGrupoId;
      delete updated.parcelaIndice;
      delete updated.parcelaTotal;
    } else if (gastoTipo === 'parcelado' && lockedParcelGroup) {
      updated.gastoTipo = 'parcelado';
      updated.periodicidade = periodicidade;
      updated.parcelaGrupoId = tx.parcelaGrupoId;
      updated.parcelaIndice = tx.parcelaIndice;
      updated.parcelaTotal = tx.parcelaTotal;
      delete updated.numParcelas;
    }
    updateTransaction(updated);
    showToast('Transação atualizada! ✓');
    navigation.navigate('Main');
  };

  if (tx.isTransfer) {
    return (
      <View style={{ flex: 1, backgroundColor: T.offWhite }}>
        <Header title="Editar transação" onBack={() => navigation.goBack()} />
        <View style={{ padding: 24 }}>
          <Text style={styles.blockText}>
            Transferências não podem ser editadas. Exclua e crie uma nova transferência se precisar ajustar.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.offWhite }}>
      <Header title="Editar transação" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toggle}>
            {['entrada', 'saída'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setTipo(t)} style={[styles.toggleBtn, tipo === t && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, tipo === t && styles.toggleTextActive]}>
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Valor</Text>
            <View style={{ position: 'relative' }}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                ref={valorRef}
                value={displayValor}
                onChangeText={handleValor}
                placeholder="0,00"
                placeholderTextColor={T.grayNeutral}
                keyboardType="numeric"
                style={[styles.input, styles.valueInput]}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor={T.grayNeutral}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity activeOpacity={0.75} onPress={() => setShowDatePicker(true)} style={styles.datePill}>
              <Text style={styles.dateText}>{data}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              value={obs}
              onChangeText={setObs}
              placeholder="Opcional"
              placeholderTextColor={T.grayNeutral}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Conta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
              {accountPickerList.map((ac) => (
                <TouchableOpacity
                  key={ac.id}
                  onPress={() => setAccountId(ac.id)}
                  style={[styles.accountPill, accountId === ac.id && styles.accountPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountIcon}>{ac.icon}</Text>
                  <Text style={[styles.accountText, accountId === ac.id && styles.accountTextActive]}>{ac.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Cartão (opcional)</Text>
            {cardPickerList.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                <TouchableOpacity
                  onPress={() => setCreditCardId(null)}
                  style={[styles.accountPill, !creditCardId && styles.accountPillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.accountIcon}>—</Text>
                  <Text style={[styles.accountText, !creditCardId && styles.accountTextActive]}>Nenhum</Text>
                </TouchableOpacity>
                {cardPickerList.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCreditCardId(c.id)}
                    style={[styles.accountPill, String(creditCardId) === String(c.id) && styles.accountPillActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.accountIcon}>{c.icon}</Text>
                    <Text style={[styles.accountText, String(creditCardId) === String(c.id) && styles.accountTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.blockText}>Você ainda não cadastrou cartões.</Text>
            )}
          </View>

          {creditCardId ? (
            <View style={styles.field}>
              <Text style={styles.label}>Fatura</Text>
              {invoiceKeyAuto ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  {[
                    { key: invoiceKeyShift(invoiceKeyAuto, -1), label: invoiceLabelPtBr(invoiceKeyShift(invoiceKeyAuto, -1)) },
                    { key: invoiceKeyAuto, label: invoiceLabelPtBr(invoiceKeyAuto) },
                    { key: invoiceKeyShift(invoiceKeyAuto, 1), label: invoiceLabelPtBr(invoiceKeyShift(invoiceKeyAuto, 1)) },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setInvoiceKey(opt.key);
                        setInvoiceManual(opt.key !== invoiceKeyAuto);
                      }}
                      style={[styles.accountPill, invoiceKey === opt.key && styles.accountPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.accountText, invoiceKey === opt.key && styles.accountTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.blockText}>Não foi possível sugerir a fatura.</Text>
              )}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Tipo de gasto</Text>
            {lockedParcelGroup && gastoTipo === 'parcelado' ? (
              <Text style={styles.lockedHint}>
                Parcela {tx.parcelaIndice} de {tx.parcelaTotal} · {PERIOD_LABEL[tx.periodicidade] || tx.periodicidade}. Para
                interromper parcelas, use Excluir no detalhe desta transação.
              </Text>
            ) : (
              <View style={styles.toggle}>
                {[
                  { key: 'nenhum', label: 'Normal' },
                  { key: 'fixo', label: 'Fixo' },
                  { key: 'parcelado', label: 'Parcelado' },
                ].map((o) => (
                  <TouchableOpacity
                    key={o.key}
                    onPress={() => {
                      setGastoTipo(o.key);
                      if (o.key === 'parcelado' || o.key === 'fixo') {
                        setPeriodicidade((p) => p || 'mensal');
                      }
                    }}
                    style={[styles.toggleBtn, gastoTipo === o.key && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, gastoTipo === o.key && styles.toggleTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {!lockedParcelGroup && gastoTipo === 'fixo' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Periodicidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPeriodicidade(p.key)}
                    style={[styles.accountPill, periodicidade === p.key && styles.accountPillActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.accountText, periodicidade === p.key && styles.accountTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {!lockedParcelGroup && gastoTipo === 'parcelado' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Parcelas e periodicidade</Text>
              <View style={styles.installmentRow}>
                <View style={styles.installmentCol}>
                  <Text style={styles.installmentLabel}>Número (1 a 365)</Text>
                  <ScrollView
                    style={styles.installmentScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {PARCELA_NUMS.map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() => setNumParcelas(n)}
                        style={styles.installPick}
                        activeOpacity={0.65}
                      >
                        <Text
                          style={[
                            styles.installPickText,
                            numParcelas === n && styles.installPickTextActive,
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.installmentCol}>
                  <Text style={styles.installmentLabel}>Período</Text>
                  <ScrollView
                    style={styles.installmentScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {PERIODS.map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        onPress={() => setPeriodicidade(p.key)}
                        style={styles.installPick}
                        activeOpacity={0.65}
                      >
                        <Text
                          style={[
                            styles.installPickText,
                            periodicidade === p.key && styles.installPickTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Categoria</Text>
            <TouchableOpacity
              style={styles.catRow}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ManualCategory', {
                  txData: { tipo, valor: parseFloat(valor || '0'), descricao, data },
                  returnTo: 'EditTransaction',
                  editTx: tx,
                  excludeCategories: ['Transferência'],
                })
              }
            >
              <CatIcon category={categoria} size={36} />
              <Text style={styles.catName}>{categoria}</Text>
              <Text style={styles.catChange}>Alterar →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ minHeight: 24 }} />

          <PrimaryButton label="Salvar alterações" disabled={!valor || !descricao} onPress={handleSave} />
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker ? (
        Platform.OS === 'web' ? (
          <BrCalendarModal
            visible={showDatePicker}
            title="Selecionar data"
            valueBr={data}
            palette={T}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(valueBr) => {
              const d = parseBrDate(valueBr) || new Date();
              setDataObj(d);
              setData(valueBr);
            }}
          />
        ) : (
          <DateTimePicker
            value={dataObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickDate}
          />
        )
      ) : null}
    </View>
  );
}
