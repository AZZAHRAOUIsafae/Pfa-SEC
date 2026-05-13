import type { Project } from '../types';

const STATUS_ORDER: Project['status'][] = [
  'PENDING',
  'IN_PROGRESS',
  'VALIDATION',
  'MODIFICATION_REQUESTED',
  'READY',
  'COMPLETED',
];

export function sortProjectsByStatus(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
}

export function isProjectOverdue(project: Project): boolean {
  if (!project.deadline || project.status === 'COMPLETED') return false;
  return new Date(project.deadline) < new Date();
}

export function getProgressLabel(progress: number): string {
  if (progress >= 100) return 'Terminé';
  if (progress >= 75) return 'Presque terminé';
  if (progress >= 50) return 'En cours';
  if (progress > 0) return 'Démarré';
  return 'Non commencé';
}