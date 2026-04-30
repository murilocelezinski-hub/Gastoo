import React from 'react';
import { View } from 'react-native';
import {
  Bank,
  PiggyBank,
  Wallet,
  CreditCard,
  ChartLine,
} from 'phosphor-react';
import { T as THEME } from '../theme';

const ACCOUNT_ICONS = {
  'Conta Corrente': Bank,
  'Poupança': PiggyBank,
  'Carteira': Wallet,
  'Cartão Crédito': CreditCard,
  'Investimentos': ChartLine,
};

export function AccountIcon({ accountName, size = 28, color = THEME.orange }) {
  const IconComponent = ACCOUNT_ICONS[accountName] || Wallet;
  return (
    <IconComponent size={size} weight="fill" color={color} />
  );
}

export function AccountIconCard({ accountName, size = 32, bgColor = THEME.orange }) {
  const IconComponent = ACCOUNT_ICONS[accountName] || Wallet;
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
      <IconComponent size={size * 0.7} weight="fill" color={THEME.white} />
    </View>
  );
}
