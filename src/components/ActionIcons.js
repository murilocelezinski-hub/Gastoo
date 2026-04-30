import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTrash,
  faFolder,
  faCreditCard,
  faChevronRight,
  faChevronLeft,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

export function TrashIcon({ size = 20, color = '#EF4444' }) {
  return <FontAwesomeIcon icon={faTrash} size={size} color={color} />;
}

export function FolderIcon({ size = 20, color = '#FE5E03' }) {
  return <FontAwesomeIcon icon={faFolder} size={size} color={color} />;
}

export function CardIcon({ size = 20, color = '#FE5E03' }) {
  return <FontAwesomeIcon icon={faCreditCard} size={size} color={color} />;
}

export function ChevronRightIcon({ size = 20, color = '#FE5E03' }) {
  return <FontAwesomeIcon icon={faChevronRight} size={size} color={color} />;
}

export function ChevronLeftIcon({ size = 20, color = '#FFFFFF' }) {
  return <FontAwesomeIcon icon={faChevronLeft} size={size} color={color} />;
}

export function CheckIcon({ size = 16, color = '#FFFFFF' }) {
  return <FontAwesomeIcon icon={faCheck} size={size} color={color} />;
}
