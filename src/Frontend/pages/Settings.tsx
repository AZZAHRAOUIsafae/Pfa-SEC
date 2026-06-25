import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Camera, 
  Save, 
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  LogOut,
  Globe,
  Ban,
  Users,
  ChevronRight,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  AlertCircle,
  Search,
  MessageSquare
} from 'lucide-react';
import { User } from '../../Backend/types';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../Backend/lib/utils';
import { dbService } from '../../Backend/services/db';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../Backend/lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Country, City } from 'country-state-city';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

type TabType = 'profile' | 'security' | 'privacy' | 'network' | 'history' | 'blacklist';

export default function Settings({ user, onUpdate, onLogout }: SettingsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  // ... rest of state
  const [bannedUsers, setBannedUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user.role === 'ADMIN' && activeTab === 'blacklist') {
      const fetchBanned = async () => {
        const allUsers = await dbService.getAllUsers(user.company);
        setBannedUsers(allUsers.filter(u => u.isBanned));
      };
      fetchBanned();
    }
  }, [user.role, activeTab]);

  const handleUnban = async (uid: string) => {
    await dbService.banUser(uid, false);
    setBannedUsers(prev => prev.filter(u => u.id !== uid));
  };
  // Use explicit dependencies to avoid stale closures
  const [formData, setFormData] = useState<User>(() => {
    let code = user.inviteCode;
    if (user.role === 'ADMIN' && (!code || code.trim() === '')) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      const prefix = user.company ? user.company.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7) : 'CAB';
      code = `${prefix || 'CAB'}-${rand}`;
    }
    return {
      ...user,
      country: user.country || 'Morocco',
      city: user.city || '',
      age: user.age || 18,
      phone: user.phone || '',
      address: user.address || '',
      company: user.company || '',
      onigtNumber: user.onigtNumber || '',
      ice: user.ice || '',
      ifNum: user.ifNum || '',
      rc: user.rc || '',
      patente: user.patente || '',
      bio: user.bio || '',
      inviteCode: code
    };
  });

  // Sync formData with user prop if it changes from outside
  useEffect(() => {
    if (user) {
      setFormData(prev => {
        // Only update fields that are actually different to prevent unnecessary re-renders or losing focus
        const updated = { ...prev };
        let hasChanges = false;

        const fieldsToSync: (keyof User)[] = ['name', 'avatar', 'phone', 'age', 'country', 'city', 'address', 'company', 'onigtNumber', 'ice', 'ifNum', 'rc', 'patente', 'bio', 'isTwoFactorEnabled', 'blockedUids', 'loginHistory', 'inviteCode'];
        
        fieldsToSync.forEach(field => {
          if (user[field] !== undefined && user[field] !== prev[field]) {
            (updated as any)[field] = user[field];
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }
  }, [user]);

  const [isSaved, setIsSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [isPwdChanging, setIsPwdChanging] = useState(false);
  const [showTfaSetup, setShowTfaSetup] = useState(false);
  const [tfaStep, setTfaStep] = useState(1);
  const [setupCode, setSetupCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [tfaError, setTfaError] = useState('');
  const [otpPreviewUrl, setOtpPreviewUrl] = useState<string>('');
  const [otpWarning, setOtpWarning] = useState<string>('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const startTfaSetup = async () => {
    setIsSendingCode(true);
    setTfaError('');
    setOtpPreviewUrl('');
    setOtpWarning('');
    try {
      // 1. Generate and save the 6-digit secure code in Firestore
      const code = await dbService.generateAndSaveAdminOTP(user.id, user.email);
      
      // 2. Call backend secure endpoint to dispatch a real email
      const response = await fetch('/api/otp/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          code,
          name: user.name || 'Utilisateur',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email via backend API');
      }

      const resData = await response.json();
      console.log('[Settings 2FA] Email dispatch success:', resData);

      if (resData.previewUrl) {
        setOtpPreviewUrl(resData.previewUrl);
      }
      if (resData.warning) {
        setOtpWarning(resData.warning);
      }

      // 3. Update states
      setResendCooldown(30);
      setShowTfaSetup(true);
      setTfaStep(2); // Go directly to verification code entry step
    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      setTfaError(i18n.language === 'ar' ? 'فشل إرسال رمز التحقق.' : i18n.language === 'en' ? 'Failed to send verification code.' : 'Échec de l\'envoi du code de vérification.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const finishTfaSetup = async () => {
    setTfaError('');
    try {
      const verifyRes = await dbService.verifyAdminOTP(user.id, setupCode);
      if (verifyRes.success) {
        const newState = true;
        setFormData({ ...formData, isTwoFactorEnabled: newState });
        await dbService.updateUser(user.id, { isTwoFactorEnabled: newState });
        onUpdate({ ...user, isTwoFactorEnabled: newState });
        setShowTfaSetup(false);
        setTfaStep(1);
        setSetupCode('');
      } else {
        if (verifyRes.error === 'OTP_EXPIRED') {
          setTfaError(i18n.language === 'ar' ? 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'The verification code has expired. Please request a new one.' : 'Le code d\'authentification a expiré. Veuillez en générer un nouveau.');
        } else if (verifyRes.error === 'OTP_MAX_ATTEMPTS') {
          setTfaError(i18n.language === 'ar' ? 'تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'Max attempts exceeded (3/3). Please request a new code.' : 'Nombre maximal de tentatives dépassé (3/3). Veuillez demander un nouveau code.');
        } else if (verifyRes.error === 'OTP_NOT_FOUND') {
          setTfaError(i18n.language === 'ar' ? 'رمز غير موجود. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'Code not found. Please request a new code.' : 'Code non trouvé. Veuillez générer un nouveau code.');
        } else {
          setTfaError(t('login.invalid_code') || "Code de vérification invalide.");
        }
      }
    } catch (err: any) {
      console.error("Failed to verify 2FA setup:", err);
      setTfaError(t('login.invalid_code') || "Code de vérification invalide.");
    }
  };

  // Real data state
  const [topographers, setTopographers] = useState<User[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering
  const filteredTopographers = topographers.filter(topo => 
    topo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topo.company && topo.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all topographers
      const topos = await dbService.getTopographers(user.company);
      setTopographers(topos);

      // Fetch blocked profiles individually
      if (user.blockedUids && user.blockedUids.length > 0) {
        const profiles = await Promise.all(
          user.blockedUids.map(uid => dbService.getUser(uid))
        );
        setBlockedProfiles(profiles.filter((u): u is User => u !== null));
      }
    };
    fetchData();
  }, [user.blockedUids]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      alert('Le nom est obligatoire.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }

    const phoneRegex = /^(06|07)[0-9]{8}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      alert('Le numéro de téléphone doit commencer par 06 ou 07 et comporter exactement 10 chiffres.');
      return;
    }

    const ageNum = parseInt(String(formData.age)) || 0;
    if (ageNum < 18) {
      alert('Désolé, vous devez avoir au moins 18 ans.');
      return;
    }

    if (!formData.country || !formData.city) {
      alert('Le pays et la ville sont obligatoires.');
      return;
    }

    // Filter out immutable or internal fields to avoid security rule rejection
    const { id, email, role, createdAt, uid, loginHistory, blockedUids, ...updateData } = formData;
    
    // Ensure numeric types and clean data
    const ageValue = parseInt(String(formData.age));
    const finalUpdateData = {
      ...updateData,
      age: isNaN(ageValue) ? 18 : ageValue,
      phone: formData.phone || '',
      country: formData.country || 'Morocco',
      city: formData.city || '',
      address: formData.address || '',
      company: formData.company || '',
      onigtNumber: formData.onigtNumber || '',
      ice: formData.ice || '',
      ifNum: formData.ifNum || '',
      rc: formData.rc || '',
      patente: formData.patente || '',
      inviteCode: formData.inviteCode || '',
    };
    
    try {
      await dbService.updateUser(user.id, finalUpdateData);
      
      // Update parent state with merged data
      const updatedUser = { 
        ...user, 
        ...formData, 
        age: isNaN(ageValue) ? 18 : ageValue 
      };
      
      onUpdate(updatedUser);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Erreur lors de la mise à jour du profil.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwords.current || !passwords.new) return;
    setPwdError('');
    setPwdSuccess(false);
    setIsPwdChanging(true);

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwords.current);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, passwords.new);
      setPwdSuccess(true);
      setPasswords({ current: '', new: '' });
    } catch (err: any) {
      setPwdError(err.message || 'Erreur lors du changement de mot de passe. Vérifiez votre mot de passe actuel.');
    } finally {
      setIsPwdChanging(false);
    }
  };

  const handleUnblock = async (uid: string) => {
    const newBlocked = user.blockedUids?.filter(id => id !== uid) || [];
    const updatedUser = { ...user, blockedUids: newBlocked };
    await dbService.updateUser(user.id, { blockedUids: newBlocked });
    onUpdate(updatedUser);
  };

  const handleBlock = async (uid: string) => {
    const newBlocked = [...(user.blockedUids || []), uid];
    const updatedUser = { ...user, blockedUids: newBlocked };
    await dbService.updateUser(user.id, { blockedUids: newBlocked });
    onUpdate(updatedUser);
  };

  const { t, i18n } = useTranslation();

  const menuItems = [
    { id: 'profile', label: t('settings.menu.profile'), icon: UserIcon },
    { id: 'security', label: t('settings.menu.security'), icon: Shield },
    { id: 'history', label: t('settings.menu.history'), icon: Globe },
    { id: 'privacy', label: t('settings.menu.privacy'), icon: Ban },
    ...(user.role === 'ADMIN' ? [{ id: 'blacklist', label: t('settings.menu.blacklist'), icon: Shield }] : []),
    { id: 'network', label: t('settings.menu.network'), icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 text-destructive border border-destructive/20 bg-destructive/5 rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-all font-bold"
        >
          <LogOut className="w-4 h-4" />
          {t('common.logout')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Menu */}
        <div className="space-y-2">
          {menuItems.map((item, i) => (
            <button
              key={`settings-menu-${item.id || `idx-${i}`}-${i}`}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 opacity-0 transition-all", activeTab === item.id ? "opacity-100 translate-x-1" : "")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border rounded-2xl p-6 md:p-8"
            >
              {activeTab === 'profile' && (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted border-2 border-background shadow-lg">
                        {formData.avatar ? (
                          <img src={formData.avatar} className="w-full h-full object-cover" alt="Avatar" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-10 h-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <input 
                        type="file"
                        id="avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = reader.result as string;
                              const updatedUser = { ...formData, avatar: base64 };
                              setFormData(updatedUser);
                              // Immediate save for avatar
                              await dbService.updateUser(user.id, { avatar: base64 });
                              onUpdate(updatedUser);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{formData.name}</h3>
                      <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.full_name')}</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.phone')}</label>
                      <input 
                        type="tel" 
                        value={formData.phone || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="0612345678"
                        className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.country')}</label>
                      <select
                        value={Country.getAllCountries().find(c => c.name === formData.country || c.isoCode === formData.country)?.isoCode || 'MA'}
                        onChange={e => {
                          const c = Country.getCountryByCode(e.target.value);
                          setFormData({ ...formData, country: c?.name || '', city: '' });
                        }}
                        className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                      >
                        {Country.getAllCountries().map((c, i) => (
                          <option key={`set-country-${c.isoCode}-${i}`} value={c.isoCode}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.city')}</label>
                      <select
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                      >
                        <option value="">{t('common.select_city')}</option>
                        {City.getCitiesOfCountry(Country.getAllCountries().find(c => c.name === formData.country || c.isoCode === formData.country)?.isoCode || 'MA')?.map((c, idx) => (
                          <option key={`set-city-${c.name}-${idx}`} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {user.role !== 'CLIENT' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.company')}</label>
                          <input 
                            type="text" 
                            value={formData.company || ''}
                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: TopoGeo Maroc"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">N° d'inscription au Tableau de l'Ordre (ONIGT)</label>
                          <input 
                            type="text" 
                            value={formData.onigtNumber || ''}
                            onChange={e => setFormData({ ...formData, onigtNumber: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: 1234 (Agréé ONIGT Maroc)"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ICE (Identifiant Commun de l'Entreprise)</label>
                          <input 
                            type="text" 
                            value={formData.ice || ''}
                            onChange={e => setFormData({ ...formData, ice: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: 001546789000085"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Identifiant Fiscal (I.F.)</label>
                          <input 
                            type="text" 
                            value={formData.ifNum || ''}
                            onChange={e => setFormData({ ...formData, ifNum: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: 40234567"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Registre du Commerce (R.C.)</label>
                          <input 
                            type="text" 
                            value={formData.rc || ''}
                            onChange={e => setFormData({ ...formData, rc: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: Casa 543210"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Patente (Taxe Professionnelle)</label>
                          <input 
                            type="text" 
                            value={formData.patente || ''}
                            onChange={e => setFormData({ ...formData, patente: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                            placeholder="Ex: 31204560"
                          />
                        </div>
                      </>
                    )}
                    {user.role === 'ADMIN' && (
                      <div className="space-y-2 md:col-span-2 bg-primary/5 dark:bg-white/5 border border-primary/10 p-5 rounded-2xl">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-primary">Code d'invitation Topographe</label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Partagez ce code avec vos topographes pour qu'ils s'associent automatiquement à votre cabinet lors de leur inscription.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const rand = Math.floor(1000 + Math.random() * 9000);
                              const prefix = formData.company ? formData.company.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7) : 'CAB';
                              setFormData({ ...formData, inviteCode: `${prefix || 'CAB'}-${rand}` });
                            }}
                            className="text-xs text-primary font-black uppercase hover:underline shrink-0"
                          >
                            Générer nouveau
                          </button>
                        </div>
                        <div className="relative mt-2">
                          <input 
                            type="text" 
                            readOnly
                            value={formData.inviteCode || ''}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            className="w-full bg-muted/60 border border-muted-foreground/10 rounded-xl p-3 text-sm font-mono tracking-wider focus:outline-none cursor-pointer select-all"
                            placeholder="Code d'invitation"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold">Clic pour sélectionner</span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('settings.profile.age')}</label>
                      <input 
                        type="number" 
                        value={formData.age || ''}
                        onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                        className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {user.role === 'CLIENT' ? t('settings.profile.address_personal') : t('settings.profile.address_professional')}
                    </label>
                    <textarea 
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-muted/50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none h-24 resize-none"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t">
                    <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                      {isSaved && (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {t('settings.profile.saved')}
                        </>
                      )}
                    </div>
                    <button type="submit" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:opacity-90 transition-all">
                      <Save className="w-4 h-4" /> {t('common.save')}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-dashed flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('login.last_login')}</p>
                        <p className="text-sm font-black">
                          {user.loginHistory && user.loginHistory.length > 1 
                            ? `${user.loginHistory[1].location} • ${new Date(user.loginHistory[1].timestamp).toLocaleString()}`
                            : t('common.just_now')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{t('admin.logs.device')}</p>
                      <p className="text-xs font-medium">{user.lastDeviceInfo?.device || 'Unknown'}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-4">{t('settings.security.change_password')}</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      {pwdError && (
                        <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {pwdError}
                        </div>
                      )}
                      {pwdSuccess && (
                        <div className="p-3 bg-green-500/10 text-green-600 text-xs rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('settings.security.password_success')}
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{t('settings.security.current_password')}</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            required
                            type="password" 
                            value={passwords.current}
                            onChange={e => setPasswords({ ...passwords, current: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{t('settings.security.new_password')}</label>
                          {passwords.new && (
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                              passwords.new.length < 6 ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                            )}>
                              {passwords.new.length < 6 ? t('settings.security.strength_weak') : t('settings.security.strength_strong')}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input 
                            required
                            type={showPassword ? "text" : "password"} 
                            value={passwords.new}
                            onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full bg-muted/50 border-none rounded-xl py-2.5 pl-10 pr-12 text-sm focus:ring-2 focus:ring-primary outline-none" 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <button 
                        disabled={isPwdChanging}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm w-full mt-4 disabled:opacity-50 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        {isPwdChanging ? t('common.updating') : t('settings.security.update_password_button')}
                      </button>
                    </form>
                  </div>

                  <div className="pt-8 border-t relative">
                    <h3 className="text-lg font-bold mb-4">{t('settings.security.2fa.title')}</h3>
                    <div className="flex items-center justify-between p-6 bg-muted/30 rounded-2xl border">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", (user.role === 'ADMIN' || formData.isTwoFactorEnabled) ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground")}>
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold">{t('settings.security.2fa.method')}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.role === 'ADMIN' 
                              ? (i18n.language === 'ar' ? 'حماية إضافية إجبارية للمسؤولين عبر البريد الإلكتروني.' : i18n.language === 'en' ? 'Mandatory email-based security verification for Administrators.' : 'Protection email obligatoire et renforcée pour les comptes de Cabinet Administrateur.')
                              : t('settings.security.2fa.description')}
                          </p>
                        </div>
                      </div>
                      {user.role === 'ADMIN' ? (
                        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-500/20">
                          {i18n.language === 'ar' ? 'مفعل (مطلوب)' : i18n.language === 'en' ? 'Enabled (Required)' : 'Activé (Obligatoire)'}
                        </div>
                      ) : (
                        <button 
                          onClick={async () => {
                            if (formData.isTwoFactorEnabled) {
                              const newState = false;
                              setFormData({ ...formData, isTwoFactorEnabled: newState });
                              await dbService.updateUser(user.id, { isTwoFactorEnabled: newState });
                              onUpdate({ ...user, isTwoFactorEnabled: newState });
                            } else {
                              await startTfaSetup();
                            }
                          }}
                          disabled={isSendingCode}
                          className={cn(
                            "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                            formData.isTwoFactorEnabled 
                              ? "bg-primary text-white" 
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          )}
                        >
                          {isSendingCode ? t('login.sending') : formData.isTwoFactorEnabled ? t('common.deactivate') : t('common.activate')}
                        </button>
                      )}
                    </div>

                    <AnimatePresence>
                      {showTfaSetup && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden max-h-[min(720px,92vh)] flex flex-col"
                          >
                            <div className="p-6 border-b flex items-center justify-between shrink-0">
                              <h3 className="font-black text-lg">
                                {i18n.language === 'ar' ? 'تفعيل التحقق بخطوتين (2FA)' : i18n.language === 'en' ? 'Enable Two-Factor Authentication' : 'Activer la Double Authentification'}
                              </h3>
                              <button onClick={() => setShowTfaSetup(false)} className="p-2 hover:bg-muted rounded-xl transition-all">
                                <Search className="w-5 h-5 rotate-45" />
                              </button>
                            </div>
                            <div className="p-8 space-y-6 overflow-y-auto flex-1">
                              <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                                  <ShieldCheck className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                  <p className="font-bold text-sm">
                                    {i18n.language === 'ar' ? 'أدخل رمز التحقق' : i18n.language === 'en' ? 'Enter Verification Code' : 'Saisissez votre code de vérification'}
                                  </p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {i18n.language === 'ar' 
                                      ? `لقد أرسلنا رمز تحقق مكونًا من 6 أرقام إلى بريدك الإلكتروني: ${user.email}` 
                                      : i18n.language === 'en' 
                                        ? `We have sent a 6-digit secure verification code to your email address: ${user.email}` 
                                        : `Nous venons de vous envoyer un code de vérification sécurisé à 6 chiffres à l'adresse e-mail : ${user.email}`}
                                  </p>
                                </div>
                              </div>

                              {tfaError && (
                                <div className="text-destructive text-xs font-semibold bg-destructive/10 p-3 rounded-xl border border-destructive/20 flex items-center justify-center gap-2">
                                  <AlertCircle className="w-4 h-4 shrink-0" />
                                  <span>{tfaError}</span>
                                </div>
                              )}

                              <input 
                                type="text" 
                                maxLength={6}
                                value={setupCode}
                                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full bg-muted border-none rounded-xl py-4 text-center text-2xl font-black tracking-widest focus:ring-2 focus:ring-primary outline-none"
                              />

                              {otpWarning && (
                                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs rounded-xl flex items-start gap-2 border border-amber-500/20 leading-relaxed text-left">
                                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  <span>{otpWarning}</span>
                                </div>
                              )}

                              {otpPreviewUrl && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-2">
                                  <p className="text-xs text-muted-foreground font-medium">
                                    {i18n.language === 'ar' ? 'نمط التجريب: تم إرسال الرمز إلى صندوق بريد افتراضي' : i18n.language === 'en' ? 'Demo Mode: OTP sent to virtual developer mailbox' : 'Mode Démo/Secours : l\'e-mail a été envoyé à une boîte aux lettres de test'}
                                  </p>
                                  <a 
                                    href={otpPreviewUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-black px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    {i18n.language === 'ar' ? 'عرض البريد الإلكتروني المستلم' : i18n.language === 'en' ? 'Open Received Email' : 'Ouvrir l\'e-mail reçu'}
                                  </a>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs px-1">
                                <span className="text-muted-foreground">
                                  {i18n.language === 'ar' ? 'لم تستلم الرمز؟' : i18n.language === 'en' ? 'Didn\'t receive the code?' : 'Vous n\'avez pas reçu le code ?'}
                                </span>
                                <button
                                  type="button"
                                  onClick={startTfaSetup}
                                  disabled={isSendingCode || resendCooldown > 0}
                                  className="font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  {isSendingCode 
                                    ? t('login.sending') 
                                    : resendCooldown > 0 
                                      ? `${i18n.language === 'ar' ? 'إعادة الإرسال' : i18n.language === 'en' ? 'Resend' : 'Renvoyer'} (${resendCooldown}s)` 
                                      : (i18n.language === 'ar' ? 'إعادة إرسال' : i18n.language === 'en' ? 'Resend' : 'Renvoyer le code')}
                                </button>
                              </div>

                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => setShowTfaSetup(false)}
                                  className="flex-1 px-4 py-3 border rounded-xl text-sm font-bold hover:bg-muted"
                                >
                                  {t('common.cancel')}
                                </button>
                                <button 
                                  onClick={finishTfaSetup}
                                  disabled={setupCode.length !== 6}
                                  className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                  {t('settings.security.2fa.verify_btn')}
                                </button>
                              </div>
                            </div>
                            <div className="p-6 bg-muted/30 border-t text-center shrink-0">
                              <p className="text-[10px] text-muted-foreground leading-relaxed">
                                {i18n.language === 'ar' 
                                  ? 'هذا الرمز صالح لمدة 5 دقائق وبحد أقصى 3 محاولات.' 
                                  : i18n.language === 'en' 
                                    ? 'This secure code is valid for 5 minutes with a maximum of 3 entry attempts.' 
                                    : 'Ce code de sécurité est valide pendant 5 minutes avec un maximum de 3 tentatives de saisie.'}
                              </p>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold">{t('settings.history.title')}</h3>
                  <div className="space-y-3">
                    {user.loginHistory && user.loginHistory.length > 0 ? user.loginHistory.map((item, idx) => (
                      <div key={`login-hist-${item.id || `idx-${idx}`}-${idx}`} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-3 rounded-xl", idx === 0 ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground")}>
                            {item.device.toLowerCase().includes('phone') || item.device.toLowerCase().includes('mobile') || item.device.toLowerCase().includes('iphone') || item.device.toLowerCase().includes('android') ? (
                              <Smartphone className="w-6 h-6" />
                            ) : item.device.toLowerCase().includes('windows') || item.device.toLowerCase().includes('mac') || item.device.toLowerCase().includes('desktop') ? (
                              <Globe className="w-6 h-6" />
                            ) : (
                              <Shield className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">{item.location}</p>
                              {idx === 0 && <span className="bg-green-500/20 text-green-600 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">{t('settings.history.current')}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{item.device} • {new Date(item.timestamp).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'en' ? 'en-US' : 'fr-FR')}</p>
                          </div>
                        </div>
                        {idx !== 0 && (
                          <button className="text-destructive text-sm font-bold hover:underline">{t('settings.history.disconnect')}</button>
                        )}
                      </div>
                    )) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-2xl border-2 border-dashed">
                        <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>{t('settings.history.no_history')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{t('settings.privacy.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('settings.privacy.desc')}</p>
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder={t('settings.privacy.block_placeholder')}
                        className="w-full bg-muted/50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            const found = topographers.find(t => t.name.toLowerCase() === val.toLowerCase());
                            if (found && !user.blockedUids?.includes(found.id)) {
                              await handleBlock(found.id);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {blockedProfiles.length > 0 ? blockedProfiles.map((item, i) => (
                      <div key={`blocked-prof-${item.id || `idx-${i}`}-${i}`} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                        <div className="flex items-center gap-4">
                          {item.avatar ? (
                            <img src={item.avatar} className="w-10 h-10 rounded-full object-cover" alt={item.name} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                              <UserIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnblock(item.id)}
                          className="px-4 py-2 text-xs font-bold border border-destructive/20 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-all"
                        >
                          {t('settings.privacy.unblock')}
                        </button>
                      </div>
                    )) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-2xl border-2 border-dashed">
                        <Ban className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>{t('settings.privacy.no_blocked')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'blacklist' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{t('settings.blacklist.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('settings.blacklist.desc')}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {bannedUsers.length > 0 ? bannedUsers.map((item, i) => (
                      <div key={`banned-global-user-${item.id || `idx-${i}`}-${i}`} className="flex items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-black">
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold flex items-center gap-2">
                              {item.name} 
                              <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">{t('settings.blacklist.banned')}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{item.email} • {item.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnban(item.id)}
                          className="px-4 py-2 text-xs font-bold bg-white border border-red-500/20 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          {t('settings.blacklist.reactivate')}
                        </button>
                      </div>
                    )) : (
                      <div className="text-center py-20 text-muted-foreground bg-muted/5 rounded-3xl border-2 border-dashed">
                        <ShieldCheck className="w-16 h-16 mx-auto mb-4 opacity-10" />
                        <p className="text-lg font-bold">{t('settings.blacklist.no_banned')}</p>
                        <p className="text-sm opacity-60">{t('settings.blacklist.healthy')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'network' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{t('settings.network.title')}</h3>
                      <p className="text-sm text-muted-foreground">{t('settings.network.desc')}</p>
                    </div>
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('common.search_expert') || "Rechercher un expert..."} 
                        className="w-full bg-muted/50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTopographers.length > 0 ? filteredTopographers.map((topo, i) => (
                      <div key={`topo-card-res-${topo.id || `idx-${i}`}-${i}`} className="p-4 bg-card border rounded-2xl flex items-center justify-between hover:shadow-md transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-inner bg-muted">
                            {topo.avatar ? (
                              <img src={topo.avatar} className="w-full h-full object-cover" alt={topo.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold group-hover:text-primary transition-colors">{topo.name}</p>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{topo.company || 'Indépendant'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {user.role === 'CLIENT' && (
                            <button 
                              onClick={() => navigate('/messages', { state: { selectedRecipientId: topo.id } })}
                              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                              title="Envoyer un message"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                          {user.blockedUids?.includes(topo.id) ? (
                            <button 
                              onClick={() => handleUnblock(topo.id)}
                              className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-all shadow-sm"
                              title="Débloquer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleBlock(topo.id)}
                              className="p-2 bg-muted hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                              title="Bloquer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full text-center py-12 text-muted-foreground italic">
                        {t('common.no_expert_found', { query: searchQuery })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
