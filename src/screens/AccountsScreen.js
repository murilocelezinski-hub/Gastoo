import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { T, fmt, ACCOUNTS } from '../theme';
import { Header, PrimaryButton, ConfirmModal } from '../components/Shared';
import { useFinance, balanceForAccount, activeAccounts } from '../context/FinanceContext';

export default function AccountsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    accounts,
    transactions,
    addAccount,
    deleteAccount,
    archiveAccount,
    unarchiveAccount,
    showToast,
  } = useFinance();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ACCOUNTS[0].icon);
  const [saldoRaw, setSaldoRaw] = useState('');
  const [deleteEmptyTarget, setDeleteEmptyTarget] = useState(null);
  const [mergeFrom, setMergeFrom] = useState(null);
  const [mergeIntoId, setMergeIntoId] = useState(null);
  const [error, setError] = useState('');

  const act = activeAccounts(accounts);
  const archived = accounts.filter((a) => a.archived);

  const tryArchive = (ac) => {
    setError('');
    if (act.length <= 1) {
      setError('Não é possível arquivar a única conta ativa.');
      return;
    }
    archiveAccount(ac.id);
    showToast('Conta arquivada.');
  };

  const handleSaldo = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setSaldoRaw(num === '0.00' ? '' : num);
  };

  const displaySaldo = saldoRaw
    ? parseFloat(saldoRaw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : '';

  const submit = () => {
    setError('');
    if (!name.trim()) {
      setError('Informe o nome da conta.');
      return;
    }
    addAccount({ name: name.trim(), icon, saldoInicial: saldoRaw ? parseFloat(saldoRaw) : 0 });
    showToast('Conta criada.');
    setName('');
    setSaldoRaw('');
    setIcon(ACCOUNTS[0].icon);
  };

  const openDelete = (ac) => {
    setError('');
    const count = transactions.filter((t) => t.accountId === ac.id).length;
    if (count > 0) {
      const others = act.filter((a) => a.id !== ac.id);
      if (others.length === 0) {
        setError('Crie outra conta ativa antes de excluir esta (com transações).');
        return;
      }
      setMergeFrom(ac);
      setMergeIntoId(others[0].id);
    } else {
      setDeleteEmptyTarget(ac);
    }
  };

  const confirmDeleteEmpty = () => {
    if (!deleteEmptyTarget) return;
    const res = deleteAccount(deleteEmptyTarget.id);
    if (!res.ok) setError(res.error);
    else showToast('Conta excluída.');
    setDeleteEmptyTarget(null);
  };

  const confirmMergeAndDelete = () => {
    if (!mergeFrom || !mergeIntoId) return;
    const res = deleteAccount(mergeFrom.id, mergeIntoId);
    if (!res.ok) {
      setError(res.error || 'Não foi possível concluir.');
      setMergeFrom(null);
      return;
    }
    showToast('Transações movidas e conta excluída.');
    setMergeFrom(null);
    setMergeIntoId(null);
  };

  return (
    <View style={styles.container}>
      <Header title="Contas" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('CreditCards')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Cartões de crédito</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {act.map((ac) => {
            const bal = balanceForAccount(accounts, transactions, ac.id);
            const count = transactions.filter((t) => t.accountId === ac.id).length;
            return (
              <View key={ac.id} style={styles.row}>
                <Text style={styles.rowIcon}>{ac.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{ac.name}</Text>
                  <Text style={styles.rowMeta}>
                    Inicial {fmt(ac.saldoInicial || 0)} · Atual {fmt(bal)}
                    {count > 0 ? ` · ${count} trans.` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => tryArchive(ac)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Arquivar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openDelete(ac)} hitSlop={12} style={styles.trash}>
                  <Text style={styles.trashText}>🗑</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {archived.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Arquivadas</Text>
              {archived.map((ac) => {
                const bal = balanceForAccount(accounts, transactions, ac.id);
                return (
                  <View key={ac.id} style={[styles.row, { opacity: 0.9 }]}>
                    <Text style={styles.rowIcon}>{ac.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{ac.name}</Text>
                      <Text style={styles.rowMeta}>Atual {fmt(bal)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => unarchiveAccount(ac.id)} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Restaurar</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Nova conta</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Nubank"
              placeholderTextColor={T.grayNeutral}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Saldo inicial</Text>
            <View style={{ position: 'relative' }}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                value={displaySaldo}
                onChangeText={handleSaldo}
                placeholder="0,00"
                placeholderTextColor={T.grayNeutral}
                keyboardType="numeric"
                style={[styles.input, styles.valueInput]}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Ícone</Text>
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
          <PrimaryButton label="Adicionar conta" onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        show={!!deleteEmptyTarget}
        title="Excluir conta?"
        message={
          deleteEmptyTarget ? `Remover "${deleteEmptyTarget.name}"? Esta conta não possui transações.` : ''
        }
        onCancel={() => setDeleteEmptyTarget(null)}
        onConfirm={confirmDeleteEmpty}
      />

      <Modal visible={!!mergeFrom} transparent animationType="fade" onRequestClose={() => setMergeFrom(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mover transações</Text>
            <Text style={styles.modalMsg}>
              A conta "{mergeFrom?.name}" possui lançamentos. Escolha para qual conta ativa deseja movê-los antes de
              excluir.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mergeRow}>
              {mergeFrom
                ? act
                    .filter((a) => a.id !== mergeFrom.id)
                    .map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setMergeIntoId(a.id)}
                        style={[styles.mergePill, mergeIntoId === a.id && styles.mergePillActive]}
                      >
                        <Text style={styles.mergeIcon}>{a.icon}</Text>
                        <Text style={[styles.mergeName, mergeIntoId === a.id && styles.mergeNameActive]}>{a.name}</Text>
                      </TouchableOpacity>
                    ))
                : null}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setMergeFrom(null)}>
                <Text style={[styles.modalBtnText, { color: T.graphite }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOk]}
                onPress={confirmMergeAndDelete}
                disabled={!mergeIntoId}
              >
                <Text style={[styles.modalBtnText, { color: T.white }]}>Mover e excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.offWhite },
  scroll: { padding: 20, gap: 12 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.graySilver,
    marginBottom: 4,
  },
  linkText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.orange },
  linkArrow: { fontSize: 18, color: T.orange },
  errorBanner: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: T.burnt,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: T.graySilver,
    gap: 8,
    flexWrap: 'wrap',
  },
  rowIcon: { fontSize: 28 },
  rowName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: T.graphite },
  rowMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.grayMed, marginTop: 2 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: T.graphite, marginBottom: 8 },
  modalMsg: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed, marginBottom: 12 },
  mergeRow: { gap: 8, paddingVertical: 4 },
  mergePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.graySilver,
  },
  mergePillActive: { borderColor: T.orange, backgroundColor: 'rgba(240,80,0,0.08)' },
  mergeIcon: { fontSize: 18 },
  mergeName: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.graphite },
  mergeNameActive: { fontFamily: 'Poppins_600SemiBold', color: T.orange },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1.5, borderColor: T.graySilver },
  modalBtnOk: { backgroundColor: T.orange },
  modalBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
});
