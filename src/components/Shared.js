import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal as RNModal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreferences, useThemeColors } from '../context/AppPreferencesContext';

// ─── LOGO ────────────────────────────────────────────────
export function GastooLogo({ variant = 'orange', size = 32 }) {
  const T = useThemeColors();
  const configs = {
    dark: { text: T.graphite, dollar: T.white, iconBg: T.orange, iconColor: '#fff' },
    orange: { text: T.white, dollar: T.amber, iconBg: 'rgba(255,255,255,0.25)', iconColor: '#fff' },
    light: { text: T.graphite, dollar: T.orange, iconBg: T.orange, iconColor: '#fff' },
  };
  const c = configs[variant];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: c.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.55, fontFamily: 'Poppins_600SemiBold', color: c.iconColor }}>$</Text>
      </View>
      <Text style={{ fontFamily: 'Poppins_300Light', fontSize: size * 0.75, color: c.text, letterSpacing: 1 }}>
        GA<Text style={{ color: c.dollar, fontFamily: 'Poppins_600SemiBold' }}>$</Text>TOO
      </Text>
    </View>
  );
}

// ─── CATEGORY ICON ───────────────────────────────────────
// Ícone circular padronizado com cores da marca
export function CatIcon({ category, size = 40 }) {
  const { categories } = useAppPreferences();
  const cat =
    categories.find((c) => c.name === category) ||
    categories.find((c) => c.name === 'Outros') ||
    categories[categories.length - 1];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: cat?.color || '#BCBCB8',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.46 }}>{cat?.icon || '📦'}</Text>
    </View>
  );
}

// ─── TOAST ───────────────────────────────────────────────
export function Toast({ message, show }) {
  const T = useThemeColors();
  const insets = useSafeAreaInsets();
  if (!show) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: Math.max(60, 16 + insets.top),
        alignSelf: 'center',
        backgroundColor: T.gold,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
        zIndex: 100,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite }}>{message}</Text>
    </View>
  );
}

// ─── CONFIRM MODAL ───────────────────────────────────────
export function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  const T = useThemeColors();
  return (
    <RNModal visible={show} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: T.white }]} accessibilityViewIsModal={true}>
          <Text style={[styles.modalTitle, { color: T.graphite }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: T.grayMed }]}>{message}</Text>
          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              style={[styles.modalBtn, { borderWidth: 1.5, borderColor: T.graySilver }]}
            >
              <Text style={[styles.modalBtnText, { color: T.graphite }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} activeOpacity={0.85} style={[styles.modalBtn, { backgroundColor: T.burnt }]}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

// ─── PRIMARY BUTTON ──────────────────────────────────────
// Altura fixa de 52px conforme Design System
export function PrimaryButton({ label, onPress, disabled, style }) {
  const T = useThemeColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        {
          backgroundColor: disabled ? T.graySilver : T.orange,
          borderRadius: 12,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: T.orange,
          shadowOpacity: disabled ? 0 : 0.3,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: disabled ? 0 : 4,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── HEADER ──────────────────────────────────────────────
export function Header({ title, onBack, right }) {
  const insets = useSafeAreaInsets();
  const T = useThemeColors();
  return (
    <View style={[styles.header, { paddingTop: Math.max(16, 8 + insets.top), backgroundColor: T.chocolate }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ color: T.brandFg, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={[styles.headerTitle, { color: T.brandFg }]}>{title}</Text>
      {right || <View style={{ width: 30 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, marginBottom: 8 },
  modalMessage: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { fontFamily: 'Poppins_300Light', fontSize: 20, flex: 1 },
});
