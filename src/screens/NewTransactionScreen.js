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
import { useFinance, activeAccounts, activeCreditCards } from '../context/FinanceContext';

function formatBrDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function createNewTransactionStyles(T) {
  return StyleSheet.create({
    form: { flexGrow: 1, padding: 20, gap: 20 },
    modeRow: { flexDirection: 'row', gap: 10 },
    modeBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
      alignItems: 'center',
    },
    modeBtnActive: { backgroundColor: T.orange, borderColor: T.orange },
    modeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: T.graphite },
    modeTextActive: { color: '#fff' },
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
    hint: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.burnt },
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
    datePlaceholder: { color: T.grayNeutral },
  });
}

export default function NewTransactionScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createNewTransactionStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { accounts, creditCards, addTransfer, showToast } = useFinance();
  const act = useMemo(() => activeAccounts(accounts), [accounts]);
  const cardsAct = useMemo(() => activeCreditCards(creditCards), [creditCards]);
  const [kind, setKind] = useState('despesa'); // despesa | receita | transfer
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
<<<<<<< HEAD
  const [data, setData] = useState(formatTodayBr());
=======
  const [dataObj, setDataObj] = useState(() => new Date());
  const [data, setData] = useState(() => formatBrDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
>>>>>>> murilo
  const [accountId, setAccountId] = useState(act[0]?.id);
  const [creditCardId, setCreditCardId] = useState(null);
  const [gastoTipo, setGastoTipo] = useState('nenhum'); // nenhum | fixo | parcelado
  const [periodicidade, setPeriodicidade] = useState('mensal');
  const [origem, setOrigem] = useState(act[0]?.id);
  const [destino, setDestino] = useState(act[1]?.id || act[0]?.id);
  const [paySource, setPaySource] = useState('conta'); // conta | cartao
  const valorRef = useRef(null);
  const descRef = useRef(null);

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
    setTimeout(() => valorRef.current?.focus?.(), 80);
  }, [kind]);

  useEffect(() => {
    // Fonte de pagamento é exclusiva
    if (paySource === 'conta') {
      if (creditCardId) setCreditCardId(null);
      if (!accountId && act[0]?.id) setAccountId(act[0].id);
    } else {
      // cartao
      if (accountId) setAccountId(null);
      if (!creditCardId && cardsAct[0]?.id) setCreditCardId(cardsAct[0].id);
    }
  }, [paySource]); // eslint-disable-line react-hooks/exhaustive-deps

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

              <View style={styles.field}>
                <View style={styles.toggle}>
                  {[
                    { key: 'fixo', label: 'Fixo' },
                    { key: 'parcelado', label: 'Parcelado' },
                  ].map((o) => (
                    <TouchableOpacity
                      key={o.key}
                      onPress={() => setGastoTipo((cur) => (cur === o.key ? 'nenhum' : o.key))}
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
                      ...(gastoTipo !== 'nenhum' ? { gastoTipo, periodicidade } : {}),
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
            <DateTimePicker value={dataObj} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onPickDate} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
