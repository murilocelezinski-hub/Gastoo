import React, { useState, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { T, fmt, ACCOUNTS } from '../theme';
import { Header, PrimaryButton, ConfirmModal } from '../components/Shared';
import { useFinance, activeAccounts, accountName } from '../context/FinanceContext';

export default function CreditCardsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    accounts,
    creditCards,
    transactions,
    addCreditCard,
    deleteCreditCard,
    archiveCreditCard,
    unarchiveCreditCard,
    showToast,
  } = useFinance();

  const act = useMemo(() => activeAccounts(accounts), [accounts]);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('💳');
  const [limiteRaw, setLimiteRaw] = useState('');
  const [diaFech, setDiaFech] = useState('10');
  const [diaVen, setDiaVen] = useState('15');
  const [linkAccountId, setLinkAccountId] = useState(null);

  useEffect(() => {
    if (!act.length) return;
    setLinkAccountId((id) => (id && act.some((a) => a.id === id) ? id : act[0].id));
  }, [act]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState('');

  const cardsActive = creditCards.filter((c) => !c.archived);
  const cardsArchived = creditCards.filter((c) => c.archived);

  const handleLimite = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setLimiteRaw(num === '0.00' ? '' : num);
  };

  const displayLimite = limiteRaw
    ? parseFloat(limiteRaw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : '';

  const submit = () => {
    setError('');
    if (!name.trim()) {
      setError('Informe o nome do cartão.');
      return;
    }
    if (!linkAccountId || !act.some((a) => a.id === linkAccountId)) {
      setError('Selecione uma conta bancária ativa.');
      return;
    }
    const df = Math.min(31, Math.max(1, parseInt(diaFech, 10) || 10));
    const dv = Math.min(31, Math.max(1, parseInt(diaVen, 10) || 15));
    addCreditCard({
      name: name.trim(),
      icon,
      limite: limiteRaw ? parseFloat(limiteRaw) : 0,
      diaFechamento: df,
      diaVencimento: dv,
      accountId: linkAccountId,
    });
    showToast('Cartão adicionado.');
    setName('');
    setLimiteRaw('');
    setDiaFech('10');
    setDiaVen('15');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const res = deleteCreditCard(deleteTarget.id);
    if (!res.ok) setError(res.error);
    else showToast('Cartão removido.');
    setDeleteTarget(null);
  };

  const txCountForCard = (id) => transactions.filter((t) => String(t.creditCardId) === String(id)).length;

  return (
    <View style={styles.container}>
      <Header title="Cartões de crédito" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {cardsActive.map((c) => (
            <View key={c.id} style={styles.row}>
              <Text style={styles.rowIcon}>{c.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{c.name}</Text>
                <Text style={styles.rowMeta}>
                  Limite {fmt(c.limite)} · Fecha dia {c.diaFechamento} · Vence dia {c.diaVencimento}
                </Text>
                <Text style={styles.rowSub}>
                  Conta: {accountName(accounts, c.accountId)}
                  {txCountForCard(c.id) > 0 ? ` · ${txCountForCard(c.id)} lançamentos` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => archiveCreditCard(c.id)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Arquivar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDeleteTarget(c)} hitSlop={12} style={styles.trash}>
                <Text style={styles.trashText}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}

          {cardsArchived.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Arquivados</Text>
              {cardsArchived.map((c) => (
                <View key={c.id} style={[styles.row, { opacity: 0.85 }]}>
                  <Text style={styles.rowIcon}>{c.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{c.name}</Text>
                    <Text style={styles.rowMeta}>Conta: {accountName(accounts, c.accountId)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => unarchiveCreditCard(c.id)} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Restaurar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeleteTarget(c)} hitSlop={12} style={styles.trash}>
                    <Text style={styles.trashText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Novo cartão</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Visa Nubank"
              placeholderTextColor={T.grayNeutral}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Limite</Text>
            <View style={{ position: 'relative' }}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                value={displayLimite}
                onChangeText={handleLimite}
                placeholder="0,00"
                placeholderTextColor={T.grayNeutral}
                keyboardType="numeric"
                style={[styles.input, styles.valueInput]}
              />
            </View>
          </View>
          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fechamento (dia)</Text>
              <TextInput
                value={diaFech}
                onChangeText={(t) => setDiaFech(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="10"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Vencimento (dia)</Text>
              <TextInput
                value={diaVen}
                onChangeText={(t) => setDiaVen(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="15"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Ícone (banco)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
              {ACCOUNTS.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  onPress={() => setIcon(p.icon)}
                  style={[styles.iconPill, icon === p.icon && styles.iconPillActive]}
                >
                  <Text style={styles.iconEmoji}>{p.icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Conta para pagamento da fatura</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountRow}>
              {act.map((ac) => (
                <TouchableOpacity
                  key={ac.id}
                  onPress={() => setLinkAccountId(ac.id)}
                  style={[styles.accountPill, linkAccountId === ac.id && styles.accountPillActive]}
                >
                  <Text style={styles.accountIcon}>{ac.icon}</Text>
                  <Text style={[styles.accountText, linkAccountId === ac.id && styles.accountTextActive]}>{ac.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <PrimaryButton label="Adicionar cartão" onPress={submit} disabled={!act.length || !linkAccountId} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        show={!!deleteTarget}
        title="Excluir cartão?"
        message={
          deleteTarget
            ? `Remover "${deleteTarget.name}" permanentemente?`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.offWhite },
  scroll: { padding: 20, gap: 12 },
  errorBanner: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.burnt, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: T.graySilver,
    gap: 8,
    flexWrap: 'wrap',
  },
  rowIcon: { fontSize: 26 },
  rowName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
  rowMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginTop: 2 },
  rowSub: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.grayNeutral, marginTop: 2 },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  smallBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: T.orange },
  trash: { padding: 8, marginLeft: 'auto' },
  trashText: { fontSize: 18 },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: T.charcoal,
    marginTop: 16,
    marginBottom: 4,
  },
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
  valueInput: { paddingLeft: 56, fontSize: 18, fontFamily: 'Poppins_600SemiBold' },
  currencyPrefix: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: T.grayMed,
  },
  rowFields: { flexDirection: 'row', gap: 12 },
  iconRow: { gap: 8, paddingVertical: 4 },
  iconPill: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.graySilver,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.white,
  },
  iconPillActive: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.06)' },
  iconEmoji: { fontSize: 22 },
  accountRow: { gap: 8, paddingVertical: 4 },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.graySilver,
    backgroundColor: T.white,
  },
  accountPillActive: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.06)' },
  accountIcon: { fontSize: 15 },
  accountText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.graphite },
  accountTextActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
});
