import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  MessageSquare, 
  FileText, 
  Map as MapIcon, 
  MapPin,
  Mail,
  Calendar, 
  Clock,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  List,
  Search,
  X,
  Download,
  Paperclip,
  Bell,
  Target,
  Globe,
  Check as CheckIcon,
  Star
} from 'lucide-react';
import { Project, ProjectDocument, User, Notification, ConnectionRequest, Intervention } from '../../Backend/types';
import ProjectCard from '../components/ProjectCard';
import DocumentViewer from '../components/DocumentViewer';
import ProjectDetailsOverlay from '../components/ProjectDetailsOverlay';
import PaymentModal from '../components/PaymentModal';
import RatingSystem from '../components/RatingSystem';
import { cn } from '../../Backend/lib/utils';
import { dbService } from '../../Backend/services/db';
import { formatDistanceToNow } from 'date-fns';
import { fr, arMA, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Shield, Check, XCircle, Search as SearchIcon, Users, ChevronDown, History, Database, CloudRain, Sun, CloudLightning, Settings } from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../Backend/lib/exportUtils';
import { auth } from '../../Backend/lib/firebase';

interface ClientDashboardProps {
  user: User;
  projects: Project[];
  documents: ProjectDocument[];
  notifications: Notification[];
  onAddProject: (p: Omit<Project, 'id'>) => Promise<string>;
  initialShowDocs?: boolean;
}

export default function ClientDashboard({ user, projects, documents, notifications, onAddProject, initialShowDocs = false }: ClientDashboardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(initialShowDocs);
  const [activeDoc, setActiveDoc] = useState<ProjectDocument | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState({ type: 'Levé de terrain', location: '', description: '', topographerId: '', bookingDate: '', bookingTime: '' });
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({ name: '', type: 'PHOTO' as ProjectDocument['type'], projectId: '' });
  const [topographers, setTopographers] = useState<User[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'connections'>('overview');
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [proSearchQuery, setProSearchQuery] = useState('');
  const [proSearchResults, setProSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [docToPay, setDocToPay] = useState<ProjectDocument | null>(null);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [topoToRate, setTopoToRate] = useState<{ id: string, name: string } | null>(null);
  const [projectToRate, setProjectToRate] = useState<Project | null>(null);
  const [linkedCabinet, setLinkedCabinet] = useState<User | null>(null);

  // Interactive calendar slots booking states
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [selectedBookingDate, setSelectedBookingDate] = useState<string>('');
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<string>('');
  const [quoteBookingContext, setQuoteBookingContext] = useState<{ projectId: string; topographerId: string; docName: string } | null>(null);
  const [bookingSuccessMessage, setBookingSuccessMessage] = useState<string | null>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  React.useEffect(() => {
    dbService.getTopographers(user.company).then(setTopographers);
    
    if (user.linkedTopographerId) {
      dbService.getUser(user.linkedTopographerId).then(setLinkedCabinet);
    }

    const unsubscribeInterventions = dbService.subscribeToInterventions(user.id, user.role, setInterventions);
    return () => {
      unsubscribeInterventions();
    };
  }, [user.linkedTopographerId]);

  React.useEffect(() => {
    setShowAllDocs(initialShowDocs);
  }, [initialShowDocs]);

  const handleRate = (project: Project) => {
    const topoName = topographers.find(t => t.id === project.topographerId)?.name || 'Topographe';
    setTopoToRate({ id: project.topographerId, name: topoName });
    setProjectToRate(project);
    setIsRatingOpen(true);
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportData = (type: 'projects' | 'documents', format: 'csv' | 'json') => {
    let dataToExport: any[] = [];
    const filename = `client_export_${type}_${new Date().toISOString().split('T')[0]}`;
    const userEmail = auth.currentUser?.email || user.email;

    if (type === 'projects') {
      dataToExport = projects.map(p => ({
        Nom: p.name,
        Topographe: topographers.find(t => t.id === p.topographerId)?.name || 'N/A',
        Surface: p.area || 0,
        Statut: p.status,
        Date: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt.seconds * 1000).toLocaleString()) : 'N/A'
      }));
    } else {
      dataToExport = documents.map(d => ({
        Nom: d.name,
        Type: d.type,
        Signe: d.isSigned ? 'OUI' : 'NON',
        Montant: d.amount?.ttc || 0,
        Date: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt.seconds * 1000).toLocaleString()) : 'N/A'
      }));
    }

    if (format === 'json') {
      exportToJSON(dataToExport, filename, userEmail);
    } else {
      exportToCSV(dataToExport, filename, `Mes Données Smart Cabinet`, userEmail);
    }
    setIsExportMenuOpen(false);
  };

  const searchPros = async () => {
    if (!proSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Find both ADMINS and TOPOGRAPHERS
      const admins = await dbService.getAdmins();
      const results = [...admins, ...topographers].filter(u => 
        u.name.toLowerCase().includes(proSearchQuery.toLowerCase()) || 
        u.company?.toLowerCase().includes(proSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(proSearchQuery.toLowerCase())
      );
      setProSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (proId: string) => {
    try {
      await dbService.sendConnectionRequest(user, proId);
      alert(t('common.alerts.request_sent'));
      setProSearchResults(prev => prev.filter(p => p.id !== proId));
    } catch (error) {
      console.error("Failed to send request:", error);
    }
  };

  const handleSign = async (docId: string, signature: string) => {
    try {
      const isQuote = activeDoc?.type === 'QUOTE';
      const docProjId = activeDoc?.projectId || '';
      const docTopoId = activeDoc?.topographerId || '';
      const docName = activeDoc?.name || '';

      await dbService.signDocument(docId, signature, user.id);
      // Notifications are already handled by dbService or would be better here
      await dbService.createNotification({
        userId: activeDoc?.topographerId || '',
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        type: 'DOCUMENT',
        content: `A signé le document : ${activeDoc?.name}`,
        link: '/documents'
      });
      
      if (isQuote) {
        setQuoteBookingContext({
          projectId: docProjId,
          topographerId: docTopoId,
          docName: docName
        });
        setSelectedBookingDate('');
        setSelectedBookingSlot('');
      } else {
        alert("Document signé avec succès !");
      }
      setActiveDoc(null);
    } catch (error) {
      console.error('Signing failed:', error);
      alert(t('common.alerts.sign_failed'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadData(prev => ({ ...prev, name: file.name }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.projectId || !selectedFile) {
      alert(t('common.alerts.select_project_file'));
      return;
    }
    
    setIsSubmitting(true);
    const doc: Omit<ProjectDocument, 'id'> = {
      projectId: uploadData.projectId,
      name: selectedFile.name,
      type: uploadData.type,
      url: URL.createObjectURL(selectedFile), // Simulate real URL
      size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
      createdAt: new Date().toISOString()
    };
    
    try {
      await dbService.addDocument(doc);
      
      // Self-notification for activity feed
      await dbService.createNotification({
        userId: user.id,
        senderId: user.id,
        senderName: 'Vous',
        senderAvatar: user.avatar,
        type: 'DOCUMENT',
        content: `Vous avez ajouté un document : ${selectedFile.name}`,
        link: '/documents'
      });

      setIsUploadModalOpen(false);
      setUploadData({ name: '', type: 'PHOTO', projectId: '' });
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.topographerId) {
      alert(t('common.alerts.select_topo'));
      return;
    }
    const project: Omit<Project, 'id'> = {
      name: `${newRequest.type} - ${newRequest.location}`,
      description: newRequest.description,
      status: 'PENDING',
      progress: 0,
      currentStep: 0, // 'Demande envoyée'
      startDate: new Date().toLocaleDateString('fr-FR'),
      estimatedDelivery: 'À définir',
      deadline: 'À définir',
      topographerId: newRequest.topographerId,
      clientId: user.id,
      clientName: user.name,
      location: newRequest.location,
    };
    
    try {
      const projectId = await onAddProject(project);

      if (requestFile && projectId) {
        const doc: Omit<ProjectDocument, 'id'> = {
          projectId: projectId,
          clientId: user.id,
          name: requestFile.name,
          type: 'PDF',
          url: URL.createObjectURL(requestFile),
          size: `${(requestFile.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: new Date().toISOString()
        };
        await dbService.addDocument(doc);
      }

      // Notification to topographer
      await dbService.createNotification({
        userId: newRequest.topographerId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        type: 'PROJECT',
        content: `A demandé un nouveau relevé: ${project.name}`,
        link: '/'
      });

      // Self-notification for activity feed
      await dbService.createNotification({
        userId: user.id,
        senderId: user.id,
        senderName: 'Vous',
        senderAvatar: user.avatar,
        type: 'PROJECT',
        content: `Vous avez demandé un nouveau relevé : ${newRequest.type}`,
        link: '/'
      });

      // If a date and slot were selected by the client during request creation
      if (newRequest.bookingDate && newRequest.bookingTime && projectId) {
        await dbService.createIntervention({
          projectId: projectId,
          clientId: user.id,
          topographerId: newRequest.topographerId,
          title: `Prospection Terrain - ${newRequest.type}`,
          description: `Intervention planifiée par le client lors du dépôt initial du dossier.`,
          date: newRequest.bookingDate,
          startTime: newRequest.bookingTime,
          projectName: `${newRequest.type} - ${newRequest.location}`,
          status: 'PLANNED',
          type: 'LEVE'
        });
      }
    } catch (err) {
      console.error("Error creating project request:", err);
    }

    setIsNewProjectModalOpen(false);
    setNewRequest({ type: 'Levé de terrain', location: '', description: '', topographerId: '', bookingDate: '', bookingTime: '' });
    setRequestFile(null);
  };

  const handlePay = (doc: ProjectDocument) => {
    setDocToPay(doc);
    setPaymentAmount(doc.amount?.ttc || 0);
    setIsPaymentOpen(true);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-8 space-y-10 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
      <div className="absolute bottom-40 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10" />

      <PaymentModal 
        isOpen={isPaymentOpen}
        amount={paymentAmount}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={async () => {
          if (docToPay) {
            await dbService.updateDocument(docToPay.id, {
              paymentStatus: 'PAID',
              paymentDate: new Date().toISOString(),
              paymentMethod: 'STRIPE'
            });
            
            // Notify topo
            if (docToPay.topographerId) {
              await dbService.createNotification({
                userId: docToPay.topographerId,
                senderId: user.id,
                senderName: user.name,
                type: 'DOCUMENT',
                content: `Le client a payé la facture: ${docToPay.name}`,
                link: '/finance'
              });
            }

            // Sync project status if full paid? logic could vary, for now just invoice
          }
          setIsPaymentOpen(false);
          setDocToPay(null);
        }}
      />
      
      <AnimatePresence>
        {isRatingOpen && topoToRate && (
           <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsRatingOpen(false)} 
                className="absolute inset-0 bg-black/60 backdrop-blur-md" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                className="relative w-full max-w-sm"
              >
                <RatingSystem 
                  topographerId={topoToRate.id}
                  clientId={user.id}
                  clientName={user.name}
                  projectId={projectToRate?.id}
                  onSuccess={() => {
                    setIsRatingOpen(false);
                    setProjectToRate(null);
                    alert(t('common.alerts.eval_success') || 'Évaluation enregistrée avec succès !');
                  }}
                />
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Interactive Calendar slot reservation after accepting a Quote */}
      <AnimatePresence>
        {quoteBookingContext && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/70 backdrop-blur-md" 
              onClick={() => setQuoteBookingContext(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 30 }} 
              className="bg-card border w-full max-w-lg rounded-3xl p-8 relative shadow-2xl space-y-6 z-10"
            >
              <div className="flex justify-between items-center pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-foreground">✍️ Devis Signé avec Succès !</h4>
                    <p className="text-[10px] text-muted-foreground">Créneau de Prospection Terrain Requis</p>
                  </div>
                </div>
                <button onClick={() => setQuoteBookingContext(null)} className="p-2 hover:bg-muted rounded-xl"><X className="w-5 h-5" /></button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Le devis <span className="font-bold text-foreground">"{quoteBookingContext.docName}"</span> a été signé. Veuillez sélectionner un créneau de levé libre dans le calendrier de votre topographe pour finaliser le planning.
              </p>

              <div className="space-y-4">
                {/* 1. Date selection input */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Date Souhaitée d'Intervention</span>
                  <input 
                    type="date"
                    value={selectedBookingDate}
                    onChange={e => {
                      setSelectedBookingDate(e.target.value);
                      setSelectedBookingSlot('');
                    }}
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                {selectedBookingDate && (() => {
                  const targetTopo = topographers.find(t => t.id === quoteBookingContext.topographerId);
                  
                  // Working days check: Map English name to French names
                  const daysMapping: Record<string, string> = {
                    'Monday': 'Lundi', 'Tuesday': 'Mardi', 'Wednesday': 'Mercredi',
                    'Thursday': 'Jeudi', 'Friday': 'Vendredi', 'Saturday': 'Samedi', 'Sunday': 'Dimanche'
                  };
                  const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  const dateObj = new Date(selectedBookingDate);
                  const selectedDayName = englishDays[dateObj.getDay()];
                  
                  const workingDays = targetTopo?.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                  const isAvailableDay = workingDays.includes(selectedDayName);

                  // Weather forecast calculations
                  const dayNum = dateObj.getDate();
                  let weatherIcon = <Sun className="w-3.5 h-3.5 text-emerald-600" />;
                  let weatherLabel = "☀️ Ensoleillé - Sédiment sec optimal";
                  let weatherBg = "bg-emerald-50 text-emerald-800 border-emerald-100";

                  if (dayNum % 4 === 0) {
                    weatherIcon = <CloudLightning className="w-3.5 h-3.5 text-rose-600" />;
                    weatherLabel = "⛈️ Orages violents prévus - Alerte météo de report possible";
                    weatherBg = "bg-rose-50 text-rose-800 border-rose-100";
                  } else if (dayNum % 2 === 0) {
                    weatherIcon = <CloudRain className="w-3.5 h-3.5 text-amber-600" />;
                    weatherLabel = "🌧️ Pluie résiduelle - Conditions glissantes, vigilance";
                    weatherBg = "bg-amber-50 text-amber-800 border-amber-100";
                  }

                  if (!isAvailableDay) {
                    return (
                      <div className="text-[11px] text-muted-foreground bg-rose-50 border border-rose-100 p-3 rounded-2xl font-bold leading-relaxed">
                        ⚠️ Ce professionnel ne fait pas de terrain le {daysMapping[selectedDayName] || selectedDayName}. Jours d'ouverture : {workingDays.map(wd => daysMapping[wd] || wd).join(', ')}
                      </div>
                    );
                  }

                  // Slots calculation
                  const hoursConf = targetTopo?.availability?.hours || { start: '08:00', end: '17:00' };
                  const startH = parseInt(hoursConf.start.split(':')[0], 10);
                  const endH = parseInt(hoursConf.end.split(':')[0], 10);
                  const slots: string[] = [];
                  for (let h = startH; h < endH; h++) {
                    slots.push(`${h.toString().padStart(2, '0')}:00`);
                  }

                  return (
                    <div className="space-y-4">
                      {/* Weather advice widget */}
                      <div className={cn("text-[11px] p-3 rounded-xl border flex items-center gap-2.5 font-bold", weatherBg)}>
                        {weatherIcon}
                        <span>Prévision Météo : {weatherLabel}</span>
                      </div>

                      {/* Slots visual grid */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Créneaux horaires disponibles :</span>
                        <div className="grid grid-cols-4 gap-2 pt-1 font-mono">
                          {slots.map(slot => {
                            const isTaken = interventions.some(int => 
                              int.topographerId === quoteBookingContext.topographerId && 
                              int.date === selectedBookingDate && 
                              int.startTime === slot
                            );

                            const isSelected = selectedBookingSlot === slot;

                            return (
                              <button
                                type="button"
                                key={`quote-slot-btn-${slot}`}
                                disabled={isTaken}
                                onClick={() => setSelectedBookingSlot(slot)}
                                className={cn(
                                  "p-2.5 text-xs font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center",
                                  isTaken ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed line-through" :
                                  isSelected ? "bg-primary border-primary text-white shadow-md shadow-primary/20" :
                                  "bg-muted hover:bg-muted/80 border-transparent text-foreground"
                                )}
                              >
                                {slot}
                                {isTaken && <span className="text-[8px] font-sans font-normal">Réservé</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Confirm submit actions */}
              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuoteBookingContext(null)}
                  className="flex-1 border bg-transparent hover:bg-muted border-muted py-3 rounded-xl text-xs font-bold transition-all text-muted-foreground"
                >
                  Plus tard
                </button>
                <button
                  type="button"
                  disabled={!selectedBookingDate || !selectedBookingSlot}
                  onClick={async () => {
                    if (!selectedBookingDate || !selectedBookingSlot) return;
                    try {
                      const projName = projects.find(p => p.id === quoteBookingContext.projectId)?.name || 'Projet Signé';
                      
                      await dbService.createIntervention({
                        projectId: quoteBookingContext.projectId,
                        clientId: user.id,
                        topographerId: quoteBookingContext.topographerId,
                        title: `Prospection Terrain - ${projName}`,
                        description: `Intervention planifiée par le client après signature du devis officiel "${quoteBookingContext.docName}".`,
                        date: selectedBookingDate,
                        startTime: selectedBookingSlot,
                        projectName: projName,
                        status: 'PLANNED',
                        type: 'LEVE'
                      });

                      // Notification to topographer
                      await dbService.createNotification({
                        userId: quoteBookingContext.topographerId,
                        senderId: user.id,
                        senderName: user.name,
                        senderAvatar: user.avatar,
                        type: 'PROJECT',
                        content: `A planifié une intervention terrain : ${selectedBookingDate} à ${selectedBookingSlot}`,
                        link: '/planning'
                      });

                      setBookingSuccessMessage("Slot réservé ! Les notifications d'e-mails ont été transmises.");
                      setTimeout(() => {
                        setBookingSuccessMessage(null);
                        setQuoteBookingContext(null);
                      }, 2500);
                    } catch (e) {
                      console.error("Booking error:", e);
                    }
                  }}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  Confirmer le Levé
                </button>
              </div>

              {bookingSuccessMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 text-center rounded-xl"
                >
                  🎉 {bookingSuccessMessage}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DocumentViewer 
        document={activeDoc} 
        isOpen={activeDoc !== null} 
        onClose={() => setActiveDoc(null)}
        onSign={handleSign}
        onPay={handlePay}
      />

      <ProjectDetailsOverlay
        project={selectedProject}
        documents={documents}
        onClose={() => setSelectedProject(null)}
        onViewDocument={setActiveDoc}
      />

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border w-full max-w-lg rounded-2xl shadow-2xl p-8 max-h-[min(720px,92vh)] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold">{t('client.add_document')}</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-6 overflow-y-auto flex-1 pr-1">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('client.associated_project')}</label>
                <select 
                  required
                  value={uploadData.projectId}
                  onChange={e => setUploadData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('client.select_project')}</option>
                  {projects.map((p, i) => (
                    <option key={`client-prj-opt-${p.id}-${i}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('client.file_label')}</label>
                <div className="relative group/file">
                  <input 
                    type="file" 
                    required
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  <div className="w-full bg-muted border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 text-center group-hover/file:border-primary/50 transition-all">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-bold truncate">
                      {selectedFile ? selectedFile.name : t('client.choose_file')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, PDF (Max. 10MB)</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('common.type')}</label>
                <select 
                  value={uploadData.type}
                  onChange={e => setUploadData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="PHOTO">{t('client.doc_types.photo')}</option>
                  <option value="PAYMENT_SCREENSHOT">{t('client.doc_types.payment')}</option>
                  <option value="PDF">{t('client.doc_types.pdf')}</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? t('common.saving') : t('common.save')}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Documents Modal */}
      {showAllDocs && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border w-full max-w-4xl rounded-2xl shadow-2xl p-8 max-h-[80vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">{t('nav.documents')}</h3>
                <p className="text-sm text-muted-foreground">{t('client.files_count', { count: documents.length })}</p>
              </div>
              <button onClick={() => setShowAllDocs(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {documents.length > 0 ? documents.map((doc, i) => (
                <div 
                  key={`doc-all-${doc.id}-${i}`}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-bold text-primary/70">{doc.type}</span> • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : t('common.unknown_date')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setActiveDoc(doc)}
                      className="px-4 py-2 text-sm font-bold bg-card border rounded-lg hover:bg-accent transition-all"
                    >
                      {t('common.view')}
                    </button>
                    <a 
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>{t('documents.empty')}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* New Project Modal Overlay */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border w-full max-w-lg rounded-2xl shadow-2xl p-8 max-h-[min(780px,92vh)] flex flex-col"
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-xl font-bold">{t('client.new_request')}</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSendRequest} className="space-y-6 overflow-y-auto flex-1 pr-1 pb-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('common.topographer')}</label>
                <select 
                  required
                  value={newRequest.topographerId}
                  onChange={e => setNewRequest(prev => ({ ...prev, topographerId: e.target.value }))}
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('client.select_topo')}</option>
                  {topographers.map((t, i) => (
                    <option key={`topo-new-${t.id}-${i}`} value={t.id}>
                      {t.name} ({t.city || 'N/A'}) {t.rating ? `⭐ ${t.rating.toFixed(1)} (${t.reviewCount || 0} avis)` : '⭐ Non noté'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('client.prestation_type')}</label>
                <select 
                  value={newRequest.type}
                  onChange={e => setNewRequest(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>{t('client.service_types.survey')}</option>
                  <option>{t('client.service_types.layout')}</option>
                  <option>{t('client.service_types.autocad')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('common.location')}</label>
                <input 
                  required
                  type="text" 
                  value={newRequest.location}
                  onChange={e => setNewRequest(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Bouskoura, Casablanca" 
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('client.description')}</label>
                <textarea 
                  required
                  value={newRequest.description}
                  onChange={e => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-muted border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary h-24 resize-none" 
                  placeholder={t('client.description_placeholder')} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t('client.add_documents_request') || 'Documents (Plans, images, etc.)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    id="request-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setRequestFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label
                    htmlFor="request-file-upload"
                    className="cursor-pointer bg-muted hover:bg-muted/80 border border-dashed border-muted-foreground/30 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground w-full transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    {requestFile ? requestFile.name : (t('client.choose_file') || 'Choisir un fichier...')}
                  </label>
                  {requestFile && (
                    <button
                      type="button"
                      onClick={() => setRequestFile(null)}
                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Interactive Calendar slot selector */}
              {newRequest.topographerId && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> {t('scheduler.select_appointment_optional')}
                  </h4>
                  
                  {/* Select booking Date */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground">{t('scheduler.intervention_date')}</span>
                    <input 
                      type="date"
                      value={newRequest.bookingDate}
                      onChange={e => {
                        setNewRequest(prev => ({ ...prev, bookingDate: e.target.value, bookingTime: '' }));
                      }}
                      className="w-full bg-background border rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>

                  {newRequest.bookingDate && (() => {
                    const targetTopo = topographers.find(t => t.id === newRequest.topographerId);
                    
                    const englishDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dateObj = new Date(newRequest.bookingDate);
                    const selectedDayName = englishDays[dateObj.getDay()];
                    
                    const workingDays = targetTopo?.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                    const isAvailableDay = workingDays.includes(selectedDayName);

                    // Weather forecast calculations
                    const dayNum = dateObj.getDate();
                    let weatherIcon = <Sun className="w-3.5 h-3.5 text-emerald-600" />;
                    let weatherLabel = t('scheduler.weather_sunny');
                    let weatherBg = "bg-emerald-50 text-emerald-800 border-emerald-100";

                    if (dayNum % 4 === 0) {
                      weatherIcon = <CloudLightning className="w-3.5 h-3.5 text-rose-600" />;
                      weatherLabel = t('scheduler.weather_storm');
                      weatherBg = "bg-rose-50 text-rose-800 border-rose-100";
                    } else if (dayNum % 2 === 0) {
                      weatherIcon = <CloudRain className="w-3.5 h-3.5 text-amber-600" />;
                      weatherLabel = t('scheduler.weather_rainy');
                      weatherBg = "bg-amber-50 text-amber-800 border-amber-100";
                    }

                    if (!isAvailableDay) {
                      return (
                        <div className="text-[10px] text-muted-foreground bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-bold">
                          ⚠️ {t('scheduler.topo_not_available_on', { day: t(`scheduler.days.${selectedDayName}`) })} {workingDays.map(wd => t(`scheduler.days.${wd}`)).join(', ')}
                        </div>
                      );
                    }

                    // Slot calculation
                    const hoursConf = targetTopo?.availability?.hours || { start: '08:00', end: '17:00' };
                    const startH = parseInt(hoursConf.start.split(':')[0], 10);
                    const endH = parseInt(hoursConf.end.split(':')[0], 10);
                    const slots: string[] = [];
                    for (let h = startH; h < endH; h++) {
                      slots.push(`${h.toString().padStart(2, '0')}:00`);
                    }

                    return (
                      <div className="space-y-3">
                        {/* Weather advice widget */}
                        <div className={cn("text-[10px] p-2.5 rounded-xl border flex items-center gap-2 font-semibold", weatherBg)}>
                          {weatherIcon}
                          <span>{t('scheduler.weather_forecast')} {weatherLabel}</span>
                        </div>

                        {/* Slots visual grid */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-muted-foreground">{t('scheduler.available_slots')}</span>
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {slots.map(slot => {
                              const isTaken = interventions.some(int => 
                                int.topographerId === newRequest.topographerId && 
                                int.date === newRequest.bookingDate && 
                                int.startTime === slot
                              );

                              const isSelected = newRequest.bookingTime === slot;

                              return (
                                <button
                                  type="button"
                                  key={`slot-btn-${slot}`}
                                  disabled={isTaken}
                                  onClick={() => setNewRequest(prev => ({ ...prev, bookingTime: slot }))}
                                  className={cn(
                                    "p-2 text-[10px] font-bold font-mono rounded-lg border transition-all text-center",
                                    isTaken ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed line-through" :
                                    isSelected ? "bg-primary border-primary text-white" :
                                    "bg-background hover:bg-muted"
                                  )}
                                >
                                  {slot}
                                  {isTaken && <span className="block text-[7px] font-sans font-normal">{t('scheduler.occupied')}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
              >
                {t('client.send_request')}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground flex items-center gap-4">
            {t('client.welcome', { name: user.name.split(' ')[0] })}
            <motion.span 
              animate={{ rotate: [0, 20, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block"
            >
              👋
            </motion.span>
          </h1>
          <p className="text-muted-foreground mt-1">{t('client.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 relative z-20">
          <div className="relative z-30">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 hover:scale-105 active:scale-95 transition-all text-sm shadow-xl shadow-primary/20"
            >
              <Download className="w-4 h-4 text-primary-foreground" />
              <span>{t('common.export')}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExportMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-card border rounded-2xl shadow-2xl z-30 overflow-hidden"
                >
                  <div className="p-4 bg-muted/30 border-b text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('client.export_title')}</p>
                  </div>
                  <div className="p-2 space-y-1">
               {[
                      { id: 'projects-csv', label: t('client.export_projects_csv'), icon: History, type: 'projects', format: 'csv' },
                      { id: 'docs-csv', label: t('client.export_docs_csv'), icon: FileText, type: 'documents', format: 'csv' },
                      { id: 'json-full', label: t('client.export_backup_json'), icon: Database, type: 'projects', format: 'json' },
                    ].map((item, idx) => (
                      <button
                        key={`client-export-item-${item.id || idx}-${idx}`}
                        onClick={() => handleExportData(item.type as any, item.format as any)}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-primary/10 rounded-xl transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 font-bold text-foreground">
                          <item.icon className="w-4 h-4 text-primary" />
                          {item.label}
                        </div>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-muted text-muted-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-muted/80 transition-all"
          >
            <Paperclip className="w-5 h-5" />
            <span>{t('client.add_file')}</span>
          </button>
          <button 
            onClick={() => setIsNewProjectModalOpen(true)}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span>{t('client.new_request')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-4 border-b">
        <button 
          onClick={() => setActiveTab('overview')}
          className={cn(
            "pb-3 text-sm font-bold transition-all px-4 relative",
            activeTab === 'overview' ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t('client.overview')}
        </button>
        <button 
          onClick={() => setActiveTab('connections')}
          className={cn(
            "pb-3 text-sm font-bold transition-all px-4 relative",
            activeTab === 'connections' ? "text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t('client.connections')} {!user.linkedTopographerId && <span className="ml-2 w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
            { 
              id: 'active_projects',
              label: t('client.stats.active_projects'), 
              value: projects.filter(p => ['PENDING', 'IN_PROGRESS', 'VALIDATION'].includes(p.status)).length.toString(), 
              icon: Clock, 
              color: 'text-blue-600', 
              bg: 'bg-blue-600/10',
              action: () => document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' })
            },
            { 
              id: 'finance',
              label: t('client.stats.finance'), 
              value: documents.filter(d => ['INVOICE', 'QUOTE'].includes(d.type)).length.toString(), 
              icon: FileText, 
              color: 'text-indigo-600', 
              bg: 'bg-indigo-600/10', 
              action: () => setShowAllDocs(true) 
            },
            { 
              id: 'total_progress',
              label: t('client.stats.total_progress'), 
              value: projects.length > 0 ? `${Math.round(projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length)}%` : '0%', 
              icon: TrendingUp, 
              color: 'text-amber-600', 
              bg: 'bg-amber-600/10',
              subtitle: 'Ensemble des chantiers',
              action: () => document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' })
            },
            { 
              id: 'topo_calc',
              label: t('client.stats.topo_calc'), 
              value: 'Prêt', 
              icon: Target, 
              color: 'text-rose-600', 
              bg: 'bg-rose-600/10', 
              subtitle: 'Surfaces & Distances',
              action: () => navigate('/maps')
            },
          ].map((stat, i) => (
            <motion.div 
              key={`client-stat-${stat.id || i}-${i}`}
              initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={stat.action}
            className={cn(
              "bg-card border rounded-2xl p-5 flex flex-col gap-3 transition-all group",
              stat.action && "cursor-pointer hover:shadow-xl hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-2.5 rounded-xl transition-all group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              {stat.action && <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-black tracking-tight mt-1">{stat.value}</p>
              {'subtitle' in stat && <p className="text-[9px] text-muted-foreground mt-1">{stat.subtitle}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects List */}
        <div id="projects-section" className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold border-l-4 border-primary pl-4 tracking-tighter uppercase">{t('client.my_projects')}</h2>
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button 
                onClick={() => setView('grid')}
                className={cn("p-1.5 rounded-md transition-all", view === 'grid' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView('list')}
                className={cn("p-1.5 rounded-md transition-all", view === 'list' ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className={cn(
            "grid gap-6",
            view === 'grid' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            {projects.map((project, i) => (
              <ProjectCard 
                key={`client-project-card-${project.id || i}-${i}`} 
                project={project} 
                onClick={() => setSelectedProject(project)}
                onRate={handleRate}
              />
            ))}
          </div>
          {projects.length === 0 && (
            <div className="p-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
              {t('client.no_projects')}
            </div>
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Finance Widget */}
          <section className="bg-card border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl transition-all group-hover:bg-primary/10" />
            <h3 className="font-bold mb-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground relative z-10">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t('client.finance_summary')}
            </h3>
            
            <div className="space-y-4 relative z-10">
              <div className="bg-muted/30 rounded-2xl p-4 border border-dashed">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">{t('client.total_engaged')}</p>
                <p className="text-2xl font-black tracking-tighter">{(documents.filter(d => ['INVOICE', 'QUOTE'].includes(d.type)).reduce((acc, d) => acc + (d.amount?.ttc || 0), 0)).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/10 flex items-center justify-between">
                  <p className="text-[9px] font-bold uppercase text-emerald-600 tracking-tighter">{t('client.paid_validated')}</p>
                  <p className="font-black text-emerald-700">{(documents.filter(d => d.isSigned).reduce((acc, d) => acc + (d.amount?.ttc || 0), 0)).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</p>
                </div>
                <div className="bg-amber-500/5 rounded-2xl p-4 flex items-center justify-between border border-amber-500/10">
                  <p className="text-[9px] font-bold uppercase text-amber-600 tracking-tighter">{t('common.pending')}</p>
                  <p className="font-black text-amber-700 cursor-help" title="Invoices not yet signed">{(documents.filter(d => d.type === 'INVOICE' && !d.isSigned).reduce((acc, d) => acc + (d.amount?.ttc || 0), 0)).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</p>
                </div>
              </div>

              <button 
                onClick={() => setShowAllDocs(true)}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {t('client.invoice_details')}
              </button>
            </div>
          </section>

          {/* Quick Actions / Notifications */}
          <section className="bg-card border rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
              <Bell className="w-4 h-4 text-primary" />
              {t('client.recent_activity')}
            </h3>
            <div className="space-y-6">
               {notifications.length > 0 ? notifications.slice(0, 6).map((notif, i) => (
                <div 
                  key={`client-act-notif-${notif.id || `idx-${i}`}-${i}`} 
                  onClick={() => {
                    if (notif.link) navigate(notif.link);
                    dbService.markNotificationAsRead(notif.id);
                  }}
                  className="flex gap-4 group cursor-pointer"
                >
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all border",
                      notif.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary border-primary/20"
                    )}>
                      {notif.type === 'MESSAGE' ? <MessageSquare className="w-5 h-5" /> : 
                       notif.type === 'PROJECT' ? <MapIcon className="w-5 h-5" /> :
                       notif.type === 'DOCUMENT' ? <FileText className="w-5 h-5" /> :
                       <Bell className="w-5 h-5" />}
                    </div>
                    {i !== notifications.slice(0, 6).length - 1 && <div className="w-0.5 h-full bg-border my-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-70 truncate">{notif.senderName}</p>
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                        {notif.timestamp?.toDate ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true, locale: i18n.language === 'fr' ? fr : undefined }) : t('common.just_now')}
                      </span>
                    </div>
                    <p className={cn(
                      "text-xs mt-1 transition-colors leading-tight",
                      notif.read ? "text-muted-foreground" : "font-bold text-foreground group-hover:text-primary"
                    )}>{notif.content}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 opacity-50">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs">{t('client.no_activity')}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
        </>
      ) : (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-card border rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-2">{t('client.pro_link_title')}</h2>
            <p className="text-muted-foreground mb-8">{t('client.pro_link_desc')}</p>

            {user.linkedTopographerId ? (
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/20">
                    {linkedCabinet?.avatar ? (
                      <img src={linkedCabinet.avatar} className="w-full h-full object-cover rounded-3xl" alt={linkedCabinet.name} />
                    ) : (
                      <Shield className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                       <Check className="w-3 h-3" />
                       {t('client.linked_account_active')}
                    </p>
                    <h3 className="text-xl font-bold mt-1 text-foreground">
                      {linkedCabinet ? (linkedCabinet.company || linkedCabinet.name) : t('client.linked_partner_connected')}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {linkedCabinet?.email}
                      </p>
                      {linkedCabinet?.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {linkedCabinet.city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => navigate(`/profile/${linkedCabinet?.id}`)}
                    className="flex items-center gap-2 text-primary font-bold bg-primary/10 hover:bg-primary/20 px-5 py-2.5 rounded-xl transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span>{t('common.view') || 'Voir Profil'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex items-start gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-700">{t('client.no_linked_cabinet')}</h3>
                    <p className="text-sm text-amber-600/80 mt-1">{t('client.find_cabinet_desc')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <SearchIcon className="w-5 h-5 text-primary" />
                    {t('client.search_pro_title')}
                  </h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t('client.search_pro_placeholder')}
                      value={proSearchQuery}
                      onChange={(e) => setProSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchPros()}
                      className="flex-1 bg-muted border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button 
                      onClick={searchPros}
                      disabled={isSearching}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {isSearching ? t('client.searching') : t('common.search')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {proSearchResults.map((pro, i) => (
                      <motion.div 
                        key={`pro-res-${pro.id || `idx-${i}`}-${i}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-muted/50 border rounded-2xl p-5 hover:border-primary/30 transition-all flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {pro.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold">{pro.name}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{pro.company || t('client.independent_cabinet')}</p>
                            <p className="text-[10px] text-muted-foreground">{pro.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => sendRequest(pro.id)}
                          className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                          title={t('client.send_link_request')}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                    {proSearchResults.length === 0 && proSearchQuery && !isSearching && (
                      <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-3xl">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>{t('client.no_pro_found')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
