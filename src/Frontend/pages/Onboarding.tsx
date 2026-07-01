import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Globe, 
  ShieldCheck, 
  Zap, 
  Users, 
  Map as MapIcon,
  Check,
  Cpu
} from 'lucide-react';
import { cn } from '../../Backend/lib/utils';

const slides = [
  {
    id: 0,
    icon: Cpu,
    titleKey: 'onboarding.robot_title',
    descKey: 'onboarding.robot_desc',
    color: 'bg-indigo-500/10 text-indigo-500',
    
    image: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=1200'
  },
  {
    id: 1,
    icon: Globe,
    titleKey: 'onboarding.slide1_title',
    descKey: 'onboarding.slide1_desc',
    color: 'bg-blue-500/10 text-blue-500',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200'
  },
  {
    id: 2,
    icon: Users,
    titleKey: 'onboarding.slide2_title',
    descKey: 'onboarding.slide2_desc',
    color: 'bg-green-500/10 text-green-500',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200'
  },
  {
    id: 3,
    icon: Zap,
    titleKey: 'onboarding.slide3_title',
    descKey: 'onboarding.slide3_desc',
    color: 'bg-amber-500/10 text-amber-500',
    image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=1200'
  },
  {
    id: 4,
    icon: ShieldCheck,
    titleKey: 'onboarding.slide4_title',
    descKey: 'onboarding.slide4_desc',
    color: 'bg-primary/10 text-primary',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200'
  }
];

interface OnboardingProps {
  onComplete?: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, i18n } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    if (onComplete) onComplete();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background with Thematic Pattern (Sync with Login) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary/5 dark:bg-slate-950/20 z-10" />
        <div className="absolute inset-0 opacity-20 topo-grid z-0" />
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <MapIcon className="w-6 h-6" />
          </div>
          <span className="font-black tracking-tight text-xl hidden sm:inline-block">DataTopoGuard</span>
        </div>


      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        {/* Visual Section */}
        <div className="relative h-[300px] md:h-[500px] rounded-3xl overflow-hidden border shadow-2xl bg-muted">
          <AnimatePresence>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              {slides[currentSlide].video ? (
                <video 
                  src={slides[currentSlide].video} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={slides[currentSlide].image} 
                  alt="Slide visual"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
                <div className="text-white">
                  <h3 className="text-xl font-bold font-display">{t(slides[currentSlide].titleKey)}</h3>
                  <p className="text-xs opacity-90 mt-2 line-clamp-2 md:line-clamp-none">{t(slides[currentSlide].descKey)}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Info Section */}
        <div className="flex flex-col gap-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", slides[currentSlide].color)}>
                {React.createElement(slides[currentSlide].icon, { className: "w-8 h-8" })}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                  {t(slides[currentSlide].titleKey)}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t(slides[currentSlide].descKey)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Indicators & Actions */}
          <div className="space-y-8 pt-4">
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <div 
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    currentSlide === index ? "w-8 bg-primary" : "w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="p-3 rounded-full border hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-primary text-primary-foreground font-black rounded-2xl flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                  {currentSlide === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={handleComplete}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                {t('onboarding.skip')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <div className="absolute bottom-6 text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-medium opacity-50">
        DataTopoGuard Ecosystem • Smart Cabinet 2026
      </div>
    </div>
  );
}
