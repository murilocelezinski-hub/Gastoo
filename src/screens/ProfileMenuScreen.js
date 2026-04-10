import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Shared';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';

const Row = ({ label, sub, onPress, right, palette }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
    <View style={{ flex: 1 }}>
      <Text style={[styles.rowLabel, { color: palette.graphite }]}>{label}</Text>
      {sub ? <Text style={[styles.rowSub, { color: palette.grayMed }]}>{sub}</Text> : null}
    </View>
    {right ?? <Text style={[styles.chev, { color: palette.orange }]}>→</Text>}
  </TouchableOpacity>
);

export default function ProfileMenuScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, themeMode, setThemeMode } = useAppPreferences();
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
              <View style={[styles.miniAvatarPlaceholder, { backgroundColor: theme.grayVLight }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.graphite }]}>Dados do usuário</Text>
              <Text style={[styles.rowSub, { color: theme.grayMed }]}>
                {profile.name || profile.email
                  ? `${profile.name || '—'} · ${profile.email || ''}`
                  : 'Nome, e-mail e foto'}
              </Text>
            </View>
            <Text style={[styles.chev, { color: theme.orange }]}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal }]}>Aparência</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.graphite, flex: 1 }]}>Visual do aplicativo</Text>
            <Switch value={isDark} onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')} trackColor={{ false: theme.graySilver, true: theme.orange }} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.white, borderColor: theme.grayVLight }]}>
          <Text style={[styles.sectionTitle, { color: theme.charcoal }]}>Finanças</Text>
          <Row palette={theme} label="Contas" onPress={() => navigation.navigate('Accounts')} />
          <View style={[styles.sep, { backgroundColor: theme.grayVLight }]} />
          <Row palette={theme} label="Cartões de crédito" onPress={() => navigation.navigate('CreditCards')} />
          <View style={[styles.sep, { backgroundColor: theme.grayVLight }]} />
          <Row palette={theme} label="Categorias" sub="Adicionar ou remover" onPress={() => navigation.navigate('CategoriesSettings')} />
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
});
