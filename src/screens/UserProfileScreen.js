import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, PrimaryButton } from '../components/Shared';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';
import { useFinance } from '../context/FinanceContext';

export default function UserProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, ready } = useAppPreferences();
  const theme = useThemeColors();
  const { showToast } = useFinance();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri || '');

  useEffect(() => {
    if (!ready) return;
    setName(profile.name);
    setEmail(profile.email);
    setAvatarUri(profile.avatarUri || '');
  }, [ready, profile.name, profile.email, profile.avatarUri]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', 'É necessário permitir o acesso à galeria para escolher uma foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.65,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    setAvatarUri(uri);
  };

  const clearPhoto = () => setAvatarUri('');

  const save = () => {
    setProfile({ name: name.trim(), email: email.trim(), avatarUri: avatarUri || '' });
    showToast('Dados salvos.');
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.offWhite }]}>
      <Header title="Dados do usuário" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom, gap: 16 }}>
          <Text style={[styles.label, { color: theme.charcoal }]}>Foto de perfil</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.85}
              style={[styles.avatarWrap, { borderColor: theme.graySilver, backgroundColor: theme.white }]}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 40 }}>👤</Text>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, gap: 8 }}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                <Text style={[styles.link, { color: theme.orange }]}>Escolher da galeria</Text>
              </TouchableOpacity>
              {avatarUri ? (
                <TouchableOpacity onPress={clearPhoto} activeOpacity={0.8}>
                  <Text style={[styles.linkMuted, { color: theme.grayMed }]}>Remover foto</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Text style={[styles.label, { color: theme.charcoal }]}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={theme.grayNeutral}
            style={[styles.input, { backgroundColor: theme.white, borderColor: theme.graySilver, color: theme.graphite }]}
          />
          <Text style={[styles.label, { color: theme.charcoal }]}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            placeholderTextColor={theme.grayNeutral}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, { backgroundColor: theme.white, borderColor: theme.graySilver, color: theme.graphite }]}
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
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 88, height: 88 },
  link: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  linkMuted: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
});
