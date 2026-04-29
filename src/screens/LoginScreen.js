import React, { useMemo, useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/Shared';
import { useThemeColors } from '../context/AppPreferencesContext';
import { signIn } from '../services/authService';

const logo = require('../../assets/logo2.png');

function createLoginStyles(T) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 28 },
    logo: { width: 180, height: 54 },
    title: { fontFamily: 'Poppins_300Light', fontSize: 22, color: T.graphite, marginBottom: 6 },
    subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed, marginBottom: 28 },
    field: { marginBottom: 16 },
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
    inputError: { borderColor: T.burnt },
    errorText: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: T.burnt, marginTop: 4 },
    eyeBtn: { position: 'absolute', right: 14, top: 14 },
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 24 },
    forgotText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: T.orange },
    signupText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.grayMed,
      textAlign: 'center',
      marginTop: 20,
    },
    signupLink: { color: T.orange, fontFamily: 'Poppins_600SemiBold' },
  });
}

export default function LoginScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createLoginStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const showToastLocal = (msg) => Alert.alert('Gastoo', msg);

  const validate = () => {
    const e = {};
    if (!email.includes('@')) e.email = 'E-mail inválido';
    if (pass.length < 4) e.pass = 'Mínimo 4 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoginError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), pass);
    } catch (err) {
      setLoginError('E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.offWhite }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(60, 16 + insets.top), paddingBottom: 28 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.title}>Bem-vindo de volta</Text>
        <Text style={styles.subtitle}>Entre para gerenciar suas finanças</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com"
            placeholderTextColor={T.grayNeutral} keyboardType="email-address"
            autoCapitalize="none" style={[styles.input, errors.email && styles.inputError]} />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <View>
            <TextInput value={pass} onChangeText={setPass} placeholder="••••••••"
              placeholderTextColor={T.grayNeutral} secureTextEntry={!showPass}
              style={[styles.input, { paddingRight: 48 }, errors.pass && styles.inputError]} />
            <TouchableOpacity
              onPress={() => setShowPass(!showPass)}
              style={styles.eyeBtn}
              hitSlop={12}
              accessibilityLabel={showPass ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Text style={{ color: T.grayMed, fontSize: 16 }}>{showPass ? '◡' : '⊙'}</Text>
            </TouchableOpacity>
          </View>
          {errors.pass && <Text style={styles.errorText}>{errors.pass}</Text>}
        </View>

        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => showToastLocal('Em breve: recuperação de senha.')}
          accessibilityLabel="Recuperar senha"
        >
          <Text style={styles.forgotText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <PrimaryButton label={loading ? 'Entrando...' : 'Entrar'} onPress={submit} disabled={loading} />

        {loginError && (
          <Text style={[styles.errorText, { fontSize: 13, textAlign: 'center', marginTop: 12 }]}>
            {loginError}
          </Text>
        )}

        <Text style={styles.signupText}>
          Não tem conta?{' '}
          <Text
            style={styles.signupLink}
            onPress={() => navigation.navigate('SignUp')}
            accessibilityRole="button"
          >
            Cadastre-se
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
