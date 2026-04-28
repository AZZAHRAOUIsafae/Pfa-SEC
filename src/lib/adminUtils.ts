import { ADMIN_TAB_LABELS, type AdminTab } from './adminConstants';

export function getAdminTabLabel(tab: AdminTab): string {
  return ADMIN_TAB_LABELS[tab] ?? tab;
}

export function formatAdminStat(value: number, suffix = ''): string {
  return `${value.toLocaleString('fr-FR')}${suffix}`;
}
