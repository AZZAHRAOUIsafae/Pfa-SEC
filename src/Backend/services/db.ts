import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  addDoc,
  orderBy,
  or,
  and,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { cryptoService } from '../lib/crypto';
import { User, Project, ProjectDocument, Message, Notification, UserRole, Intervention, ConnectionRequest, Review, FailedLoginLog, AdminOTP } from '../types';

enum OperationType {
  // ...
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Users
  async getUser(uid: string): Promise<User | null> {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as any) } as User : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUser(user: User): Promise<void> {
    const path = `users/${user.id}`;
    try {
      let companyStr = user.company || '';
      let adminIdVal = user.adminId || null;

      if (user.adminEmail) {
        const admins = await this.getAdmins();
        const activeAdmin = admins.find(a => a.email.toLowerCase() === user.adminEmail?.toLowerCase());
        if (activeAdmin) {
          if (!companyStr && activeAdmin.company) {
            companyStr = activeAdmin.company;
          }
          if (!adminIdVal) {
            adminIdVal = activeAdmin.id;
          }
        }
      }

      await setDoc(doc(db, 'users', user.id), {
        uid: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        phone: user.phone || '',
        age: user.age || 18,
        country: user.country || 'Morocco',
        city: user.city || '',
        company: companyStr,
        adminEmail: user.adminEmail || '',
        adminId: adminIdVal,
        linkedTopographerId: user.linkedTopographerId || null,
        isTwoFactorEnabled: user.isTwoFactorEnabled || false,
        isEmailVerified: user.isEmailVerified || false,
        isPhoneVerified: user.isPhoneVerified || false,
        blockedUids: user.blockedUids || [],
        loginHistory: user.loginHistory || [],
        loginCount: user.loginCount !== undefined ? user.loginCount : 0,
        createdAt: serverTimestamp(),
        status: 'online',
        lastSeen: serverTimestamp()
      });

      // Notify Admins
      const admins = await this.getAdmins();
      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          senderId: user.id,
          senderName: user.name,
          type: 'ALERT',
          content: `Nouvel utilisateur inscrit : ${user.name} (${user.role})`,
          link: '/admin'
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const path = `users/${uid}`;
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToUsers(callback: (users: User[]) => void, company?: string, adminEmail?: string) {
    const path = 'users';
    let q = query(collection(db, 'users'), orderBy('name', 'asc'));

    const systemAdmins = [
      'ahmed@gmail.com',
      'contact@topopro.ma',
      'admin@topopro.ma',
      'topo.safe.guard@gmail.com',
      's.azzahraoui@esisa.ac.ma'
    ];

    const isSystemAdmin = adminEmail && systemAdmins.includes(adminEmail.toLowerCase());

    if (company && company.trim() !== '') {
      q = query(collection(db, 'users'), where('company', '==', company), orderBy('name', 'asc'));
    } else if (adminEmail && !isSystemAdmin) {
      q = query(collection(db, 'users'), where('adminEmail', '==', adminEmail), orderBy('name', 'asc'));
    }

    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as User));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getAllUsers(company?: string, adminEmail?: string): Promise<User[]> {
    const path = 'users';
    try {
      let q: any = collection(db, 'users');

      const systemAdmins = [
        'ahmed@gmail.com',
        'contact@topopro.ma',
        'admin@topopro.ma',
        'topo.safe.guard@gmail.com',
        's.azzahraoui@esisa.ac.ma'
      ];

      const isSystemAdmin = adminEmail && systemAdmins.includes(adminEmail.toLowerCase());

      if (company && company.trim() !== '') {
        q = query(q, where('company', '==', company));
      } else if (adminEmail && !isSystemAdmin) {
        q = query(q, where('adminEmail', '==', adminEmail));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAdmins(): Promise<User[]> {
    const path = 'users';
    try {
      // Use a more specific query for admins
      const q = query(collection(db, 'users'), where('role', '==', 'ADMIN'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as User));
    } catch (error) {
      console.error("Failed to get admins:", error);
      return [];
    }
  },

  async getClientsForTopographer(topographerId: string): Promise<User[]> {
    const path = 'users';
    try {
      // 1. Get clients directly linked to this topographer
      const linkedQuery = query(
        collection(db, 'users'),
        where('role', '==', 'CLIENT'),
        where('linkedTopographerId', '==', topographerId)
      );

      // 2. Get the topographer's own info to find company/adminEmail
      const topoDoc = await getDoc(doc(db, 'users', topographerId));
      const topoData = topoDoc.exists() ? topoDoc.data() : null;

      const promises: Promise<any>[] = [getDocs(linkedQuery)];

      // 3. If topographer belongs to a company, also fetch all clients of that company
      if (topoData?.company && topoData.company.trim() !== '') {
        const companyQuery = query(
          collection(db, 'users'),
          where('role', '==', 'CLIENT'),
          where('company', '==', topoData.company)
        );
        promises.push(getDocs(companyQuery));
      } else if (topoData?.adminEmail) {
        // Fallback: fetch clients sharing the same adminEmail
        const adminEmailQuery = query(
          collection(db, 'users'),
          where('role', '==', 'CLIENT'),
          where('adminEmail', '==', topoData.adminEmail)
        );
        promises.push(getDocs(adminEmailQuery));
      }

      const snapshots = await Promise.all(promises);

      // Merge and deduplicate results by user id
      const clientsMap = new Map<string, User>();
      for (const snapshot of snapshots) {
        snapshot.docs.forEach((d: any) => {
          clientsMap.set(d.id, { id: d.id, ...(d.data() as any) } as User);
        });
      }

      return Array.from(clientsMap.values());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAdminByEmail(email: string): Promise<User | null> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('email', '==', email), where('role', '==', 'ADMIN'), limit(1));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...(doc.data() as any) } as User;
    } catch (error) {
      console.error("Failed to get admin by email:", error);
      if (error instanceof Error && error.message.includes('permission')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      return null;
    }
  },

  // --- Connection Requests ---
  async sendConnectionRequest(sender: User, receiverId: string): Promise<string> {
    const path = 'connectionRequests';
    try {
      const docRef = await addDoc(collection(db, path), {
        senderId: sender.id,
        senderName: sender.name,
        senderEmail: sender.email,
        receiverId: receiverId,
        status: 'PENDING',
        createdAt: serverTimestamp(),
        type: 'CLIENT_TO_PRO'
      });

      // Create notification for receiver
      await this.createNotification({
        userId: receiverId,
        senderId: sender.id,
        senderName: sender.name,
        type: 'ALERT',
        content: `Nouvelle demande de liaison de part de ${sender.name}`,
        link: '/settings' // Or a specific connections page
      });

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  subscribeToIncomingRequests(userId: string, callback: (reqs: ConnectionRequest[]) => void) {
    const q = query(collection(db, 'connectionRequests'), where('receiverId', '==', userId), where('status', '==', 'PENDING'));
    return onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ConnectionRequest));
      callback(reqs);
    });
  },

  async handleConnectionRequest(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    const path = `connectionRequests/${requestId}`;
    try {
      const reqDoc = await getDoc(doc(db, 'connectionRequests', requestId));
      if (!reqDoc.exists()) throw new Error("Request not found");
      const requestData = reqDoc.data() as ConnectionRequest;

      await updateDoc(doc(db, 'connectionRequests', requestId), { status });

      if (status === 'ACCEPTED') {
        const receiver = await this.getUser(requestData.receiverId);

        // Link Client to Pro (Topographer or Admin)
        const updateData: any = {
          linkedTopographerId: requestData.receiverId,
          updatedAt: serverTimestamp()
        };

        if (receiver) {
          updateData.adminEmail = (receiver.role === 'ADMIN' ? receiver.email : receiver.adminEmail) || '';
          updateData.adminId = (receiver.role === 'ADMIN' ? receiver.id : receiver.adminId) || null;
          updateData.company = receiver.company || '';
        }

        await updateDoc(doc(db, 'users', requestData.senderId), updateData);
      }

      // Notify sender
      await this.createNotification({
        userId: requestData.senderId,
        senderId: requestData.receiverId,
        senderName: 'Système',
        type: 'ALERT',
        content: `Votre demande de liaison a été ${status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
        link: '/search'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updatePresence(uid: string, status: 'online' | 'offline'): Promise<void> {
    if (!uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          status,
          lastSeen: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Failed to update presence:", error);
    }
  },

  async getProject(projectId: string): Promise<Project | null> {
    try {
      const docSnap = await getDoc(doc(db, 'projects', projectId));
      return docSnap.exists() ? { id: docSnap.id, ...(docSnap.data() as any) } as Project : null;
    } catch (error) {
      console.error("Failed to get project:", error);
      return null;
    }
  },

  subscribeToProjects(role: UserRole, userId: string, callback: (projects: Project[]) => void, adminEmail?: string, company?: string) {
    const path = 'projects';
    let q;

    if (role === 'ADMIN') {
      if (company && company.trim() !== '') {
        q = query(collection(db, 'projects'), where('company', '==', company), orderBy('createdAt', 'desc'));
      } else if (adminEmail) {
        q = query(collection(db, 'projects'), where('adminEmail', '==', adminEmail), orderBy('createdAt', 'desc'));
      } else {
        q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      }
    } else if (role === 'TOPOGRAPHER') {
      q = query(collection(db, 'projects'), where('topographerId', '==', userId));
    } else {
      q = query(collection(db, 'projects'), where('clientId', '==', userId));
    }

    return onSnapshot(q, (snapshot) => {
      const prjs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Project));
      callback(prjs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getTopographers(company?: string): Promise<User[]> {
    const path = 'users';
    try {
      let q;
      if (company && company.trim() !== '') {
        q = query(collection(db, 'users'), where('role', '==', 'TOPOGRAPHER'), where('company', '==', company));
      } else {
        q = query(collection(db, 'users'), where('role', '==', 'TOPOGRAPHER'));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as User));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async logLogin(uid: string, info: { location: string, device: string }): Promise<void> {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;

        // Track new device alert
        const isNewDevice = userData.lastDeviceInfo && (userData.lastDeviceInfo.device !== info.device);
        const isNewLocation = userData.lastDeviceInfo && (userData.lastDeviceInfo.location !== info.location);

        const newLoginHistory = [
          { id: Math.random().toString(36).substr(2, 9), ...info, timestamp: new Date().toISOString() },
          ...(userData.loginHistory || []).slice(0, 19) // Keep last 20
        ];

        const loginCount = (userData.loginCount || 0) + 1;

        await updateDoc(userRef, {
          loginHistory: newLoginHistory,
          loginCount: loginCount,
          lastDeviceInfo: info,
          status: 'online',
          lastSeen: serverTimestamp()
        });

        // Trigger Security Alert if detected new device/location
        if (isNewDevice || isNewLocation) {
          await this.createNotification({
            userId: uid,
            senderId: 'system',
            senderName: 'Sécurité Système',
            type: 'ALERT',
            content: `Nouvelle connexion détectée depuis un ${isNewDevice ? 'nouvel appareil' : 'nouvel emplacement'}: ${info.device} (${info.location})`,
            link: '/settings'
          });

          // Also alert Admin if it's an admin login
          if (userData.role === 'ADMIN') {
            const auditLog: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
              userId: 'LOGS', // Special key for system logs if we want
              senderId: uid,
              senderName: userData.name,
              type: 'ALERT',
              content: `Alerte Sécurité: Admin ${userData.name} s'est connecté depuis ${info.device} (${info.location})`,
              link: `/profile/${uid}`
            };
            // Notifications are currently our audit logs in this implementation
            await this.createNotification(auditLog);
          }
        } else {
          // Normal audit log for standard login
          await this.createNotification({
            userId: 'LOGS',
            senderId: uid,
            senderName: userData.name,
            type: 'LOGIN',
            content: `${userData.name} s'est connecté au système. Total connexions: ${loginCount}`,
            link: `/profile/${uid}`
          });
        }
      }
    } catch (error) {
      console.error('Failed to log login:', error);
    }
  },

  async deleteUser(uid: string): Promise<void> {
    // We no longer delete users to keep audit trails.
    // We ban them instead.
    await this.banUser(uid, true);
  },

  async banUser(uid: string, isBanned: boolean): Promise<void> {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        isBanned,
        status: isBanned ? 'offline' : 'online',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Projects
  async getProjects(role: 'CLIENT' | 'TOPOGRAPHER' | 'ADMIN', uid: string): Promise<Project[]> {
    const path = 'projects';
    if (!uid && role !== 'ADMIN') {
      console.warn('getProjects called without uid for non-admin role');
      return [];
    }
    try {
      let q;
      if (role === 'ADMIN') {
        q = query(collection(db, 'projects'));
      } else if (role === 'TOPOGRAPHER') {
        q = query(collection(db, 'projects'), where('topographerId', '==', uid));
      } else {
        q = query(collection(db, 'projects'), where('clientId', '==', uid));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Project));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async createProject(project: Omit<Project, 'id'>): Promise<string> {
    const path = 'projects';
    try {
      let companyStr = project.company || '';
      if (!companyStr && project.topographerId) {
        const topoUser = await this.getUser(project.topographerId);
        if (topoUser && topoUser.company) {
          companyStr = topoUser.company;
        }
      }
      if (!companyStr && project.clientId) {
        const clientUser = await this.getUser(project.clientId);
        if (clientUser && clientUser.company) {
          companyStr = clientUser.company;
        }
      }

      const docRef = await addDoc(collection(db, 'projects'), {
        name: project.name,
        description: project.description || '',
        status: project.status,
        progress: project.progress,
        currentStep: project.currentStep || 0,
        startDate: project.startDate || '',
        estimatedDelivery: project.estimatedDelivery || '',
        deadline: project.deadline,
        topographerId: project.topographerId,
        clientId: project.clientId,
        clientName: project.clientName,
        adminEmail: project.adminEmail || '',
        adminId: project.adminId || '',
        company: companyStr,
        location: project.location || '',
        coordinates: project.coordinates || { lat: 0, lng: 0 },
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async createDocument(document: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const path = 'documents';
    try {
      let companyStr = document.company || '';
      if (!companyStr && document.projectId) {
        const prj = await this.getProject(document.projectId);
        if (prj && prj.company) {
          companyStr = prj.company;
        }
      }
      if (!companyStr && document.topographerId) {
        const topo = await this.getUser(document.topographerId);
        if (topo && topo.company) {
          companyStr = topo.company;
        }
      }

      const docRef = await addDoc(collection(db, 'documents'), {
        ...document,
        company: companyStr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isSigned: false
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      throw error;
    }
  },

  async updateProject(id: string, data: Partial<Project>): Promise<void> {
    const path = `projects/${id}`;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'projects', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateDocument(id: string, data: Partial<ProjectDocument>): Promise<void> {
    const path = `documents/${id}`;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'documents', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Helper to parse Google Maps URL to coordinates
  parseGoogleMapsUrl(url: string): { lat: number, lng: number, z?: number } | null {
    try {
      // Logic for format: https://www.google.com/maps/@33.5724128,-7.5891328,15z
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
      }

      // Logic for query format: https://www.google.com/maps/search/?api=1&query=33.5724128,-7.5891328
      const queryMatch = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (queryMatch) {
        return { lat: parseFloat(queryMatch[1]), lng: parseFloat(queryMatch[2]) };
      }

      return null;
    } catch (e) {
      console.error("Error parsing maps URL:", e);
      return null;
    }
  },

  // Calculate area of a polygon in square meters
  calculateArea(coords: { lat: number, lng: number }[]): number {
    if (coords.length < 3) return 0;
    let area = 0;
    const radius = 6378137; // Earth's radius in meters

    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];
      area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
    }

    return Math.abs(area * radius * radius / 2 * Math.PI / 180);
  },

  // Calculate perimeter of a polyline/polygon in meters
  calculatePerimeter(coords: { lat: number, lng: number }[]): number {
    let perimeter = 0;
    const radius = 6378137;

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];

      const dLat = (p2.lat - p1.lat) * Math.PI / 180;
      const dLng = (p2.lng - p1.lng) * Math.PI / 180;

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      perimeter += radius * c;
    }

    return perimeter;
  },

  async updateProjectProgress(id: string, progress: number): Promise<void> {
    const path = `projects/${id}`;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'projects', id), { progress });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateProjectStatus(id: string, status: Project['status']): Promise<void> {
    const path = `projects/${id}`;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'projects', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Documents
  async getDocuments(projectId: string): Promise<ProjectDocument[]> {
    const path = 'documents';
    if (!projectId) return [];
    try {
      const q = query(collection(db, 'documents'), where('projectId', '==', projectId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProjectDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  subscribeToDocuments(userId: string, role: UserRole, callback: (docs: ProjectDocument[]) => void, company?: string) {
    const path = 'documents';
    const field = role === 'CLIENT' ? 'clientId' : 'topographerId';
    const q = role === 'ADMIN'
      ? (company && company.trim() !== ''
        ? query(collection(db, 'documents'), where('company', '==', company), orderBy('createdAt', 'desc'))
        : query(collection(db, 'documents'), orderBy('createdAt', 'desc')))
      : query(collection(db, 'documents'), where(field, '==', userId));

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProjectDocument));
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getAllDocumentsByUser(userId: string, role: UserRole): Promise<ProjectDocument[]> {
    const path = 'documents';
    try {
      const field = role === 'CLIENT' ? 'clientId' : 'topographerId';
      const q = query(collection(db, 'documents'), where(field, '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Fallback for older documents without clientId/topographerId
        // This might be what's currently failing if we use high-level listing without projectId filter
        return [];
      }

      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProjectDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllDocuments(): Promise<ProjectDocument[]> {
    const path = 'documents';
    try {
      const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProjectDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllDocumentsForClient(projectIds: string[]): Promise<ProjectDocument[]> {
    if (projectIds.length === 0) return [];
    const path = 'documents';
    try {
      // Chunking for 'in' query if needed, but we prefer getAllDocumentsByUser
      const q = query(collection(db, 'documents'), where('projectId', 'in', projectIds.slice(0, 10)), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProjectDocument));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Get all unique topographers a client has messaged
  async getChatContacts(userId: string, role: 'CLIENT' | 'TOPOGRAPHER'): Promise<User[]> {
    try {
      const messagesRef = collection(db, 'messages');
      const q1 = query(messagesRef, where('senderId', '==', userId));
      const q2 = query(messagesRef, where('receiverId', '==', userId));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      const contactIds = new Set<string>();
      snap1.docs.forEach(doc => contactIds.add(doc.data().receiverId));
      snap2.docs.forEach(doc => contactIds.add(doc.data().senderId));

      const contacts: User[] = [];
      for (const id of contactIds) {
        if (id && id !== userId) {
          const u = await this.getUser(id);
          if (u) contacts.push(u);
        }
      }
      return contacts;
    } catch (error) {
      console.error("Error getting contacts:", error);
      return [];
    }
  },

  async addProject(project: Omit<Project, 'id'>): Promise<string> {
    const path = 'projects';
    try {
      let companyStr = project.company || '';
      if (!companyStr && project.topographerId) {
        const topo = await this.getUser(project.topographerId);
        if (topo && topo.company) {
          companyStr = topo.company;
        }
      }
      if (!companyStr && project.clientId) {
        const clientUser = await this.getUser(project.clientId);
        if (clientUser && clientUser.company) {
          companyStr = clientUser.company;
        }
      }

      const docRef = await addDoc(collection(db, 'projects'), {
        ...project,
        company: companyStr,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async addDocument(document: Omit<ProjectDocument, 'id'>): Promise<string> {
    const path = 'documents';
    try {
      let finalClientId = document.clientId;
      let finalTopographerId = document.topographerId;
      let companyStr = document.company || '';

      // If missing, fetch from project
      if (!finalClientId || !finalTopographerId || !companyStr) {
        const projectDoc = await getDoc(doc(db, 'projects', document.projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as Project;
          finalClientId = finalClientId || projectData.clientId;
          finalTopographerId = finalTopographerId || projectData.topographerId;
          companyStr = companyStr || projectData.company || '';
        }
      }

      if (!companyStr && finalTopographerId) {
        const topo = await this.getUser(finalTopographerId);
        if (topo && topo.company) {
          companyStr = topo.company;
        }
      }

      const docRef = await addDoc(collection(db, 'documents'), {
        projectId: document.projectId,
        clientId: finalClientId || '',
        topographerId: finalTopographerId || '',
        name: document.name,
        type: document.type,
        url: document.url,
        size: document.size,
        amount: document.amount || null,
        metadata: document.metadata || null,
        company: companyStr,
        createdAt: serverTimestamp()
      });

      // Notify the specific Admin linked to this topographer
      const topographer = await this.getUser(auth.currentUser?.uid || '');
      let adminUid = topographer?.adminId;

      if (!adminUid && topographer?.adminEmail) {
        const admin = await this.getAdminByEmail(topographer.adminEmail);
        adminUid = admin?.id;
      }

      if (adminUid) {
        await this.createNotification({
          userId: adminUid,
          senderId: auth.currentUser?.uid || '',
          senderName: 'Système',
          type: 'DOCUMENT',
          content: `Nouveau document déposé : ${document.name}`,
          link: `/projets/${document.projectId}`
        });
      }
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Messages
  subscribeToMessages(userId: string, otherId: string, callback: (messages: Message[]) => void) {
    const path = 'messages';
    const q = query(
      collection(db, 'messages'),
      or(
        and(where('senderId', '==', userId), where('receiverId', '==', otherId)),
        and(where('senderId', '==', otherId), where('receiverId', '==', userId))
      )
    );

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data() as Message;
        return {
          id: doc.id,
          ...data,
          text: data.deletedForEveryone
            ? data.text
            : cryptoService.decryptMessage(data.text, data.senderId, data.receiverId)
        } as Message;
      });
      // Sort messages in-memory to bypass Firestore compound index restrictions
      msgs.sort((a, b) => {
        const getMs = (ts: any) => {
          if (!ts) return Date.now(); // Optimistic placement for pending server timestamps
          if (typeof ts === 'string') return new Date(ts).getTime();
          if (typeof ts.toDate === 'function') return ts.toDate().getTime();
          if (typeof ts.seconds === 'number') return ts.seconds * 1000;
          if (ts instanceof Date) return ts.getTime();
          try {
            return new Date(ts).getTime();
          } catch (e) {
            return 0;
          }
        };
        return getMs(a.timestamp) - getMs(b.timestamp);
      });
      callback(msgs);
    }, (error) => {
      console.error('Error in subscribeToMessages:', error);
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async sendMessage(message: Message): Promise<void> {
    const path = 'messages';
    try {
      const encryptedText = cryptoService.encryptMessage(message.text, message.senderId, message.receiverId);

      await addDoc(collection(db, 'messages'), {
        senderId: message.senderId,
        receiverId: message.receiverId,
        text: encryptedText,
        fileUrl: message.fileUrl || null,
        fileName: message.fileName || null,
        fileType: message.fileType || null,
        timestamp: serverTimestamp(),
        deletedForEveryone: false,
        deletedBy: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteMessageForMe(msgId: string, userId: string): Promise<void> {
    const path = `messages/${msgId}`;
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        deletedBy: arrayUnion(userId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteMessageForEveryone(msgId: string): Promise<void> {
    const path = `messages/${msgId}`;
    try {
      await updateDoc(doc(db, 'messages', msgId), {
        deletedForEveryone: true,
        text: 'Ce message a été supprimé',
        fileUrl: null,
        fileName: null,
        fileType: null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Notifications
  subscribeToNotifications(userId: string, callback: (notifications: Notification[]) => void) {
    const path = 'notifications';
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
      callback(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async logFailedLogin(email: string, reason: string): Promise<void> {
    try {
      let companyStr = '';
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.trim()), limit(1));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const userData = qSnap.docs[0].data();
          companyStr = userData.company || '';
        }
      } catch (err) {
        console.error('Error fetching user for failed login log:', err);
      }

      await addDoc(collection(db, 'failed_logins'), {
        email: email.trim(),
        reason,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        company: companyStr
      });
    } catch (error) {
      console.error('Error logging failed login:', error);
    }
  },

  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
    const path = 'reviews';
    try {
      // Update Topographer Rating
      const topoRef = doc(db, 'users', review.topographerId);
      const topoSnap = await getDoc(topoRef);
      let companyStr = '';
      if (topoSnap.exists()) {
        const topoData = topoSnap.data() as User;
        companyStr = topoData.company || '';
        const currentRating = topoData.rating || 0;
        const currentCount = topoData.reviewCount || 0;
        const newCount = currentCount + 1;
        const newRating = (currentRating * currentCount + review.rating) / newCount;

        await updateDoc(topoRef, {
          rating: newRating,
          reviewCount: newCount
        });
      }

      await addDoc(collection(db, 'reviews'), {
        ...review,
        company: companyStr,
        createdAt: serverTimestamp()
      });

      // Update associated project if provided
      if (review.projectId) {
        const projectRef = doc(db, 'projects', review.projectId);
        await updateDoc(projectRef, {
          hasReview: true,
          ratingValue: review.rating
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getReviews(topographerId: string): Promise<any[]> {
    try {
      const q = query(collection(db, 'reviews'), where('topographerId', '==', topographerId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  },

  subscribeToReviews(userId: string, role: UserRole, callback: (reviews: any[]) => void, company?: string) {
    const path = 'reviews';
    const q = role === 'ADMIN'
      ? query(collection(db, 'reviews'), orderBy('createdAt', 'desc'))
      : role === 'TOPOGRAPHER'
        ? query(collection(db, 'reviews'), where('topographerId', '==', userId), orderBy('createdAt', 'desc'))
        : query(collection(db, 'reviews'), where('clientId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      let reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (role === 'ADMIN' && company && company.trim() !== '') {
        reviews = reviews.filter((r: any) => r.company === company);
      }
      callback(reviews);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    const path = 'notifications';
    try {
      let companyStr = (notification as any).company || '';
      if (!companyStr && notification.senderId && notification.senderId !== 'system' && notification.senderId !== 'Système') {
        const sender = await this.getUser(notification.senderId);
        if (sender && sender.company) {
          companyStr = sender.company;
        }
      }
      if (!companyStr && notification.userId && notification.userId !== 'LOGS') {
        const receiver = await this.getUser(notification.userId);
        if (receiver && receiver.company) {
          companyStr = receiver.company;
        }
      }

      await addDoc(collection(db, 'notifications'), {
        ...notification,
        company: companyStr,
        senderAvatar: notification.senderAvatar || '',
        read: false,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const path = `notifications/${id}`;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const path = 'notifications';
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
      await Promise.all(batch);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  subscribeToAllNotifications(callback: (notifications: Notification[]) => void, company?: string) {
    const path = 'notifications';
    const q = company && company.trim() !== ''
      ? query(
        collection(db, 'notifications'),
        where('userId', '==', 'LOGS'),
        where('company', '==', company),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
      : query(
        collection(db, 'notifications'),
        where('userId', '==', 'LOGS'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Notification));
      callback(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async signDocument(docId: string, signatureBase64: string, userId: string): Promise<void> {
    const path = `documents/${docId}`;
    try {
      await updateDoc(doc(db, 'documents', docId), {
        isSigned: true,
        signatureBase64,
        signatureDate: serverTimestamp(),
        signedBy: userId,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Interventions
  subscribeToInterventions(userId: string, role: UserRole, callback: (interventions: Intervention[]) => void) {
    const path = 'interventions';
    const q = role === 'ADMIN'
      ? query(collection(db, 'interventions'), orderBy('date', 'asc'))
      : role === 'TOPOGRAPHER'
        ? query(collection(db, 'interventions'), where('topographerId', '==', userId))
        : query(collection(db, 'interventions'), where('clientId', '==', userId));

    return onSnapshot(q, (snapshot) => {
      const ints = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Intervention));
      callback(ints);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async createIntervention(intervention: Omit<Intervention, 'id'>): Promise<string> {
    const path = 'interventions';
    try {
      let companyStr = (intervention as any).company || '';
      if (!companyStr && intervention.projectId) {
        const prj = await this.getProject(intervention.projectId);
        if (prj && prj.company) {
          companyStr = prj.company;
        }
      }
      if (!companyStr && intervention.topographerId) {
        const topo = await this.getUser(intervention.topographerId);
        if (topo && topo.company) {
          companyStr = topo.company;
        }
      }

      const docRef = await addDoc(collection(db, 'interventions'), {
        ...intervention,
        company: companyStr,
        status: intervention.status || 'PLANNED',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateIntervention(id: string, data: Partial<Intervention>): Promise<void> {
    const path = `interventions/${id}`;
    if (!id) return;
    try {
      await updateDoc(doc(db, 'interventions', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateTwoFactor(userId: string, enabled: boolean): Promise<void> {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isTwoFactorEnabled: enabled,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteIntervention(id: string): Promise<void> {
    const path = `interventions/${id}`;
    try {
      await deleteDoc(doc(db, 'interventions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Data Exportation
  exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return;

    // Get headers from first object keys
    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  async exportProjectsToCSV(role: UserRole, userId: string) {
    const projects = await this.getProjects(role as any, userId);
    const exportData = projects.map(p => ({
      ID: p.id,
      Nom: p.name,
      Client: p.clientName,
      Status: p.status,
      Progression: `${p.progress}%`,
      Echeance: p.deadline,
      Surface: p.area ? `${p.area} m²` : '0',
      Perimetre: p.perimeter ? `${p.perimeter} m` : '0',
      Description: p.description
    }));

    this.exportToCSV(exportData, `projets_topo_${new Date().toISOString().split('T')[0]}.csv`);
  },

  async generateAndSaveAdminOTP(userId: string, email: string): Promise<string> {
    const path = `admin_otps/${userId}`;
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

      await setDoc(doc(db, 'admin_otps', userId), {
        userId,
        email,
        code,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        createdAt: serverTimestamp()
      });

      console.log(`[OTP SYSTEM] Generation: OTP ${code} saved securely in Firestore for user ${userId}. Expires at: ${expiresAt.toLocaleTimeString()}`);
      return code;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async verifyAdminOTP(userId: string, enteredCode: string): Promise<{ success: boolean; error?: string }> {
    const path = `admin_otps/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, 'admin_otps', userId));
      if (!docSnap.exists()) {
        console.warn(`[OTP SYSTEM] Verification failure: No OTP document found in Firestore for user ${userId}`);
        return { success: false, error: 'OTP_NOT_FOUND' };
      }

      const data = docSnap.data();
      const storedCode = data.code;
      const expiresAtStr = data.expiresAt;
      const expiresAt = new Date(expiresAtStr);
      const currentAttempts = data.attempts || 0;

      // 1. Check expiration
      if (Date.now() > expiresAt.getTime()) {
        await deleteDoc(doc(db, 'admin_otps', userId));
        console.log(`[OTP SYSTEM] Expiration: OTP code has expired and was auto-deleted for user ${userId}`);
        return { success: false, error: 'OTP_EXPIRED' };
      }

      // 2. Increment and enforce max attempts
      const newAttempts = currentAttempts + 1;

      if (storedCode === enteredCode) {
        // Success: Clean up and log
        await deleteDoc(doc(db, 'admin_otps', userId));
        console.log(`[OTP SYSTEM] Success: OTP successfully verified on attempt ${newAttempts}/3 for user ${userId}`);
        return { success: true };
      }

      // Incorrect code
      if (newAttempts >= 3) {
        // Exceeded: delete the code
        await deleteDoc(doc(db, 'admin_otps', userId));
        console.log(`[OTP SYSTEM] Exceeded: OTP deleted due to maximum attempts (3/3) reached for user ${userId}`);
        return { success: false, error: 'OTP_MAX_ATTEMPTS' };
      }

      // Update attempts count
      await setDoc(doc(db, 'admin_otps', userId), {
        ...data,
        attempts: newAttempts
      });
      console.log(`[OTP SYSTEM] Failure: Incorrect OTP entered for user ${userId}. Attempt ${newAttempts}/3`);
      return { success: false, error: 'OTP_INVALID' };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      throw error;
    }
  }
};
