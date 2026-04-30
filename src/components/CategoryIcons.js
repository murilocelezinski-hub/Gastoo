import React from 'react';
import FontAwesome5Icon from '@fortawesome/react-native-fontawesome';
import {
  faUtensils,
  faCar,
  faHome,
  faCapsules,
  faGamepad,
  faGraduationCap,
  faTshirt,
  faBell,
  faChartLine,
  faExchangeAlt,
  faEllipsisH,
} from '@fortawesome/free-solid-svg-icons';

export function IconAlimentacao({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faUtensils} size={size / 6} color={color} />;
}

export function IconTransporte({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faCar} size={size / 6} color={color} />;
}

export function IconMoradia({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faHome} size={size / 6} color={color} />;
}

export function IconSaude({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faCapsules} size={size / 6} color={color} />;
}

export function IconLazer({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faGamepad} size={size / 6} color={color} />;
}

export function IconEducacao({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faGraduationCap} size={size / 6} color={color} />;
}

export function IconVestuario({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faTshirt} size={size / 6} color={color} />;
}

export function IconAssinaturas({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faBell} size={size / 6} color={color} />;
}

export function IconInvestimentos({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faChartLine} size={size / 6} color={color} />;
}

export function IconTransferencia({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faExchangeAlt} size={size / 6} color={color} />;
}

export function IconOutros({ size = 24, color = '#fff' }) {
  return <FontAwesome5Icon icon={faEllipsisH} size={size / 6} color={color} />;
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
