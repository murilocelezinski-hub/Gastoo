import React from 'react';
import { View } from 'react-native';
import BankIcon from 'react-native-brazil-bank-icons';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

const BANK_COMPE_MAP = {
  'Nubank': '260',
  'Itaú': '341',
  'Bradesco': '237',
  'Inter': '077',
  'C6 Bank': '336',
  'Santander': '033',
  'XP': '348',
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

export default function BankIconComponent({ bankName, bankColor, bankInitial, size = 32 }) {
  const compeCode = BANK_COMPE_MAP[bankName];

  if (compeCode) {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <BankIcon COMPE={compeCode} size={size} quality="high" />
      </View>
    );
  }

  return <BankFallback bankColor={bankColor} bankInitial={bankInitial} size={size} />;
}
