import React from 'react';
import { View } from 'react-native';
import FontAwesome5Icon from '@fortawesome/react-native-fontawesome';
import {
  faUniversity,
  faPiggyBank,
  faWallet,
  faCreditCard,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import { T as THEME } from '../theme';

const ACCOUNT_ICONS = {
  'Conta Corrente': faUniversity,
  'Poupança': faPiggyBank,
  'Carteira': faWallet,
  'Cartão Crédito': faCreditCard,
  'Investimentos': faChartLine,
};

export function AccountIcon({ accountName, size = 28, color = THEME.orange }) {
  const icon = ACCOUNT_ICONS[accountName] || faWallet;
  return (
    <FontAwesome5Icon icon={icon} size={size / 6} color={color} />
  );
}

export function AccountIconCard({ accountName, size = 32, bgColor = THEME.orange }) {
  const icon = ACCOUNT_ICONS[accountName] || faWallet;
  return (
    <View
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesome5Icon icon={icon} size={size * 0.5 / 6} color={THEME.white} />
    </View>
  );
}
