import type { Project } from '../types';

export function filterProjectsByStatus(projects: Project[], status: Project['status']): Project[] {
  return projects.filter((p) => p.status === status);
}

export function searchProjects(projects: Project[], query: string): Project[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(
    (p) => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q)
  );
}
