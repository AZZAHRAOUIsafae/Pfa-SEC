import type { User, Project } from '../types';

export function countUsersByRole(users: User[]): Record<string, number> {
  return users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});
}

export function countActiveProjects(projects: Project[]): number {
  return projects.filter((p) => p.status !== 'COMPLETED').length;
}
