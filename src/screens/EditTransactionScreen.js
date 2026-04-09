import React, { useState, useEffect, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from '../theme';
import { Header, PrimaryButton, CatIcon } from '../components/Shared';
import { useFinance, activeAccounts } from '../context/FinanceContext';

export default function EditTransactionScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { tx } = route.params;
  const { accounts, updateTransaction, showToast } = useFinance();
  const act = useMemo(() => activeAccounts(accounts), [accounts]);
  const accountPickerList = useMemo(() => {
    const cur = accounts.find((a) => a.id === tx.accountId);
    if (!cur) return act;
    if (act.some((a) => a.id === cur.id)) return act;
    return [...act, cur];
  }, [act, accounts, tx.accountId]);

  const [tipo, setTipo] = useState(tx.tipo);
  const [valor, setValor] = useState(String(tx.valor));
  const [descricao, setDescricao] = useState(tx.descricao);
  const [data, setData] = useState(tx.data);
  const [obs, setObs] = useState(tx.obs || '');
  const [categoria, setCategoria] = useState(tx.categoria);
  const [accountId, setAccountId] = useState(tx.accountId || accounts[0]?.id);

  useEffect(() => {
    if (route.params?.selectedCategory) {
      setCategoria(route.params.selectedCategory);
    }
  }, [route.params?.selectedCategory]);

  const handleValor = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setValor(num === '0.00' ? '' : num);
  };

  const handleData = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setData(masked);
  };

  const displayValor = valor ? parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';

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
              onChangeText={handleData}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={T.grayNeutral}
              keyboardType="numeric"
              maxLength={10}
              style={styles.input}
            />
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  accountPillActive: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.06)' },
  accountIcon: { fontSize: 16 },
  accountText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
  accountTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
});
