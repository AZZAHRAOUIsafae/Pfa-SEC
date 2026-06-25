import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertTriangle, 
  Map, 
  ArrowRight,
  Globe,
  Check
} from 'lucide-react';
import { User, UserRole } from '../../Backend/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../Backend/lib/utils';
import { useTranslation } from 'react-i18next';

interface LoginProps {
  onLogin: (user: User) => void;
}

import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../../Backend/lib/firebase';
import { dbService } from '../../Backend/services/db';

import { otpService } from '../../Backend/services/otpService';

export default function Login({ onLogin }: LoginProps) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT');
  const [showPassword, setShowPassword] = useState(false);
  const [tfaCode, setTfaCode] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTfaVerification, setShowTfaVerification] = useState(false);
  const [tempProfile, setTempProfile] = useState<User | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpPreviewUrl, setOtpPreviewUrl] = useState<string>('');
  const [otpWarning, setOtpWarning] = useState<string>('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const sendCode = async (userEmail: string, profileToUse?: User | null) => {
    if (resendCooldown > 0) return;
    setIsSendingCode(true);
    setError('');
    setOtpPreviewUrl('');
    setOtpWarning('');
    const targetProfile = profileToUse || tempProfile;
    try {
      if (!targetProfile) return;

      // 1. Generate and save the 6-digit secure code in Firestore (unified admin_otps/{userId} collection)
      const code = await dbService.generateAndSaveAdminOTP(targetProfile.id, userEmail);
      setGeneratedCode(code);

      // 2. Call backend secure endpoint to dispatch a real email
      const response = await fetch('/api/otp/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          code,
          name: targetProfile.name || 'Utilisateur',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email via backend API');
      }

      const resData = await response.json();
      console.log('[OTP CLIENT] Email dispatch success:', resData);

      if (resData.previewUrl) {
        setOtpPreviewUrl(resData.previewUrl);
      }
      if (resData.warning) {
        setOtpWarning(resData.warning);
      }

      // 3. Set a 30-second cooldown on success
      setResendCooldown(30);

    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      setError(i18n.language === 'ar' ? 'فشل إرسال رمز التحقق.' : i18n.language === 'en' ? 'Failed to send verification code.' : 'Échec de l\'envoi du code de vérification.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleTfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProfile) return;
    
    setIsSubmitting(true);
    setError('');
    try {
      // Unify verification for all roles using the secure Firestore-backed dbService.verifyAdminOTP
      const verifyRes = await dbService.verifyAdminOTP(tempProfile.id, tfaCode);
      if (verifyRes.success) {
        const loginInfo = {
          location: 'Maroc',
          device: navigator.userAgent.split(') ')[1] || 'Web Browser',
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString()
        };
        await dbService.logLogin(tempProfile.id, loginInfo);
        onLogin(tempProfile);
        navigate('/');
      } else {
        if (verifyRes.error === 'OTP_EXPIRED') {
          setError(i18n.language === 'ar' ? 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'The verification code has expired. Please request a new one.' : 'Le code d\'authentification a expiré. Veuillez en générer un nouveau.');
        } else if (verifyRes.error === 'OTP_MAX_ATTEMPTS') {
          setError(i18n.language === 'ar' ? 'تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'Max attempts exceeded (3/3). Please request a new code.' : 'Nombre maximal de tentatives dépassé (3/3). Veuillez demander un nouveau code.');
        } else if (verifyRes.error === 'OTP_NOT_FOUND') {
          setError(i18n.language === 'ar' ? 'رمز غير موجود. يرجى طلب رمز جديد.' : i18n.language === 'en' ? 'Code not found. Please request a new code.' : 'Code non trouvé. Veuillez générer un nouveau code.');
        } else {
          setError(t('login.invalid_code') || "Code de vérification invalide.");
        }
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError(err.message || "Erreur de validation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    // Force account selection to avoid automatic login with wrong account
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      // Apply persistence based on 'Remember Me'
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithPopup(auth, provider);
      if (!userCredential.user) throw new Error(t('common.error'));
      
      const profile = await dbService.getUser(userCredential.user.uid);
      
      const loginInfo = {
        location: 'Maroc',
        device: navigator.userAgent.split(') ')[1] || 'Web Browser'
      };

      if (profile) {
        if (profile.isBanned) {
          await auth.signOut();
          throw new Error(t('login.banned_account'));
        }
        if (profile.role === 'ADMIN' || profile.isTwoFactorEnabled) {
          setTempProfile(profile);
          setShowTfaVerification(true);
          await sendCode(profile.email, profile);
          return;
        }
        await dbService.logLogin(profile.id, loginInfo);
        onLogin(profile);
        navigate('/');
      } else {
        // If profile doesn't exist, create one with basic info
        const newUser: User = {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || 'Utilisateur Google',
          role: 'CLIENT', // Default role for new Google users
          phone: '', // Will be updated in settings/profile if needed
          isEmailVerified: userCredential.user.emailVerified, // Google emails are usually verified
          avatar: userCredential.user.photoURL || undefined
        };
        await dbService.createUser(newUser);
        await dbService.logLogin(newUser.id, loginInfo);
        onLogin(newUser);
        navigate('/');
      }
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError(i18n.language === 'ar' ? 'تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.' : i18n.language === 'en' ? 'The login window was closed before completion.' : 'La fenêtre de connexion a été fermée avant la fin de l\'opération.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError(i18n.language === 'ar' ? 'هناك محاولة تسجيل دخول أخرى جارية بالفعل.' : i18n.language === 'en' ? 'Another login attempt is already in progress.' : 'Une autre tentative de connexion est déjà en cours.');
      } else if (err.code === 'auth/network-request-failed') {
        setError(i18n.language === 'ar' ? 'خطأ في الشبكة. يرجى التحقق من اتصالك.' : i18n.language === 'en' ? 'Network error. Please check your connection.' : 'Erreur réseau. Veuillez vérifier votre connexion.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      // Apply persistence based on 'Remember Me'
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await dbService.getUser(userCredential.user.uid);
      
      const loginInfo = {
        location: 'Maroc', // Simplified for demo
        device: navigator.userAgent.split(') ')[1] || 'Web Browser'
      };

      if (profile) {
        if (profile.isBanned) {
          await auth.signOut();
          await dbService.logFailedLogin(email, 'ACCOUNT_BANNED');
          throw new Error(t('login.banned_account'));
        }
        if ((role === 'ADMIN' || role === 'TOPOGRAPHER') && profile.role !== role) {
          await dbService.logFailedLogin(email, 'INVALID_ROLE');
          throw new Error(t('login.invalid_role', { role: profile.role }));
        }
        
        if (profile.role === 'ADMIN' || profile.isTwoFactorEnabled) {
          setTempProfile(profile);
          setShowTfaVerification(true);
          await sendCode(profile.email, profile);
          return;
        }

        await dbService.logLogin(profile.id, loginInfo);
        onLogin(profile);
        navigate('/');
      } else {
        await dbService.logFailedLogin(email, 'PROFILE_NOT_FOUND');
        throw new Error(t('login.profile_not_found'));
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      // 'auth/invalid-credential' is the newer unified error for wrong email/password
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError(i18n.language === 'ar' ? 'بيانات الاعتماد غير صالحة: بريد إلكتروني أو كلمة مرور غير صحيحة.' : i18n.language === 'en' ? 'Invalid credentials: Incorrect email or password.' : 'Identifiants invalides : Email ou mot de passe incorrect.');
      } else if (err.code === 'auth/user-disabled') {
        setError(i18n.language === 'ar' ? 'تم تعطيل هذا الحساب من قبل المسؤول.' : i18n.language === 'en' ? 'This account has been disabled by an administrator.' : 'Ce compte a été désactivé par un administrateur.');
      } else if (err.code === 'auth/too-many-requests') {
        setError(i18n.language === 'ar' ? 'محاولات فاشلة كثيرة جداً. تم حظر حسابك مؤقتًا لأسباب أمنية.' : i18n.language === 'en' ? 'Too many failed attempts. Your account has been temporarily blocked for security reasons.' : 'Trop de tentatives échouées. Votre compte a été temporairement bloqué pour des raisons de sécurité.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(t('login.auth_not_enabled'));
      } else if (err.code === 'auth/network-request-failed') {
        setError(i18n.language === 'ar' ? 'خطأ في الشبكة. يرجى التحقق من اتصالك.' : i18n.language === 'en' ? 'Network error. Please check your connection.' : 'Erreur réseau. Veuillez vérifier votre connexion.');
      } else {
        setError(err.message || t('login.auth_failed'));
      }
      
      if (!err.message?.includes('Rôle') && !err.message?.includes('suspendu') && err.code) {
        await dbService.logFailedLogin(email, err.code);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showTfaVerification) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card border rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-black tracking-tight">{t('login.tfa_title')}</h1>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {t('login.tfa_sent_to')} <span className="font-bold text-foreground">{tempProfile.email}</span>.
              </p>
            </div>

            <form onSubmit={handleTfaVerify} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('login.security_code')}</label>
                  <button 
                    type="button"
                    onClick={() => sendCode(tempProfile.email)}
                    disabled={isSendingCode || resendCooldown > 0}
                    className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter disabled:opacity-50 disabled:no-underline"
                  >
                    {isSendingCode ? t('login.sending') : resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : t('login.resend_code')}
                  </button>
                </div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-muted border-none rounded-2xl py-4 text-center text-3xl font-black tracking-[0.5em] focus:ring-2 focus:ring-primary outline-none transition-all shadow-inner"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {otpWarning && (
                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs rounded-xl flex items-start gap-2 border border-amber-500/20 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
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

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" /> : <ShieldCheck className="w-5 h-5" />}
                {t('login.validate_access')}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowTfaVerification(false);
                  setTfaCode('');
                  setError('');
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {t('login.back_to_login')}
              </button>
            </form>

            <div className="mt-8 p-4 bg-muted/30 rounded-2xl border border-dashed text-center">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {t('login.tfa_tip')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Modern Background with Thematic Pattern */}
      <div className="absolute inset-0 z-0">
        {/* Main Background Image - High Quality Technical Photo feel */}
        <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/80 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=2400" 
          alt="Technical Background"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        
        {/* Animated Gradient Orbs for Modern Vibe */}
        <div className="absolute top-0 -left-20 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse transition-all duration-1000" />
        
        {/* Subtle Topo Grid overlay */}
        <div className="absolute inset-0 opacity-[0.25] topo-grid z-20 pointer-events-none" />
      </div>



      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card/60 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden z-10"
      >
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-primary to-blue-600 text-primary-foreground dark:from-white dark:to-slate-200 dark:text-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Map className="w-10 h-10 relative z-10" />
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight text-foreground">DataTopoGuard</h1>
            <p className="text-sm text-muted-foreground mt-2 font-medium">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="space-y-3">
              <label className="text-sm font-medium">{t('login.role')}</label>
              <div className="grid grid-cols-3 gap-3">
                {(['CLIENT', 'TOPOGRAPHER', 'ADMIN'] as UserRole[]).map((r, i) => (
                  <button
                    key={`${r}-${i}`}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 border rounded-xl transition-all gap-1",
                      role === r ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {r === 'CLIENT' && <Mail className="w-5 h-5" />}
                    {r === 'TOPOGRAPHER' && <Map className="w-5 h-5" />}
                    {r === 'ADMIN' && <ShieldCheck className="w-5 h-5" />}
                    <span className="text-[10px] font-bold uppercase">{r}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">{t('login.email')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary focus:bg-background/80 outline-none transition-all shadow-inner"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-semibold">{t('login.password')}</label>
                <button type="button" className="text-xs text-primary font-bold hover:underline">{t('login.forgot')}</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-12 text-sm focus:ring-2 focus:ring-primary focus:bg-background/80 outline-none transition-all shadow-inner"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {(role === 'ADMIN' || role === 'TOPOGRAPHER') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">2FA Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value)}
                    className="w-full bg-muted border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="000000"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-primary focus:ring-primary" 
                  checked={rememberMe}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setRememberMe(val);
                    localStorage.setItem('rememberMe', String(val));
                  }}
                />
                <span className="text-xs">{t('login.remember')}</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={cn(
                "w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl shadow-2xl shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-base mt-2",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? t('common.loading') : t('login.signin')}
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
              onClick={handleGoogleLogin}
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

          <div className="mt-8 pt-6 border-t space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <div className="text-[10px]">
                  <p className="font-semibold text-foreground uppercase tracking-wider">{t('login.secure_session')}</p>
                  <p className="text-muted-foreground leading-none mt-0.5">{t('login.last_login')}: {t('common.just_now')}</p>
                </div>
              </div>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
            
            <p className="text-center text-xs text-muted-foreground">
              {t('login.no_account')} <Link to="/register" className="text-primary font-medium hover:underline">{t('login.create_account')}</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
