/** Central Firestore collection names used by db service. */
export const COLLECTIONS = {
  users: 'users',
  projects: 'projects',
  documents: 'documents',
  messages: 'messages',
  notifications: 'notifications',
  interventions: 'interventions',
  connectionRequests: 'connectionRequests',
  reviews: 'reviews',
  failedLogins: 'failedLogins',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export function userDocPath(userId: string): string {
  return `${COLLECTIONS.users}/${userId}`;
}
