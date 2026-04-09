import React, { useMemo, useState } from 'react';
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
import { fmt, ACCOUNTS } from '../theme';
import { Header, PrimaryButton, ConfirmModal } from '../components/Shared';
import { useFinance, balanceForAccount, activeAccounts } from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';

function createAccountsStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },
    scroll: { padding: 20, gap: 12 },
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
    archiveLink: {
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.graySilver,
    },
    archiveLinkText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.grayMed },
    sheet: {
      backgroundColor: T.white,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 16,
      maxHeight: '78%',
    },
    sheetTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: T.graphite, marginBottom: 12 },
    sheetEmpty: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed, textAlign: 'center', paddingVertical: 24 },
    headerArchiveBtn: { padding: 6, position: 'relative' },
    archiveBadge: {
      position: 'absolute',
      top: -2,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: T.orange,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    archiveBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins_600SemiBold' },
  });
}

export default function AccountsScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createAccountsStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const {
    accounts,
    transactions,
    addAccount,
    updateAccount,
    deleteAccount,
    archiveAccount,
    unarchiveAccount,
    showToast,
  } = useFinance();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ACCOUNTS[0].icon);
  const [saldoRaw, setSaldoRaw] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState(ACCOUNTS[0].icon);
  const [editSaldoRaw, setEditSaldoRaw] = useState('');
  const [deleteEmptyTarget, setDeleteEmptyTarget] = useState(null);
  const [mergeFrom, setMergeFrom] = useState(null);
  const [mergeIntoId, setMergeIntoId] = useState(null);
  const [error, setError] = useState('');
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  const act = activeAccounts(accounts);
  const archived = accounts.filter((a) => a.archived);

  const tryArchive = (ac) => {
    setError('');
    if (act.length <= 1) {
      showToast('Não é possível arquivar a única conta ativa.');
      return;
    }
    archiveAccount(ac.id);
    showToast('Conta arquivada.');
  };

  const archiveFromEdit = () => {
    if (!editTarget) return;
    if (act.length <= 1) {
      showToast('Não é possível arquivar a única conta ativa.');
      return;
    }
    archiveAccount(editTarget.id);
    showToast('Conta arquivada.');
    setEditTarget(null);
  };

  const handleSaldo = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setSaldoRaw(num === '0.00' ? '' : num);
  };

  const displaySaldo = saldoRaw
    ? parseFloat(saldoRaw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : '';

  const displayEditSaldo = editSaldoRaw
    ? parseFloat(editSaldoRaw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    : '';

  const handleEditSaldo = (text) => {
    const raw = text.replace(/\D/g, '');
    const num = (parseInt(raw || '0') / 100).toFixed(2);
    setEditSaldoRaw(num === '0.00' ? '' : num);
  };

  const openEdit = (ac) => {
    setEditTarget(ac);
    setEditName(ac.name);
    setEditIcon(ac.icon || ACCOUNTS[0].icon);
    setEditSaldoRaw(ac.saldoInicial ? Number(ac.saldoInicial).toFixed(2) : '');
  };

  const saveEdit = () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      showToast('Informe o nome da conta.');
      return;
    }
    updateAccount(editTarget.id, {
      name: editName.trim(),
      icon: editIcon,
      saldoInicial: editSaldoRaw ? parseFloat(editSaldoRaw) : 0,
    });
    showToast('Conta atualizada.');
    setEditTarget(null);
  };

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

  const headerArchive = (
    <TouchableOpacity
      onPress={() => setShowArchivedModal(true)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={styles.headerArchiveBtn}
      accessibilityLabel="Ver contas arquivadas"
    >
      <Text style={{ fontSize: 22, color: T.brandFg }}>🗃️</Text>
      {archived.length > 0 ? (
        <View style={styles.archiveBadge}>
          <Text style={styles.archiveBadgeText}>{archived.length > 9 ? '9+' : archived.length}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Contas" onBack={() => navigation.goBack()} right={headerArchive} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          {act.map((ac) => {
            const bal = balanceForAccount(accounts, transactions, ac.id);
            const count = transactions.filter((t) => t.accountId === ac.id).length;
            return (
              <View key={ac.id} style={styles.row}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  onPress={() => openEdit(ac)}
                  activeOpacity={0.65}
                >
                  <Text style={styles.rowIcon}>{ac.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{ac.name}</Text>
                    <Text style={styles.rowMeta}>
                      Inicial {fmt(ac.saldoInicial || 0)} · Atual {fmt(bal)}
                      {count > 0 ? ` · ${count} trans.` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openDelete(ac)} hitSlop={12} style={styles.trash}>
                  <Text style={styles.trashText}>🗑</Text>
                </TouchableOpacity>
              </View>
            );
          })}

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

      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Editar conta</Text>
              <Text style={styles.label}>Nome</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome"
                placeholderTextColor={T.grayNeutral}
                style={styles.input}
              />
              <Text style={styles.label}>Saldo inicial</Text>
              <View style={{ position: 'relative' }}>
                <Text style={styles.currencyPrefix}>R$</Text>
                <TextInput
                  value={displayEditSaldo}
                  onChangeText={handleEditSaldo}
                  placeholder="0,00"
                  placeholderTextColor={T.grayNeutral}
                  keyboardType="numeric"
                  style={[styles.input, styles.valueInput]}
                />
              </View>
              <Text style={styles.label}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
                {ACCOUNTS.map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    onPress={() => setEditIcon(p.icon)}
                    style={[styles.iconPill, editIcon === p.icon && styles.iconPillActive]}
                  >
                    <Text style={styles.iconEmoji}>{p.icon}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.archiveLink} onPress={archiveFromEdit} activeOpacity={0.75}>
                <Text style={styles.archiveLinkText}>Arquivar esta conta</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setEditTarget(null)}>
                  <Text style={[styles.modalBtnText, { color: T.graphite }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnOk]} onPress={saveEdit}>
                  <Text style={[styles.modalBtnText, { color: T.white }]}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showArchivedModal} transparent animationType="slide" onRequestClose={() => setShowArchivedModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setShowArchivedModal(false)}
          />
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <Text style={styles.sheetTitle}>Contas arquivadas</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {archived.length === 0 ? (
                <Text style={styles.sheetEmpty}>Nenhuma conta arquivada.</Text>
              ) : (
                archived.map((ac) => {
                  const bal = balanceForAccount(accounts, transactions, ac.id);
                  return (
                    <View key={ac.id} style={[styles.row, { marginBottom: 10 }]}>
                      <Text style={styles.rowIcon}>{ac.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{ac.name}</Text>
                        <Text style={styles.rowMeta}>Atual {fmt(bal)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => unarchiveAccount(ac.id)} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>Restaurar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openDelete(ac)} hitSlop={12} style={styles.trash}>
                        <Text style={styles.trashText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowArchivedModal(false)}
              style={{ paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: T.orange }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
