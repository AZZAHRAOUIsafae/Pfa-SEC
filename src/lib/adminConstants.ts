export const ADMIN_TABS = [
  'users',
  'documents',
  'finance',
  'registry',
  'audit',
  'messages',
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export const ADMIN_TAB_LABELS: Record<AdminTab, string> = {
  users: 'Utilisateurs',
  documents: 'Documents',
  finance: 'Finance',
  registry: 'Registre',
  audit: 'Audit',
  messages: 'Messages',
};
