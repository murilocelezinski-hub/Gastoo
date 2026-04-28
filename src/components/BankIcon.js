import React from 'react';
import Svg, { Circle, Rect, Path, Text as SvgText, G } from 'react-native-svg';

// Nubank: círculo roxo + "Nu" centralizado
function NubankLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="16" fill="#820AD1" />
      <SvgText
        x="16" y="21"
        textAnchor="middle"
        fontSize="13"
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        Nu
      </SvgText>
    </Svg>
  );
}

// Itaú: círculo laranja + "itaú" minúsculo
function ItauLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="16" fill="#EC7000" />
      <SvgText
        x="16" y="21"
        textAnchor="middle"
        fontSize="10"
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        itaú
      </SvgText>
    </Svg>
  );
}

// Bradesco: círculo vermelho + "B" + árvore simplificada (triângulo)
function BradescоLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="16" fill="#CC092F" />
      {/* Triângulo estilizado lembrando a árvore do Bradesco */}
      <Path d="M16 6 L22 18 L10 18 Z" fill="#FFFFFF" opacity="0.9" />
      <Rect x="14" y="18" width="4" height="5" fill="#FFFFFF" opacity="0.9" />
    </Svg>
  );
}

// Inter: círculo laranja + "inter" em branco
function InterLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="16" fill="#FF7A00" />
      <SvgText
        x="16" y="21"
        textAnchor="middle"
        fontSize="9"
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        inter
      </SvgText>
    </Svg>
  );
}

// C6 Bank: rect preto arredondado + "C6" em branco
function C6BankLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="0" y="0" width="32" height="32" rx="8" ry="8" fill="#242424" />
      <SvgText
        x="16" y="21"
        textAnchor="middle"
        fontSize="12"
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        C6
      </SvgText>
    </Svg>
  );
}

// Santander: círculo vermelho + chama simplificada (3 curvas)
function SantanderLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx="16" cy="16" r="16" fill="#EC0000" />
      {/* Chama simplificada: 3 formas curvadas em branco */}
      <Path
        d="M16 7 C16 7 12 11 12 15 C12 17.2 13.8 19 16 19 C18.2 19 20 17.2 20 15 C20 11 16 7 16 7Z"
        fill="#FFFFFF"
        opacity="0.9"
      />
      <Path
        d="M16 12 C16 12 14 14 14 16 C14 17.1 14.9 18 16 18 C17.1 18 18 17.1 18 16 C18 14 16 12 16 12Z"
        fill="#EC0000"
        opacity="0.8"
      />
    </Svg>
  );
}

// XP: rect preto + "XP" em branco
function XPLogo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="0" y="0" width="32" height="32" rx="8" ry="8" fill="#000000" />
      <SvgText
        x="16" y="21"
        textAnchor="middle"
        fontSize="13"
        fontFamily="Poppins_600SemiBold"
        fontWeight="600"
        fill="#FFFFFF"
      >
        XP
      </SvgText>
    </Svg>
  );
}

const BANK_LOGOS = {
  'Nubank': NubankLogo,
  'Itaú': ItauLogo,
  'Bradesco': BradescоLogo,
  'Inter': InterLogo,
  'C6 Bank': C6BankLogo,
  'Santander': SantanderLogo,
  'XP': XPLogo,
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
  const Logo = BANK_LOGOS[bankName];
  if (Logo) return <Logo size={size} />;
  return <BankFallback bankColor={bankColor} bankInitial={bankInitial} size={size} />;
}
