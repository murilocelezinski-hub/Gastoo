import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
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
  return <FontAwesomeIcon icon={faUtensils} size={size} color={color} />;
}

export function IconTransporte({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faCar} size={size} color={color} />;
}

export function IconMoradia({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faHome} size={size} color={color} />;
}

export function IconSaude({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faCapsules} size={size} color={color} />;
}

export function IconLazer({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faGamepad} size={size} color={color} />;
}

export function IconEducacao({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faGraduationCap} size={size} color={color} />;
}

export function IconVestuario({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faTshirt} size={size} color={color} />;
}

export function IconAssinaturas({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faBell} size={size} color={color} />;
}

export function IconInvestimentos({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faChartLine} size={size} color={color} />;
}

export function IconTransferencia({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faExchangeAlt} size={size} color={color} />;
}

export function IconOutros({ size = 24, color = '#fff' }) {
  return <FontAwesomeIcon icon={faEllipsisH} size={size} color={color} />;
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
