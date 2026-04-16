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
    toggleTextActive: { color: '#fff' },
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
    accountPillActive: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.06)' },
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
  });
}

export default function EditTransactionScreen({ navigation, route }) {
  const T = useThemeColors();
  const styles = useMemo(() => createEditTransactionStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { tx } = route.params;
  const { accounts, creditCards, updateTransaction, showToast } = useFinance();
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
  const valorRef = useRef(null);

  useEffect(() => {
    if (route.params?.selectedCategory) {
      setCategoria(route.params.selectedCategory);
    }
  }, [route.params?.selectedCategory]);

  useEffect(() => {
    setTimeout(() => valorRef.current?.focus?.(), 120);
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
      return;
    }
    if (invoiceKeyAuto && !invoiceManual) setInvoiceKey(invoiceKeyAuto);
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
    const updated = {
      ...tx,
      tipo,
      valor: parseFloat(valor),
      descricao,
      data,
      obs,
      categoria,
      accountId,
      creditCardId: creditCardId || null,
      ...(creditCardId ? { invoiceKey: invoiceKey || invoiceKeyAuto, invoiceKeyManual: invoiceManual } : {}),
      ...(gastoTipo === 'nenhum' ? { gastoTipo: 'nenhum', periodicidade: undefined } : { gastoTipo, periodicidade }),
    };
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
                    { key: invoiceKeyAuto, label: `${invoiceLabelPtBr(invoiceKeyAuto)} (auto)` },
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
            <View style={styles.toggle}>
              {[
                { key: 'nenhum', label: 'Normal' },
                { key: 'fixo', label: 'Fixo' },
                { key: 'parcelado', label: 'Parcelado' },
              ].map((o) => (
                <TouchableOpacity
                  key={o.key}
                  onPress={() => setGastoTipo(o.key)}
                  style={[styles.toggleBtn, gastoTipo === o.key && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, gastoTipo === o.key && styles.toggleTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {gastoTipo !== 'nenhum' ? (
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
        <DateTimePicker value={dataObj} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onPickDate} />
      ) : null}
    </View>
  );
}
