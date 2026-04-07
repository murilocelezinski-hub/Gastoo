import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, PrimaryButton } from '../components/Shared';
import { useAppPreferences } from '../context/AppPreferencesContext';
import { useFinance } from '../context/FinanceContext';

export default function UserProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors: T, profile, setProfile } = useAppPreferences();
  const { showToast } = useFinance();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  const save = () => {
    setProfile({ name: name.trim(), email: email.trim() });
    showToast('Dados salvos.');
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: T.offWhite }]}>
      <Header title="Dados do usuário" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom, gap: 16 }}>
          <Text style={[styles.label, { color: T.charcoal }]}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={T.grayNeutral}
            style={[styles.input, { backgroundColor: T.white, borderColor: T.graySilver, color: T.graphite }]}
          />
          <Text style={[styles.label, { color: T.charcoal }]}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor={T.grayNeutral}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: T.white, borderColor: T.graySilver, color: T.graphite }]}
          />
          <PrimaryButton label="Salvar" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  },
});
