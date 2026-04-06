import React, { useState, useEffect, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';
import { Header, PrimaryButton } from '../components/Shared';
import { useFinance, activeAccounts } from '../context/FinanceContext';

export default function NewTransactionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { accounts, addTransfer, showToast } = useFinance();
  const act = useMemo(() => activeAccounts(accounts), [accounts]);
  const [mode, setMode] = useState('normal');
  const [tipo, setTipo] = useState('saída');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('01/04/2026');
  const [accountId, setAccountId] = useState(act[0]?.id);
  const [origem, setOrigem] = useState(act[0]?.id);
  const [destino, setDestino] = useState(act[1]?.id || act[0]?.id);

  useEffect(() => {
    if (!act.length) return;
    setAccountId((id) => (act.some((a) => a.id === id) ? id : act[0].id));
    setOrigem((id) => (act.some((a) => a.id === id) ? id : act[0].id));
    setDestino((id) => (act.some((a) => a.id === id) ? id : act[1]?.id || act[0].id));
  }, [act]);

  const handleValor = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setValor(num === '0.00' ? '' : num);
  };

  const displayValor = valor ? parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

  const canContinue = mode === 'normal' ? valor && descricao && accountId : valor && origem && destino && origem !== destino;

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
              { key: 'normal', label: 'Receita / Despesa' },
              { key: 'transfer', label: 'Transferência' },
            ].map((m) => (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'normal' ? (
            <>
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
                <TextInput
                  value={data}
                  onChangeText={setData}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={T.grayNeutral}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
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
              </View>

              <View style={{ flex: 1, minHeight: 20 }} />

              <PrimaryButton
                label="Continuar"
                disabled={!canContinue}
                onPress={() => {
                  navigation.navigate('AICategory', {
                    txData: {
                      tipo,
                      valor: parseFloat(valor),
                      descricao,
                      data,
                      accountId,
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
                <TextInput
                  value={data}
                  onChangeText={setData}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={T.grayNeutral}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>

              {origem === destino && act.length > 1 ? (
                <Text style={styles.hint}>Escolha contas diferentes para origem e destino.</Text>
              ) : null}

              <View style={{ flex: 1, minHeight: 20 }} />

              <PrimaryButton label="Salvar transferência" disabled={!canContinue} onPress={saveTransfer} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  modeTextActive: { color: T.white },
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
});
