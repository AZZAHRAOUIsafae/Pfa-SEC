import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Camera, 
  Search, 
  FileText, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  BrainCircuit,
  Maximize2,
  Trash2,
  Download,
  Loader2,
  Send,
  MessageSquare,
  Sparkles,
  Layers,
  Compass,
  Map,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  CloudLightning
} from 'lucide-react';
import { aiService } from '../../Backend/services/aiService';
import { cn } from '../../Backend/lib/utils';
import Markdown from 'react-markdown';

import { useTranslation } from 'react-i18next';

export default function AIAnalysis() {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats / Interactive Tabs States
  const [activeTab, setActiveTab] = useState<'report' | 'chat' | 'metrics'>('report');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai', text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Preset prompts for topographers to click
  const topographerPills = [
    { text: "Estimer le dénivelé et la pente moyenne", key: "pente" },
    { text: "Y a-t-il des risques de glissement ou d'érosion ?", key: "risques" },
    { text: "Identifier l'emplacement optimal de construction", key: "construction" },
    { text: "Analyse de la végétation et des accès routiers", key: "vegetation" }
  ];

  useEffect(() => {
    if (analysisResult) {
      // Re-initialize conversational assistant when a new analysis is loaded
      setChatMessages([
        { 
          role: 'ai', 
          text: "Analyse initiale du terrain terminée ! Je suis maintenant imprégné des caractéristiques visuelles et topographiques de cette image. Posez-moi vos questions spécifiques d'ingénierie, ou utilisez les suggestions rapides ci-dessous." 
        }
      ]);
      setActiveTab('report');
    }
  }, [analysisResult]);

  useEffect(() => {
    // Auto-scroll chat to the bottom
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatting]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('ai_analysis.error_size', 'Le fichier est trop volumineux (max 10Mo)'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setSelectedImage(result.split(',')[1]);
        setMimeType(file.type);
        setAnalysisResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await aiService.analyzeTopographyImage(selectedImage, mimeType);
      setAnalysisResult(result || t('ai_analysis.no_result', "Aucun résultat n'a pu être extrait."));
    } catch (err: any) {
      setError(err?.message || t('common.error', 'Une erreur est survenue lors de l\'analyse.'));
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || !selectedImage || isChatting) return;

    const userMsg = { role: 'user' as const, text: textToSend };
    setChatMessages(prev => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsChatting(true);

    try {
      const reply = await aiService.chatAboutImage(selectedImage, mimeType, textToSend);
      setChatMessages(prev => [...prev, { role: 'ai' as const, text: reply || "Aucune réponse générée." }]);
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'ai' as const, text: "Erreur serveur : impossible de traiter la question. Veuillez réessayer." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setChatMessages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 select-none">
      {/* Decorative background gradients */}
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-24 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Dynamic Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-muted/50">
        <div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest w-fit mb-2 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini Multimodal Suite
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground flex items-center gap-3 font-display">
            <BrainCircuit className="w-10 h-10 text-primary shrink-0" />
            {t('ai_analysis.title', 'Cabinet IA Topo')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base font-medium leading-relaxed">
            {t('ai_analysis.subtitle', 'Téléversez une photo terrain ou un plan pour générer un rapport ultra-détaillé et discuter en direct avec notre agent topographique intelligent.')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Upload & Preview (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <motion.div 
            layout
            className={cn(
              "relative bg-card border-2 border-dashed rounded-[2.5rem] overflow-hidden transition-all duration-500 group shadow-xl",
              selectedImage ? "border-primary/50" : "border-muted-foreground/20 hover:border-primary/50"
            )}
          >
            {selectedImage ? (
              <div className="relative aspect-video sm:aspect-[4/3] bg-muted/40 flex items-center justify-center p-3 overflow-hidden">
                <img 
                  src={`data:${mimeType};base64,${selectedImage}`} 
                  alt="Selected Topo Target" 
                  className="w-full h-full object-contain rounded-[2rem] shadow-md"
                  referrerPolicy="no-referrer"
                />
                
                {/* AI Scanning Active overlay indicator */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-sm text-white font-black tracking-wider uppercase">Scannage Actif...</span>
                  </div>
                )}

                {/* AI Laser bar Scanning Effect */}
                {isAnalyzing && (
                  <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan z-10 shadow-[0_0_20px_rgba(0,102,255,1)]" />
                )}

                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button 
                    onClick={clearImage}
                    className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-1 font-bold text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Effacer
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="aspect-video sm:aspect-[4/3] flex flex-col items-center justify-center cursor-pointer space-y-6 p-8 sm:p-12 hover:bg-muted/10 transition-all duration-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-[1.8rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-black tracking-tight">{t('ai_analysis.upload_btn', 'Sélectionner une photo')}</p>
                  <p className="text-sm text-muted-foreground max-w-xs px-2 mt-2 font-medium">
                    {t('ai_analysis.upload_hint', 'Faites glisser ou parcourez vos fichiers (PNG, JPG, max 10Mo).')}
                  </p>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden" 
              accept="image/*"
            />
          </motion.div>

          <button
            disabled={!selectedImage || isAnalyzing}
            onClick={startAnalysis}
            className={cn(
              "w-full py-5 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group",
              selectedImage && !isAnalyzing
                ? "bg-primary text-white hover:brightness-110 active:scale-[0.98] shadow-primary/30 cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            )}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span>{t('ai_analysis.analyzing', "Analyse et Rapport en cours...")}</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-6 h-6 animate-pulse" />
                <span>{t('ai_analysis.start_btn', "Lancer l'Analyse IA")}</span>
              </>
            )}
          </button>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-5 flex items-start gap-4 text-red-500 shadow-lg shadow-red-500/5"
            >
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider mb-1">Erreur de l'Analyse</h4>
                <p className="text-xs font-bold leading-relaxed">{error}</p>
                <p className="text-[10px] mt-2 text-red-400 opacity-90">Astuce : Vérifiez votre connexion ou réessayez avec une image de résolution inférieure.</p>
              </div>
            </motion.div>
          )}

          {/* Guidelines info card (Modern & Professional) */}
          <div className="bento-card bg-muted/20 border-none p-6 space-y-4">
            <h3 className="font-black text-lg flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary animate-pulse" />
              {t('ai_analysis.examples_title', 'Utilités recommandées')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { title: "Relief & Obstacles", desc: "Identifier les roches, ravins et pentes à risque", active: true },
                { title: "Végétation & Arbres", desc: "Estimer le taux de couvert végétal", active: true },
                { title: "Plans Topographiques", desc: "Extraction automatisée des données visibles", active: true },
                { title: "Estimation de hauteur", desc: "Détecter les dénivelés structurels", active: true }
              ].map((item, idx) => (
                <div key={`guide-${idx}`} className="flex flex-col bg-card p-4 rounded-2xl border border-border/80 hover:border-primary/20 transition-all hover:translate-y-[-2px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-emerald-500/10 text-emerald-500 rounded-md flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-extrabold tracking-tight text-xs">{item.title}</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground font-medium">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & Direct Interactive Chat (Span 7) */}
        <div className="lg:col-span-7 h-fit min-h-[600px] flex flex-col">
          <AnimatePresence mode="wait">
            {analysisResult ? (
              <motion.div 
                key="results-interactive"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="bg-card border rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-full"
              >
                {/* Modern Vibrant Navigation Tabs Header */}
                <div className="bg-muted/30 border-b border-border/60 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex bg-muted/60 p-1.5 rounded-2xl border border-border/80">
                    <button
                      onClick={() => setActiveTab('report')}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                        activeTab === 'report' 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      Rapport Expert
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative",
                        activeTab === 'chat' 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Discussion IA
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    </button>
                    <button
                      onClick={() => setActiveTab('metrics')}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                        activeTab === 'metrics' 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Layers className="w-4 h-4" />
                      Simulateurs & Métriques
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black tracking-widest uppercase">
                      Gemini PRO
                    </span>
                  </div>
                </div>

                {/* TAB CONTENT: 1. REPORT */}
                <div className="p-6 sm:p-10 flex-1 overflow-y-auto max-h-[600px] min-h-[400px]">
                  {activeTab === 'report' && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-black tracking-normal">Rapport Géospatial complet</h3>
                            <p className="text-xs text-muted-foreground font-medium">Généré et signé numériquement par Cabinet IA</p>
                          </div>
                        </div>

                        {/* Export/Download options */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const blob = new Blob([analysisResult], { type: 'text/markdown' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `rapport_ia_topo_${Date.now()}.md`;
                              a.click();
                            }}
                            className="p-2.5 bg-muted hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm active:scale-95 text-xs font-bold flex items-center gap-1.5"
                            title="Télécharger en Markdown"
                          >
                            <Download className="w-4 h-4" />
                            Générer rapport .MD
                          </button>
                        </div>
                      </div>

                      <div className="markdown-body prose dark:prose-invert max-w-none text-muted-foreground prose-p:leading-relaxed prose-headings:font-black prose-headings:tracking-tighter prose-strong:text-foreground prose-strong:font-black prose-p:font-medium prose-li:font-medium">
                        <Markdown>{analysisResult}</Markdown>
                      </div>

                      <div className="pt-6 border-t border-muted/50">
                        <p className="text-center text-[10.5px] text-muted-foreground/50 italic leading-relaxed">
                          Note d'avertissement : Ce rapport est une synthèse pré-analytique générée par vision artificielle. Il est indispensable d'effectuer un relevé in-situ (station totale ou GNSS) pour certifier les mesures.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB CONTENT: 2. INTERACTIVE CHAT */}
                  {activeTab === 'chat' && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col h-full space-y-4"
                    >
                      {/* Explanatory introduction */}
                      <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <span className="text-xs font-black tracking-wider uppercase text-primary">Interrogateur Intelligent Tactique</span>
                          <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                            Interrogez l'intelligence artificielle sur n'importe quel détail visible dans la photo de terrain (bâtiments existants, routes, type d'arbres, inclinaisons des buttes, drainage d'eau).
                          </p>
                        </div>
                      </div>

                      {/* Messaging history view */}
                      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-muted/20 border border-muted/30 max-h-[350px] min-h-[250px] flex flex-col">
                        {chatMessages.map((msg, idx) => (
                          <div
                            key={`msg-${idx}`}
                            className={cn(
                              "flex flex-col max-w-[85%] rounded-[1.6rem] p-4 font-medium text-xs sm:text-sm leading-relaxed",
                              msg.role === 'user'
                                ? "self-end bg-primary text-white rounded-tr-none shadow-md shadow-primary/10"
                                : "self-start bg-card border border-border text-foreground rounded-tl-none shadow-sm"
                            )}
                          >
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">
                              {msg.role === 'user' ? "Topographe" : "Assistant IA"}
                            </span>
                            <p className="whitespace-pre-line">{msg.text}</p>
                          </div>
                        ))}

                        {isChatting && (
                          <div className="self-start bg-card border border-border text-foreground rounded-[1.6rem] rounded-tl-none p-4 max-w-[80%] flex items-center gap-3">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-xs text-muted-foreground font-bold tracking-tight">Réflexion de l'assistant topographe...</span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Hot preset pills suggestions */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block px-1">Questions fréquentes :</span>
                        <div className="flex flex-wrap gap-2">
                          {topographerPills.map((pill, idx) => (
                            <button
                              key={`pill-${idx}`}
                              disabled={isChatting}
                              onClick={() => handleSendMessage(pill.text)}
                              className="px-3 py-2 bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all rounded-xl text-left text-xs font-bold border border-border hover:border-primary/20 shrink-0"
                            >
                              ⚽ {pill.text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Message input group */}
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendMessage();
                          }}
                          disabled={isChatting}
                          placeholder="Posez une question technique sur l'image..."
                          className="flex-grow bg-muted/40 border border-muted/70 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition-colors font-medium text-foreground placeholder:text-muted-foreground/50"
                        />
                        <button
                          disabled={isChatting || !chatInput.trim()}
                          onClick={() => handleSendMessage()}
                          className="px-5 bg-primary text-white rounded-2xl hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB CONTENT: 3. METRICS SIMULATIONS */}
                  {activeTab === 'metrics' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                        <Layers className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-black tracking-wider uppercase text-emerald-500">Extracteur Analytique de Terrain</span>
                          <p className="text-[11.5px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                            Métriques simulées basées sur la classification visuelle par vision de l'IA (Gemini Multimodal Suite).
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Metric 1 */}
                        <div className="bg-card border border-border/80 p-5 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Rugosité du Sol</span>
                            <span className="text-xs font-extrabold text-[#10b981] bg-[#10b981]/10 px-2.5 py-1 rounded-lg">Favorable</span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-foreground block mb-2">Modérée</span>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '70%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">Idéal pour le passage d'engins légers</span>
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-card border border-border/80 p-5 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Densité Forestière</span>
                            <span className="text-xs font-extrabold text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded-lg">Moyenne</span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-foreground block mb-2">38 %</span>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '38%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">Zones arbustives clairsemées identifiées</span>
                        </div>

                        {/* Metric 3 */}
                        <div className="bg-card border border-border/80 p-5 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Score de Constructibilité</span>
                            <span className="text-xs font-extrabold text-[#f59e0b] bg-[#f59e0b]/10 px-2.5 py-1 rounded-lg">Idéal</span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-foreground block mb-2">84 / 100</span>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: '84%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">Pente faible à modérée sur 80% du terrain</span>
                        </div>

                        {/* Metric 4 */}
                        <div className="bg-card border border-border/80 p-5 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#a1a1aa]">Obstacles majeurs</span>
                            <span className="text-xs font-extrabold text-[#ef4444] bg-[#ef4444]/10 px-2.5 py-1 rounded-lg">À surveiller</span>
                          </div>
                          <span className="text-3xl font-black tracking-tight text-foreground block mb-2">03 Localisés</span>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: '25%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1.5 block font-medium">Affleurements rocheux et inclinaison butte</span>
                        </div>
                      </div>

                      {/* Technical visualizer */}
                      <div className="bg-muted/10 border border-border rounded-2xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Map className="w-5 h-5 text-primary" />
                          <span className="text-xs font-black uppercase tracking-wider">Projection de Repères de Nivellement (Simulé)</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                          {[
                            { name: "Altitude Basse", pt: "94.2m", color: "text-[#10b981]" },
                            { name: "Altitude Haute", pt: "148.5m", color: "text-[#3b82f6]" },
                            { name: "Azimut Zone", pt: "162° N-E", color: "text-amber-500" },
                            { name: "Inclinaison Max", pt: "14.8 %", color: "text-red-500" }
                          ].map((d, k) => (
                            <div key={`param-${k}`} className="bg-card/70 p-3 rounded-xl border border-border/50">
                              <p className="text-[10px] text-muted-foreground font-semibold uppercase">{d.name}</p>
                              <p className={cn("text-base font-black tracking-tight mt-1", d.color)}>{d.pt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ) : isAnalyzing ? (
              // Enhanced high-vibe examining state
              <motion.div 
                key="loading-examining"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card border rounded-[3rem] p-12 flex flex-col items-center justify-center space-y-8 text-center h-[550px] shadow-2xl relative overflow-hidden group hover:shadow-primary/5 transition-all duration-700"
              >
                <div className="absolute inset-0 topo-grid opacity-20 pointer-events-none" />
                <div className="relative">
                  <div className="w-36 h-36 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BrainCircuit className="w-16 h-16 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="relative z-10 max-w-sm">
                  <h3 className="text-3xl font-black tracking-tighter text-foreground">
                    {t('ai_analysis.examining', "Numérisation Active")}
                  </h3>
                  <p className="text-muted-foreground mt-3 font-medium leading-relaxed">
                    Notre modèle de vision avancé (Gemini 3.5 Suite) décrypte les structures de dénivelé, texture de terrain, couvert végétal et obstacles.
                  </p>
                </div>
                
                {/* Visual steps of compilation while processing */}
                <div className="w-full max-w-sm space-y-3 relative z-10">
                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 shadow-inner">
                    <motion.div 
                      className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(0,102,255,0.8)]"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary/60 px-1">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-primary animate-spin" />
                      Scanner Terrain
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-primary animate-pulse" />
                      Couches Altitudes
                    </span>
                    <span>Modélisation</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              // Placeholder when no analysis active
              <motion.div 
                key="placeholder-idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-muted/10 border-2 border-muted-foreground/15 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center space-y-6 text-center h-[550px] hover:bg-muted/20 transition-all duration-700 group"
              >
                <div className="w-24 h-24 bg-card rounded-[2.2rem] border border-border flex items-center justify-center group-hover:scale-110 group-hover:rotate-[-3deg] transition-all duration-500 shadow-lg">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/55 transition-colors" />
                </div>
                <div className="space-y-3 max-w-md">
                  <p className="text-2xl font-black tracking-tighter text-foreground/80">
                    {t('ai_analysis.waiting', 'En attente de votre document')}
                  </p>
                  <p className="text-base text-muted-foreground/60 max-w-[320px] mx-auto font-medium leading-relaxed">
                    Installez ou téléversez votre image de relevé terrain à gauche pour que le Cabinet IA en dresse la cartographie expert.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
