import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User as UserIcon, 
  Mail, 
  Lock, 
  Check, 
  X, 
  Map, 
  ArrowRight,
  Shield,
  Phone, 
  MapPin, 
  Globe,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { User, UserRole } from '../../Backend/types';
import { motion } from 'motion/react';
import { cn } from '../../Backend/lib/utils';
import { Country, City } from 'country-state-city';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../Backend/lib/firebase';
import { dbService } from '../../Backend/services/db';

interface RegisterProps {
  onRegister: (user: User) => void;
}

export default function Register({ onRegister }: RegisterProps) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'CLIENT' as UserRole,
    password: '',
    confirmPassword: '',
    phone: '',
    country: 'MA',
    city: '',
    age: '',
    adminId: '' as string | undefined,
    adminEmail: ''
  });
  const [strength, setStrength] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [topoJoinMethod, setTopoJoinMethod] = useState<'SELECT' | 'CODE'>('SELECT');
  const [selectedCompanyAdminId, setSelectedCompanyAdminId] = useState('');
  const [enteredInviteCode, setEnteredInviteCode] = useState('');

  const getTranslation = (key: string) => {
    const lang = i18n.language || 'fr';
    const dict: Record<string, Record<string, string>> = {
      choose_method: {
        fr: "Méthode d'association",
        en: "Association Method",
        ar: "طريقة الربط"
      },
      select_company: {
        fr: "Sélectionner la société",
        en: "Select Company",
        ar: "اختر الشركة"
      },
      invite_code: {
        fr: "Code d'invitation",
        en: "Invitation Code",
        ar: "رمز الدعوة"
      },
      select_company_placeholder: {
        fr: "Sélectionnez votre entreprise/cabinet",
        en: "Select your company/cabinet",
        ar: "اختر شركتك أو مكتبك"
      },
      invite_code_placeholder: {
        fr: "Entrez le code d'invitation",
        en: "Enter invitation code",
        ar: "أدخل رمز الدعوة"
      },
      invite_code_tip: {
        fr: "Le code d'invitation est fourni par votre administrateur (généré dans ses paramètres de profil).",
        en: "The invitation code is provided by your administrator (generated in their profile settings).",
        ar: "يتم توفير رمز الدعوة بواسطة المسؤول الخاص بك (يتم إنشاؤه في إعدادات ملفه الشخصي)."
      },
      invalid_code: {
        fr: "Code d'invitation invalide ou entreprise introuvable.",
        en: "Invalid invitation code or company not found.",
        ar: "رمز الدعوة غير صالح أو الشركة غير موجودة."
      },
      missing_company: {
        fr: "Veuillez sélectionner votre société ou entrer un code d'invitation valide.",
        en: "Please select your company or enter a valid invitation code.",
        ar: "يرجى اختيار شركتك أو إدخال رمز دعوة صحيح."
      }
    };
    const currentDict = dict[key] || {};
    return currentDict[lang] || currentDict['fr'] || '';
  };

  const [admins, setAdmins] = useState<User[]>([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      const list = await dbService.getAdmins();
      setAdmins(list);
    };
    fetchAdmins();
  }, []);

  const handleGoogleRegister = async () => {
    setError('');
    
    let resolvedAdminId = '';
    let resolvedAdminEmail = '';
    let resolvedCompanyName = '';

    if (formData.role === 'TOPOGRAPHER') {
      if (topoJoinMethod === 'SELECT') {
        if (!selectedCompanyAdminId) {
          setError(getTranslation('missing_company'));
          return;
        }
        const foundAdmin = admins.find(a => a.id === selectedCompanyAdminId);
        if (!foundAdmin) {
          setError(getTranslation('invalid_code'));
          return;
        }
        resolvedAdminId = foundAdmin.id;
        resolvedAdminEmail = foundAdmin.email;
        resolvedCompanyName = foundAdmin.company || '';
      } else {
        if (!enteredInviteCode.trim()) {
          setError(getTranslation('missing_company'));
          return;
        }
        const foundAdmin = admins.find(a => a.inviteCode && a.inviteCode.toString().trim().toUpperCase() === enteredInviteCode.trim().toUpperCase());
        if (!foundAdmin) {
          setError(getTranslation('invalid_code'));
          return;
        }
        resolvedAdminId = foundAdmin.id;
        resolvedAdminEmail = foundAdmin.email;
        resolvedCompanyName = foundAdmin.company || '';
      }
    }

    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const profile = await dbService.getUser(userCredential.user.uid);
      
      const loginInfo = {
        location: 'Maroc',
        device: navigator.userAgent.split(') ')[1] || 'Web Browser'
      };

      if (profile) {
        await dbService.logLogin(profile.id, loginInfo);
        onRegister(profile);
        navigate('/');
      } else {
        const newUser: User = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || 'User',
          role: formData.role, // Use the selected role
          adminEmail: resolvedAdminEmail,
          adminId: resolvedAdminId,
          company: resolvedCompanyName,
          blockedUids: [],
          loginHistory: [],
          language: i18n.language || 'fr'
        };
        await dbService.createUser(newUser);
        onRegister(newUser);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let score = 0;
    if (formData.password.length >= 8) score++;
    if (/[A-Z]/.test(formData.password)) score++;
    if (/[0-9]/.test(formData.password)) score++;
    if (/[^A-Za-z0-9]/.test(formData.password)) score++;
    setStrength(score);
  }, [formData.password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('register.invalid_email'));
      return;
    }

    const phoneRegex = /^(06|07)[0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError(t('register.invalid_phone'));
      return;
    }

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone || !formData.city || !formData.age) {
      setError(t('register.missing_fields'));
      return;
    }

    const ageNum = parseInt(formData.age);
    if (isNaN(ageNum) || ageNum < 18) {
      setError(t('register.underage_error'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('register.password_mismatch'));
      return;
    }
    
    let resolvedAdminId = '';
    let resolvedAdminEmail = '';
    let resolvedCompanyName = '';

    if (formData.role === 'TOPOGRAPHER') {
      if (topoJoinMethod === 'SELECT') {
        if (!selectedCompanyAdminId) {
          setError(getTranslation('missing_company'));
          return;
        }
        const foundAdmin = admins.find(a => a.id === selectedCompanyAdminId);
        if (!foundAdmin) {
          setError(getTranslation('invalid_code'));
          return;
        }
        resolvedAdminId = foundAdmin.id;
        resolvedAdminEmail = foundAdmin.email;
        resolvedCompanyName = foundAdmin.company || '';
      } else {
        if (!enteredInviteCode.trim()) {
          setError(getTranslation('missing_company'));
          return;
        }
        const foundAdmin = admins.find(a => a.inviteCode && a.inviteCode.toString().trim().toUpperCase() === enteredInviteCode.trim().toUpperCase());
        if (!foundAdmin) {
          setError(getTranslation('invalid_code'));
          return;
        }
        resolvedAdminId = foundAdmin.id;
        resolvedAdminEmail = foundAdmin.email;
        resolvedCompanyName = foundAdmin.company || '';
      }
    }

    setIsSubmitting(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      
      const newUser: User = {
        id: userCredential.user.uid,
        uid: userCredential.user.uid,
        email: formData.email.trim(),
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        age: ageNum,
        country: Country.getCountryByCode(formData.country)?.name || formData.country,
        city: formData.city,
        adminEmail: resolvedAdminEmail,
        adminId: resolvedAdminId,
        company: resolvedCompanyName,
        linkedTopographerId: null,
        blockedUids: [],
        loginHistory: [],
        isEmailVerified: false, // Flag for email verification
        language: i18n.language || 'fr'
      };

      // Send actual verification email
      try {
        await sendEmailVerification(userCredential.user);
      } catch (sendErr) {
        console.error("Failed to send verification email", sendErr);
      }

      await dbService.createUser(newUser);
      
      // Notify user about verification
      alert(t('register.verification_sent', { email: formData.email }));
      
      onRegister(newUser);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError(t('login.auth_not_enabled'));
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('register.email_in_use'));
      } else if (err.code === 'auth/weak-password') {
        setError(t('register.weak_password'));
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const strengthColor = strength === 0 ? 'bg-muted' : strength === 1 ? 'bg-red-500' : strength === 2 ? 'bg-amber-500' : strength === 3 ? 'bg-blue-500' : 'bg-green-500';
  const strengthText = strength === 0 ? t('register.strength_none') : strength === 1 ? t('register.strength_weak') : strength === 2 ? t('register.strength_fair') : strength === 3 ? t('register.strength_good') : t('register.strength_strong');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden font-sans">
      {/* Modern Background with Thematic Pattern (Sync with Login) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary/95 dark:bg-slate-950/98 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1541462608141-adbc0360ec3a?auto=format&fit=crop&q=80&w=2400" 
          alt="Modern Grid"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-accent-topo/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute inset-0 opacity-[0.15] topo-grid z-20 pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-card/60 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden z-10"
      >
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-blue-600 text-primary-foreground dark:from-white dark:to-slate-200 dark:text-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight">{t('register.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t('register.subtitle')}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-[11px] rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('register.full_name')}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Ahmed Mansouri"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('login.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="ahmed@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('settings.phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="0612345678"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('settings.country')}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value, city: ''})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                  >
                    {Country.getAllCountries().map((c, i) => (
                      <option key={`reg-country-${c.isoCode}-${i}`} value={c.isoCode}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('settings.city')}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none disabled:opacity-50"
                  >
                    <option value="">{t('register.select_city')}</option>
                    {City.getCitiesOfCountry(formData.country)?.map((c, idx) => (
                      <option key={`reg-city-${c.name}-${idx}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('register.age')}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="number" 
                    required
                    min="18"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="25"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('register.account_type')}</label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, role: 'CLIENT'})}
                  className={cn(
                    "p-3 border rounded-xl flex flex-col items-center gap-1 transition-all",
                    formData.role === 'CLIENT' ? "bg-primary border-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <UserIcon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{t('login.roles.client')}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, role: 'TOPOGRAPHER'})}
                  className={cn(
                    "p-3 border rounded-xl flex flex-col items-center gap-1 transition-all",
                    formData.role === 'TOPOGRAPHER' ? "bg-primary border-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Map className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{t('login.roles.topo')}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, role: 'ADMIN'})}
                  className={cn(
                    "p-3 border rounded-xl flex flex-col items-center gap-1 transition-all",
                    formData.role === 'ADMIN' ? "bg-primary border-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Shield className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{t('login.roles.admin')}</span>
                </button>
              </div>
            </div>

            {formData.role === 'TOPOGRAPHER' && (
              <div className="space-y-4 p-5 bg-primary/5 dark:bg-white/5 border border-primary/10 rounded-2xl">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {getTranslation('choose_method')}
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTopoJoinMethod('SELECT')}
                      className={cn(
                        "py-2 text-xs font-bold rounded-lg transition-all",
                        topoJoinMethod === 'SELECT'
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {getTranslation('select_company')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopoJoinMethod('CODE')}
                      className={cn(
                        "py-2 text-xs font-bold rounded-lg transition-all",
                        topoJoinMethod === 'CODE'
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {getTranslation('invite_code')}
                    </button>
                  </div>
                </div>

                {topoJoinMethod === 'SELECT' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {getTranslation('select_company')}
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        required
                        value={selectedCompanyAdminId}
                        onChange={(e) => setSelectedCompanyAdminId(e.target.value)}
                        className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
                      >
                        <option value="">{getTranslation('select_company_placeholder')}</option>
                        {admins
                          .filter(a => a.company && a.company.trim() !== '')
                          .map((admin, idx) => (
                            <option key={`adm-co-${admin.id}-${idx}`} value={admin.id}>
                              {admin.company}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {getTranslation('invite_code')}
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        placeholder="CAB-1234"
                        value={enteredInviteCode}
                        onChange={(e) => setEnteredInviteCode(e.target.value)}
                        className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none font-mono tracking-wider"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {getTranslation('invite_code_tip')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="password" 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {/* Strength Meter */}
                <div className="space-y-1.5">
                  <div className="flex gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step, i) => (
                      <div 
                        key={`password-step-${i}`} 
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          strength >= step ? strengthColor : "bg-muted"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex justify-between">
                    <span>{t('register.password_strength')}: <span className="font-semibold">{strengthText}</span></span>
                    <span>{t('register.min_characters')}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('register.confirm_password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="password" 
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="••••••••"
                  />
                  {formData.confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {formData.password === formData.confirmPassword ? 
                        <Check className="w-4 h-4 text-green-500" /> : 
                        <X className="w-4 h-4 text-red-500" />
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={cn(
                "w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl shadow-2xl shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base mt-4",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? t('register.submitting') : t('register.submit_btn')}
              {!isSubmitting && <ArrowRight className="w-5 h-5 bg-white/20 rounded-full p-0.5" />}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('login.google').split('with ')[0]}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 border rounded-xl hover:bg-muted/50 transition-all font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t('login.have_account')} <Link to="/login" className="text-primary font-medium hover:underline">{t('login.signin')}</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
