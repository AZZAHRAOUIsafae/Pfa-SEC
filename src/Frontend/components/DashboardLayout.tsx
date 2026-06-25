import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  MapPin, 
  MessageSquare, 
  BarChart3, 
  Users, 
  FileText, 
  Shield, 
  History, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  User as UserIcon,
  Menu,
  X,
  Sun,
  Moon,
  Folder,
  FileBox,
  Eye,
  Globe,
  Check as CheckIcon,
  BrainCircuit,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../Backend/lib/utils';
import { User, Project, ProjectDocument, Notification } from '../../Backend/types';
import { useTheme } from './ThemeProvider';
import { dbService } from '../../Backend/services/db';
import { formatDistanceToNow } from 'date-fns';
import { fr, arMA, enUS } from 'date-fns/locale';

interface DashboardLayoutProps {
  user: User;
  notifications: Notification[];
  onLogout: () => void;
}

export default function DashboardLayout({ user, notifications, onLogout }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    projects: Project[];
    users: User[];
    documents: ProjectDocument[];
  }>({ projects: [], users: [], documents: [] });
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { t, i18n } = useTranslation();

  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setShowResults(false);
      }
      if (langRef.current && !langRef.current.contains(target)) {
        setShowLangMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults({ projects: [], users: [], documents: [] });
        return;
      }

      const query = searchQuery.toLowerCase();
      
      // Search projects
      const allProjects = await dbService.getProjects(user.role, user.id);
      const matchedProjects = allProjects.filter(p => p.name.toLowerCase().includes(query));

      // Search users (especially for admin or network)
      let matchedUsers: User[] = [];
      if (user.role === 'ADMIN') {
        const allUsers = await dbService.getAllUsers(user.company);
        matchedUsers = allUsers.filter(u => 
          u.name.toLowerCase().includes(query) || 
          u.role.toLowerCase().includes(query)
        );
      } else {
        // Non-admins search for topographers
        const topos = await dbService.getTopographers(user.company);
        matchedUsers = topos.filter(u => u.name.toLowerCase().includes(query));
      }

      // Search documents
      let matchedDocs: ProjectDocument[] = [];
      if (user.role !== 'ADMIN') {
        const userDocs = await dbService.getAllDocumentsByUser(user.id, user.role);
        matchedDocs = userDocs.filter(d => d.name.toLowerCase().includes(query));
      }

      setSearchResults({
        projects: matchedProjects,
        users: matchedUsers,
        documents: matchedDocs.filter(d => d.name.toLowerCase().includes(query))
      });
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user.id, user.role]);

  const getSidebarItems = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
          { name: t('nav.users') || 'Gestion Utilisateurs', icon: Users, path: '/users' },
          { name: t('nav.documents') || 'Tous les Documents', icon: FileText, path: '/documents' },
          { name: t('nav.finance'), icon: BarChart3, path: '/finance' },
          { name: t('nav.registry'), icon: History, path: '/registry' },
          { name: t('nav.reviews') || 'Avis & Évaluations', icon: Star, path: '/reviews' },
          { name: t('nav.audit'), icon: Shield, path: '/logs' },
          { name: t('nav.ai_analysis'), icon: BrainCircuit, path: '/ai-analysis' },
          { name: t('nav.settings'), icon: Settings, path: '/settings' },
        ];
      case 'TOPOGRAPHER':
        return [
          { name: t('nav.dashboard') || 'Mes Clients', icon: Users, path: '/' },
          { name: t('nav.technical') || 'Progression Projets', icon: BarChart3, path: '/progress' },
          { name: t('nav.ai_analysis'), icon: BrainCircuit, path: '/ai-analysis' },
          { name: t('nav.maps'), icon: Map, path: '/maps' },
          { name: t('nav.finance'), icon: FileText, path: '/finance' },
          { name: t('nav.settings'), icon: Settings, path: '/settings' },
        ];
      case 'CLIENT':
      default:
        return [
          { name: t('nav.dashboard'), icon: LayoutDashboard, path: '/' },
          { name: t('nav.messages'), icon: MessageSquare, path: '/messages' },
          { name: t('nav.maps'), icon: Map, path: '/maps' },
          { name: t('nav.projects') || 'Mes Documents', icon: FileText, path: '/documents' },
          { name: t('nav.settings'), icon: Settings, path: '/settings' },
        ];
    }
  };

  const navItems = getSidebarItems();

  return (
    <div className="min-h-screen bg-background mesh-gradient flex transition-colors duration-500 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] -z-10" />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transition-all duration-500 lg:static lg:translate-x-0 p-4",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full glass-card rounded-[2.5rem] flex flex-col border-white/20 shadow-2xl shadow-primary/5">
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 font-black text-xl text-primary font-display">
              <div className="w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3">
                <Map className="w-6 h-6" />
              </div>
              <span className="tracking-tighter">TopoGuard</span>
            </div>
            <button className="lg:hidden p-2 hover:bg-muted rounded-xl" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-8 pb-8 pt-2">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
          </div>

          <nav className="flex-1 px-4 space-y-2 no-scrollbar overflow-y-auto">
            {navItems.map((item, i) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={`nav-${item.name}-${i}`}
                  to={item.path}
                  className={cn(
                    "group relative flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-primary rounded-2xl -z-10 shadow-lg shadow-primary/30"
                    />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-white" : "group-hover:text-primary"
                  )} />
                  <span className="text-sm font-bold tracking-tight">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-6">
            <button 
              onClick={onLogout}
              className="flex items-center gap-3 px-6 py-4 w-full text-left rounded-2xl text-destructive hover:bg-destructive/10 transition-all font-black uppercase tracking-widest text-[10px] border border-destructive/10 group active:scale-95"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Navbar */}
        <header className="h-20 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40 bg-background/50 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="lg:hidden p-3 bg-card border rounded-2xl shadow-sm text-primary" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div ref={searchRef} className="relative w-full max-w-md hidden md:block group z-50">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder={t('nav.search_placeholder')} 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                  setShowNotifications(false);
                  setShowLangMenu(false);
                }}
                onFocus={() => {
                  setShowResults(true);
                  setShowNotifications(false);
                  setShowLangMenu(false);
                }}
                className="w-full bg-card/50 backdrop-blur-sm border-2 border-transparent border-b-primary/5 hover:border-b-primary/20 rounded-2xl py-3 pl-12 pr-4 text-sm focus:bg-card focus:border-primary/20 focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
              />

              {/* Search Results Dropdown */}
              {showResults && searchQuery.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-card border rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[450px] overflow-y-auto">
                  <div className="p-2 border-b flex justify-between items-center bg-muted/30">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">{t('nav.search_results')}</span>
                    <button onClick={() => setShowResults(false)} className="p-1 hover:bg-muted rounded-full">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="p-2 space-y-4">
                    {/* Projects Section */}
                    {searchResults.projects.length > 0 && (
                      <div className="space-y-1">
                        <p className="px-3 text-[10px] font-black uppercase text-primary/60 tracking-widest">{t('nav.projects')}</p>
                        {searchResults.projects.map((p, i) => (
                          <button 
                            key={`search-result-project-${p.id || `idx-${i}`}-${i}`}
                            onClick={() => {
                              navigate(user.role === 'ADMIN' ? '/registry' : '/');
                              setShowResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-xl transition-all text-left group"
                          >
                            <div className="w-8 h-8 bg-amber-500/10 text-amber-500 rounded-lg flex items-center justify-center">
                              <Folder className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{p.status}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Users Section */}
                    {searchResults.users.length > 0 && (
                      <div className="space-y-1">
                        <p className="px-3 text-[10px] font-black uppercase text-primary/60 tracking-widest">{t('nav.members_friends')}</p>
                        {searchResults.users.map((u, i) => (
                          <button 
                            key={`search-result-user-${u.id || `idx-${i}`}-${i}`}
                            onClick={() => {
                              navigate(`/profile/${u.id}`);
                              setShowResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-xl transition-all text-left group"
                          >
                            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center overflow-hidden">
                              {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <UserIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter font-black">{u.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Documents Section */}
                    {searchResults.documents.length > 0 && (
                      <div className="space-y-1">
                        <p className="px-3 text-[10px] font-black uppercase text-primary/60 tracking-widest">{t('nav.documents')}</p>
                        {searchResults.documents.map((d, i) => (
                          <button 
                            key={`search-result-doc-${d.id || `idx-${i}`}-${i}`}
                            onClick={() => {
                              navigate('/documents');
                              setShowResults(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-xl transition-all text-left group"
                          >
                            <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                              <FileBox className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{d.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">{d.type}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.projects.length === 0 && searchResults.users.length === 0 && searchResults.documents.length === 0 && (
                      <div className="p-8 text-center bg-muted/20 rounded-2xl">
                        <p className="text-xs text-muted-foreground">{t('nav.no_results', { query: searchQuery })}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-accent text-foreground transition-all"
          title={t('common.toggle_theme')}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div ref={notifRef} className="relative z-50">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowLangMenu(false);
                  setShowResults(false);
                }}
                className="p-2 rounded-full hover:bg-accent text-foreground relative transition-all active:scale-90"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive text-[10px] font-black text-white rounded-full flex items-center justify-center animate-pulse border-2 border-card">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-card border rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest">{t('nav.notifications')}</h3>
                      <p className="text-[10px] text-muted-foreground">{t('nav.notifications_count', { count: notifications.filter(n => !n.read).length })}</p>
                    </div>
                    <button 
                      onClick={() => dbService.markAllNotificationsAsRead(user.id)}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      {t('nav.mark_all_read')}
                    </button>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n, i) => (
                        <button 
                          key={`notif-pop-${n.id || `idx-${i}`}-${i}`}
                          onClick={async () => {
                            await dbService.markNotificationAsRead(n.id);
                            if (n.link) navigate(n.link);
                            setShowNotifications(false);
                          }}
                          className={cn(
                            "w-full p-4 flex gap-3 text-left hover:bg-muted transition-all border-b last:border-0 font-sans",
                            !n.read && "bg-primary/5"
                          )}
                        >
                          <div className="shrink-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border">
                              {n.senderAvatar ? (
                                <img src={n.senderAvatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="font-bold text-primary">{n.senderName.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1">
                              <p className="text-xs font-bold truncate">{n.senderName}</p>
                              <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                                {n.timestamp?.toDate ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true, locale: i18n.language === 'fr' ? fr : i18n.language === 'ar' ? arMA : enUS }) : t('common.just_now')}
                              </span>
                            </div>
                            <p className="text-[11px] text-foreground/80 line-clamp-2 mt-0.5 leading-snug">{n.content}</p>
                          </div>
                          {!n.read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 self-start shrink-0" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-12 text-center opacity-50">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-xs">{t('nav.no_notifications')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/messages')}
              className="p-2 rounded-full hover:bg-accent text-foreground hidden sm:block transition-all active:scale-90"
              title={t('nav.messages')}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-border mx-1" />
            <Link to="/profile" className="flex items-center gap-3 pl-2 group">
              <div className="text-right hidden lg:block text-foreground">
                <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{user.name}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize font-bold tracking-tight">{user.role}</p>
              </div>
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-sm">
                {user.avatar ? (
                  <img 
                    key={user.avatar.substring(0, 100)} // Key helps force refresh
                    src={user.avatar} 
                    className="w-full h-full object-cover" 
                    alt={user.name}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-sm">{user.name.charAt(0)}</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
