import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, PrimaryButton } from '../components/Shared';
import { CheckIcon } from '../components/ActionIcons';
import { getCategoryIcon } from '../components/CategoryIcons';
import { useFinance } from '../context/FinanceContext';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { T } from '../theme';

function createStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.chocolate },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 20,
      gap: 12,
      justifyContent: 'space-between',
    },
    catCard: {
      width: '47%',
      alignItems: 'center',
      paddingVertical: 18,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: T.homeHairline,
      backgroundColor: T.homeGlass,
      gap: 8,
      position: 'relative',
    },
    catCardActive: {
      borderColor: T.orange,
      backgroundColor: 'rgba(254,94,3,0.1)',
    },
    check: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: T.amber,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catIconBox: {
      width: 44,
      height: 44,
      // Circular conforme Design System
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.brandFg },
  });
}

export default function ManualCategoryScreen({ navigation, route }) {
  const T = useThemeColors();
  const styles = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { txData, excludeCategories = [] } = route.params;
  const { addTransaction, addInstallmentTransactions, showToast } = useFinance();
  const { categories } = useAppPreferences();
  const [selected, setSelected] = useState(null);

  const cats = categories.filter((c) => !excludeCategories.includes(c.name));

  const handleConfirm = () => {
    if (!selected) return;

    if (route.params?.returnTo === 'EditTransaction') {
      navigation.navigate('EditTransaction', {
        tx: route.params.editTx,
        selectedCategory: selected,
      });
      return;
    }

    const newTx = {
      ...txData,
      categoria: selected,
      obs: '',
      criado_por_ia: false,
    };
    if (newTx.gastoTipo === 'parcelado') {
      addInstallmentTransactions(newTx);
      showToast('Parcelas salvas! ✓');
    } else {
      addTransaction(newTx);
      showToast('Transação salva! ✓');
    }
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      <Header title="Escolher categoria" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.grid}>
        {cats.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            onPress={() => setSelected(cat.name)}
            style={[styles.catCard, selected === cat.name && styles.catCardActive]}
            activeOpacity={0.7}
          >
            {selected === cat.name && (
              <View style={styles.check}>
                <CheckIcon size={14} color={T.white} />
              </View>
            )}
            <View style={[styles.catIconBox, { backgroundColor: cat.color }]}>
              {(() => { const Icon = getCategoryIcon(cat.name); return <Icon size={22} color="#fff" />; })()}
            </View>
            <Text style={styles.catLabel}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 32 + insets.bottom }}>
        <PrimaryButton label="Confirmar seleção" onPress={handleConfirm} disabled={!selected} />
      </View>
    </View>
  );
}
