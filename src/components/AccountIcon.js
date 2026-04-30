import React from 'react';
import { View } from 'react-native';
import {
  BanknotesIcon,
  CreditCardIcon,
  WalletIcon,
  SparklesIcon,
  TrendingUpIcon,
} from 'react-native-heroicons/solid';
import { T as THEME } from '../theme';

const ACCOUNT_ICONS = {
  'Conta Corrente': BanknotesIcon,
  'Poupança': SparklesIcon,
  'Carteira': WalletIcon,
  'Cartão Crédito': CreditCardIcon,
  'Investimentos': TrendingUpIcon,
};

export function AccountIcon({ accountName, size = 28, color = THEME.orange }) {
  const IconComponent = ACCOUNT_ICONS[accountName] || WalletIcon;
  return (
    <IconComponent size={size} color={color} strokeWidth={2} />
  );
}

export function AccountIconCard({ accountName, size = 32, bgColor = THEME.orange }) {
  const IconComponent = ACCOUNT_ICONS[accountName] || WalletIcon;
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
      <IconComponent size={size * 0.7} color={THEME.white} strokeWidth={2.5} />
    </View>
  );
}
