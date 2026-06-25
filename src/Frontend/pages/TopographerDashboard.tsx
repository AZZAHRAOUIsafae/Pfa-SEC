import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Map as MapIcon, 
  MapPin, 
  FileText, 
  Plus, 
  Layers, 
  Maximize2, 
  Lock,
  Search,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  X,
  Target,
  Loader2,
  MessageSquare,
  Folder,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Database,
  Globe,
  Check as CheckIcon,
  Star,
  History as HistoryIcon,
  ChevronDown,
  ArrowUpRight,
  Calendar,
  Clock,
  CloudRain,
  Sun,
  CloudLightning,
  Mail,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Project, User, ProjectDocument, Intervention, ConnectionRequest } from '../../Backend/types';
import { cn } from '../../Backend/lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ProjectDetailsOverlay from '../components/ProjectDetailsOverlay';
import DocumentGeneratorModal from '../components/DocumentGeneratorModal';
import { dbService } from '../../Backend/services/db';
import { exportToCSV, exportToJSON } from '../../Backend/lib/exportUtils';
import { auth } from '../../Backend/lib/firebase';
import DocumentViewer from '../components/DocumentViewer';
import { useNavigate, useLocation } from 'react-router-dom';

// Fix for default marker icons in React Leaflet
import L from 'leaflet';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapEvents() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.on('mousemove', (e) => {
      // Simulating real-time coordinate update
    });
  }, [map]);
  return null;
}

interface TopographerDashboardProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  clients: User[];
  initialTab?: 'projects' | 'planning' | 'maps' | 'finance' | 'uploads' | 'technical';
  user: User;
  documents: ProjectDocument[];
}

import TopoMapView from '../components/TopoMapView';

export default function TopographerDashboard({ projects, setProjects, clients, initialTab = 'projects', user, documents }: TopographerDashboardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locationState = useLocation();
  const [activeTab, setActiveTab] = useState<'projects' | 'planning' | 'maps' | 'finance' | 'uploads' | 'technical' | 'reviews'>(initialTab as any);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [isTechnicalModalOpen, setIsTechnicalModalOpen] = useState(false);
  const [technicalFile, setTechnicalFile] = useState<File | null>(null);
  const [importProjectId, setImportProjectId] = useState<string>('');
  const [importUrl, setImportUrl] = useState<string>('');
  const [isDocGeneratorOpen, setIsDocGeneratorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [financeSearch, setFinanceSearch] = useState('');
  const [financeStatusFilter, setFinanceStatusFilter] = useState('ALL');
  const [financeTypeFilter, setFinanceTypeFilter] = useState('ALL');
  const [isPFAGuideOpen, setIsPFAGuideOpen] = useState(false);

  // Availability configurations states
  const [availabilityDays, setAvailabilityDays] = useState<string[]>(
    user.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  );
  const [availabilityHours, setAvailabilityHours] = useState<{ start: string; end: string }>(
    user.availability?.hours || { start: '08:00', end: '17:00' }
  );
  const [weatherRiskThreshold, setWeatherRiskThreshold] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(
    user.availability?.weatherRiskThreshold || 'MEDIUM'
  );
  const [isAutoWeatherReschedulingEnabled, setIsAutoWeatherReschedulingEnabled] = useState<boolean>(
    user.availability?.isAutoWeatherReschedulingEnabled !== false
  );
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilitySavedMessage, setAvailabilitySavedMessage] = useState<string | null>(null);

  const handleSaveAvailability = async () => {
    setIsSavingAvailability(true);
    setAvailabilitySavedMessage(null);
    try {
      await dbService.updateUser(user.id, {
        availability: {
          days: availabilityDays,
          hours: availabilityHours,
          weatherRiskThreshold,
          isAutoWeatherReschedulingEnabled
        }
      });
      setAvailabilitySavedMessage(t('scheduler.success_notification'));
      setTimeout(() => setAvailabilitySavedMessage(null), 4000);
    } catch (e) {
      console.error("Error saving availability:", e);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };
 
  useEffect(() => {
    // Connection requests subscription
    let unsubscribeReqs = () => {};
    let unsubscribeReviews = () => {};
    if (auth.currentUser) {
      unsubscribeReqs = dbService.subscribeToIncomingRequests(auth.currentUser.uid, setIncomingRequests);
      unsubscribeReviews = dbService.subscribeToReviews(auth.currentUser.uid, user.role, setReviews);
    }
    return () => {
      unsubscribeReqs();
      unsubscribeReviews();
    };
  }, []);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportData = (type: 'projects' | 'finance', format: 'csv' | 'json') => {
    let dataToExport: any[] = [];
    const filename = `export_${type}_${new Date().toISOString().split('T')[0]}`;
    const userEmail = auth.currentUser?.email || user.email;

    if (type === 'projects') {
      dataToExport = projects.map(p => ({
        ID: p.id,
        Nom: p.name,
        Client: p.clientName,
        Statut: p.status,
        Date: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : new Date(p.createdAt.seconds * 1000).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'en' ? 'en-US' : 'fr-FR')) : 'N/A'
      }));
    } else {
      dataToExport = documents.filter(d => ['INVOICE', 'QUOTE'].includes(d.type)).map(d => ({
        Ref: d.id,
        Type: d.type,
        Montant: d.amount?.ttc || 0,
        Etat: d.isSigned ? t('status.paid') : t('status.pending'),
        Date: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt.seconds * 1000).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'en' ? 'en-US' : 'fr-FR')) : 'N/A'
      }));
    }

    if (format === 'json') {
      exportToJSON(dataToExport, filename, userEmail);
    } else {
      exportToCSV(dataToExport, filename, `Export ${type.toUpperCase()} - ${user.name}`, userEmail);
    }
    setIsExportMenuOpen(false);
  };

  const handleRequestAction = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await dbService.handleConnectionRequest(requestId, status);
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error("Failed to handle request:", error);
    }
  };

  const handleCreateDocument = async (docData: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      await dbService.createDocument(docData);
      // Create notification for client
      const project = projects.find(p => p.id === docData.projectId);
      await dbService.createNotification({
        userId: docData.clientId,
        senderId: user.id || auth.currentUser?.uid || '',
        senderName: user.name || 'Votre Topographe',
        senderAvatar: user.avatar,
        type: 'DOCUMENT',
        content: `Nouveau document disponible : ${docData.name}`,
        link: '/documents'
      });
      setIsDocGeneratorOpen(false);
    } catch (error) {
      console.error('Failed to create document:', error);
      alert(t('common.alerts.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportTechnical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importProjectId || !technicalFile) return;
    setIsSubmitting(true);
    try {
      const project = projects.find(p => p.id === importProjectId);
      if (project) {
        const fileData = {
          id: Math.random().toString(36).substring(7),
          name: technicalFile.name,
          date: new Date().toISOString().split('T')[0],
          size: `${(technicalFile.size / 1024).toFixed(1)} KB`
        };
        const updatedTechFiles = [...(project.technicalFiles || []), fileData];
        await dbService.updateProject(importProjectId, { technicalFiles: updatedTechFiles });
        setIsTechnicalModalOpen(false);
        setTechnicalFile(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportTechnical = (project: Project) => {
    const points = Array.from({ length: 50 }, (_, i) => ({
      ID: i + 1,
      X: (450000 + Math.random() * 1000).toFixed(3),
      Y: (320000 + Math.random() * 1000).toFixed(3),
      Z: (100 + Math.random() * 10).toFixed(3)
    }));
    dbService.exportToCSV(points, `COORD_${project.name}.csv`);
  };
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [planningForm, setPlanningForm] = useState<Omit<Intervention, 'id'>>({
    projectId: '',
    projectName: '',
    topographerId: '',
    clientId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    title: '',
    description: '',
    status: 'PLANNED',
    type: 'LEVE'
  });

  const [importMeasurements, setImportMeasurements] = useState({
    area: 0,
    perimeter: 0,
    altitude: 0
  });

  useEffect(() => {
    if (locationState.state?.importMapUrl) {
      setActiveTab('maps');
      setImportUrl(locationState.state.importMapUrl);
      // Pre-select project if possible
      const candidate = projects.find(p => p.clientId === locationState.state.clientId);
      if (candidate) setImportProjectId(candidate.id);
    }
  }, [locationState.state, projects]);

  const handleSaveImportedLocation = async () => {
    if (!importUrl || !importProjectId) {
      alert(t('common.alerts.fill_fields'));
      return;
    }

    const coords = dbService.parseGoogleMapsUrl(importUrl);
    if (!coords) {
      alert(t('common.alerts.invalid_url'));
      return;
    }

    // Add altitude if provided
    if (importMeasurements.altitude) {
      coords.z = importMeasurements.altitude;
    }

    setIsSubmitting(true);
    try {
      await dbService.updateProject(importProjectId, {
        coordinates: coords,
        location: importUrl.includes('search') ? "Position partagée (Recherche)" : "Position partagée (Précise)",
        area: importMeasurements.area > 0 ? importMeasurements.area : undefined,
        perimeter: importMeasurements.perimeter > 0 ? importMeasurements.perimeter : undefined,
      });
      alert(t('common.alerts.position_updated'));
      setImportUrl('');
      setImportMeasurements({ area: 0, perimeter: 0, altitude: 0 });
      // Update local state if needed (App.tsx subscription should handle this)
    } catch (e) {
      console.error(e);
      alert(t('common.alerts.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    setActiveTab(initialTab || 'projects');
  }, [initialTab]);

  useEffect(() => {
    if (auth.currentUser?.uid) {
      const unsub = dbService.subscribeToInterventions(auth.currentUser.uid, user.role, (data) => {
        setInterventions(data);
      });
      return () => unsub();
    }
  }, [user.role]);
  const [isAddPrjOpen, setIsAddPrjOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsModalType, setStatsModalType] = useState<'active' | 'deliverables' | 'area' | 'finance'>('active');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeDoc, setActiveDoc] = useState<ProjectDocument | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  
  // Finance Document Creation State
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeForm, setFinanceForm] = useState({
    projectId: '',
    name: '',
    amountHT: 0,
    acompte: 0
  });

  useEffect(() => {
    // Relying on prop documents
  }, [projects]);
  const [isSubmittingIgnored, setIsSubmittingIgnored] = useState(false);
  const [newPrj, setNewPrj] = useState({ 
    name: '', 
    clientId: '', 
    deadline: '', 
    description: '', 
    location: '', 
    area: '',
    lat: '33.5731',
    lng: '-7.5898',
    startDate: new Date().toLocaleDateString('fr-FR') 
  });
  const [uploadData, setUploadData] = useState({ projectId: '', type: 'MAP' as const });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!uploadData.projectId || !selectedFile) {
      alert(t('common.alerts.select_project_file'));
      return;
    }
    setIsSubmitting(true);
    try {
      const project = projects.find(p => p.id === uploadData.projectId);
      if (!project) return;

      const docName = selectedFile.name;
      
      // Convert to Base64 for persistence if small enough (< 800KB to stay safe with 1MB Firestore limit)
      let fileUrl = URL.createObjectURL(selectedFile);
      if (selectedFile.size < 800 * 1024) {
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(selectedFile);
        });
      }

      await dbService.addDocument({
        projectId: project.id,
        clientId: project.clientId,
        topographerId: project.topographerId,
        name: docName,
        type: uploadData.type as any,
        url: fileUrl,
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
        createdAt: new Date().toISOString()
      });

      const currentUser = await dbService.getUser(auth.currentUser?.uid || '');
      if (currentUser) {
        await dbService.createNotification({
          userId: project.clientId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          type: 'DOCUMENT',
          content: `A ajouté un nouveau document: ${docName}`,
          link: '/documents'
        });
      }
      alert(t('common.alerts.upload_success'));
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading:', error);
      alert(t('common.alerts.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const client = clients.find(c => c.id === newPrj.clientId);
    
    const project: Omit<Project, 'id'> = {
      name: newPrj.name,
      description: newPrj.description,
      status: 'IN_PROGRESS',
      progress: 0,
      currentStep: 1, // Projet accepté
      startDate: newPrj.startDate,
      estimatedDelivery: newPrj.deadline,
      deadline: newPrj.deadline,
      location: newPrj.location,
      topographerId: auth.currentUser?.uid || 'current-topo',
      clientId: newPrj.clientId,
      clientName: client?.name || 'Client Inconnu',
      adminEmail: user.adminEmail || user.email,
      adminId: user.adminId || user.id,
      area: parseFloat(newPrj.area) || 0,
      coordinates: { 
        lat: parseFloat(newPrj.lat) || 33.5731, 
        lng: parseFloat(newPrj.lng) || -7.5898 
      }
    };
    
    try {
      await dbService.createProject(project);
      setIsAddPrjOpen(false);
      setNewPrj({ 
        name: '', 
        clientId: '', 
        deadline: '', 
        description: '', 
        location: '', 
        area: '',
        lat: '33.5731',
        lng: '-7.5898',
        startDate: new Date().toLocaleDateString('fr-FR') 
      });

      // Send notification to client
      const currentUser = await dbService.getUser(auth.currentUser?.uid || '');
      if (currentUser) {
        await dbService.createNotification({
          userId: project.clientId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          type: 'PROJECT',
          content: `A créé un nouveau projet: ${project.name}`,
          link: '/'
        });
      }
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProjectStatus = async (id: string, status: Project['status']) => {
    try {
      await dbService.updateProjectStatus(id, status);
      const project = projects.find(p => p.id === id);
      if (project) {
        await dbService.createNotification({
          userId: project.clientId,
          senderId: auth.currentUser?.uid || '',
          senderName: 'Topographe',
          type: 'PROJECT',
          content: `Votre projet "${project.name}" est maintenant ${status === 'IN_PROGRESS' ? 'en cours' : status}`,
          link: '/'
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planningForm.projectId || !planningForm.title || !planningForm.date) {
      alert(t('common.alerts.fill_fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      const project = projects.find(p => p.id === planningForm.projectId);
      if (!project) throw new Error("Projet non trouvé");

      await dbService.createIntervention({
        ...planningForm,
        projectName: project.name,
        clientId: project.clientId,
        topographerId: auth.currentUser?.uid || ''
      });

      // Notify Client
      const currentUser = await dbService.getUser(auth.currentUser?.uid || '');
      await dbService.createNotification({
        userId: project.clientId,
        senderId: auth.currentUser?.uid || '',
        senderName: currentUser?.name || 'Topographe',
        senderAvatar: currentUser?.avatar,
        type: 'PROJECT',
        content: `A planifié une intervention de type ${planningForm.type} pour le ${planningForm.date} à ${planningForm.startTime}`,
        link: '/planning'
      });

      setIsPlanningModalOpen(false);
      setPlanningForm({
        projectId: '',
        projectName: '',
        topographerId: '',
        clientId: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        title: '',
        description: '',
        status: 'PLANNED',
        type: 'LEVE'
      });
      alert(t('common.alerts.position_updated')); // Or generic success
    } catch (error) {
      console.error("Error creating intervention:", error);
      alert(t('common.alerts.save_error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProgress = async (id: string, progress: number) => {
    // Parent subscription will update UI
    const project = projects.find(p => p.id === id);
    try {
      await dbService.updateProjectProgress(id, progress);

      // Send notification to client if progress is significant (e.g., 25, 50, 75, 100)
      if (project && [25, 50, 75, 100].includes(progress)) {
        const currentUser = await dbService.getUser(auth.currentUser?.uid || '');
        if (currentUser) {
          await dbService.createNotification({
            userId: project.clientId,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatar,
            type: 'PROJECT',
            content: i18n.language === 'ar' 
              ? `قام بتحديث المشروع "${project.name}" إلى ${progress}%`
              : i18n.language === 'en'
                ? `Updated project "${project.name}" to ${progress}%`
                : `A mis à jour le projet "${project.name}" à ${progress}%`,
            link: '/'
          });
        }
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const updateProjectDetails = async (id: string, data: Partial<Project>) => {
    try {
      await dbService.updateProject(id, data);
    } catch (error) {
      console.error("Error updating project details:", error);
    }
  };

  const STEPS = [
    t('common.steps.step_0'),
    t('common.steps.step_1'),
    t('common.steps.step_2'),
    t('common.steps.step_3'),
    t('common.steps.step_4'),
    t('common.steps.step_5')
  ];

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const deliverablesThisMonth = projects.filter(p => {
    if (!p.deadline) return false;
    const date = new Date(p.deadline);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  const totalArea = projects.reduce((acc, p) => acc + (p.area || 0), 0);

  const [exportType, setExportType] = useState<'projects' | 'documents' | 'interventions'>('projects');

  const handleExportCSV = () => {
    try {
      if (exportType === 'projects') {
        dbService.exportToCSV(projects.map(p => ({
          ID: p.id,
          Nom: p.name,
          Client: p.clientName,
          Statut: p.status,
          Lieu: p.location,
          Surface: p.area,
          Date: p.startDate
        })), `projets_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (exportType === 'documents') {
        dbService.exportToCSV(documents.map(d => ({
          ID: d.id,
          Nom: d.name,
          Type: d.type,
          Taille: d.size,
          Signe: d.isSigned ? 'OUI' : 'NON',
          Montant_TTC: d.amount?.ttc || 0
        })), `documents_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (exportType === 'interventions') {
        dbService.exportToCSV(interventions.map(i => ({
          ID: i.id,
          Titre: i.title,
          Projet: i.projectName,
          Date: i.date,
          Heure: i.startTime,
          Type: i.type,
          Status: i.status
        })), `interventions_${new Date().toISOString().split('T')[0]}.csv`);
      }
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Une erreur est survenue lors de l\'exportation CSV.');
    }
  };

  const stats = [
    { id: 'active_projects', label: 'Projets Actifs', value: projects.filter(p => p.status !== 'COMPLETED').length.toString(), color: 'bg-blue-500' },
    { id: 'deliverables', label: 'Livrables ce mois', value: deliverablesThisMonth.toString(), color: 'bg-amber-500' },
    { id: 'area_total', label: 'Surface Totale', value: `${totalArea.toFixed(2)} Ha`, color: 'bg-emerald-500' },
    { id: 'revenue', label: 'CA Prévisionnel', value: (documents.filter(d => d.type === 'INVOICE' || d.type === 'QUOTE').reduce((acc, d) => acc + (d.amount?.ttc || 0), 0)).toLocaleString('fr-FR') + ' DH', color: 'bg-indigo-500' }
  ];

  return (
    <div className="space-y-8 h-full flex flex-col min-h-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-20">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground flex items-center gap-4 font-display">
            {t('topo.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('topo.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 relative z-20">
          <div className="relative z-30">
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
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
                  <div className="p-4 bg-muted/30 border-b">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">{t('client.export_title')}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {[
                      { id: 'projects-csv', label: `${t('client.my_projects')} (CSV)`, icon: HistoryIcon, type: 'projects', format: 'csv' },
                      { id: 'finance-csv', label: `${t('nav.finance')} (CSV)`, icon: TrendingUp, type: 'finance', format: 'csv' },
                      { id: 'json-full', label: `${t('client.export_backup_json')}`, icon: Database, type: 'projects', format: 'json' },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`topo-export-${item.id || idx}-${idx}`}
                          onClick={() => handleExportData(item.type as any, item.format as any)}
                          className="w-full text-left px-4 py-3 text-xs hover:bg-primary/10 rounded-xl transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3 font-bold text-foreground">
                            <Icon className="w-4 h-4 text-primary" />
                            {item.label}
                          </div>
                          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => setIsAddPrjOpen(true)}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            <span>{t('topo.add_project')}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <button 
            key={`topo-stat-card-${stat.id || `stat-${i}`}-${i}`} 
            onClick={() => {
              setStatsModalType(stat.id as any);
              setIsStatsModalOpen(true);
            }}
            className="bg-card border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-lg transition-all text-left group"
          >
            <div className={cn("w-2 h-10 rounded-full transition-all group-hover:h-12", stat.color)} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t(`topo.${stat.id}` as any) || stat.label}</p>
              <p className="text-xl font-black">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex border-b gap-8">
        {(['projects', 'planning', 'maps', 'finance', 'uploads', 'technical', 'reviews'] as const).map((tab, i) => (
          <button
            key={`topo-main-tab-${tab || `tab-${i}`}-${i}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "pb-4 text-sm font-semibold capitalize transition-all relative",
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(`nav.${tab}`)}
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'technical' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-card p-6 border rounded-3xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-primary/10 text-primary rounded-2xl">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t('topo.technical_data_centralization')}</h3>
                  <p className="text-xs text-muted-foreground">{t('topo.technical_data_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsTechnicalModalOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" /> {t('topo.import_terrain')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p, i) => (
                <div key={`topo-tech-card-${p.id || `idx-${i}`}-${i}`} className="bg-card border rounded-3xl p-6 hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center font-black text-primary text-xl">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold">{p.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{p.clientName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">{t('topo.attached_files')}</p>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {p.technicalFiles && p.technicalFiles.length > 0 ? p.technicalFiles.map((file, fileIdx) => (
                        <div key={`tech-file-${p.id || 'prj'}-${file.id || `file-${fileIdx}`}-${fileIdx}`} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-xl text-[10px] font-bold">
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>{file.name}</span>
                          <span className="opacity-50 font-medium">({file.size})</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-muted-foreground italic px-1">{t('topo.no_tech_files')}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleExportTechnical(p)}
                      className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export XYZ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
         {activeTab === 'planning' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-6 border rounded-2xl gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t('scheduler.appointment_title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('scheduler.appointment_desc')}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPlanningModalOpen(true)}
                className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-md self-stretch sm:self-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                {t('scheduler.schedule_field_trip')}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Col 1 : Appointments and live scheduling calendar */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Simulated Weekly Calendar Timeline */}
                <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-bold text-sm tracking-tight flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> {t('scheduler.weekly_view')}
                    </h4>
                    <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{t('scheduler.real_time')}</span>
                  </div>
                  
                  {/* Calendar Matrix View */}
                  <div className="grid grid-cols-7 gap-1 text-center border rounded-xl overflow-hidden bg-muted/20 font-mono text-[10px]">
                    {[
                      t('scheduler.days_short_mon'), 
                      t('scheduler.days_short_tue'), 
                      t('scheduler.days_short_wed'), 
                      t('scheduler.days_short_thu'), 
                      t('scheduler.days_short_fri'), 
                      t('scheduler.days_short_sat'), 
                      t('scheduler.days_short_sun')
                    ].map((d, index) => {
                      const daysMap: Record<number, string> = { 0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 4: 'Friday', 5: 'Saturday', 6: 'Sunday' };
                      const isWorking = availabilityDays.includes(daysMap[index]);
                      return (
                        <div key={`cal-head-${daysMap[index]}`} className={cn(
                          "py-2 font-bold border-b",
                          isWorking ? "bg-card text-foreground" : "bg-zinc-100 text-muted-foreground/60 dark:bg-zinc-800"
                        )}>
                          <div>{d}</div>
                          <div className="text-[8px] font-medium opacity-70">
                            {isWorking ? t('scheduler.available') : t('scheduler.closed')}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                    {t('scheduler.open_slots_between', { 
                      start: availabilityHours.start, 
                      end: availabilityHours.end, 
                      dispo: t('scheduler.available') 
                    })}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" /> {t('scheduler.scheduled_interventions')}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {interventions.length > 0 ? interventions.map((int, intIdx) => {
                      // Simulated Weather calculator
                      const dayVal = parseInt(int.date?.split('-')[2] || '1', 10);
                      let weatherStatus: 'SUNNY' | 'RAINY' | 'STORM' = 'SUNNY';
                      let weatherDescription = t('scheduler.clear_blue_sky');
                      let weatherSafety: 'SAFE' | 'VIGILANCE' | 'DANGER' = 'SAFE';

                      if (dayVal % 4 === 0) {
                        weatherStatus = 'STORM';
                        weatherDescription = t('scheduler.storm_alert');
                        weatherSafety = 'DANGER';
                      } else if (dayVal % 2 === 0) {
                        weatherStatus = 'RAINY';
                        weatherDescription = t('scheduler.intermittent_rain');
                        weatherSafety = 'VIGILANCE';
                      }

                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={`topo-planning-int-${int.id || `idx-${intIdx}`}-${intIdx}`}
                          className={cn(
                            "bg-card border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden",
                            weatherSafety === 'DANGER' ? "border-rose-300 dark:border-rose-900" :
                            weatherSafety === 'VIGILANCE' ? "border-amber-300 dark:border-amber-900" : ""
                          )}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <div className={cn(
                                "p-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                int.status === 'PLANNED' ? "bg-blue-100 text-blue-600" :
                                int.status === 'IN_PROGRESS' ? "bg-amber-100 text-amber-600" :
                                int.status === 'COMPLETED' ? "bg-emerald-100 text-emerald-600" :
                                "bg-rose-100 text-rose-600"
                              )}>
                                {int.status}
                              </div>
                              <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted/60 px-2 py-0.5 rounded">{int.type || 'INTERVENTION'}</span>
                            </div>

                            <h4 className="font-bold text-sm mb-1">{int.title}</h4>
                            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{int.description}</p>
                            
                            <div className="space-y-2 py-3 border-y border-muted/50 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Folder className="w-3.5 h-3.5 text-primary" />
                                <span className="font-bold truncate text-foreground">{int.projectName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span className="font-mono text-[11px] text-foreground">{int.date} {i18n.language === 'ar' ? 'على الساعة' : i18n.language === 'en' ? 'at' : 'à'} {int.startTime}</span>
                              </div>
                            </div>

                            {/* Dynamic Weather Risk Simulator section */}
                            <div className="mt-4 p-3 rounded-xl bg-muted/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">{t('scheduler.weather_diagnostic')}</span>
                                {weatherStatus === 'SUNNY' && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><Sun className="w-3 h-3" /> {t('scheduler.favorable')}</span>}
                                {weatherStatus === 'RAINY' && <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><CloudRain className="w-3 h-3" /> {t('scheduler.vigilance')}</span>}
                                {weatherStatus === 'STORM' && <span className="flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full"><CloudLightning className="w-3 h-3" /> {t('scheduler.cancelled_risk')}</span>}
                              </div>
                              <p className="text-[11px] font-semibold text-foreground leading-snug">{weatherDescription}</p>

                              {/* Automated scheduled/sent email simulator */}
                              <div className="border-t border-dashed mt-2 pt-2 space-y-1">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {t('scheduler.scheduled_emails')}
                                </span>
                                {weatherStatus === 'SUNNY' ? (
                                  <div className="text-[10px] text-emerald-700 bg-emerald-50/50 p-1.5 rounded border border-emerald-100 flex items-center justify-between mt-1">
                                    <span className="truncate">{t('scheduler.email_confirm_meeting', { date: int.date })}</span>
                                    <span className="text-[8px] bg-emerald-200 px-1 rounded uppercase font-bold shrink-0">{t('scheduler.sent')}</span>
                                  </div>
                                ) : weatherStatus === 'RAINY' ? (
                                  <div className="text-[10px] text-amber-700 bg-amber-50/50 p-1.5 rounded border border-amber-100 flex items-center justify-between mt-1">
                                    <span className="truncate">{t('scheduler.email_vigilance_rain')}</span>
                                    <span className="text-[8px] bg-amber-200 px-1 rounded uppercase font-bold shrink-0">{t('scheduler.verified')}</span>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    <div className="text-[10px] text-rose-700 bg-rose-50/50 p-1.5 rounded border border-rose-100 flex items-center justify-between">
                                      <span className="truncate">{t('scheduler.email_urgent_cancel')}</span>
                                      <span className="text-[8px] bg-rose-600 text-white px-1 rounded uppercase font-bold shrink-0">{t('scheduler.planned')}</span>
                                    </div>
                                    {isAutoWeatherReschedulingEnabled && (
                                      <div className="text-[9px] text-blue-700 italic">
                                        {t('scheduler.auto_reschedule_alert')}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t">
                            {int.status !== 'COMPLETED' && (
                              <button 
                                onClick={() => dbService.updateIntervention(int.id, { status: 'COMPLETED' })}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-bold transition-colors"
                              >
                                {t('scheduler.finished')}
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if(confirm(t('scheduler.delete_confirm'))) dbService.deleteIntervention(int.id);
                              }}
                              className="px-2 py-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors border border-rose-100"
                              title={t('common.cancel')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="col-span-full py-12 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground font-medium">{t('scheduler.no_interventions')}</p>
                        <button 
                          onClick={() => setIsPlanningModalOpen(true)}
                          className="mt-4 text-primary font-bold hover:underline text-sm"
                        >
                          {t('scheduler.schedule_field_trip')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 2 : Availability and Work Schedule Setup settings */}
              <div className="space-y-6">
                <div className="bg-card border rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{t('scheduler.hours_availability')}</h4>
                      <p className="text-[10px] text-muted-foreground">{t('scheduler.configure_constraints')}</p>
                    </div>
                  </div>

                  {/* Toggles for Weekly Working Days */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('scheduler.open_days')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'Monday', label: 'Lundi' },
                        { key: 'Tuesday', label: 'Mardi' },
                        { key: 'Wednesday', label: 'Mercredi' },
                        { key: 'Thursday', label: 'Jeudi' },
                        { key: 'Friday', label: 'Vendredi' },
                        { key: 'Saturday', label: 'Samedi' },
                        { key: 'Sunday', label: 'Dimanche' }
                      ].map((dayObj) => {
                        const isSelected = availabilityDays.includes(dayObj.key);
                        return (
                          <button
                            type="button"
                            key={`btn-day-toggle-${dayObj.key}`}
                            onClick={() => {
                              if (isSelected) {
                                setAvailabilityDays(availabilityDays.filter(d => d !== dayObj.key));
                              } else {
                                setAvailabilityDays([...availabilityDays, dayObj.key]);
                              }
                            }}
                            className={cn(
                              "text-left p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between transition-all",
                              isSelected 
                                ? "bg-primary/5 border-primary text-primary shadow-sm" 
                                : "hover:bg-muted border-muted text-muted-foreground"
                            )}
                          >
                            <span>{t(`scheduler.days.${dayObj.key}`)}</span>
                            <div className={cn(
                              "w-3 h-3 rounded-full border",
                              isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                            )} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Daily Hours Selectors */}
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('scheduler.daily_slot')}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">{t('scheduler.start_hour')}</span>
                        <input
                          type="time"
                          value={availabilityHours.start}
                          onChange={(e) => setAvailabilityHours({ ...availabilityHours, start: e.target.value })}
                          className="w-full bg-muted border-none rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">{t('scheduler.end_hour')}</span>
                        <input
                          type="time"
                          value={availabilityHours.end}
                          onChange={(e) => setAvailabilityHours({ ...availabilityHours, end: e.target.value })}
                          className="w-full bg-muted border-none rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automated Weather Resilience Rules */}
                  <div className="space-y-4 pt-4 border-t">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('scheduler.weather_management')}</label>
                    
                    <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">{t('scheduler.intelligent_auto_reschedule')}</p>
                        <p className="text-[9px] text-muted-foreground">{t('scheduler.auto_reschedule_desc')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAutoWeatherReschedulingEnabled(!isAutoWeatherReschedulingEnabled)}
                        className={cn(
                          "w-10 h-6 rounded-full p-1 transition-all",
                          isAutoWeatherReschedulingEnabled ? "bg-primary" : "bg-muted border border-muted-foreground/20"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-white transition-all",
                          isAutoWeatherReschedulingEnabled ? "translate-x-4" : "translate-x-0"
                        )} />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{t('scheduler.critical_cancel_threshold')}</span>
                      <select
                        value={weatherRiskThreshold}
                        onChange={(e) => setWeatherRiskThreshold(e.target.value as any)}
                        className="w-full bg-muted border-none rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-primary outline-none"
                      >
                        <option value="LOW">{t('scheduler.threshold_strict')}</option>
                        <option value="MEDIUM">{t('scheduler.threshold_medium')}</option>
                        <option value="HIGH">{t('scheduler.threshold_tolerant')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Submission and saved alerts */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      disabled={isSavingAvailability}
                      onClick={handleSaveAvailability}
                      className="w-full bg-primary text-primary-foreground text-xs font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSavingAvailability ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('scheduler.updating')}
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4" />
                          {t('scheduler.save_hours_rules')}
                        </>
                      )}
                    </button>

                    {availabilitySavedMessage && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold p-2 text-center rounded-xl"
                      >
                        {availabilitySavedMessage}
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            {incomingRequests.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 animate-in slide-in-from-top duration-500">
                <h3 className="text-lg font-black flex items-center gap-2 mb-6">
                  <Database className="w-5 h-5 text-primary" />
                  {t('topo.new_connection_requests', { count: incomingRequests.length })}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {incomingRequests.map((req, i) => (
                    <motion.div 
                      key={`req-topo-${req.id || `ridx-${i}`}-${i}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-card border rounded-2xl p-5 flex flex-col items-center text-center gap-4 hover:shadow-md transition-all"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-2xl">
                        {req.senderName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black">{req.senderName}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{req.senderEmail}</p>
                      </div>
                      <div className="flex items-center gap-2 w-full mt-2">
                        <button 
                          onClick={() => handleRequestAction(req.id, 'ACCEPTED')}
                          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" /> {t('common.accept')}
                        </button>
                        <button 
                          onClick={() => handleRequestAction(req.id, 'REJECTED')}
                          className="p-3 bg-muted text-muted-foreground rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                          title={t('common.reject')}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-card border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-bold">{t('common.project')}</th>
                      <th className="px-6 py-4 font-bold">{t('common.client')}</th>
                      <th className="px-6 py-4 font-bold">{t('topo.step_progress')}</th>
                      <th className="px-6 py-4 font-bold">{t('topo.estimated_delivery')}</th>
                      <th className="px-6 py-4 font-bold">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {projects.map((p, i) => (
                      <tr key={`topo-prj-table-row-${p.id || `idx-${i}`}-${i}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold">{p.name}</p>
                          <div className="flex items-center gap-2">
                             <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              p.status === 'PENDING' ? "bg-amber-100 text-amber-700" :
                              p.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700" :
                              p.status === 'VALIDATION' ? "bg-purple-100 text-purple-700" :
                              "bg-green-100 text-green-700"
                            )}>
                              {p.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{p.location}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{p.clientName}</td>
                        <td className="px-6 py-4">
                              {p.status === 'PENDING' ? (
                                <button 
                                  onClick={() => updateProjectStatus(p.id, 'IN_PROGRESS')}
                                  className="text-xs font-bold text-primary hover:underline"
                                >
                                  {t('topo.accept_project')}
                                </button>
                              ) : (
                            <div className="space-y-2">
                              <select 
                                value={p.currentStep ?? 0}
                                onChange={(e) => updateProjectDetails(p.id, { currentStep: parseInt(e.target.value) })}
                                className="w-full bg-muted border-none rounded-lg p-1 text-[10px] outline-none"
                              >
                                {STEPS.map((step, stepIdx) => (
                                  <option key={`step-${p.id || `prj-${i}`}-${stepIdx}`} value={stepIdx}>{stepIdx + 1}. {step}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="range" 
                                  min="0" max="100" 
                                  value={p.progress} 
                                  onChange={(e) => updateProgress(p.id, parseInt(e.target.value))}
                                  className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <span className="font-medium text-[10px] font-mono">{p.progress}%</span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            value={p.estimatedDelivery || ''}
                            onChange={(e) => updateProjectDetails(p.id, { estimatedDelivery: e.target.value })}
                            placeholder="ex: 10/05/2026"
                            className="w-full bg-muted border-none rounded-lg p-1.5 text-[10px] outline-none"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setSelectedProject(p)}
                              className="p-2 hover:bg-muted rounded-lg text-primary transition-colors" title="Détails & Plan"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => navigate('/messages', { state: { selectedRecipientId: p.clientId } })}
                              className="p-2 hover:bg-muted rounded-lg text-primary transition-colors" title="Chat"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="p-2 hover:bg-muted rounded-lg text-primary transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                          {t('topo.no_active_projects')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'maps' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-auto lg:h-[700px]">
            <div className="lg:col-span-3 bg-card border rounded-3xl overflow-hidden shadow-inner relative h-[500px] lg:h-full">
              <TopoMapView 
                points={projects} 
                onSave={(data) => {
                  if (importProjectId) {
                    dbService.updateProject(importProjectId, data);
                    alert("Mesures cartographiques enregistrées pour le projet !");
                  } else {
                    alert("Veuillez d'abord sélectionner un projet dans le panneau de droite.");
                  }
                }}
              />
            </div>
            
            <div className="space-y-6">
              <section className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="font-bold flex items-center gap-2 mb-6 text-[10px] uppercase tracking-widest text-primary">
                  <Calculator className="w-4 h-4" />
                  {t('topo.calc_topo_save')}
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Source : Lien Maps Clients</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="Collez le lien Maps ici..."
                        className="w-full bg-muted border-none rounded-xl p-3 pl-9 text-xs focus:ring-1 focus:ring-primary outline-none"
                      />
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Affectation de l'espace</label>
                    <select 
                      value={importProjectId}
                      onChange={(e) => setImportProjectId(e.target.value)}
                      className="w-full bg-muted border-none rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary outline-none appearance-none"
                    >
                      <option value="">Lier à un projet...</option>
                      {projects.map((p, i) => (
                        <option key={`map-import-prj-${p.id || `prj-${i}`}-${i}`} value={p.id}>{p.name} - {p.clientName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 border-t border-muted/50 mt-2">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Mesures Manuelles / Vérifiées</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Surface (m²)</label>
                        <input 
                          type="number"
                          value={importMeasurements.area || ''}
                          onChange={(e) => setImportMeasurements({ ...importMeasurements, area: parseFloat(e.target.value) || 0 })}
                          placeholder="ex: 1250"
                          className="w-full bg-muted border-none rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Périmètre (m)</label>
                        <input 
                          type="number"
                          value={importMeasurements.perimeter || ''}
                          onChange={(e) => setImportMeasurements({ ...importMeasurements, perimeter: parseFloat(e.target.value) || 0 })}
                          placeholder="ex: 150"
                          className="w-full bg-muted border-none rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Point Z (Altitude)</label>
                    <input 
                      type="number"
                      value={importMeasurements.altitude || ''}
                      onChange={(e) => setImportMeasurements({ ...importMeasurements, altitude: parseFloat(e.target.value) || 0 })}
                      placeholder="Altitude en mètres..."
                      className="w-full bg-muted border-none rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                  </div>

                  <button 
                    onClick={handleSaveImportedLocation}
                    disabled={isSubmitting || !importUrl || !importProjectId}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Enregistrer les Mesures
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-dashed">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <p className="text-[10px] font-bold uppercase text-amber-600">Note Technique</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                    L'enregistrement synchronise instantanément la position GPS et les dimensions sur la fiche technique du projet client.
                  </p>
                </div>
              </section>

              <section className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl">
                <h3 className="font-bold mb-4 text-[10px] uppercase tracking-widest text-primary">Couches Carto</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold">Standard Vue</span>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                  </div>
                  <div className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer opacity-50 grayscale">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold">Satellite (HD)</span>
                    </div>
                    <Lock className="w-3 h-3" />
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (() => {
          // Robust calculation of professional financial stats
          const invoices = documents.filter(d => d.type === 'INVOICE');
          const quotes = documents.filter(d => d.type === 'QUOTE');
          
          const totalInvoices = invoices.length;
          
          // Chiffre d'affaires (TTC of paid invoices)
          const revenueTotal = invoices
            .filter(d => d.paymentStatus === 'PAID' || d.isSigned)
            .reduce((sum, d) => sum + (d.amount?.ttc || 0), 0);
            
          const paidInvoicesCount = invoices.filter(d => d.paymentStatus === 'PAID' || d.isSigned).length;
          const unpaidInvoicesCount = invoices.filter(d => d.paymentStatus === 'UNPAID' || d.paymentStatus === 'PENDING' || !d.paymentStatus).length;
          
          // Live Filtering of financial documents
          const filteredDocs = documents.filter(doc => {
            // Only Financial document types
            if (!['INVOICE', 'QUOTE', 'ORDER'].includes(doc.type)) return false;
            
            // Document Type Filter
            if (financeTypeFilter !== 'ALL' && doc.type !== financeTypeFilter) return false;
            
            // Payment / Validation Status Filter
            if (financeStatusFilter !== 'ALL') {
              const isPaid = doc.paymentStatus === 'PAID' || doc.isSigned;
              const isCancelled = (doc.paymentStatus as string) === 'CANCELLED';
              const isPending = !isPaid && !isCancelled;
              
              if (financeStatusFilter === 'PAID' && !isPaid) return false;
              if (financeStatusFilter === 'PENDING' && !isPending) return false;
              if (financeStatusFilter === 'CANCELLED' && !isCancelled) return false;
            }
            
            // Text Search Filter (Reference, Client name, Project name, or custom observations)
            if (financeSearch.trim() !== '') {
              const q = financeSearch.toLowerCase();
              const formattedRef = `${doc.type.substring(0,3)}-${doc.id.substring(0,8).toUpperCase()}`.toLowerCase();
              const proj = projects.find(p => p.id === doc.projectId);
              const pName = proj ? proj.name.toLowerCase() : '';
              const cName = proj ? proj.clientName.toLowerCase() : '';
              const docName = doc.name.toLowerCase();
              const obs = doc.metadata?.observations?.toLowerCase() || '';
              
              if (!formattedRef.includes(q) && !pName.includes(q) && !cName.includes(q) && !docName.includes(q) && !obs.includes(q)) {
                return false;
              }
            }
            
            return true;
          });

          return (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Financial Dashboard Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* CA Total */}
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-zinc-800">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full -mr-6 -mt-6" />
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">Chiffre d'Affaires</p>
                  <p className="text-2xl font-black font-mono text-zinc-100">{revenueTotal.toLocaleString('fr-FR')} <span className="text-xs font-black">MAD</span></p>
                  <p className="text-[9px] text-zinc-400 mt-2">Factures réglées validées</p>
                </div>

                {/* Total Invoices count */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-100 rounded-full -mr-6 -mt-6" />
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Nombre de Factures</p>
                  <p className="text-2xl font-black font-mono text-foreground">{totalInvoices} <span className="text-xs font-bold">Émises</span></p>
                  <p className="text-[9px] text-muted-foreground mt-2">Prises en compte sur l'exercice</p>
                </div>

                {/* Paid Invoices */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-6 -mt-6" />
                  <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">Factures Payées</p>
                  <p className="text-2xl font-black font-mono text-green-700">{paidInvoicesCount}</p>
                  <p className="text-[9px] text-muted-foreground mt-2">Encaissées avec succès (MAD)</p>
                </div>

                {/* Unpaid Invoices */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-6 -mt-6" />
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Factures Impayées</p>
                  <p className="text-2xl font-black font-mono text-amber-700">{unpaidInvoicesCount}</p>
                  <p className="text-[9px] text-muted-foreground mt-2">En attente de paiement (impayées)</p>
                </div>
              </div>

              {/* Moroccan Regulatory Compliance (ONIGT & Loi 30-93) Card */}
              <div id="onigt-compliance-widget" className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-xl pointer-events-none" />
                
                <div className="space-y-3 relative z-10 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
                      Loi N° 30-93 Réglementaire
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                      ONIGT Maroc Agréé
                    </span>
                  </div>
                  
                  <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                    Conformité Légale & Facturation Électronique Maroc
                  </h2>
                  
                  <p className="text-xs text-indigo-200 max-w-5xl leading-relaxed">
                    L'ensemble des documents financiers générés respecte scrupuleusement le cadre légal régissant la profession d'Ingénieur Géomètre-Topographe au Maroc (Ordre National des Ingénieurs Géomètres-Topographes) et les réformes fiscales B2B de la Direction Générale des Impôts (DGI).
                  </p>
                  
                  {/* Compliance Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Agréé ONIGT</p>
                        <p className="text-xs font-semibold text-white mt-0.5">N° Ordre: {user.onigtNumber || "Non configuré"}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">TVA Maroc</p>
                        <p className="text-xs font-semibold text-white mt-0.5">Taux de 20% (Légal)</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Identifiants B2B</p>
                        <p className="text-xs font-semibold text-white mt-0.5">ICE, Patente, IF, RC</p>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 009 11.571V9a4 4 0 00-8 0v1.268c0 2.634.718 5.122 1.96 7.28l.054.09m4-2.04C10.517 14.17 12 10.743 12 7V4a2 2 0 00-2-2H4a2 2 0 00-2 2v3c0 3.31 1.82 6.187 4.51 7.69M15 11.5c.348.01.696.02 1.045.03m1.472.04c.485.018.971.039 1.458.062M16 12v3m4-3v3m-2-1.5h2" /></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Signatures</p>
                        <p className="text-xs font-semibold text-white mt-0.5">Contrôlée par l'IGT</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Invoice Search and Filtering Panel */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-base font-black text-foreground">Recherche & Filtration</h3>
                    <p className="text-xs text-muted-foreground">Recherchez par client, par désignation ou filtrez par statut fiscal</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsDocGeneratorOpen(true)} 
                    className="w-full md:w-auto text-[10px] bg-primary text-primary-foreground px-5 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 shadow-xl shadow-primary/10 transition-all uppercase tracking-widest animate-pulse"
                  >
                    <Plus className="w-3.5 h-3.5" /> Émettre une Facture / Devis
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Rechercher client, projet, réf, obs..."
                      value={financeSearch}
                      onChange={(e) => setFinanceSearch(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 text-foreground outline-none border border-transparent focus:border-primary/20 rounded-2xl px-4 py-3 text-sm font-medium pr-10"
                    />
                    {financeSearch && (
                      <button type="button" onClick={() => setFinanceSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground">✕</button>
                    )}
                  </div>

                  {/* Document Type Dropdown */}
                  <select
                    value={financeTypeFilter}
                    onChange={(e) => setFinanceTypeFilter(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 text-foreground outline-none border border-transparent focus:border-primary/20 rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    <option value="ALL" className="bg-card text-foreground">Tous les documents financiers</option>
                    <option value="INVOICE" className="bg-card text-foreground">Factures uniquement</option>
                    <option value="QUOTE" className="bg-card text-foreground">Devis estimatifs</option>
                    <option value="ORDER" className="bg-card text-foreground">Bons de commande</option>
                  </select>

                  {/* Status Dropdown */}
                  <select
                    value={financeStatusFilter}
                    onChange={(e) => setFinanceStatusFilter(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800 text-foreground outline-none border border-transparent focus:border-primary/20 rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    <option value="ALL" className="bg-card text-foreground">Tous les statuts de paiement</option>
                    <option value="PAID" className="bg-card text-foreground">Payée / Réglée</option>
                    <option value="PENDING" className="bg-card text-foreground">En attente (Impayée)</option>
                    <option value="CANCELLED" className="bg-card text-foreground">Annulée</option>
                  </select>
                </div>
              </div>

              {/* Documents List Registry Table */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-muted/40 border-b text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Réf. Document</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Projet & Client</th>
                        <th className="px-6 py-4">Date de calcul</th>
                        <th className="px-6 py-4">Montant Net (TTC)</th>
                        <th className="px-6 py-4 text-right">Statut Fiscal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDocs.length > 0 ? (
                        filteredDocs.map((doc, i) => {
                          const associatedProject = projects.find(p => p.id === doc.projectId);
                          
                          // Determine correct localized status & coloring
                          const isPaid = doc.paymentStatus === 'PAID' || doc.isSigned;
                          const isCancelled = (doc.paymentStatus as string) === 'CANCELLED';
                          
                          let statusLabel = "En attente";
                          let statusClass = "bg-amber-50 text-amber-700 border border-amber-200";
                          
                          if (doc.type === 'INVOICE') {
                            if (isPaid) {
                              statusLabel = "Payée";
                              statusClass = "bg-green-50 text-green-700 border border-green-200/50";
                            } else if (isCancelled) {
                              statusLabel = "Annulée";
                              statusClass = "bg-red-50 text-red-600 border border-red-200/50";
                            } else {
                              statusLabel = "En attente";
                              statusClass = "bg-amber-50 text-amber-700 border border-amber-200/50";
                            }
                          } else {
                            if (doc.isSigned) {
                              statusLabel = "Approuvé";
                              statusClass = "bg-blue-50 text-blue-700 border border-blue-200/50";
                            } else {
                              statusLabel = "Provisoire";
                              statusClass = "bg-zinc-100 text-zinc-600 border border-zinc-200";
                            }
                          }

                          return (
                            <tr key={`row-doc-${doc.id || `doc-${i}`}-${i}`} className="hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setActiveDoc(doc)}>
                              <td className="px-6 py-4 font-black font-mono text-xs">{doc.type.substring(0,3)}-{doc.id.substring(0,8).toUpperCase()}</td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted p-1 px-2 rounded-lg">
                                  {doc.type === 'INVOICE' ? 'Facture' : doc.type === 'QUOTE' ? 'Devis' : doc.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-foreground text-xs">{doc.name}</div>
                                <div className="text-[10px] text-muted-foreground font-medium">Client: {associatedProject?.clientName || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                                {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : 'Non renseigné'}
                              </td>
                              <td className="px-6 py-4 font-black font-mono text-xs text-foreground">
                                {(doc.amount?.ttc || 0).toLocaleString('fr-FR')} <span className="text-[9px] font-bold">MAD</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", statusClass)}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-bold">
                            Aucun document financier ne correspond aux critères de filtration.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                  <div className="w-1.5 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                  {t('topo.finance_summary_project')}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {projects.map((p, i) => {
                  const projectDocs = documents.filter(d => d.projectId === p.id && ['INVOICE', 'QUOTE'].includes(d.type));
                  const totalPaid = projectDocs.filter(d => d.isSigned).reduce((acc, d) => acc + (d.amount?.ttc || 0), 0);
                  const totalPending = projectDocs.filter(d => !d.isSigned).reduce((acc, d) => acc + (d.amount?.ttc || 0), 0);
                  const totalHT = projectDocs.reduce((acc, d) => acc + (d.amount?.ht || 0), 0);
                  
                  return (
                    <motion.div 
                      key={`project-fin-card-${p.id || `prj-${i}`}-${i}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card border-2 border-transparent hover:border-primary/20 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                      
                      <div className="flex justify-between items-start mb-5 relative">
                        <div className="space-y-1">
                          <h4 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors leading-none">{p.name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="font-medium">{p.location}</span>
                          </div>
                        </div>
                        <div className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                          p.status === 'COMPLETED' ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                        )}>
                          {p.status}
                        </div>
                      </div>

                      <div className="space-y-5 relative">
                        <div className="flex items-center justify-between py-3 border-b border-muted/50 border-dashed">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{t('common.client')}</span>
                            <span className="font-bold text-sm">{p.clientName}</span>
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1 p-3 bg-muted/30 rounded-2xl">
                            <p className="text-[9px] uppercase text-muted-foreground font-black tracking-widest">{t('common.total_ht')}</p>
                            <p className="font-mono font-black text-sm">{totalHT.toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</p>
                          </div>
                          <div className="space-y-1 p-3 bg-green-500/5 rounded-2xl text-right">
                            <p className="text-[9px] uppercase text-green-600 font-black tracking-widest">{t('common.collected')}</p>
                            <p className="font-mono font-black text-sm text-green-600">{totalPaid.toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-muted-foreground">{t('common.remaining')}</span>
                            <span className="text-amber-600">{totalPending.toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR')} DH</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(totalPaid + totalPending) > 0 ? (totalPaid / (totalPaid + totalPending)) * 100 : 0}%` }}
                              className="h-full bg-gradient-to-r from-primary to-blue-600 shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

        {activeTab === 'uploads' && (
          // ... existing uploads content ...
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8">
            <div className="bg-card border rounded-2xl p-6 space-y-6 self-start">
              <h3 className="text-lg font-bold">{t('topo.upload_portal')}</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('common.project')}</label>
                  <select 
                    value={uploadData.projectId}
                    onChange={e => setUploadData({ ...uploadData, projectId: e.target.value })}
                    className="w-full bg-muted border-none rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">{t('client.select_project')}</option>
                    {projects.map((p, i) => <option key={`project-opt-${p.id || `prj-${i}`}-${i}`} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('topo.doc_type')}</label>
                  <select 
                    value={uploadData.type}
                    onChange={e => setUploadData({ ...uploadData, type: e.target.value as any })}
                    className="w-full bg-muted border-none rounded-lg p-2.5 text-sm outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="MAP">{t('client.doc_types.photo')}</option>
                    <option value="PDF">{t('client.doc_types.pdf')}</option>
                    <option value="TECH">{t('nav.technical')}</option>
                    <option value="PHOTO">{t('client.doc_types.photo')}</option>
                  </select>
                </div>
                <div className="relative group/file overflow-hidden rounded-xl">
                  <input 
                    type="file" 
                    required
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  <div className="border-2 border-dashed border-muted rounded-xl p-8 text-center transition-colors group-hover/file:border-primary/50 bg-muted/20">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover/file:text-primary transition-colors" />
                    <p className="text-xs font-bold truncate">
                      {selectedFile ? selectedFile.name : t('topo.drag_drop_docs')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{t('topo.select_plan_report')}</p>
                  </div>
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Chiffrer & Télécharger</span>
                </button>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Archives & Documents Récents</h3>
              <div className="space-y-3">
                {documents.filter(d => !['INVOICE', 'QUOTE', 'ORDER'].includes(d.type)).length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-10 text-center">{t('topo.no_tech_files_shared') || 'Aucun document technique partagé pour le moment.'}</p>
                )}
                {documents.filter(d => !['INVOICE', 'QUOTE', 'ORDER'].includes(d.type)).map((doc, i) => (
                  <div key={`upload-doc-${doc.id || `idx-${i}`}-${i}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="max-w-[200px]">
                        <p className="text-xs font-black truncate">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{doc.type} • {projects.find(p => p.id === doc.projectId)?.name || 'Projet inconnu'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setActiveDoc(doc)}
                        className="p-2 hover:bg-white rounded-lg text-primary transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-primary/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10">
              <div className="text-center md:text-left">
                <h2 className="text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
                  {user.rating?.toFixed(1) || '0.0'}
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={`user-rating-star-${star}-${user.id || 'me'}`} className={cn("w-6 h-6", star <= Math.round(user.rating || 0) ? "fill-amber-400" : "text-amber-200")} />
                    ))}
                  </div>
                </h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Score Global basés sur {user.reviewCount || 0} évaluations</p>
              </div>
              <div className="h-px w-full md:h-12 md:w-px bg-primary/10" />
              <div className="flex-1 space-y-3 w-full">
                {[5, 4, 3, 2, 1].map((rating, i) => {
                  const count = reviews.filter(r => r.rating === rating).length;
                  const percent = user.reviewCount ? (count / user.reviewCount) * 100 : 0;
                  return (
                    <div key={`rating-bar-${rating}-${i}`} className="flex items-center gap-4">
                      <span className="text-[10px] font-black w-3">{rating}</span>
                      <div className="flex-1 h-2 bg-primary/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((review, i) => (
                <motion.div 
                  key={`topo-review-item-${review.id || i}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border rounded-3xl p-6 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs">
                        {review.clientName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{review.clientName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{review.projectName || t('topo.project_finished')}</p>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={`review-${review.id || 'no-id'}-${i}-star-${star}`} className={cn("w-3 h-3", star <= review.rating ? "fill-amber-400" : "text-amber-200")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{review.comment || t('topo.no_comment')}"
                  </p>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {new Date(review.createdAt?.seconds * 1000 || review.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </motion.div>
              ))}
              {reviews.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 border-2 border-dashed rounded-3xl opacity-40">
                  <Star className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('topo.no_reviews')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        <ProjectDetailsOverlay 
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          documents={documents}
          isTopographer={true}
        />
        <DocumentViewer 
          document={activeDoc} 
          isOpen={activeDoc !== null}
          onClose={() => setActiveDoc(null)}
        />
        
        {/* Create Finance Document Modal */}
        <DocumentGeneratorModal 
          isOpen={isFinanceModalOpen}
          onClose={() => setIsFinanceModalOpen(false)}
          onSubmit={handleCreateDocument}
          projects={projects}
          clients={clients}
          topographerId={user.id}
        />
        
        {/* Technical Import Modal */}
        {isTechnicalModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
              onClick={() => setIsTechnicalModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-card border rounded-3xl w-full max-w-lg p-8 shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">{t('topo.import_tech_title')}</h2>
                  <p className="text-xs text-muted-foreground">{t('topo.import_tech_desc')}</p>
                </div>
                <button onClick={() => setIsTechnicalModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleImportTechnical} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('topo.import_destination_project')}</label>
                  <select 
                    required
                    value={importProjectId}
                    onChange={(e) => setImportProjectId(e.target.value)}
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm"
                  >
                    <option value="">{t('client.select_project')}</option>
                    {projects.map((p, i) => (
                      <option key={`p-tech-${p.id}-${i}`} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('topo.doc_type')}</label>
                  <input 
                    type="file"
                    required
                    onChange={(e) => setTechnicalFile(e.target.files?.[0] || null)}
                    className="w-full text-xs"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {t('topo.import_launch')}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Planning Modal */}
        {isPlanningModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPlanningModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border rounded-3xl w-full max-w-lg p-8 shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">{t('topo.plan_intervention')}</h2>
                  <p className="text-xs text-muted-foreground">{t('topo.plan_intervention_desc')}</p>
                </div>
                <button onClick={() => setIsPlanningModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateIntervention} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('topo.project_concerned')}</label>
                  <select 
                    required
                    value={planningForm.projectId}
                    onChange={(e) => setPlanningForm({ ...planningForm, projectId: e.target.value })}
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="">{t('client.select_project')}</option>
                    {projects.map((p, i) => (
                      <option key={`plan-prj-select-${p.id}-${i}`} value={p.id}>{p.name} ({p.clientName})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('common.type')}</label>
                    <select 
                      required
                      value={planningForm.type}
                      onChange={(e) => setPlanningForm({ ...planningForm, type: e.target.value as any })}
                      className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="LEVE">{t('project.steps.levy_started')}</option>
                      <option value="BORNAGE">Bornage</option>
                      <option value="IMPLANTATION">{t('client.service_types.layout')}</option>
                      <option value="VRD">VRD</option>
                      <option value="COPROPRIETE">Copropriété</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Heure</label>
                    <input 
                      type="time"
                      required
                      value={planningForm.startTime}
                      onChange={(e) => setPlanningForm({ ...planningForm, startTime: e.target.value })}
                      className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('common.date')}</label>
                  <input 
                    type="date"
                    required
                    value={planningForm.date}
                    onChange={(e) => setPlanningForm({ ...planningForm, date: e.target.value })}
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('topo.mission_title')}</label>
                  <input 
                    type="text"
                    required
                    value={planningForm.title}
                    onChange={(e) => setPlanningForm({ ...planningForm, title: e.target.value })}
                    placeholder="ex: Levé de détail parcelle A12"
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('topo.mission_notes')}</label>
                  <textarea 
                    value={planningForm.description}
                    onChange={(e) => setPlanningForm({ ...planningForm, description: e.target.value })}
                    placeholder={t('client.description_placeholder')}
                    className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {t('topo.confirm_appointment')}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Stats Detail Modal */}
        {isStatsModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsStatsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-card border rounded-3xl w-full max-w-3xl p-8 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl",
                    statsModalType === 'active' ? "bg-blue-500 text-white" :
                    statsModalType === 'deliverables' ? "bg-amber-500 text-white" :
                    statsModalType === 'area' ? "bg-emerald-500 text-white" :
                    "bg-indigo-500 text-white"
                  )}>
                    {statsModalType === 'active' ? <Layers className="w-5 h-5" /> :
                     statsModalType === 'deliverables' ? <Target className="w-5 h-5" /> :
                     statsModalType === 'area' ? <Maximize2 className="w-5 h-5" /> :
                     <FileText className="w-5 h-5" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {statsModalType === 'active' ? 'Dossiers Actifs' :
                       statsModalType === 'deliverables' ? 'Livrables du Mois' :
                       statsModalType === 'area' ? 'Détails des Surfaces' :
                       'Revenue Prévisionnel'}
                    </h2>
                    <p className="text-xs text-muted-foreground">Données réelles extraites de votre base</p>
                  </div>
                </div>
                <button onClick={() => setIsStatsModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 pr-2">
                {statsModalType === 'active' && (
                  <div className="space-y-3">
                    {projects.map((p, i) => (
                      <div key={`stat-active-res-${p.id || `prj-${i}`}-${i}`} className="p-4 border rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer" onClick={() => { setSelectedProject(p); setIsStatsModalOpen(false); }}>
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">Client: {p.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-primary">{p.progress}%</p>
                          <p className="text-[9px] uppercase font-black text-muted-foreground">{p.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statsModalType === 'deliverables' && (
                  <div className="space-y-3">
                    {projects.filter(p => {
                      if (!p.deadline) return false;
                      const date = new Date(p.deadline);
                      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                    }).map((p, i) => (
                      <div key={`stat-deliv-res-${p.id || `prj-${i}`}-${i}`} className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Target className="w-3 h-3" /> Échéance: {p.deadline}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-600">À livrer</p>
                          <p className="text-[9px] uppercase font-black text-muted-foreground">{p.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statsModalType === 'area' && (
                  <div className="space-y-3">
                    {projects.map((p, i) => (
                      <div key={`stat-area-res-${p.id || `prj-${i}`}-${i}`} className="p-4 border rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-emerald-600">{p.area || 0} <span className="text-xs">Ha</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {statsModalType === 'finance' && (
                  <div className="space-y-3">
                    {documents.filter(d => d.type === 'INVOICE' || d.type === 'QUOTE').map((doc, i) => (
                      <div key={`stat-finance-res-${doc.id || `doc-${i}`}-${i}`} className="p-4 border rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-all cursor-pointer" onClick={() => { setActiveDoc(doc); setIsStatsModalOpen(false); }}>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", doc.type === 'INVOICE' ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-600")}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground">Réf: {doc.id.substring(0,8).toUpperCase()} • {doc.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-indigo-600">{(doc.amount?.ttc || 0).toLocaleString('fr-FR')} DH</p>
                          <p className="text-[9px] uppercase font-bold text-muted-foreground">{doc.isSigned ? 'Payé' : 'Devis / Attente'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {(
                  (statsModalType === 'active' && projects.filter(p => p.status !== 'COMPLETED').length === 0) ||
                  (statsModalType === 'deliverables' && projects.filter(p => p.deadline && new Date(p.deadline).getMonth() === currentMonth).length === 0) ||
                  (statsModalType === 'area' && projects.length === 0) ||
                  (statsModalType === 'finance' && documents.filter(d => d.type === 'INVOICE' || d.type === 'QUOTE').length === 0)
                ) && (
                  <div className="py-20 text-center text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm italic">{t('common.empty')}</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setIsStatsModalOpen(false)}
                className="w-full bg-muted py-3 rounded-xl font-bold hover:bg-muted/80 transition-all"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}

        {/* Export Preview Modal */}
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsExportModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-card border rounded-3xl w-full max-w-4xl p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold">Centre d'Exportation de Données</h2>
                  <p className="text-xs text-muted-foreground">Sélectionnez le type de données à extraire</p>
                </div>
                <button onClick={() => setIsExportModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setExportType('projects')}
                  className={cn(
                    "flex-1 p-4 border rounded-2xl flex items-center gap-3 transition-all",
                    exportType === 'projects' ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Folder className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Projets</p>
                    <p className="text-[10px] opacity-70">{projects.length} dossiers actifs</p>
                  </div>
                </button>
                <button 
                  onClick={() => setExportType('documents')}
                  className={cn(
                    "flex-1 p-4 border rounded-2xl flex items-center gap-3 transition-all",
                    exportType === 'documents' ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <FileText className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Documents</p>
                    <p className="text-[10px] opacity-70">{documents.length} fichiers</p>
                  </div>
                </button>
                <button 
                  onClick={() => setExportType('interventions')}
                  className={cn(
                    "flex-1 p-4 border rounded-2xl flex items-center gap-3 transition-all",
                    exportType === 'interventions' ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  <Calculator className="w-5 h-5" />
                  <div className="text-left">
                    <p className="font-bold text-sm">Missions</p>
                    <p className="text-[10px] opacity-70">{interventions.length} RDV terrain</p>
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mb-6 border rounded-xl bg-muted/20">
                {exportType === 'projects' ? (
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Projet</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Client</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Lieu</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Surface</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {projects.map((p, idx) => (
                        <tr key={`export-prj-row-${p.id}-${idx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.clientName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.location}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary">{p.area || 0} Ha</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : exportType === 'documents' ? (
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Fichier</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Etat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {documents.map((d, docIdx) => (
                        <tr key={`export-doc-row-${d.id}-${docIdx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]">{d.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.type}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", d.isSigned ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500")}>
                              {d.isSigned ? 'SIGNÉ' : 'ATTENTE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Mission</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Projet</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {interventions.map((i, intIdx) => (
                        <tr key={`export-int-row-${i.id}-${intIdx}`} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{i.title}</td>
                          <td className="px-4 py-3 text-muted-foreground">{i.projectName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{i.date} {i.startTime}</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{i.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-bold border-2 hover:bg-muted transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={() => {
                    handleExportCSV();
                    setIsExportModalOpen(false);
                  }}
                  disabled={exportType === 'projects' ? projects.length === 0 : documents.length === 0}
                  className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  <span>Télécharger le CSV de {exportType === 'projects' ? 'Dossiers' : exportType === 'documents' ? 'Documents' : 'Missions'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddPrjOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddPrjOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-card border rounded-3xl w-full max-w-lg p-8 shadow-2xl max-h-[min(780px,92vh)] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-bold">Nouveau Projet Topographique</h2>
                <button onClick={() => setIsAddPrjOpen(false)}><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddProject} className="space-y-4 overflow-y-auto flex-1 pr-1 pb-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom du Projet</label>
                  <input
                    required
                    value={newPrj.name}
                    onChange={e => setNewPrj(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="ex: Résidence El Oualidia"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Associé</label>
                  <select
                    required
                    value={newPrj.clientId}
                    onChange={e => setNewPrj(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                  >
                    <option value="">Choisir un client...</option>
                    {clients.map((c, i) => <option key={`client-opt-${c.id}-${i}`} value={c.id}>{c.name} ({c.company})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Échéance Prévue</label>
                    <input
                      required
                      type="date"
                      value={newPrj.deadline}
                      onChange={e => setNewPrj(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Surface (Hectares)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={newPrj.area}
                      onChange={e => setNewPrj(prev => ({ ...prev, area: e.target.value }))}
                      className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                      placeholder="ex: 2.5"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Localisation (Adresse)</label>
                  <input
                    required
                    value={newPrj.location}
                    onChange={e => setNewPrj(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none"
                    placeholder="ex: Bouskoura, Casablanca"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={newPrj.lat}
                      onChange={e => setNewPrj(prev => ({ ...prev, lat: e.target.value }))}
                      className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={newPrj.lng}
                      onChange={e => setNewPrj(prev => ({ ...prev, lng: e.target.value }))}
                      className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    required
                    value={newPrj.description}
                    onChange={e => setNewPrj(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-muted border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none h-20 resize-none"
                    placeholder="Détails du projet..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold mt-4 shadow-xl shadow-primary/20"
                >
                  Démarrer le Projet
                </button>
              </form>
            </motion.div>
          </div>
        )}

        <DocumentGeneratorModal 
          isOpen={isDocGeneratorOpen}
          onClose={() => setIsDocGeneratorOpen(false)}
          onSubmit={handleCreateDocument}
          projects={projects}
          clients={clients}
          topographerId={user.id}
        />
      </AnimatePresence>
    </div>
  );
}
