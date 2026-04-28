import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../context/AppPreferencesContext';
import { Header, PrimaryButton } from '../components/Shared';
import BrCalendarModal from '../components/BrCalendarModal';
import { useFinance, activeAccounts, activeCreditCards, invoiceKeyFromDateAndCloseDay, invoiceLabelPtBr } from '../context/FinanceContext';
import { useResponsiveLayout } from '../utils/responsiveLayout';
import { parseBrDate } from '../utils/chart';

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


function createNewTransactionStyles(T, isDesktop) {
  return StyleSheet.create({
    form: { flexGrow: 1, padding: isDesktop ? 40 : 20, gap: isDesktop ? 24 : 20, maxWidth: isDesktop ? 800 : 'auto' },
    modeRow: { flexDirection: 'row', gap: isDesktop ? 16 : 10 },
    modeBtn: {
      flex: 1,
      paddingVertical: isDesktop ? 14 : 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      alignItems: 'center',
    },
    modeBtnActive: { backgroundColor: T.orange, borderColor: T.orange },
    modeText: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 14 : 12, color: T.graphite },
    modeTextActive: { color: '#fff' },
    toggle: {
      flexDirection: 'row',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    toggleBtn: { flex: 1, paddingVertical: isDesktop ? 14 : 12, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: T.orange },
    toggleText: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 15 : 14, color: T.graphite },
    toggleTextActive: { color: '#fff' },
    field: {},
    label: { fontFamily: 'Poppins_600SemiBold', fontSize: isDesktop ? 13 : 12, color: T.charcoal, marginBottom: 8 },
    input: {
      backgroundColor: T.white,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      paddingHorizontal: 16,
      paddingVertical: isDesktop ? 16 : 14,
      fontFamily: 'Poppins_400Regular',
      fontSize: isDesktop ? 16 : 15,
      color: T.graphite,
    },
    valueInput: { paddingLeft: 60, fontSize: isDesktop ? 32 : 24, fontFamily: 'Poppins_600SemiBold' },
    currencyPrefix: {
      position: 'absolute',
      left: 16,
      top: isDesktop ? 18 : 16,
      zIndex: 1,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: isDesktop ? 28 : 24,
      color: T.grayMed,
    },
    accountRow: { gap: isDesktop ? 12 : 8, paddingVertical: 2, flexWrap: isDesktop ? 'wrap' : 'nowrap' },
    accountPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: isDesktop ? 12 : 10,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      backgroundColor: T.white,
    },
    accountPillActive: { borderColor: T.orange, backgroundColor: 'rgba(254,94,3,0.06)' },
    accountIcon: { fontSize: isDesktop ? 18 : 16 },
    accountText: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 14 : 13, color: T.graphite },
    accountTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
    hint: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 13 : 12, color: T.burnt },
    datePill: {
      backgroundColor: T.white,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      paddingHorizontal: 16,
      paddingVertical: isDesktop ? 16 : 14,
      justifyContent: 'center',
    },
    dateText: { fontFamily: 'Poppins_400Regular', fontSize: isDesktop ? 16 : 15, color: T.graphite },
    datePlaceholder: { color: T.grayNeutral },
    installmentRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
    installmentCol: { flex: 1 },
    installmentLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: T.charcoal, marginBottom: 6 },
    installmentScroll: { maxHeight: 160, borderRadius: 12, borderWidth: 1.5, borderColor: T.graySilver, backgroundColor: T.white },
    installPick: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.grayVLight },
    installPickText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
    installPickTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
  });
}

export default function NewTransactionScreen({ navigation, route }) {
  const T = useThemeColors();
  const { isDesktop } = useResponsiveLayout();
  const styles = useMemo(() => createNewTransactionStyles(T, isDesktop), [T, isDesktop]);
  const insets = useSafeAreaInsets();
  const { accounts, creditCards, addTransfer, showToast } = useFinance();
  const act = useMemo(() => activeAccounts(accounts), [accounts]);
  const cardsAct = useMemo(() => activeCreditCards(creditCards), [creditCards]);
  // Aceita defaultKind vindo dos botões de ação rápida do Dashboard
  const [kind, setKind] = useState(route?.params?.defaultKind || 'despesa'); // despesa | receita | transfer
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataObj, setDataObj] = useState(() => new Date());
  const [data, setData] = useState(() => formatBrDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [accountId, setAccountId] = useState(act[0]?.id);
  const [creditCardId, setCreditCardId] = useState(null);
  const [gastoTipo, setGastoTipo] = useState('nenhum'); // nenhum | fixo | parcelado
  const [periodicidade, setPeriodicidade] = useState('mensal');
  const [numParcelas, setNumParcelas] = useState(12);
  const [origem, setOrigem] = useState(act[0]?.id);
  const [destino, setDestino] = useState(act[1]?.id || act[0]?.id);
  const [paySource, setPaySource] = useState('conta'); // conta | cartao
  const [invoiceKey, setInvoiceKey] = useState(null);
  const [invoiceManual, setInvoiceManual] = useState(false);
  const valorRef = useRef(null);
  const descRef = useRef(null);
  const prevCardIdRef = useRef(null);

  const mode = kind === 'transfer' ? 'transfer' : 'normal';
  const tipo = kind === 'receita' ? 'entrada' : 'saída';

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      setDataObj(now);
      setData(formatBrDate(now));
      setTimeout(() => valorRef.current?.focus?.(), 120);
    }, [])
  );

  useEffect(() => {
    if (!act.length) return;
    setAccountId((id) => (act.some((a) => a.id === id) ? id : act[0].id));
    setOrigem((id) => (act.some((a) => a.id === id) ? id : act[0].id));
    setDestino((id) => (act.some((a) => a.id === id) ? id : act[1]?.id || act[0].id));
  }, [act]);

  useEffect(() => {
    const t = setTimeout(() => valorRef.current?.focus?.(), 80);
    return () => clearTimeout(t);
  }, [kind]);

  useEffect(() => {
    // Fonte de pagamento é exclusiva — este efeito roda apenas quando paySource muda.
    // Usa setters funcionais para evitar leituras de valores stale de outros estados.
    if (paySource === 'conta') {
      setCreditCardId(null);
      setAccountId((id) => id || act[0]?.id || null);
      setInvoiceKey(null);
      setInvoiceManual(false);
      prevCardIdRef.current = null;
    } else {
      // cartao
      setAccountId(null);
      setCreditCardId((id) => id || cardsAct[0]?.id || null);
    }
  }, [paySource, act, cardsAct]);

  const invoiceKeyAuto = useMemo(() => {
    if (paySource !== 'cartao' || !creditCardId) return null;
    const card = creditCards.find((c) => String(c.id) === String(creditCardId));
    if (!card) return null;
    return invoiceKeyFromDateAndCloseDay(dataObj, card.diaFechamento);
  }, [creditCardId, creditCards, dataObj, paySource]);

  useEffect(() => {
    if (paySource !== 'cartao') return;
    if (!invoiceKeyAuto) return;
    const prev = prevCardIdRef.current;
    const cardChanged = prev != null && creditCardId != null && String(prev) !== String(creditCardId);
    if (cardChanged) {
      // A seleção manual de fatura não deve “vazar” entre cartões.
      setInvoiceManual(false);
      setInvoiceKey(invoiceKeyAuto);
    } else if (!invoiceManual) {
      setInvoiceKey(invoiceKeyAuto);
    }
    prevCardIdRef.current = creditCardId;
  }, [invoiceKeyAuto, invoiceManual, paySource]);

  const handleValor = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setValor(num === '0.00' ? '' : num);
  };

  const displayValor = valor ? parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

  const canContinue =
    mode === 'normal'
      ? valor && descricao && (paySource === 'conta' ? accountId : creditCardId)
      : valor && origem && destino && origem !== destino;

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

  const saveTransfer = () => {
    if (!canContinue) return;
    addTransfer({
      valor: parseFloat(valor),
      descricao: descricao.trim(),
      data,
      accountOrigem: origem,
      accountDestino: destino,
    });
    showToast('Transferência registrada! ✓');
    navigation.navigate('Main');
  };

  const openDatePicker = () => setShowDatePicker(true);
  const onPickDate = (_, selected) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (!selected) return;
    setDataObj(selected);
    setData(formatBrDate(selected));
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.offWhite }}>
      <Header title="Nova transação" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.form, { paddingBottom: 28 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modeRow}>
            {[
              { key: 'despesa', label: 'Despesa' },
              { key: 'receita', label: 'Receita' },
              { key: 'transfer', label: 'Transferência' },
            ].map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setKind(m.key)}
                style={[styles.modeBtn, kind === m.key && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, kind === m.key && styles.modeTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'normal' ? (
            <>
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
                    returnKeyType="next"
                    onSubmitEditing={() => descRef.current?.focus?.()}
                    style={[styles.input, styles.valueInput]}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  ref={descRef}
                  value={descricao}
                  onChangeText={setDescricao}
                  placeholder="Ex: Almoço no restaurante"
                  placeholderTextColor={T.grayNeutral}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Data</Text>
                <TouchableOpacity activeOpacity={0.75} onPress={openDatePicker} style={styles.datePill}>
                  <Text style={[styles.dateText, !data && styles.datePlaceholder]}>{data || 'Selecionar data'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Pago com</Text>
                <View style={styles.toggle}>
                  {[
                    { key: 'conta', label: 'Conta' },
                    { key: 'cartao', label: 'Cartão' },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() => setPaySource(o.key)}
                      style={[styles.toggleBtn, paySource === o.key && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleText, paySource === o.key && styles.toggleTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                {paySource === 'conta' ? (
                  <>
                    <Text style={styles.label}>Conta</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                      {act.map((ac) => (
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
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Cartão</Text>
                    {cardsAct.length ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                        {cardsAct.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setCreditCardId(c.id)}
                            style={[styles.accountPill, creditCardId === c.id && styles.accountPillActive]}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.accountIcon}>{c.icon}</Text>
                            <Text style={[styles.accountText, creditCardId === c.id && styles.accountTextActive]}>{c.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : (
                      <Text style={styles.hint}>Você ainda não cadastrou cartões.</Text>
                    )}
                  </>
                )}
              </View>

              {paySource === 'cartao' && creditCardId ? (
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
                    <Text style={styles.hint}>Selecione um cartão para sugerir a fatura.</Text>
                  )}
                </View>
              ) : null}

              <View style={styles.field}>
                <View style={styles.toggle}>
                  {[
                    { key: 'fixo', label: 'Fixo' },
                    { key: 'parcelado', label: 'Parcelado' },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() =>
                      setGastoTipo((cur) => {
                        const n = cur === o.key ? 'nenhum' : o.key;
                        if (n === 'parcelado') setPeriodicidade((p) => p || 'mensal');
                        if (n === 'fixo') setPeriodicidade((p) => p || 'mensal');
                        return n;
                      })
                    }
                      style={[styles.toggleBtn, gastoTipo === o.key && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleText, gastoTipo === o.key && styles.toggleTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {gastoTipo === 'fixo' ? (
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

              {gastoTipo === 'parcelado' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>Parcelas e periodicidade</Text>
                  <View style={styles.installmentRow}>
                    <View style={styles.installmentCol}>
                      <Text style={styles.installmentLabel}>Número de parcelas</Text>
                      <TextInput
                        value={String(numParcelas)}
                        onChangeText={(txt) => {
                          const n = parseInt(txt.replace(/\D/g, ''), 10);
                          if (!isNaN(n) && n >= 1) setNumParcelas(n);
                          else if (txt === '') setNumParcelas(1);
                        }}
                        keyboardType="numeric"
                        style={[styles.input, { textAlign: 'center', fontSize: isDesktop ? 18 : 16 }]}
                        maxLength={3}
                        placeholder="12"
                        placeholderTextColor={T.grayNeutral}
                      />
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

              <View style={{ flex: 1, minHeight: 20 }} />

              <PrimaryButton
                label="Continuar"
                disabled={!canContinue}
                onPress={() => {
                  const finalAccountId =
                    paySource === 'conta'
                      ? accountId
                      : creditCards.find((c) => String(c.id) === String(creditCardId))?.accountId ?? act[0]?.id;
                  navigation.navigate('AICategory', {
                    txData: {
                      tipo,
                      valor: parseFloat(valor),
                      descricao,
                      data,
                      accountId: finalAccountId,
                      ...(paySource === 'cartao' && creditCardId ? { creditCardId } : {}),
                      ...(paySource === 'cartao' && creditCardId && invoiceKey ? { invoiceKey, invoiceKeyManual: invoiceManual } : {}),
                      ...(gastoTipo === 'fixo' ? { gastoTipo, periodicidade } : {}),
                      ...(gastoTipo === 'parcelado' ? { gastoTipo, periodicidade, numParcelas } : {}),
                    },
                    excludeCategories: ['Transferência'],
                  });
                }}
              />
            </>
          ) : (
            <>
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
                <Text style={styles.label}>De (origem)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  {act.map((ac) => (
                    <TouchableOpacity
                      key={ac.id}
                      onPress={() => setOrigem(ac.id)}
                      style={[styles.accountPill, origem === ac.id && styles.accountPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountIcon}>{ac.icon}</Text>
                      <Text style={[styles.accountText, origem === ac.id && styles.accountTextActive]}>{ac.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Para (destino)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
                  {act.map((ac) => (
                    <TouchableOpacity
                      key={ac.id}
                      onPress={() => setDestino(ac.id)}
                      style={[styles.accountPill, destino === ac.id && styles.accountPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.accountIcon}>{ac.icon}</Text>
                      <Text style={[styles.accountText, destino === ac.id && styles.accountTextActive]}>{ac.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Descrição (opcional)</Text>
                <TextInput
                  value={descricao}
                  onChangeText={setDescricao}
                  placeholder="Ex: Reserva mensal"
                  placeholderTextColor={T.grayNeutral}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Data</Text>
                <TouchableOpacity activeOpacity={0.75} onPress={openDatePicker} style={styles.datePill}>
                  <Text style={[styles.dateText, !data && styles.datePlaceholder]}>{data || 'Selecionar data'}</Text>
                </TouchableOpacity>
              </View>

              {origem === destino && act.length > 1 ? (
                <Text style={styles.hint}>Escolha contas diferentes para origem e destino.</Text>
              ) : null}

              <View style={{ flex: 1, minHeight: 20 }} />

              <PrimaryButton label="Salvar transferência" disabled={!canContinue} onPress={saveTransfer} />
            </>
          )}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
