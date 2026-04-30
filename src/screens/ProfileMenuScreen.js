import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'phosphor-react';
import { Header } from '../components/Shared';
import { ChevronRightIcon } from '../components/ActionIcons';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';

const Row = ({ label, sub, onPress, right, palette }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, { color: palette.graphite }]}>{label}</Text>
      {sub ? <Text style={[styles.rowSub, { color: palette.grayMed }]}>{sub}</Text> : null}
    </View>
    {right ?? <ChevronRightIcon size={18} color={palette.orange} />}
  </TouchableOpacity>
);

export default function ProfileMenuScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, themeMode, setThemeMode, transactionListOrder, setTransactionListOrder } = useAppPreferences();
  const theme = useThemeColors();
  const isDark = themeMode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite }]}>
      <Header title="Perfil" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal }]}>Conta</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('UserProfile')}
            activeOpacity={0.7}
          >
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.miniAvatar} resizeMode="cover" />
            ) : (
              <View style={[styles.miniAvatarPlaceholder, { backgroundColor: theme.grayVLight, alignItems: 'center', justifyContent: 'center' }]}>
                <User size={24} weight="fill" color={theme.grayMed} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.graphite }]}>Dados do usuário</Text>
            </View>
            <ChevronRightIcon size={18} color={theme.orange} />
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal }]}>Aparência</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.graphite, flex: 1 }]}>Visual do aplicativo</Text>
            <Switch
              value={isDark}
              onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')}
              trackColor={{ false: theme.graySilver, true: theme.orange }}
              accessibilityLabel={isDark ? 'Tema escuro ativo' : 'Tema claro ativo'}
            />
          </View>
          <View style={[styles.sep, { backgroundColor: theme.grayVLight }]} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.graphite }]}>Ordem de visualização</Text>
            </View>
            <View style={[styles.segment, { borderColor: theme.graySilver, backgroundColor: theme.white }]}>
              <TouchableOpacity
                onPress={() => setTransactionListOrder('asc')}
                activeOpacity={0.8}
                style={[
                  styles.segmentBtn,
                  transactionListOrder === 'asc' && { backgroundColor: theme.orange, borderColor: theme.orange },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: theme.graphite },
                    transactionListOrder === 'asc' && { color: theme.white, fontFamily: 'Poppins_600SemiBold' },
                  ]}
                >
                  Cresc.
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTransactionListOrder('desc')}
                activeOpacity={0.8}
                style={[
                  styles.segmentBtn,
                  transactionListOrder !== 'asc' && { backgroundColor: theme.orange, borderColor: theme.orange },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: theme.graphite },
                    transactionListOrder !== 'asc' && { color: theme.white, fontFamily: 'Poppins_600SemiBold' },
                  ]}
                >
                  Decr.
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal }]}>Finanças</Text>
          <Row palette={theme} label="Contas" onPress={() => navigation.navigate('Accounts')} />
          <View style={[styles.sep, { backgroundColor: theme.grayVLight }]} />
          <Row palette={theme} label="Cartões de crédito" onPress={() => navigation.navigate('CreditCards')} />
          <View style={[styles.sep, { backgroundColor: theme.grayVLight }]} />
          <Row palette={theme} label="Categorias" onPress={() => navigation.navigate('CategoriesSettings')} />
        </View>

        <Text style={[styles.hint, { color: theme.grayMed }]}>Ajustes salvos neste aparelho</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 4, borderWidth: 1 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, gap: 12 },
  miniAvatar: { width: 40, height: 40, borderRadius: 20 },
  miniAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  rowSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  chev: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  sep: { height: 1, marginLeft: 12 },
  hint: { fontFamily: 'Poppins_400Regular', fontSize: 11, textAlign: 'center', marginTop: 8 },
  segment: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  segmentText: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
});
