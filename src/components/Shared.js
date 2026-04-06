import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal as RNModal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T, CATEGORIES } from '../theme';

// ─── LOGO ────────────────────────────────────────────────
export function GastooLogo({ variant = 'orange', size = 32 }) {
  const configs = {
    dark: { text: T.white, dollar: T.white, iconBg: T.orange, iconColor: T.white },
    orange: { text: T.white, dollar: T.amber, iconBg: 'rgba(255,255,255,0.25)', iconColor: T.white },
    light: { text: T.graphite, dollar: T.orange, iconBg: T.orange, iconColor: T.white },
  };
  const c = configs[variant];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }}>
      <View style={{
        width: size, height: size, borderRadius: size * 0.23,
        backgroundColor: c.iconBg, alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: size * 0.55, fontFamily: 'Poppins_600SemiBold', color: c.iconColor }}>$</Text>
      </View>
      <Text style={{ fontFamily: 'Poppins_300Light', fontSize: size * 0.75, color: c.text, letterSpacing: 1 }}>
        GA<Text style={{ color: c.dollar, fontFamily: 'Poppins_600SemiBold' }}>$</Text>TOO
      </Text>
    </View>
  );
}

// ─── CATEGORY ICON ───────────────────────────────────────
export function CatIcon({ category, size = 40 }) {
  const cat = CATEGORIES.find((c) => c.name === category) || CATEGORIES[9];
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.23,
      backgroundColor: cat.color, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.5 }}>{cat.icon}</Text>
    </View>
  );
}

// ─── TOAST ───────────────────────────────────────────────
export function Toast({ message, show }) {
  if (!show) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

// ─── CONFIRM MODAL ───────────────────────────────────────
export function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  return (
    <RNModal visible={show} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={onCancel} style={[styles.modalBtn, styles.modalBtnCancel]}>
              <Text style={[styles.modalBtnText, { color: T.graphite }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalBtn, styles.modalBtnDelete]}>
              <Text style={[styles.modalBtnText, { color: T.white }]}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

// ─── PRIMARY BUTTON ──────────────────────────────────────
export function PrimaryButton({ label, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled, style]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── HEADER ──────────────────────────────────────────────
export function Header({ title, onBack, right }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: Math.max(16, 8 + insets.top) }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ color: T.white, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.headerTitle}>{title}</Text>
      {right || <View style={{ width: 30 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: T.gold, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, zIndex: 100, elevation: 10,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  toastText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.chocolate },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 320, alignItems: 'center',
  },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: T.graphite, marginBottom: 8 },
  modalMessage: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed, marginBottom: 20, textAlign: 'center' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnCancel: { borderWidth: 1.5, borderColor: T.graySilver },
  modalBtnDelete: { backgroundColor: T.burnt },
  modalBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  primaryBtn: {
    backgroundColor: T.orange, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', shadowColor: T.orange, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryBtnDisabled: { backgroundColor: T.graySilver, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.white },
  header: {
    backgroundColor: T.chocolate, paddingHorizontal: 20,
    paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerTitle: { fontFamily: 'Poppins_300Light', fontSize: 20, color: T.white, flex: 1 },
});
