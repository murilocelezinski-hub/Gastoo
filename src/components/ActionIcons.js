import React from 'react';
import {
  Trash,
  Folder,
  CreditCard,
  CaretRight,
  CaretLeft,
  Check,
} from 'phosphor-react';

export function TrashIcon({ size = 20, color = '#EF4444' }) {
  return <Trash size={size} weight="fill" color={color} />;
}

export function FolderIcon({ size = 20, color = '#FE5E03' }) {
  return <Folder size={size} weight="fill" color={color} />;
}

export function CardIcon({ size = 20, color = '#FE5E03' }) {
  return <CreditCard size={size} weight="fill" color={color} />;
}

export function ChevronRightIcon({ size = 20, color = '#FE5E03' }) {
  return <CaretRight size={size} weight="fill" color={color} />;
}

export function ChevronLeftIcon({ size = 20, color = '#FFFFFF' }) {
  return <CaretLeft size={size} weight="fill" color={color} />;
}

export function CheckIcon({ size = 16, color = '#FFFFFF' }) {
  return <Check size={size} weight="fill" color={color} />;
}
