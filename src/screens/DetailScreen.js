import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../theme';
import { Header, CatIcon, ConfirmModal } from '../components/Shared';
import { useFinance, accountName, creditCardName, invoiceLabelPtBr } from '../context/FinanceContext';
import { useThemeColors } from '../context/AppPreferencesContext';

function createDetailStyles(T) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.offWhite },
    card: {
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: T.graySilver,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    desc: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: T.graphite },
    cat: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed, marginTop: 2 },
    valueBox: {
      backgroundColor: T.offWhite,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      alignItems: 'center',
    },
    value: { fontFamily: 'Poppins_600SemiBold', fontSize: 28 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: T.grayVLight,
    },
    infoLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: T.grayMed },
    infoValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: T.graphite, flex: 1, textAlign: 'right' },
    btnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
    editBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: T.orange,
      alignItems: 'center',
    },
    editBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.orange },
    deleteBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: T.burnt,
      alignItems: 'center',
    },
    deleteBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#fff' },
    transferHint: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 11,
      color: T.grayMed,
      marginTop: 12,
      textAlign: 'center',
    },
    parcelModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    parcelModalCard: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      backgroundColor: T.white,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: T.graySilver,
    },
    parcelModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    parcelModalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: T.graphite, flex: 1 },
    parcelModalCancel: { paddingVertical: 4, paddingHorizontal: 2 },
    parcelModalCancelText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: T.orange },
    parcelActionBtn: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
  });
}

export default function DetailScreen({ navigation, route }) {
  const T = useThemeColors();
  const styles = useMemo(() => createDetailStyles(T), [T]);
  const insets = useSafeAreaInsets();
  const { tx } = route.params;
  const { accounts, creditCards, deleteTransaction, showToast } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [showParcelDelete, setShowParcelDelete] = useState(false);

  const isParcelGroup = Boolean(tx?.parcelaGrupoId && tx?.gastoTipo === 'parcelado');

  const handleDelete = () => {
    setShowModal(false);
    deleteTransaction(tx);
    showToast(tx.transferGroupId ? 'Transferência excluída.' : 'Transação excluída.');
    navigation.goBack();
  };

  const openDelete = () => {
    if (isParcelGroup) {
      setShowParcelDelete(true);
    } else {
      setShowModal(true);
    }
  };

  const deleteThisParcelOnly = () => {
    setShowParcelDelete(false);
    deleteTransaction(tx);
    showToast('Parcela excluída.');
    navigation.goBack();
  };

  const deleteThisAndFuture = () => {
    setShowParcelDelete(false);
    deleteTransaction(tx, { withFutureParcels: true });
    showToast('Parcelas excluídas.');
    navigation.goBack();
  };

  const contaLabel = accountName(accounts, tx.accountId);
  const infoRows = [
    ['Tipo', tx.tipo === 'entrada' ? 'Entrada' : 'Saída'],
    ['Conta', contaLabel],
    ...(tx.creditCardId ? [['Cartão', creditCardName(creditCards, tx.creditCardId)]] : []),
    ...(tx.creditCardId && tx.invoiceKey ? [['Fatura', invoiceLabelPtBr(tx.invoiceKey)]] : []),
    ...(tx.gastoTipo && tx.gastoTipo !== 'nenhum' ? [['Gasto', tx.gastoTipo === 'fixo' ? 'Fixo' : 'Parcelado']] : []),
    ...(tx.gastoTipo && tx.gastoTipo !== 'nenhum' && tx.periodicidade
      ? [
          [
            'Periodicidade',
            ({
              diaria: 'Diária',
              semanal: 'Semanal',
              quinzenal: 'Quinzenal',
              mensal: 'Mensal',
              bimensal: 'Bimensal',
              trimestral: 'Trimestral',
              semestral: 'Semestral',
              anual: 'Anual',
            }[tx.periodicidade] || tx.periodicidade),
          ],
        ]
      : []),
    ...(tx.gastoTipo === 'parcelado' && tx.parcelaIndice != null && tx.parcelaTotal != null
      ? [[`Parcela`, `${tx.parcelaIndice} de ${tx.parcelaTotal}`]]
      : []),
    ['Data', tx.data],
    ['Observações', tx.obs || '—'],
  ];

  return (
    <View style={styles.container}>
      <Header title="Detalhe" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom }}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <CatIcon category={tx.categoria} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={styles.desc}>{tx.descricao}</Text>
              <Text style={styles.cat}>{tx.categoria}</Text>
            </View>
          </View>

          <View style={styles.valueBox}>
            <Text style={[styles.value, { color: tx.tipo === 'entrada' ? T.gold : T.burnt }]}>
              {tx.tipo === 'entrada' ? '+' : '-'}
              {fmt(tx.valor)}
            </Text>
          </View>

          {infoRows.map(([label, val]) => (
            <View key={label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{val}</Text>
            </View>
          ))}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.editBtn, tx.isTransfer && { opacity: 0.45 }]}
              activeOpacity={0.7}
              disabled={!!tx.isTransfer}
              onPress={() => navigation.navigate('EditTransaction', { tx })}
            >
              <Text style={styles.editBtnText}>{tx.isTransfer ? 'Transferência' : 'Editar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7} onPress={openDelete}>
              <Text style={styles.deleteBtnText}>Excluir</Text>
            </TouchableOpacity>
          </View>
          {tx.isTransfer ? (
            <Text style={styles.transferHint}>Transferências são excluídas em par (origem e destino).</Text>
          ) : null}
        </View>
      </ScrollView>

      <ConfirmModal
        show={showModal}
        title={tx.transferGroupId ? 'Excluir transferência?' : 'Excluir transação?'}
        message={tx.transferGroupId ? 'Os dois lançamentos serão removidos.' : 'Essa ação não pode ser desfeita.'}
        onCancel={() => setShowModal(false)}
        onConfirm={handleDelete}
      />

      <Modal
        visible={showParcelDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setShowParcelDelete(false)}
      >
        <View style={styles.parcelModalOverlay}>
          <View style={styles.parcelModalCard}>
            <View style={styles.parcelModalHeader}>
              <Text style={styles.parcelModalTitle}>Encerrar parcelas</Text>
              <TouchableOpacity
                onPress={() => setShowParcelDelete(false)}
                style={styles.parcelModalCancel}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              >
                <Text style={styles.parcelModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.infoLabel,
                { lineHeight: 20, textAlign: 'left', color: T.grayMed, width: '100%', marginBottom: 16 },
              ]}
            >
              {tx?.parcelaIndice}ª parcela de {tx?.parcelaTotal}. O que deseja remover?
            </Text>
            <TouchableOpacity
              onPress={deleteThisParcelOnly}
              style={[styles.parcelActionBtn, { backgroundColor: T.burnt, marginBottom: 10 }]}
              activeOpacity={0.85}
            >
              <Text style={styles.deleteBtnText}>Apenas esta parcela</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deleteThisAndFuture}
              style={[
                styles.parcelActionBtn,
                {
                  borderWidth: 1.5,
                  borderColor: T.burnt,
                  backgroundColor: T.white,
                  marginBottom: 0,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[styles.editBtnText, { color: T.burnt, fontSize: 14 }]}>Esta e as parcelas futuras</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
