import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseBr(str) {
  if (!str || typeof str !== 'string') return new Date();
  const p = str.split('/');
  if (p.length !== 3) return new Date();
  const [dd, mm, yy] = p.map(Number);
  return new Date(yy, mm - 1, dd);
}

function toBr(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function BrCalendarModal({ visible, title, valueBr, onConfirm, onClose, palette }) {
  const T = palette;
  const [cursor, setCursor] = useState(() => startOfDay(parseBr(valueBr)));

  useEffect(() => {
    if (visible) setCursor(startOfDay(parseBr(valueBr)));
  }, [visible, valueBr]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    while (out.length < 42) out.push(null);
    return out;
  }, [year, month, firstDow, daysInMonth]);

  const selectDay = (day) => {
    if (day == null) return;
    const d = new Date(year, month, day);
    onConfirm(toBr(d));
    onClose();
  };

  const shiftMonth = (delta) => {
    setCursor(new Date(year, month + delta, 1));
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, justifyContent: 'center', padding: 24 },
        backdrop: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
        },
        card: {
          backgroundColor: T.white,
          borderRadius: 16,
          padding: 16,
          maxWidth: 360,
          alignSelf: 'center',
          width: '100%',
          zIndex: 2,
        },
        title: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.graphite, marginBottom: 12, textAlign: 'center' },
        monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
        monthLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.charcoal },
        navBtn: { padding: 8, minWidth: 40, alignItems: 'center' },
        navTxt: { fontSize: 18, color: T.orange, fontFamily: 'Poppins_600SemiBold' },
        wdRow: { flexDirection: 'row', marginBottom: 6 },
        wdCell: { flex: 1, alignItems: 'center' },
        wdTxt: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: T.grayMed },
        grid: { flexDirection: 'row', flexWrap: 'wrap' },
        dayCell: { width: '14.28%', minHeight: 36, alignItems: 'center', justifyContent: 'center', padding: 2 },
        dayTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.graphite },
        dayToday: { backgroundColor: 'rgba(240,80,0,0.15)', borderRadius: 999 },
        cancelBtn: { marginTop: 12, alignItems: 'center', padding: 10 },
        cancelTxt: { fontFamily: 'Poppins_400Regular', fontSize: 14, color: T.grayMed },
      }),
    [T]
  );

  const today = startOfDay(new Date());
  const sel = startOfDay(parseBr(valueBr));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Text style={styles.navTxt}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Text style={styles.navTxt}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.wdRow}>
            {WD.map((w) => (
              <View key={w} style={styles.wdCell}>
                <Text style={styles.wdTxt}>{w}</Text>
              </View>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day == null) {
                return <View key={`e-${idx}`} style={styles.dayCell} />;
              }
              const d = new Date(year, month, day);
              const isSel = sel.getTime() === d.getTime();
              const isToday = today.getTime() === d.getTime();
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isToday && styles.dayToday]}
                  onPress={() => selectDay(day)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayTxt, isSel && { color: T.orange }]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
