/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import ClientDashboard from './pages/ClientDashboard';
import TopographerDashboard from './pages/TopographerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Chatbot from './pages/Chatbot';
import ClientChat from './pages/ClientChat';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ClientMaps from './pages/ClientMaps';
import AIAnalysis from './pages/AIAnalysis';
import PublicProfile from './pages/PublicProfile';
import NotificationToast from './components/NotificationToast';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { User, Project, ProjectDocument, Notification } from '../Backend/types';
import { auth, db } from '../Backend/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { dbService } from '../Backend/services/db';

import Onboarding from './pages/Onboarding';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { i18n } = useTranslation();

  // Force language to 'fr' across the whole application
  useEffect(() => {
    if (i18n.language !== 'fr') {
      i18n.changeLanguage('fr');
    }
  }, [i18n.language]);

  useEffect(() => {
    // We don't initialize from localStorage anymore because user wants it to show "toujours" (always)
    // but the onComplete will still set it to true for the current session.
    const handleStorage = () => {
      setHasSeenOnboarding(localStorage.getItem('hasSeenOnboarding') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let unsubscribeNotifs: (() => void) | undefined;
    let unsubscribeProjects: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Mark user as online in the background (do NOT await, as database delay can lock startup)
        dbService.updatePresence(firebaseUser.uid, 'online').catch((err) => {
          console.error("Failed to mark online:", err);
        });

        // Subscribe to full user profile from Firestore
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = { id: docSnap.id, ...(docSnap.data() as any) } as User;
            setUser(profile);
            
            // Mark as online of profile state has changed
            if (profile.status !== 'online') {
              dbService.updatePresence(firebaseUser.uid, 'online').catch(() => {});
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore loading error:", error);
          setUser(null);
          setLoading(false);
        });

        const handleUnload = () => {
          dbService.updatePresence(firebaseUser.uid, 'offline').catch(() => {});
        };
        window.addEventListener('beforeunload', handleUnload);

        // Subscribe to notifications
        unsubscribeNotifs = dbService.subscribeToNotifications(firebaseUser.uid, (notifs) => {
          setNotifications(notifs);
        });

      } else {
        setUser(null);
        setProjects([]);
        setNotifications([]);
        if (unsubscribeNotifs) unsubscribeNotifs();
        if (unsubscribeProjects) unsubscribeProjects();
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeNotifs) unsubscribeNotifs();
      if (unsubscribeProjects) unsubscribeProjects();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to documents
    const unsubscribeDocs = dbService.subscribeToDocuments(user.id, user.role, (docs) => {
      setDocuments(docs);
    }, user.company);

    // Subscribe to projects based on role
    const unsubscribeProjects = dbService.subscribeToProjects(user.role, user.id, (prjs) => {
      setProjects(prjs);
    }, user.adminEmail || user.email, user.company);

    // If admin or topographer, load users (admin gets only associated, topo gets linked clients)
    if (user.role === 'ADMIN') {
      dbService.getAllUsers(user.company, user.email).then(allUsers => {
        const systemAdmins = [
          'ahmed@gmail.com',
          'contact@topopro.ma',
          'admin@topopro.ma',
          'topo.safe.guard@gmail.com',
          's.azzahraoui@esisa.ac.ma'
        ];
        const isSystemAdmin = systemAdmins.includes(user.email.toLowerCase());

        const filtered = allUsers.filter(u => {
          if (u.id === user.id) return false;
          if (isSystemAdmin) return true;
          if (u.role === 'TOPOGRAPHER') {
            return u.adminId === user.id || u.adminEmail === user.email || (user.company && u.company === user.company);
          }
          if (u.role === 'CLIENT') {
            const isDirect = u.adminId === user.id || u.adminEmail === user.email || (user.company && u.company === user.company);
            const isOfAssociatedTopo = allUsers.some(t => 
              t.role === 'TOPOGRAPHER' && 
              t.id === u.linkedTopographerId && 
              (t.adminId === user.id || t.adminEmail === user.email || (user.company && t.company === user.company))
            );
            return isDirect || isOfAssociatedTopo;
          }
          return false;
        });
        setUsers(filtered);
      });
    } else if (user.role === 'TOPOGRAPHER') {
      dbService.getClientsForTopographer(user.id).then(clients => {
        setUsers(clients);
      });
    }

    return () => {
      unsubscribeDocs();
      unsubscribeProjects();
    };
  }, [user?.id, user?.role, user?.adminEmail, user?.email, user?.company]);

  const handleLogout = async () => {
    if (user) {
      await dbService.updatePresence(user.id, 'offline');
    }
    await signOut(auth);
    setUser(null);
  };

  const banUser = async (id: string, isBanned: boolean) => {
    await dbService.banUser(id, isBanned);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isBanned } : u));
  };

  const addProject = async (project: Omit<Project, 'id'>) => {
    return await dbService.createProject(project);
  };

  if (loading) return null;

  return (
    <ThemeProvider defaultTheme="light" storageKey="datatopoguard-theme">
      <NotificationToast notifications={notifications} />
      <Router>
        <Routes>
          <Route path="/onboarding" element={<Onboarding onComplete={() => setHasSeenOnboarding(true)} />} />
          
          <Route path="/login" element={
            !hasSeenOnboarding 
              ? <Navigate to="/onboarding" /> 
              : (user ? <Navigate to="/" /> : <Login onLogin={setUser} />)
          } />
          
          <Route path="/register" element={
            !hasSeenOnboarding 
              ? <Navigate to="/onboarding" /> 
              : (user ? <Navigate to="/" /> : <Register onRegister={setUser} />)
          } />
          
          <Route element={
            !hasSeenOnboarding 
              ? <Navigate to="/onboarding" /> 
              : (user ? <DashboardLayout user={user} notifications={notifications} onLogout={handleLogout} /> : <Navigate to="/login" />)
          }>
            <Route path="/" element={
              user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} /> : 
              user?.role === 'TOPOGRAPHER' ? <TopographerDashboard projects={projects} setProjects={setProjects} clients={users.filter(u => u.role === 'CLIENT')} user={user} documents={documents} /> : 
              user && <ClientDashboard user={user} projects={projects.filter(p => p.clientId === user.id)} documents={documents} notifications={notifications} onAddProject={addProject} />
            } />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/ai-analysis" element={<AIAnalysis />} />
            <Route path="/profile" element={<Settings user={user!} onUpdate={setUser} onLogout={handleLogout} />} />
            <Route path="/settings" element={<Settings user={user!} onUpdate={setUser} onLogout={handleLogout} />} />
            <Route path="/documents" element={
               user?.role === 'CLIENT' ? <ClientDashboard user={user} projects={projects.filter(p => p.clientId === user.id)} documents={documents} notifications={notifications} onAddProject={addProject} initialShowDocs={true} /> : 
               user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="documents" /> : <Navigate to="/" />
            } />
            <Route path="/messages" element={<ClientChat user={user!} onUpdate={setUser} />} />
            <Route path="/maps" element={
              user?.role === 'CLIENT' ? <ClientMaps user={user} projects={projects.filter(p => p.clientId === user.id)} /> :
              <TopographerDashboard projects={projects} setProjects={setProjects} clients={users.filter(u => u.role === 'CLIENT')} initialTab="maps" user={user!} documents={documents} />
            } />
            <Route path="/finance" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="finance" /> : <TopographerDashboard projects={projects} setProjects={setProjects} clients={users.filter(u => u.role === 'CLIENT')} initialTab="finance" user={user!} documents={documents} />} />
            <Route path="/registry" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="registry" /> : <Navigate to="/" />} />
            <Route path="/reviews" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="reviews" /> : <Navigate to="/" />} />
            <Route path="/progress" element={<TopographerDashboard projects={projects} setProjects={setProjects} clients={users.filter(u => u.role === 'CLIENT')} initialTab="projects" user={user!} documents={documents} />} />
            <Route path="/users" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="users" /> : <Navigate to="/" />} />
            <Route path="/logs" element={user?.role === 'ADMIN' ? <AdminDashboard user={user} users={users} setUsers={setUsers} onBanUser={banUser} notifications={notifications} initialTab="audit" /> : <Navigate to="/" />} />
            <Route path="/profile/:uid" element={<PublicProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
