import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, PrimaryButton, ConfirmModal } from '../components/Shared';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useFinance } from '../context/FinanceContext';

const PRESET_COLORS = ['#F05000', '#3C3C34', '#2A1200', '#989890', '#CB7D00', '#844213', '#797970', '#C96A1E', '#E09A00', '#5C5C56', '#BCBCB8'];
const PRESET_ICONS = ['🍽', '🚗', '🏠', '💊', '🎮', '📚', '👕', '📱', '📈', '📦', '🎁', '⚡', '🏥', '✈️'];

const PROTECTED = new Set(['Transferência', 'Outros']);

export default function CategoriesSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: T, categories, addCategory, removeCategory } = useAppPreferences();
  const { transactions, showToast } = useFinance();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [err, setErr] = useState('');

  const countByCat = useMemo(() => {
    const m = {};
    for (const t of transactions) {
      if (t.categoria) m[t.categoria] = (m[t.categoria] || 0) + 1;
    }
    return m;
  }, [transactions]);

  const submitAdd = () => {
    setErr('');
    const res = addCategory({ name, color, icon });
    if (!res.ok) {
      setErr(res.error || 'Não foi possível adicionar.');
      return;
    }
    showToast('Categoria adicionada.');
    setName('');
    setIcon('📁');
    setColor(PRESET_COLORS[0]);
    setModal(false);
  };

  const tryDelete = (cat) => {
    if (PROTECTED.has(cat.name)) {
      showToast('Esta categoria não pode ser removida.');
      return;
    }
    const n = countByCat[cat.name] || 0;
    if (n > 0) {
      showToast(`Existem ${n} transações nesta categoria. Edite-as antes de remover.`);
      return;
    }
    setDeleteTarget(cat);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const res = removeCategory(deleteTarget.name);
    setDeleteTarget(null);
    if (!res.ok) showToast(res.error || 'Erro ao remover.');
    else showToast('Categoria removida.');
  };

  return (
    <View style={[styles.container, { backgroundColor: T.offWhite }]}>
      <Header title="Categorias" onBack={() => navigation.goBack()} />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}
        ListHeaderComponent={
          <TouchableOpacity style={[styles.addBtn, { borderColor: T.orange }]} onPress={() => setModal(true)} activeOpacity={0.8}>
            <Text style={[styles.addBtnText, { color: T.orange }]}>+ Nova categoria</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const locked = PROTECTED.has(item.name);
          const n = countByCat[item.name] || 0;
          return (
            <View style={[styles.row, { backgroundColor: T.white, borderColor: T.grayVLight }]}>
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: T.graphite }]}>{item.name}</Text>
                <Text style={[styles.rowMeta, { color: T.grayMed }]}>
                  {locked ? 'Obrigatória' : `${n} lançamento(s)`}
                </Text>
              </View>
              {!locked ? (
                <TouchableOpacity onPress={() => tryDelete(item)} hitSlop={12}>
                  <Text style={{ fontSize: 18 }}>🗑</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCard, { backgroundColor: T.white }]}>
            <Text style={[styles.modalTitle, { color: T.graphite }]}>Nova categoria</Text>
            {err ? <Text style={{ color: T.burnt, fontSize: 12, marginBottom: 8 }}>{err}</Text> : null}
            <Text style={[styles.label, { color: T.charcoal }]}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Pets"
              placeholderTextColor={T.grayNeutral}
              style={[styles.input, { borderColor: T.graySilver, color: T.graphite }]}
            />
            <Text style={[styles.label, { color: T.charcoal }]}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
              {PRESET_ICONS.map((ic) => (
                <TouchableOpacity key={ic} onPress={() => setIcon(ic)} style={[styles.iconPill, icon === ic && { borderColor: T.orange }]}>
                  <Text style={{ fontSize: 22 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: T.charcoal }]}>Cor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && { borderColor: T.orange, borderWidth: 3 }]}
                />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: T.graySilver }]} onPress={() => setModal(false)}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: T.graphite }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Adicionar" onPress={submitAdd} disabled={!name.trim()} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        show={!!deleteTarget}
        title="Remover categoria?"
        message={deleteTarget ? `Remover "${deleteTarget.name}"?` : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  rowMeta: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, marginBottom: 12 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  },
  iconRow: { gap: 8, paddingVertical: 4 },
  iconPill: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
