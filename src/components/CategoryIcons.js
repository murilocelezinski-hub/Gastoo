import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline, Polygon } from 'react-native-svg';

// Ícones de linha fina (strokeWidth 1.5) no estilo minimalista da identidade visual GA$TOO
const STROKE = 1.6;
const props = (color) => ({ stroke: color, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' });

export function IconAlimentacao({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M12 2a7 7 0 0 1 7 7c0 4-3 6-3 9H8c0-3-3-5-3-9a7 7 0 0 1 7-7z" />
      <Line {...p} x1="8" y1="18" x2="16" y2="18" />
      <Line {...p} x1="9" y1="21" x2="15" y2="21" />
    </Svg>
  );
}

export function IconTransporte({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect {...p} x="1" y="3" width="15" height="13" rx="2" />
      <Path {...p} d="M16 8h4l3 3v5h-7V8z" />
      <Circle {...p} cx="5.5" cy="18.5" r="2.5" />
      <Circle {...p} cx="18.5" cy="18.5" r="2.5" />
    </Svg>
  );
}

export function IconMoradia({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <Path {...p} d="M9 21V12h6v9" />
    </Svg>
  );
}

export function IconSaude({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M12 21C12 21 3 14 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 13-9 13z" />
    </Svg>
  );
}

export function IconLazer({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M12 2L9.09 8.26 2 9.27l5 4.87-1.18 6.88L12 17.77l6.18 3.25L17 14.14l5-4.87-7.09-1.01L12 2z" />
    </Svg>
  );
}

export function IconEducacao({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M2 7l10-5 10 5-10 5L2 7z" />
      <Path {...p} d="M6 9.5V16c2 2 8 2 12 0V9.5" />
      <Line {...p} x1="22" y1="7" x2="22" y2="14" />
    </Svg>
  );
}

export function IconVestuario({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path {...p} d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46 2 8h4v13h12V8h4l-1.62-4.54z" />
    </Svg>
  );
}

export function IconAssinaturas({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect {...p} x="5" y="2" width="14" height="20" rx="2" />
      <Line {...p} x1="12" y1="18" x2="12.01" y2="18" />
      <Path {...p} d="M9 7h6M9 11h4" />
    </Svg>
  );
}

export function IconInvestimentos({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline {...p} points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline {...p} points="16 7 22 7 22 13" />
    </Svg>
  );
}

export function IconTransferencia({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline {...p} points="17 1 21 5 17 9" />
      <Path {...p} d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Polyline {...p} points="7 23 3 19 7 15" />
      <Path {...p} d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

export function IconOutros({ size = 24, color = '#fff' }) {
  const p = props(color);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle {...p} cx="12" cy="12" r="1" />
      <Circle {...p} cx="19" cy="12" r="1" />
      <Circle {...p} cx="5" cy="12" r="1" />
    </Svg>
  );
}

// Mapa: nome da categoria → componente de ícone
export const CATEGORY_ICON_MAP = {
  'Alimentação': IconAlimentacao,
  'Transporte': IconTransporte,
  'Moradia': IconMoradia,
  'Saúde': IconSaude,
  'Lazer': IconLazer,
  'Educação': IconEducacao,
  'Vestuário': IconVestuario,
  'Assinaturas': IconAssinaturas,
  'Investimentos': IconInvestimentos,
  'Transferência': IconTransferencia,
  'Outros': IconOutros,
};

export function getCategoryIcon(categoryName) {
  return CATEGORY_ICON_MAP[categoryName] || IconOutros;
}
