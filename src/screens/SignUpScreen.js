import React, { useMemo, useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/Shared';
import { useThemeColors } from '../context/AppPreferencesContext';
import { signUp } from '../services/authService';

const logo = require('../../assets/logo2.png');

function createStyles(T) {
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
    loginText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: T.grayMed,
      textAlign: 'center',
      marginTop: 20,
    },
    loginLink: { color: T.orange, fontFamily: 'Poppins_600SemiBold' },
  });
}

export default function SignUpScreen({ navigation }) {
  const T = useThemeColors();
  const styles = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Informe seu nome.';
    if (!email.includes('@')) e.email = 'E-mail inválido.';
    if (pass.length < 6) e.pass = 'Mínimo 6 caracteres.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), pass, name.trim());
      Alert.alert('GA$TOO', 'Conta criada! Verifique seu e-mail se necessário e faça login.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      const msg = err?.message?.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : (err?.message || 'Erro ao cadastrar. Tente novamente.');
      Alert.alert('GA$TOO', msg);
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

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Comece a gerenciar suas finanças</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nome</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Seu nome"
            placeholderTextColor={T.grayNeutral} autoCapitalize="words"
            style={[styles.input, errors.name && styles.inputError]} />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com"
            placeholderTextColor={T.grayNeutral} keyboardType="email-address"
            autoCapitalize="none" style={[styles.input, errors.email && styles.inputError]} />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

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

        <PrimaryButton label={loading ? 'Criando...' : 'Criar conta'} onPress={submit} disabled={loading} />

        <Text style={styles.loginText}>
          Já tem conta?{' '}
          <Text
            style={styles.loginLink}
            onPress={() => navigation.replace('Login')}
            accessibilityRole="button"
          >
            Entrar
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
