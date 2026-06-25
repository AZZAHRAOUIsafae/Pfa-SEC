import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { Project } from '../../Backend/types';
import { Search, Loader2, Globe, Layers } from 'lucide-react';
import { cn } from '../../Backend/lib/utils';
import { useState } from 'react';

// Fix Leaflet icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ProjectMapProps {
  project: Project;
  onSave?: (mapData: string) => void;
  readOnly?: boolean;
}

function GeomanControls({ onSave, initialData, readOnly }: { onSave?: (data: string) => void, initialData?: string, readOnly?: boolean }) {
  const map = useMap();
  const geojsonLayerRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Initialize layer group for GeoJSON
    if (!geojsonLayerRef.current) {
      geojsonLayerRef.current = L.featureGroup().addTo(map);
    }

    if (initialData) {
      try {
        const data = JSON.parse(initialData);
        L.geoJSON(data).eachLayer((layer: any) => {
          if (geojsonLayerRef.current) {
            geojsonLayerRef.current.addLayer(layer);
          }
        });
        
        // Fit bounds if data exists
        if (geojsonLayerRef.current.getLayers().length > 0) {
          map.fitBounds(geojsonLayerRef.current.getBounds(), { padding: [20, 20] });
        }
      } catch (e) {
        console.error("Failed to parse initial map data", e);
      }
    }

    if (!readOnly) {
      map.pm.addControls({
        position: 'topleft',
        drawMarker: true,
        drawCircle: false,
        drawPolyline: true,
        drawRectangle: true,
        drawPolygon: true,
        editMode: true,
        dragMode: true,
        removalMode: true,
      });

      const handleUpdate = () => {
        if (!geojsonLayerRef.current) return;
        const data = geojsonLayerRef.current.toGeoJSON();
        if (onSave) {
          onSave(JSON.stringify(data));
        }
      };

      map.on('pm:create', (e: any) => {
        if (geojsonLayerRef.current) {
          geojsonLayerRef.current.addLayer(e.layer);
        }
        handleUpdate();
      });

      map.on('pm:remove', handleUpdate);
      map.on('pm:edit', handleUpdate);
      map.on('pm:dragend', handleUpdate);
      map.on('pm:rotateend', handleUpdate);
    }

    return () => {
      if (!readOnly) {
        map.pm.removeControls();
      }
    };
  }, [map, initialData, readOnly, onSave]);

  return null;
}

function MapSetState({ mapSetter }: { mapSetter: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    mapSetter(map);
  }, [map, mapSetter]);
  return null;
}

export default function ProjectMap({ project, onSave, readOnly = false }: ProjectMapProps) {
  const [mapViewType, setMapViewType] = useState<'plan' | 'satellite'>('satellite');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (mapInstance && project.coordinates) {
      mapInstance.setView([project.coordinates.lat, project.coordinates.lng], 16);
    }
  }, [mapInstance, project.id, project.coordinates?.lat, project.coordinates?.lng]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        if (mapInstance) {
          mapInstance.flyTo([parseFloat(lat), parseFloat(lon)], 16);
        }
      } else {
        alert("Lieu non trouvé.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const position: L.LatLngExpression = project.coordinates 
    ? [project.coordinates.lat, project.coordinates.lng] 
    : [33.5731, -7.5898]; // Default Casablanca

  return (
    <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border shadow-inner relative z-0 bg-card">
      {!readOnly && (
        <div className="p-3 bg-background border-b flex items-center justify-between gap-4 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-xs text-foreground">Ajustement de l'emplacement</p>
              <p className="text-[9px] text-muted-foreground">Centrez l'emplacement du projet</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="relative w-64 group">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une adresse/lieu..."
              className="w-full bg-muted/60 hover:bg-muted focus:bg-background border border-border/50 rounded-lg py-1.5 pl-8 pr-8 text-[10px] shadow-inner outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
            />
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            {isSearching ? (
              <Loader2 className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />
            ) : searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-bold"
              >
                ×
              </button>
            )}
          </form>
        </div>
      )}

      <div className="flex-1 relative w-full h-full">
        <MapContainer 
          center={position} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="w-full h-full"
        >
          <TileLayer
            key={mapViewType}
            attribution={mapViewType === 'satellite' 
              ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' 
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url={mapViewType === 'satellite' 
              ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            maxZoom={20}
          />
          <GeomanControls 
            onSave={onSave} 
            initialData={project.mapData} 
            readOnly={readOnly} 
          />
          <MapSetState mapSetter={setMapInstance} />
        </MapContainer>
        
        {!readOnly && (
          <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
            <div className="bg-zinc-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[180px]">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Mesures Live</p>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] uppercase font-bold text-white/50">Surface</span>
                   <span className="font-mono text-xs font-black">{project.area ? `${project.area.toLocaleString('fr-FR')} m²` : '---'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] uppercase font-bold text-white/50">Périmètre</span>
                   <span className="font-mono text-xs font-black">{project.perimeter ? `${project.perimeter.toLocaleString('fr-FR')} m` : '---'}</span>
                 </div>
               </div>
               <p className="text-[8px] text-white/30 mt-3 pt-2 border-t border-white/5 italic">
                 Dessinez un polygone pour calculer la surface.
               </p>
            </div>
          </div>
        )}

        {readOnly && (
          <div className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-bold shadow-md z-[1000] border">
            Mode Consultation
          </div>
        )}

        {/* View Mode Toggle Control */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-background/95 backdrop-blur-md border rounded-2xl p-1 shadow-xl flex gap-1 items-center">
          <button
            type="button"
            onClick={() => setMapViewType('plan')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              mapViewType === 'plan' 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setMapViewType('satellite')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
              mapViewType === 'satellite' 
                ? "bg-primary text-primary-foreground shadow" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Réel (Satellite)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
