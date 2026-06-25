import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Polyline,
  useMapEvents,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Ruler, 
  Square, 
  Box, 
  Compass, 
  Target, 
  Trash2, 
  MousePointer2,
  Layers,
  Globe,
  ZoomIn,
  ZoomOut,
  Navigation,
  Search,
  Loader2,
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { cn } from '../../Backend/lib/utils';
import Topo3DView from './Topo3DView';

// Helper to calculate area using Shoelace formula
const calculateArea = (coords: { lat: number, lng: number }[]) => {
  if (coords.length < 3) return 0;
  
  // Convert lat/lng to approximate meters (Mercator-ish)
  // 1 degree lat is ~111,320m. 1 degree lng is ~111,320m * cos(lat)
  const avgLat = coords.reduce((acc, c) => acc + c.lat, 0) / coords.length;
  const latFactor = 111320;
  const lngFactor = 111320 * Math.cos(avgLat * Math.PI / 180);

  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const xi = coords[i].lng * lngFactor;
    const yi = coords[i].lat * latFactor;
    const xj = coords[j].lng * lngFactor;
    const yj = coords[j].lat * latFactor;
    area += (xi * yj) - (xj * yi);
  }
  return Math.abs(area) / 2;
};

// Helper for distance
const calculateDistance = (p1: any, p2: any) => {
  return Math.sqrt(Math.pow(p2.lat - p1.lat, 2) + Math.pow(p2.lng - p1.lng, 2)) * 111320;
};

// Robust parser helper for GPX, KML, GeoJSON, CSV, TXT, DXF
const parseFileContent = (fileName: string, content: string): { lat: number; lng: number; alt?: number }[] => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const points: { lat: number; lng: number; alt?: number }[] = [];

  if (extension === 'gpx') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    
    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    for (let i = 0; i < trkpts.length; i++) {
      const lat = parseFloat(trkpts[i].getAttribute("lat") || '');
      const lon = parseFloat(trkpts[i].getAttribute("lon") || '');
      const eleEl = trkpts[i].getElementsByTagName("ele")[0];
      const alt = eleEl ? parseFloat(eleEl.textContent || '') : undefined;
      if (!isNaN(lat) && !isNaN(lon)) {
        points.push({ lat, lng: lon, alt });
      }
    }
    
    const wpts = xmlDoc.getElementsByTagName("wpt");
    for (let i = 0; i < wpts.length; i++) {
      const lat = parseFloat(wpts[i].getAttribute("lat") || '');
      const lon = parseFloat(wpts[i].getAttribute("lon") || '');
      const eleEl = wpts[i].getElementsByTagName("ele")[0];
      const alt = eleEl ? parseFloat(eleEl.textContent || '') : undefined;
      if (!isNaN(lat) && !isNaN(lon) && !points.some(p => Math.abs(p.lat - lat) < 1e-7 && Math.abs(p.lng - lon) < 1e-7)) {
        points.push({ lat, lng: lon, alt });
      }
    }
  } else if (extension === 'kml') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    
    const coordinatesTags = xmlDoc.getElementsByTagName("coordinates");
    for (let i = 0; i < coordinatesTags.length; i++) {
      const text = coordinatesTags[i].textContent || '';
      const coordStrings = text.trim().split(/\s+/);
      for (const str of coordStrings) {
        if (!str) continue;
        const parts = str.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const alt = parts.length >= 3 ? parseFloat(parts[2]) : undefined;
          if (!isNaN(lat) && !isNaN(lng)) {
            points.push({ lat, lng, alt });
          }
        }
      }
    }
  } else if (extension === 'geojson' || extension === 'json') {
    try {
      const geoObj = JSON.parse(content);
      
      const extractFromGeometry = (geometry: any) => {
        if (!geometry || !geometry.coordinates) return;
        const type = geometry.type;
        
        if (type === 'Point') {
          const [lng, lat, alt] = geometry.coordinates;
          if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, alt });
        } else if (type === 'LineString' || type === 'MultiPoint') {
          geometry.coordinates.forEach((coord: any) => {
            const [lng, lat, alt] = coord;
            if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, alt });
          });
        } else if (type === 'Polygon' || type === 'MultiLineString') {
          geometry.coordinates.forEach((ring: any) => {
            ring.forEach((coord: any) => {
              const [lng, lat, alt] = coord;
              if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, alt });
            });
          });
        } else if (type === 'MultiPolygon') {
          geometry.coordinates.forEach((polygon: any) => {
            polygon.forEach((ring: any) => {
              ring.forEach((coord: any) => {
                const [lng, lat, alt] = coord;
                if (!isNaN(lat) && !isNaN(lng)) points.push({ lat, lng, alt });
              });
            });
          });
        }
      };

      if (geoObj.type === 'FeatureCollection') {
        geoObj.features.forEach((feature: any) => {
          extractFromGeometry(feature.geometry);
        });
      } else if (geoObj.type === 'Feature') {
        extractFromGeometry(geoObj.geometry);
      } else {
        extractFromGeometry(geoObj);
      }
    } catch (e) {
      console.error("GeoJSON parse error", e);
    }
  } else if (extension === 'csv' || extension === 'txt') {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(/[;,|\t]/).map(p => p.trim());
      const nums = parts.map(p => parseFloat(p)).filter(n => !isNaN(n));
      
      if (nums.length >= 2) {
        let lat = nums[0];
        let lng = nums[1];
        let alt = undefined;
        
        if (nums.length >= 3) {
          lat = nums[1];
          lng = nums[2];
          alt = nums[0];
          
          if (nums.length === 3) {
            lat = nums[0];
            lng = nums[1];
            alt = nums[2];
          } else if (nums.length >= 4) {
            lat = nums[1];
            lng = nums[2];
            alt = nums[3];
          }
        }
        
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          points.push({ lat, lng, alt });
        } else if (lng >= -90 && lng <= 90 && lat >= -180 && lat <= 180) {
          points.push({ lat: lng, lng: lat, alt });
        }
      } else {
        const spaceSplit = line.trim().split(/\s+/).map(p => parseFloat(p)).filter(n => !isNaN(n));
        if (spaceSplit.length >= 2) {
          let lat = spaceSplit[0];
          let lng = spaceSplit[1];
          let alt = undefined;
          if (spaceSplit.length >= 3) {
            lat = spaceSplit[0];
            lng = spaceSplit[1];
            alt = spaceSplit[2];
            if (spaceSplit.length >= 4) {
              lat = spaceSplit[1];
              lng = spaceSplit[2];
              alt = spaceSplit[3];
            }
          }
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            points.push({ lat, lng, alt });
          } else if (lng >= -90 && lng <= 90 && lat >= -180 && lat <= 180) {
            points.push({ lat: lng, lng: lat, alt });
          }
        }
      }
    }
  } else if (extension === 'dxf') {
    const lines = content.split(/\r?\n/);
    let currentX: number | null = null;
    let currentY: number | null = null;
    let currentZ: number | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '10') {
        const nextVal = parseFloat(lines[i + 1]?.trim());
        if (!isNaN(nextVal)) currentX = nextVal;
      } else if (line === '20') {
        const nextVal = parseFloat(lines[i + 1]?.trim());
        if (!isNaN(nextVal)) currentY = nextVal;
      } else if (line === '30') {
        const nextVal = parseFloat(lines[i + 1]?.trim());
        if (!isNaN(nextVal)) currentZ = nextVal;
      }
      
      if (currentX !== null && currentY !== null) {
        let lat = currentY;
        let lng = currentX;
         let alt = currentZ !== null ? currentZ : undefined;
        
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          points.push({ lat, lng, alt });
        }
        currentX = null;
        currentY = null;
        currentZ = null;
      }
    }
  }

  return points;
};

export default function TopoMapView({ points, onSave }: { points: any[], onSave?: (data: { area: number, perimeter: number, coordinates: { lat: number, lng: number } }) => void }) {
  const [mapViewType, setMapViewType] = useState<'plan' | 'satellite'>('satellite');
  const [selectedTool, setSelectedTool] = useState<'pointer' | 'ruler' | 'area' | 'coordinates'>('pointer');
  const [markers, setMarkers] = useState<any[]>([]);
  const [areaCoords, setAreaCoords] = useState<any[]>([]);
  const [calculations, setCalculations] = useState<any>({
    distance: 0,
    area: 0,
    perimeter: 0,
    orientation: 'N 45° E'
  });

  // Map state and Search
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 150);
    }
  }, [mapInstance]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const parsedLat = parseFloat(lat);
        const parsedLon = parseFloat(lon);
        if (mapInstance) {
          mapInstance.flyTo([parsedLat, parsedLon], 16);
        }
        setMarkers(prev => [...prev, { lat: parsedLat, lng: parsedLon }]);
      } else {
        alert("Lieu non trouvé.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // State elements for Coordinate Parser / File Importer
  const [hudTab, setHudTab] = useState<'measures' | 'import'>('measures');
  const [parsedPoints, setParsedPoints] = useState<{ lat: number, lng: number, alt?: number }[]>([]);
  const [show3D, setShow3D] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number, lng: number }[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setFileError(null);
    setParsedPoints([]);
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const pts = parseFileContent(file.name, text);
        
        if (pts.length === 0) {
          setFileError("Aucun point de coordonnée valide n'a pu être extrait. Vérifiez que votre fichier contient bien des coordonnées GPS / géométriques.");
          setImportFileName(null);
        } else {
          setParsedPoints(pts);
        }
      } catch (err) {
        setFileError(`Erreur d'analyse : ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        setImportFileName(null);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setFileError("Erreur lors de la lecture du fichier.");
      setIsParsing(false);
      setImportFileName(null);
    };
    reader.readAsText(file);
  };

  const plotParsedPoints = () => {
    if (parsedPoints.length === 0) return;
    
    // 1. Plot as areaCoords and markers
    setAreaCoords(parsedPoints);
    setMarkers(parsedPoints);
    
    // 2. Perform stats calculation
    setCalculations(prev => ({
      ...prev,
      area: calculateArea(parsedPoints).toFixed(2),
      perimeter: (calculateArea(parsedPoints) * 0.1).toFixed(2)
    }));

    // 3. Center the map
    setCenterCoords(parsedPoints);
  };

  // Leaflet sub-renderer helper to dynamically auto-frame the imported points
  const MapCenterUpdater = ({ coords }: { coords: { lat: number, lng: number }[] }) => {
    const map = useMapEvents({});
    useEffect(() => {
      if (coords && coords.length > 0) {
        try {
          const latLngs = coords.map(c => L.latLng(c.lat, c.lng));
          const bounds = L.latLngBounds(latLngs);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        } catch (e) {
          console.error("Map auto-center bounds error", e);
        }
      }
    }, [coords, map]);
    return null;
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        area: parseFloat(calculations.area) || 0,
        perimeter: parseFloat(calculations.perimeter) || 0,
        coordinates: markers.length > 0 ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 33.5731, lng: -7.5898 }
      });
    } else {
      alert('Action non configurée. Veuillez sélectionner un projet.');
    }
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (selectedTool === 'coordinates' || selectedTool === 'ruler') {
          setMarkers(prev => [...prev, e.latlng]);
        } else if (selectedTool === 'area') {
          setAreaCoords(prev => [...prev, e.latlng]);
        }
      },
    });
    return null;
  };

  useEffect(() => {
    if (areaCoords.length >= 3) {
      setCalculations(prev => ({
        ...prev,
        area: calculateArea(areaCoords).toFixed(2),
        perimeter: (calculateArea(areaCoords) * 0.1).toFixed(2)
      }));
    }
  }, [areaCoords]);

  function MapSetState({ mapSetter }: { mapSetter: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
      mapSetter(map);
    }, [map, mapSetter]);
    return null;
  }

  const clearAll = () => {
    setMarkers([]);
    setAreaCoords([]);
    setCalculations({
      distance: 0,
      area: 0,
      perimeter: 0,
      orientation: 'N 45° E'
    });
  };

  if (show3D) {
    return (
      <Topo3DView 
        parsedPoints={parsedPoints} 
        onClose={() => setShow3D(false)} 
        fileName={importFileName} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border rounded-2xl overflow-hidden relative shadow-inner">
      {/* Search Header outside the map */}
      <div className="p-4 bg-background border-b flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
            <Search className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-foreground">Recherche de Coordonnées</h3>
            <p className="text-[10px] text-muted-foreground">Recherchez un lieu pour centrer la carte ou définir vos points de levé.</p>
          </div>
        </div>
        <form onSubmit={handleSearch} className="relative w-full sm:w-96 group">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Saisissez une adresse, ville ou repère..."
            className="w-full bg-muted/60 hover:bg-muted focus:bg-background border border-border/50 rounded-xl py-2 pl-10 pr-10 text-xs shadow-inner outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
          />
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
          {isSearching ? (
            <Loader2 className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />
          ) : searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              ×
            </button>
          )}
        </form>
      </div>

      <div className="flex-1 relative w-full h-full overflow-hidden">
        {/* Tool Sidebar */}
      <div className="absolute left-4 top-4 z-[400] flex flex-col gap-2 p-2 bg-card/80 backdrop-blur-md rounded-xl border shadow-xl">
        {[
          { id: 'pointer', icon: MousePointer2, label: 'Inspecter' },
          { id: 'ruler', icon: Ruler, label: 'Distance' },
          { id: 'area', icon: Square, label: 'Surface' },
          { id: 'coordinates', icon: Target, label: 'Coordonnées' },
        ].map((tool, i) => (
          <button
            key={`${tool.id}-${i}`}
            onClick={() => setSelectedTool(tool.id as any)}
            className={cn(
              "p-2.5 rounded-lg transition-all relative group",
              selectedTool === tool.id ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
            title={tool.label}
          >
            <tool.icon className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {tool.label}
            </span>
          </button>
        ))}
        <div className="h-px bg-border my-1" />
        <button onClick={clearAll} className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-all" title="Effacer tout">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Measurement HUD */}
      <div className="absolute right-4 top-4 z-[400] w-72 p-4 bg-zinc-900/90 text-white backdrop-blur-md rounded-xl border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Cartographie Pro</h4>
          <Compass className="w-4 h-4 text-white/50" />
        </div>

        {/* HUD Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-[9px] font-bold uppercase tracking-wider">
          <button 
            type="button"
            onClick={() => setHudTab('measures')}
            className={cn(
              "flex-1 py-1.5 rounded-md transition-all text-center",
              hudTab === 'measures' ? "bg-blue-600 text-white shadow-md font-extrabold" : "text-white/60 hover:text-white"
            )}
          >
            Mesures
          </button>
          <button 
            type="button"
            onClick={() => setHudTab('import')}
            className={cn(
              "flex-1 py-1.5 rounded-md transition-all text-center",
              hudTab === 'import' ? "bg-blue-600 text-white shadow-md font-extrabold" : "text-white/60 hover:text-white"
            )}
          >
            Import Fichier
          </button>
        </div>
        
        {hudTab === 'measures' ? (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="opacity-60 uppercase text-[9px]">Surface</span>
              <span className="font-bold text-lg text-white">{calculations.area} m²</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60 uppercase text-[9px]">Périmètre</span>
              <span className="font-bold">{calculations.perimeter} m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-60 uppercase text-[9px]">Orientation</span>
              <span className="font-bold text-blue-400">{calculations.orientation}</span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p className="opacity-50">Latitude (Y)</p>
                <p className="font-bold">{markers.length > 0 ? markers[0].lat.toFixed(6) : "33.5731"}</p>
              </div>
              <div>
                <p className="opacity-50">Longitude (X)</p>
                <p className="font-bold">{markers.length > 0 ? (markers[0].lng ?? markers[0].lon ?? -7.5898).toFixed(6) : "-7.5898"}</p>
              </div>
            </div>
            <button 
              onClick={handleSave}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition-all text-[10px] uppercase tracking-wider"
            >
              Enregistrer les mesures
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-white/70 italic leading-relaxed">
              Importez un levé existant de votre GPS ou CAO.
            </p>
            
            <label className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border border-dashed text-center cursor-pointer transition-all hover:bg-white/5",
              fileError ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10" : "border-white/20 hover:border-blue-500/40"
            )}>
              <input 
                type="file" 
                accept=".gpx,.kml,.geojson,.json,.csv,.txt,.dxf" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              {isParsing ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                  <span className="text-[9px] uppercase font-bold text-blue-400">Analyse...</span>
                </>
              ) : importFileName ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                  <span className="text-[10px] font-bold text-white truncate max-w-[200px]">{importFileName}</span>
                  <span className="text-[9px] text-green-400 font-bold mt-1 uppercase">{parsedPoints.length} points extraits !</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
                  <span className="text-[9px] uppercase font-black tracking-wider text-white/80">Choisir un levé</span>
                  <span className="text-[8px] text-white/50 mt-1">GPX, KML, GEOJSON, CSV, DXF</span>
                </>
              )}
            </label>
            
            {fileError && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-2 text-red-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p className="text-[9px] font-medium leading-relaxed">{fileError}</p>
              </div>
            )}

            {parsedPoints.length > 0 && (
              <div className="space-y-2 pt-1 font-mono text-[10px]">
                <div className="bg-white/5 rounded-lg p-2 border border-white/5 space-y-1">
                  <p className="border-b border-white/5 pb-1 uppercase tracking-wider text-white/50 text-[8px] font-bold">Points extraits :</p>
                  {parsedPoints.slice(0, 3).map((pt, idx) => (
                    <div key={`imported-pt-preview-${idx}`} className="flex justify-between text-[9px]">
                      <span>P{idx+1} : {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}</span>
                    </div>
                  ))}
                  {parsedPoints.length > 3 && (
                    <p className="text-[8px] text-white/40 italic">...et {parsedPoints.length - 3} restants</p>
                  )}
                </div>

                <button
                  onClick={plotParsedPoints}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-all text-[10px] uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Navigation className="w-3 h-3" />
                  Tracer & Centrer
                </button>

                <button
                  type="button"
                  onClick={() => setShow3D(true)}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg transition-all text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 mt-2 font-semibold shadow-md shadow-cyan-950/20"
                >
                  <Box className="w-3.5 h-3.5" />
                  Visualiser en 3D ({parsedPoints.length} pts)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-0">
        <MapContainer 
          {...({
            center: [33.5731, -7.5898],
            zoom: 13,
            className: "h-full w-full"
          } as any)}
        >
          <TileLayer
            key={mapViewType}
            {...({
              url: mapViewType === 'satellite' 
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              attribution: mapViewType === 'satellite'
                ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 20
            } as any)}
          />
          <MapClickHandler />
          <MapSetState mapSetter={setMapInstance} />
          <MapCenterUpdater coords={centerCoords} />
          
          {/* Static Project Markers */}
          {points.map((p, i) => p.coordinates && (
            <Marker key={`${p.id}-${i}`} position={[p.coordinates.lat, p.coordinates.lng]}>
              <Popup>
                <div className="font-display">
                  <p className="font-bold text-xs">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.clientName}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User Active Markers */}
          {markers.map((pos, i) => (
            <Marker key={`marker-${i}-${pos.lat}-${pos.lng}`} position={pos} />
          ))}

          {/* Lines & Polygons */}
          {areaCoords.length > 1 && (
            <Polygon 
              positions={areaCoords} 
              pathOptions={{ fillColor: 'var(--primary)', color: 'var(--primary)', fillOpacity: 0.2 }} 
            />
          )}

          {markers.length > 1 && (
            <Polyline positions={markers} pathOptions={{ color: "rgba(245, 158, 11, 0.8)", dashArray: "10, 10" }} />
          )}

          {/* Custom Navigation Helper */}
          <div className="absolute bottom-4 left-4 z-[400] flex gap-2">
            <button className="bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-lg border">
              <Navigation className="w-4 h-4" />
            </button>
            <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-lg shadow-lg border text-[10px] font-bold">
              Échelle 1:2500
            </div>
          </div>

          {/* View Mode Toggle Control */}
          <div className="absolute bottom-4 right-4 z-[400] bg-background/95 backdrop-blur-md border rounded-2xl p-1 shadow-xl flex gap-1 items-center">
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
        </MapContainer>
      </div>
    </div>
  </div>
  );
}
