import type { User, UserRole } from '../types';

export function filterUsersByRole(users: User[], role: UserRole): User[] {
  return users.filter((u) => u.role === role);
}

export function filterActiveUsers(users: User[]): User[] {
  return users.filter((u) => !u.isBanned);
}

export function searchUsersByName(users: User[], query: string): User[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
  );
}

export function sortUsersByName(users: User[]): User[] {
  return [...users].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function filterBannedUsers(users: User[]): User[] {
  return users.filter((u) => u.isBanned);
}