import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('pt-BR');
}

export function formatOrderNumber(num: number) {
  return `#${String(num).padStart(6, '0')}`;
}
