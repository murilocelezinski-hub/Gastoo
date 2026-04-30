import React from 'react';
import { View } from 'react-native';
import * as BankIcons from '@arcanishq/react-bank-icons';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';

const BANK_LOGO_MAP = {
  'Nubank': 'Nubank',
  'Itaú': 'Itau',
  'Bradesco': 'Bradesco',
  'Inter': 'Inter',
  'C6 Bank': 'C6',
  'Santander': 'Santander',
  'XP': 'Xp',
};

function BankFallback({ bankColor, bankInitial, size }) {
  const r = size / 2;
  const fontSize = size * 0.38;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={r} cy={r} r={r} fill={bankColor || '#888888'} />
      <SvgText
        x={r} y={r + fontSize * 0.36}
        textAnchor="middle"
        fontSize={fontSize}
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        {bankInitial}
      </SvgText>
    </Svg>
  );
}

export default function BankIcon({ bankName, bankColor, bankInitial, size = 32 }) {
  const bankKey = BANK_LOGO_MAP[bankName];

  if (bankKey && BankIcons[bankKey]) {
    const BankComponent = BankIcons[bankKey];
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <BankComponent width={size} height={size} />
      </View>
    );
  }

  return <BankFallback bankColor={bankColor} bankInitial={bankInitial} size={size} />;
}
