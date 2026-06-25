import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, Info, Maximize2, Search, Send, Crosshair, Loader2, Download } from 'lucide-react';
import { Project, User } from '../../Backend/types';
import { cn } from '../../Backend/lib/utils';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../../Backend/services/db';
import { useTranslation } from 'react-i18next';
import ProjectMap from '../components/ProjectMap';

interface ClientMapsProps {
  user: User;
  projects: Project[];
}

export default function ClientMaps({ user, projects }: ClientMapsProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(projects[0] || null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLocating, setIsLocating] = React.useState(false);
  const [mapType, setMapType] = React.useState<'m' | 'k'>('k'); // m = map, k = satellite

  const handleShareLocation = () => {
    const locationStr = searchQuery || selectedProject?.location || t('project.my_location');
    // Deep link to Google Maps with Marker (q=) and Center (ll=)
    const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(locationStr)}&z=17&t=k`;
    
    // Navigate to messages with pre-filled state
    const shareMessage = i18n.language === 'ar'
      ? `📍 إليك الموقع الدقيق لأرضي لزيارتنا :\n\nالمكان : ${locationStr}\n\nالفتح في خرائط جوجل : ${googleMapsUrl}`
      : i18n.language === 'en'
        ? `📍 Here is the precise location of my land for our visit:\n\nLocation: ${locationStr}\n\nOpen in Google Maps: ${googleMapsUrl}`
        : `📍 Voici la localisation précise de mon terrain pour notre visite :\n\nLieu : ${locationStr}\n\nOuvrir dans Google Maps : ${googleMapsUrl}`;

    navigate('/messages', { 
      state: { 
        selectedRecipientId: selectedProject?.topographerId || 'topo-123',
        initialMessage: shareMessage
      } 
    });
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = `${latitude},${longitude}`;
          setSearchQuery(coords);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(t('common.alerts.gps_error'));
          setIsLocating(false);
        }
      );
    } else {
      alert(t('common.alerts.gps_not_supported'));
      setIsLocating(false);
    }
  };

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveLocation = async () => {
    if (!searchQuery) return;
    setIsSaving(true);
    try {
      const description = i18n.language === 'ar'
        ? `تم تسجيل الموقع عبر بحث الخرائط في ${new Date().toLocaleDateString('ar-MA')}`
        : i18n.language === 'en'
          ? `Location saved via Maps search on ${new Date().toLocaleDateString('en-US')}`
          : `Lieu enregistré via recherche Maps le ${new Date().toLocaleDateString('fr-FR')}`;

      await dbService.addProject({
        name: searchQuery,
        location: searchQuery,
        clientId: user.id,
        clientName: user.name,
        topographerId: 'topo-123', // Initial fallback
        status: 'PENDING',
        progress: 0,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: description,
        coordinates: { lat: 33.5731, lng: -7.5898, z: 0 } // Dummy coordinates for now
      });
      alert(t('common.alerts.location_saved'));
      setSearchQuery('');
    } catch (e) {
      console.error(e);
      alert(t('common.alerts.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery || selectedProject?.location || 'Casablanca, Maroc')}&t=${mapType}&z=18&ie=UTF8&iwloc=B&output=embed`;

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('client.maps_title')}</h1>
          <p className="text-muted-foreground text-sm">{t('client.maps_subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            </div>
            <input 
              type="text"
              placeholder={t('client.search_map_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm outline-none text-sm"
            />
          </div>
          {searchQuery && (
            <button 
              onClick={handleSaveLocation}
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
              {t('common.save')}
            </button>
          )}
        </div>
           {/* Map Container */}
        <div className="flex-1 bg-card border rounded-3xl overflow-hidden shadow-sm relative group min-h-[450px]">
          {selectedProject ? (
            <ProjectMap 
              project={selectedProject} 
              readOnly={true} 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 min-h-[450px]">
              <MapPin className="w-12 h-12 text-muted-foreground/30 mb-3 animate-pulse" />
              <p className="text-sm text-muted-foreground font-bold">{t('client.select_project_to_view_map') || 'Sélectionnez un projet pour voir la carte'}</p>
            </div>
          )}
          
          <div className="absolute top-4 left-4 right-4 flex flex-wrap justify-between gap-4 pointer-events-none z-[1001]">
            {(searchQuery || selectedProject) && (
              <button 
                onClick={handleShareLocation}
                className="px-4 py-2 bg-blue-600 text-white border-none rounded-xl font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all pointer-events-auto ring-4 ring-blue-500/10 text-xs"
              >
                <Send className="w-3.5 h-3.5 fill-current" />
                <span>{t('client.share_topo')}</span>
              </button>
            )}

            <button 
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery || selectedProject?.location || '')}`, '_blank')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all pointer-events-auto text-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{t('client.open_google_maps')}</span>
            </button>
          </div>
          
          {selectedProject && (
            <button 
              onClick={() => {
                const link = document.createElement('a');
                link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedProject?.mapData || { type: 'FeatureCollection', features: [] }));
                link.download = `plan_${selectedProject?.name || 'site'}.geojson`;
                link.click();
                alert(t('client.download_started'));
              }}
              className="absolute bottom-6 left-6 bg-background text-foreground border px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-2xl hover:scale-105 active:scale-95 transition-all pointer-events-auto z-[1001] text-xs"
            >
              <Download className="w-4 h-4" />
              <span>{t('client.download_plan')}</span>
            </button>
          )}
        </div>

        {/* Sidebar Projects */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto pr-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-2">{t('client.sites_list')}</h3>
          {projects.map((project, i) => (
            <motion.button
              key={`project-map-item-${project.id || `idx-${i}`}-${i}`}
              whileHover={{ x: 5 }}
              onClick={() => {
                setSelectedProject(project);
                setSearchQuery('');
              }}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all",
                selectedProject?.id === project.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-card hover:bg-muted"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  selectedProject?.id === project.id ? "bg-white/20" : "bg-primary/10"
                )}>
                  <MapPin className={cn("w-4 h-4", selectedProject?.id === project.id ? "text-white" : "text-primary")} />
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                  selectedProject?.id === project.id ? "bg-white/20" : "bg-muted"
                )}>
                  {project.status}
                </div>
              </div>
              <p className="font-bold text-sm truncate">{project.name}</p>
              <p className={cn(
                "text-[10px] mt-1 flex items-center gap-1",
                selectedProject?.id === project.id ? "text-white/80" : "text-muted-foreground"
              )}>
                <Navigation className="w-3 h-3" />
                {project.location}
              </p>
            </motion.button>
          ))}

          {projects.length === 0 && (
            <div className="p-8 text-center bg-muted/50 rounded-2xl border-2 border-dashed">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs text-muted-foreground">{t('client.no_projects_location')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
