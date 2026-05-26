import React from 'react';
import {
  ForkKnife,
  Car,
  House,
  Pill,
  GameController,
  GraduationCap,
  Tote,
  Bell,
  ChartLine,
  ArrowsLeftRight,
  DotsThree,
  Money,
  Laptop,
  TrendUp,
  Gift,
  ArrowCounterClockwise,
  Buildings,
  Star,
} from 'phosphor-react';

export function IconAlimentacao({ size = 24, color = '#fff' }) {
  return <ForkKnife size={size} weight="fill" color={color} />;
}

export function IconTransporte({ size = 24, color = '#fff' }) {
  return <Car size={size} weight="fill" color={color} />;
}

export function IconMoradia({ size = 24, color = '#fff' }) {
  return <House size={size} weight="fill" color={color} />;
}

export function IconSaude({ size = 24, color = '#fff' }) {
  return <Pill size={size} weight="fill" color={color} />;
}

export function IconLazer({ size = 24, color = '#fff' }) {
  return <GameController size={size} weight="fill" color={color} />;
}

export function IconEducacao({ size = 24, color = '#fff' }) {
  return <GraduationCap size={size} weight="fill" color={color} />;
}

export function IconVestuario({ size = 24, color = '#fff' }) {
  return <Tote size={size} weight="fill" color={color} />;
}

export function IconAssinaturas({ size = 24, color = '#fff' }) {
  return <Bell size={size} weight="fill" color={color} />;
}

export function IconInvestimentos({ size = 24, color = '#fff' }) {
  return <ChartLine size={size} weight="fill" color={color} />;
}

export function IconTransferencia({ size = 24, color = '#fff' }) {
  return <ArrowsLeftRight size={size} weight="fill" color={color} />;
}

export function IconOutros({ size = 24, color = '#fff' }) {
  return <DotsThree size={size} weight="fill" color={color} />;
}

export function IconSalario({ size = 24, color = '#fff' }) {
  return <Money size={size} weight="fill" color={color} />;
}

export function IconFreelance({ size = 24, color = '#fff' }) {
  return <Laptop size={size} weight="fill" color={color} />;
}

export function IconRendimentos({ size = 24, color = '#fff' }) {
  return <TrendUp size={size} weight="fill" color={color} />;
}

export function IconPresente({ size = 24, color = '#fff' }) {
  return <Gift size={size} weight="fill" color={color} />;
}

export function IconReembolso({ size = 24, color = '#fff' }) {
  return <ArrowCounterClockwise size={size} weight="fill" color={color} />;
}

export function IconAluguelRecebido({ size = 24, color = '#fff' }) {
  return <Buildings size={size} weight="fill" color={color} />;
}

export function IconBeneficios({ size = 24, color = '#fff' }) {
  return <Star size={size} weight="fill" color={color} />;
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
  'Salário': IconSalario,
  'Freelance': IconFreelance,
  'Rendimentos': IconRendimentos,
  'Presente': IconPresente,
  'Reembolso': IconReembolso,
  'Aluguel Recebido': IconAluguelRecebido,
  'Benefícios': IconBeneficios,
};

export function getCategoryIcon(categoryName) {
  return CATEGORY_ICON_MAP[categoryName] || IconOutros;
}
