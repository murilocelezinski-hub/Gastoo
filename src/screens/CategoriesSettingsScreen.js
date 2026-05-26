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
import { Header, ConfirmModal } from '../components/Shared';
import { TrashIcon } from '../components/ActionIcons';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { useFinance } from '../context/FinanceContext';
import PhosphorIconByName from '../components/PhosphorIconByName';

const PRESET_COLORS = [
  '#FE5E03',
  '#3C3C34',
  '#2A1200',
  '#989890',
  '#CB7D00',
  '#844213',
  '#797970',
  '#C96A1E',
  '#E09A00',
  '#5C5C56',
  '#BCBCB8',
  '#1E88E5',
  '#43A047',
  '#8E24AA',
  '#FDD835',
  '#E53935',
  '#00897B',
  '#6D4C41',
  '#3949AB',
  '#D81B60',
  '#00ACC1',
  '#7CB342',
  '#FF7043',
  '#5E35B1',
  '#546E7A',
  '#C0CA33',
  '#FFB300',
  '#00BFA5',
  '#5D4037',
  '#283593',
];

const PRESET_ICONS = [
  'ForkKnife',
  'Car',
  'House',
  'Pill',
  'GameController',
  'Books',
  'TShirt',
  'DeviceMobile',
  'ChartLine',
  'Package',
  'Gift',
  'Lightning',
  'Airplane',
  'Dog',
  'Cat',
  'Coffee',
  'Pizza',
  'FilmSlate',
  'MusicNote',
  'SoccerBall',
  'Receipt',
  'Lightbulb',
  'Wrench',
  'Baby',
  'Briefcase',
  'ShoppingCart',
  'Bicycle',
  'Barbell',
  'PaintBrush',
  'NotePencil',
  'Laptop',
  'Globe',
  'Target',
  'Hamburger',
  'Umbrella',
  'GraduationCap',
  'Key',
  'Sparkle',
  'Camera',
  'Taxi',
  'GasPump',
  'Cake',
  'CreditCard',
  'TrendUp',
];

const PROTECTED = new Set(['Transferência', 'Outros']);

export default function CategoriesSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { categories, addCategory, updateCategory, removeCategory } = useAppPreferences();
  const theme = useThemeColors();
  const { transactions, showToast, renameTransactionsCategory } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingOriginalName, setEditingOriginalName] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
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

  const openAdd = () => {
    setModalMode('add');
    setEditingOriginalName(null);
    setName('');
    setIcon('Folder');
    setColor(PRESET_COLORS[0]);
    setErr('');
    setModalVisible(true);
  };

  const openEdit = (cat) => {
    setModalMode('edit');
    setEditingOriginalName(cat.name);
    setName(cat.name);
    setIcon(cat.icon || 'Folder');
    setColor(cat.color || PRESET_COLORS[0]);
    setErr('');
    setModalVisible(true);
  };

  const submitModal = () => {
    setErr('');
    if (modalMode === 'add') {
      const res = addCategory({ name, color, icon });
      if (!res.ok) {
        setErr(res.error || 'Não foi possível adicionar.');
        return;
      }
      showToast('Categoria adicionada.');
      setModalVisible(false);
      return;
    }
    const trimmed = name.trim();
    if (
      trimmed !== editingOriginalName &&
      categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.name !== editingOriginalName)
    ) {
      setErr('Já existe uma categoria com esse nome.');
      return;
    }
    if (trimmed !== editingOriginalName) {
      renameTransactionsCategory(editingOriginalName, trimmed);
    }
    const res = updateCategory(editingOriginalName, { name: trimmed, color, icon });
    if (!res.ok) {
      setErr(res.error || 'Não foi possível salvar.');
      return;
    }
    showToast('Categoria atualizada.');
    setModalVisible(false);
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

  const nameLocked = modalMode === 'edit' && editingOriginalName && PROTECTED.has(editingOriginalName);

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite }]}>
      <Header title="Categorias" onBack={() => navigation.goBack()} />

      <FlatList
        data={categories}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 + insets.bottom }}
        ListHeaderComponent={
          <TouchableOpacity style={[styles.addBtn, { borderColor: theme.orange }]} onPress={openAdd} activeOpacity={0.8}>
            <Text style={[styles.addBtnText, { color: theme.orange }]}>+ Nova categoria</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const locked = PROTECTED.has(item.name);
          const n = countByCat[item.name] || 0;
          return (
            <TouchableOpacity
              style={[styles.row, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}
              onPress={() => openEdit(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <PhosphorIconByName name={item.icon || 'Folder'} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: theme.graphite }]}>{item.name}</Text>
                <Text style={[styles.rowMeta, { color: theme.grayMed }]}>
                  {locked ? 'Obrigatória · toque para editar cor/ícone' : `${n} lançamento(s)`}
                </Text>
              </View>
              {!locked ? (
                <TouchableOpacity onPress={() => tryDelete(item)} hitSlop={12}>
                  <TrashIcon size={16} color={theme.orange} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.editorContainer, { backgroundColor: theme.offWhite, paddingTop: insets.top }]}>
          <View style={[styles.editorHeader, { borderBottomColor: theme.grayVLight, backgroundColor: theme.white }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12} style={styles.editorHeaderBtn}>
              <Text style={[styles.editorHeaderCancel, { color: theme.graphite }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.editorHeaderTitle, { color: theme.graphite }]}>
              {modalMode === 'add' ? 'Nova categoria' : 'Editar categoria'}
            </Text>
            <TouchableOpacity
              onPress={submitModal}
              disabled={!name.trim()}
              hitSlop={12}
              style={styles.editorHeaderBtn}
            >
              <Text style={[styles.editorHeaderSave, { color: name.trim() ? theme.orange : theme.grayNeutral }]}>
                Salvar
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.heroWrap}>
                <View style={[styles.heroIcon, { backgroundColor: color }]}>
                  <PhosphorIconByName name={icon || 'Folder'} size={48} color="#fff" weight="fill" />
                </View>
                <Text style={[styles.heroName, { color: theme.graphite }]} numberOfLines={1}>
                  {name.trim() || 'Nova categoria'}
                </Text>
              </View>

              {err ? (
                <Text style={[styles.errorText, { color: theme.burnt }]}>{err}</Text>
              ) : null}

              <View style={[styles.section, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
                <Text style={[styles.sectionLabel, { color: theme.grayMed }]}>NOME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Pets"
                  placeholderTextColor={theme.grayNeutral}
                  editable={!nameLocked}
                  style={[styles.sectionInput, { color: theme.graphite }, nameLocked && { opacity: 0.6 }]}
                />
              </View>

              <View style={[styles.section, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
                <Text style={[styles.sectionLabel, { color: theme.grayMed }]}>ÍCONE</Text>
                <View style={styles.iconGrid}>
                  {PRESET_ICONS.map((ic) => {
                    const selected = icon === ic;
                    return (
                      <TouchableOpacity
                        key={ic}
                        onPress={() => setIcon(ic)}
                        activeOpacity={0.7}
                        style={[
                          styles.iconCell,
                          { backgroundColor: theme.offWhite },
                          selected && { backgroundColor: color },
                        ]}
                      >
                        <PhosphorIconByName
                          name={ic}
                          size={22}
                          color={selected ? '#fff' : theme.graphite}
                          weight={selected ? 'fill' : 'regular'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.section, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
                <Text style={[styles.sectionLabel, { color: theme.grayMed }]}>COR</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map((c) => {
                    const selected = color === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setColor(c)}
                        activeOpacity={0.7}
                        style={styles.colorCellWrap}
                      >
                        <View style={[styles.colorCell, { backgroundColor: c }]} />
                        {selected ? (
                          <View style={[styles.colorCheck, { borderColor: theme.white }]}>
                            <PhosphorIconByName name="Check" size={14} color="#fff" weight="bold" />
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
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
  editorContainer: { flex: 1 },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  editorHeaderBtn: { minWidth: 70 },
  editorHeaderCancel: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  editorHeaderSave: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, textAlign: 'right' },
  editorHeaderTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, flex: 1, textAlign: 'center' },
  heroWrap: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    maxWidth: '80%',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    paddingVertical: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  iconCell: {
    width: '14.5%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  colorCellWrap: {
    width: '14.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCell: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  colorCheck: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
