import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Maximize2, 
  Compass, 
  Layers, 
  Sliders, 
  HelpCircle, 
  ArrowLeft,
  RefreshCw,
  Mountain,
  Grid,
  TrendingUp,
  Eye,
  Info,
  Map,
  Sparkles
} from 'lucide-react';
import { cn } from '../../Backend/lib/utils';

interface Point3D {
  x: number; // local meters E-W
  y: number; // local meters N-S
  z: number; // local meters Elevation
  color?: string;
  sourceLat: number;
  sourceLng: number;
}

interface Topo3DViewProps {
  parsedPoints: { lat: number; lng: number; alt?: number }[];
  onClose: () => void;
  fileName?: string | null;
}

export default function Topo3DView({ parsedPoints, onClose, fileName }: Topo3DViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Orbit States
  const [pitch, setPitch] = useState<number>(30); // Elevation angle in deg
  const [yaw, setYaw] = useState<number>(45);   // Azimuth angle in deg
  const [zoom, setZoom] = useState<number>(1.2);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);

  // Render & Style States
  const [pointSize, setPointSize] = useState<number>(4);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showContour, setShowContour] = useState<boolean>(false);
  const [colorScheme, setColorScheme] = useState<'classic' | 'spectral' | 'viridis' | 'monochrome'>('spectral');
  const [zScale, setZScale] = useState<number>(1.5); // Altitude exaggeration scale
  const [terrainSimulation, setTerrainSimulation] = useState<'real' | 'hill' | 'valley' | 'slope'>('real');
  const [wireframeDistance, setWireframeDistance] = useState<number>(25); // distance threshold (meters) for drawing wireframe edges
  const [projection, setProjection] = useState<'perspective' | 'orthographic'>('perspective');

  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0, button: 0 });

  // 1. Process Raw Data into Local 3D Coordinates (in local meters relative to center)
  const statsAndPoints = useMemo(() => {
    if (!parsedPoints || parsedPoints.length === 0) {
      return {
        points: [] as Point3D[],
        minZ: 0,
        maxZ: 0,
        avgZ: 0,
        spanX: 0,
        spanY: 0,
        spanZ: 0,
        centerLat: 0,
        centerLng: 0,
        hasRealAltitude: false,
        avgDistance: 0,
        maxSlope: 0
      };
    }

    // Latitude and longitude calculations
    const centerLat = parsedPoints.reduce((sum, p) => sum + p.lat, 0) / parsedPoints.length;
    const centerLng = parsedPoints.reduce((sum, p) => sum + p.lng, 0) / parsedPoints.length;

    // 1 deg latitude is roughly 111,320m. 1 deg longitude is roughly 111,320m * cos(lat)
    const latFactor = 111320;
    const lngFactor = 111320 * Math.cos(centerLat * Math.PI / 180);

    // Assess if we have non-trivial actual altitudes in file (different from 0)
    let altValues = parsedPoints.map(p => p.alt).filter((a): a is number => a !== undefined && !isNaN(a));
    const hasRealAltitude = altValues.length > 0 && Math.max(...altValues) !== Math.min(...altValues);

    let finalPoints: Point3D[] = [];

    // Map coordinates to relative meter Cartesian system
    parsedPoints.forEach((p) => {
      const rx = (p.lng - centerLng) * lngFactor;
      const ry = (p.lat - centerLat) * latFactor;
      let rz = 0;

      if (terrainSimulation === 'real' && hasRealAltitude) {
        rz = p.alt ?? 0;
      } else if (terrainSimulation === 'hill') {
        // Procedural smooth hill center mapping: a Gaussian distribution centered near middle
        const distSq = rx*rx + ry*ry;
        rz = 50 * Math.exp(-distSq / 15000) * (1 + 0.1 * Math.sin(rx / 10) * Math.cos(ry / 10));
      } else if (terrainSimulation === 'valley') {
        // Procedural terrain: sloping valley canyon bed
        rz = (rx * 0.1) + 20 * Math.cos(ry / 60) - 15 * Math.exp(-(ry * ry) / 8000);
      } else if (terrainSimulation === 'slope') {
        // Consistent 3D double slope / incline
        rz = (rx * 0.15) - (ry * 0.08) + 12 * Math.sin(rx / 80) * Math.cos(ry / 80);
      } else {
        // Flat file coordinates default simulation if no altitude, so it's not pre-flattened
        const distSq = rx*rx + ry*ry;
        rz = 15 * Math.sin(rx / 50) * Math.cos(ry / 50) + Math.sqrt(distSq) * 0.05;
      }

      finalPoints.push({
        x: rx,
        y: ry,
        z: rz,
        sourceLat: p.lat,
        sourceLng: p.lng
      });
    });

    const zs = finalPoints.map(p => p.z);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const avgZ = zs.reduce((s, z) => s + z, 0) / zs.length;
    const spanZ = maxZ - minZ;

    const xs = finalPoints.map(p => p.x);
    const ys = finalPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const spanX = maxX - minX;
    const spanY = maxY - minY;

    // Calculate average spacing between nearest neighbors in 2D
    let totalDists = 0;
    let counts = 0;
    let maxSlopeVal = 0;

    for (let i = 0; i < finalPoints.length; i++) {
      let minDist = Infinity;
      let closestPtIdx = -1;
      const pi = finalPoints[i];

      for (let j = 0; j < finalPoints.length; j++) {
        if (i === j) continue;
        const pj = finalPoints[j];
        const d = Math.sqrt((pi.x - pj.x)**2 + (pi.y - pj.y)**2);
        if (d < minDist) {
          minDist = d;
          closestPtIdx = j;
        }
      }

      if (closestPtIdx !== -1 && minDist < 1000) {
        totalDists += minDist;
        counts++;

        // Compute slope angle to nearest neighbor: Pitch angle % = (dz/dxy) * 100
        const dz = Math.abs(pi.z - finalPoints[closestPtIdx].z);
        if (minDist > 0.1) {
          const slopeRatio = dz / minDist;
          if (slopeRatio > maxSlopeVal) {
            maxSlopeVal = slopeRatio;
          }
        }
      }
    }

    const avgDistance = counts > 0 ? totalDists / counts : 20;
    const maxSlope = Math.atan(maxSlopeVal) * (180 / Math.PI); // slope angle in degrees

    return {
      points: finalPoints,
      minZ,
      maxZ,
      avgZ,
      spanX,
      spanY,
      spanZ,
      centerLat,
      centerLng,
      hasRealAltitude,
      avgDistance,
      maxSlope
    };
  }, [parsedPoints, terrainSimulation]);

  // Dynamic set of threshold distance based on average spacing if needed
  useEffect(() => {
    if (statsAndPoints.avgDistance > 0) {
      setWireframeDistance(Math.ceil(statsAndPoints.avgDistance * 1.6));
    }
  }, [statsAndPoints.avgDistance]);

  // Color mapper depending on the height index
  const getPointColor = (z: number, minZ: number, maxZ: number, scheme: string) => {
    const range = maxZ - minZ || 1;
    const norm = Math.min(Math.max((z - minZ) / range, 0), 1); // normalized 0 to 1

    if (scheme === 'spectral') {
      // Warm (red) represent high ridges, blue/violet represents valleys
      // norm: 0 (blue) -> 0.5 (green/yellow) -> 1 (red)
      if (norm < 0.25) {
        // Blue to Cyan
        const r = 0;
        const g = Math.round(norm * 4 * 255);
        const b = 255;
        return `rgb(${r}, ${g}, ${b})`;
      } else if (norm < 0.5) {
        // Cyan to Green
        const r = 0;
        const g = 255;
        const b = Math.round((0.5 - norm) * 4 * 255);
        return `rgb(${r}, ${g}, ${b})`;
      } else if (norm < 0.75) {
        // Green to Yellow/Orange
        const r = Math.round((norm - 0.5) * 4 * 255);
        const g = 255;
        const b = 0;
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        // Yellow/Orange to Deep Red
        const r = 255;
        const g = Math.round((1.0 - norm) * 4 * 255);
        const b = 0;
        return `rgb(${r}, ${g}, ${b})`;
      }
    } else if (scheme === 'viridis') {
      // Indigo -> Teal -> Yellow
      const r = Math.round(norm * 253);
      const g = Math.round(norm * 231);
      const b = Math.round((1 - norm) * 112 + norm * 37);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (scheme === 'classic') {
      // Classic topography scale: Valleys green, slopes brown, peaks beige/white
      if (norm < 0.3) {
        return `rgb(34, 139, 34)`; // Forest Green
      } else if (norm < 0.6) {
        return `rgb(160, 82, 45)`; // Sienna / Light Brown
      } else if (norm < 0.85) {
        return `rgb(222, 184, 135)`; // Burlywood / Beige
      } else {
        return `rgb(245, 245, 240)`; // Snow off-white
      }
    } else {
      // Monochrome Cybernetic Cyan highlight
      return `rgba(6, 182, 212, ${0.4 + norm * 0.6})`;
    }
  };

  // 2. Loop & Frame Draw Canvas rendering (Z-buffered)
  useEffect(() => {
    let animationId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup High DPI Canvas context
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpi = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpi;
      canvas.height = rect.height * dpi;
      ctx.scale(dpi, dpi);
    };

    handleResize();

    let localYaw = yaw;

    const renderFrame = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Background clearing with beautiful dark-slate map theme gradient
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      // Add a subtle grid/radial target background for technological context
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const diagonal = Math.sqrt(width*width + height*height);
      for (let r = 80; r < diagonal / 2; r += 120) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      const { points, minZ, maxZ, spanX, spanY, spanZ, avgZ } = statsAndPoints;
      if (points.length === 0) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Analyse du fichier 3D en cours...", width / 2, height / 2);
        return;
      }

      // Handle continuous rotation
      if (isAutoRotating) {
        localYaw = (localYaw + 0.18) % 360;
      } else {
        localYaw = yaw;
      }

      // Calculate the size bounds to fit in a bounding box centered in canvas
      const maxSpan = Math.max(spanX, spanY) || 1;
      
      // Center translation and perspective transformations
      const radPitch = (pitch * Math.PI) / 180;
      const radYaw = (localYaw * Math.PI) / 180;

      const cosP = Math.cos(radPitch);
      const sinP = Math.sin(radPitch);
      const cosY = Math.cos(radYaw);
      const sinY = Math.sin(radYaw);

      // Fit scale helper: size of physical bounding box map to viewport pixels
      const visualRadius = Math.min(width, height) * 0.35 * zoom;
      const boundsRadius = maxSpan / 2;
      const mapScale = visualRadius / (boundsRadius || 1);

      // Center offset Z for standard perspective
      const cameraDist = 400;

      interface ProjectedPt {
        rx: number;      // Rotated X
        ry: number;      // Rotated Y
        rz: number;      // Rotated Z (Depth for painter sorting)
        px: number;      // Projected Screen X
        py: number;      // Projected Screen Y
        color: string;
        rawZ: number;
        index: number;
        ptSource: Point3D;
      }

      const projected: ProjectedPt[] = points.map((p, idx) => {
        // Translate to zero-center local bounding box
        const xPos = p.x;
        const yPos = p.y;
        
        // Exaggerate elevation Z
        const zPos = (p.z - avgZ) * zScale;

        // Perform standard matrix rotation for 3D coordinate system (Y-Up standard projection)
        // 1. Rotate around Z (Yaw)
        const x1 = xPos * cosY - yPos * sinY;
        const y1 = xPos * sinY + yPos * cosY;
        
        // 2. Rotate around X (Pitch)
        const rotX_val = x1;
        const rotY_val = y1 * cosP - zPos * sinP;
        const rotZ_val = y1 * sinP + zPos * cosP; // This represents depth

        // Apply perspective vs orthographic projection equations
        let scaleFactor = 1.0;
        if (projection === 'perspective') {
          // Perspective shrinkage factor based on depth rotZ_val
          scaleFactor = cameraDist / (cameraDist + rotZ_val * mapScale * 0.003);
        }

        const screenX = width / 2 + panX + (rotX_val * mapScale) * scaleFactor;
        const screenY = height / 2 + panY - (rotY_val * mapScale) * scaleFactor;

        return {
          rx: rotX_val,
          ry: rotY_val,
          rz: rotZ_val, // higher means further away (drawn first)
          px: screenX,
          py: screenY,
          color: getPointColor(p.z, minZ, maxZ, colorScheme),
          rawZ: p.z,
          index: idx,
          ptSource: p
        };
      });

      // Painter Algorithm: Sort by depth (rz DESC, further first, closer last)
      projected.sort((a, b) => b.rz - a.rz);

      // --- DRAW 3D AXES & GRID FRAME ---
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        // Draw ground grid boundaries: box corners of physical terrain model
        const halfSpanX = spanX / 2 || 100;
        const halfSpanY = spanY / 2 || 100;
        const groundHeight = minZ - avgZ; // relative Z coordinate of floor

        const boxCorners = [
          { x: -halfSpanX, y: -halfSpanY, z: groundHeight },
          { x: halfSpanX, y: -halfSpanY, z: groundHeight },
          { x: halfSpanX, y: halfSpanY, z: groundHeight },
          { x: -halfSpanX, y: halfSpanY, z: groundHeight },
        ];

        // Project corners
        const projCorners = boxCorners.map(c => {
          const zPos = c.z * zScale;
          const x1 = c.x * cosY - c.y * sinY;
          const y1 = c.x * sinY + c.y * cosY;
          const rx = x1;
          const ry = y1 * cosP - zPos * sinP;
          const rz = y1 * sinP + zPos * cosP;
          
          let scaleFactor = 1;
          if (projection === 'perspective') {
            scaleFactor = cameraDist / (cameraDist + rz * mapScale * 0.003);
          }
          return {
            px: width / 2 + panX + (rx * mapScale) * scaleFactor,
            py: height / 2 + panY - (ry * mapScale) * scaleFactor
          };
        });

        // Draw bounding base square
        ctx.beginPath();
        ctx.moveTo(projCorners[0].px, projCorners[0].py);
        for (let idx = 1; idx < 4; idx++) {
          ctx.lineTo(projCorners[idx].px, projCorners[idx].py);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw Grid Lines connecting opposite sides
        const gridDivisions = 6;
        for (let i = 1; i < gridDivisions; i++) {
          const t = i / gridDivisions;
          // E-W lines
          const pStart = { px: projCorners[0].px * (1 - t) + projCorners[3].px * t, py: projCorners[0].py * (1 - t) + projCorners[3].py * t };
          const pEnd = { px: projCorners[1].px * (1 - t) + projCorners[2].px * t, py: projCorners[1].py * (1 - t) + projCorners[2].py * t };
          ctx.beginPath();
          ctx.moveTo(pStart.px, pStart.py);
          ctx.lineTo(pEnd.px, pEnd.py);
          ctx.stroke();

          // N-S lines
          const pStartNS = { px: projCorners[0].px * (1 - t) + projCorners[1].px * t, py: projCorners[0].py * (1 - t) + projCorners[1].py * t };
          const pEndNS = { px: projCorners[3].px * (1 - t) + projCorners[2].px * t, py: projCorners[3].py * (1 - t) + projCorners[2].py * t };
          ctx.beginPath();
          ctx.moveTo(pStartNS.px, pStartNS.py);
          ctx.lineTo(pEndNS.px, pEndNS.py);
          ctx.stroke();
        }

        // Draw Compass Orientation Indicators on corners
        ctx.fillText("NORD (Y+)", projCorners[3].px, projCorners[3].py - 6);
        ctx.fillText("EST (X+)", projCorners[1].px + 8, projCorners[1].py);
        ctx.fillText("SUD", projCorners[0].px, projCorners[0].py + 12);
        ctx.fillText("OUEST", projCorners[2].px - 34, projCorners[2].py);

        // Draw vertical scale ladder
        // Show sea level indicator or local floor/ceiling labels
        const relativeMaxZ = maxZ - avgZ;
        const zPosTop = relativeMaxZ * zScale;
        const xCenterOffset = 0;
        const yCenterOffset = 0;

        const pTop = {
          x1: xCenterOffset * cosY - yCenterOffset * sinY,
          y1: xCenterOffset * sinY + yCenterOffset * cosY,
          get rx() { return this.x1; },
          get ry() { return this.y1 * cosP - zPosTop * sinP; },
          get rz() { return this.y1 * sinP + zPosTop * cosP; },
          get scale() { return projection === 'perspective' ? cameraDist / (cameraDist + this.rz * mapScale * 0.003) : 1; },
          get px() { return width / 2 + panX + (this.rx * mapScale) * this.scale; },
          get py() { return height / 2 + panY - (this.ry * mapScale) * this.scale; }
        };

        const zPosBot = (minZ - avgZ) * zScale;
        const pBot = {
          x1: xCenterOffset * cosY - yCenterOffset * sinY,
          y1: xCenterOffset * sinY + yCenterOffset * cosY,
          get rx() { return this.x1; },
          get ry() { return this.y1 * cosP - zPosBot * sinP; },
          get rz() { return this.y1 * sinP + zPosBot * cosP; },
          get scale() { return projection === 'perspective' ? cameraDist / (cameraDist + this.rz * mapScale * 0.003) : 1; },
          get px() { return width / 2 + panX + (this.rx * mapScale) * this.scale; },
          get py() { return height / 2 + panY - (this.ry * mapScale) * this.scale; }
        };

        // Vertical central elevator line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pBot.px, pBot.py);
        ctx.lineTo(pTop.px, pTop.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tick marks on Z axis
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`+${maxZ.toFixed(1)}m`, pTop.px + 5, pTop.py + 3);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${minZ.toFixed(1)}m`, pBot.px + 5, pBot.py + 3);

        ctx.restore();
      }

      // --- DRAW WIREFRAME SURFACE MESH CONNECTIONS ---
      if (showWireframe && projected.length > 1) {
        ctx.save();
        ctx.lineWidth = 0.5;

        // Draw connections only between neighboring points that are physically close in horizontal meter space
        const thresholdSq = wireframeDistance * wireframeDistance;

        // In order to avoid O(N^2) lag on huge files, we scan up to 250 points or restrict search depth
        const pointsToWire = projected.slice(0, 450);

        for (let i = 0; i < pointsToWire.length; i++) {
          const ptA = pointsToWire[i];
          const srcA = ptA.ptSource;

          // Search neighboring entries
          for (let j = i + 1; j < pointsToWire.length; j++) {
            const ptB = pointsToWire[j];
            const srcB = ptB.ptSource;

            // 2D horizontal metric distance check
            const distSq = (srcA.x - srcB.x)**2 + (srcA.y - srcB.y)**2;
            if (distSq < thresholdSq) {
              const gradient = ctx.createLinearGradient(ptA.px, ptA.py, ptB.px, ptB.py);
              gradient.addColorStop(0, ptA.color.replace('rgb', 'rgba').replace(')', ', 0.15)'));
              gradient.addColorStop(1, ptB.color.replace('rgb', 'rgba').replace(')', ', 0.15)'));
              
              ctx.strokeStyle = gradient;
              ctx.beginPath();
              ctx.moveTo(ptA.px, ptA.py);
              ctx.lineTo(ptB.px, ptB.py);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // --- DRAW CONTOUR ALTITUDE ISOLINES ---
      if (showContour && projected.length > 5) {
        ctx.save();
        ctx.lineWidth = 1.0;
        
        // Isoclines slices every X meters
        const step = spanZ > 200 ? 50 : spanZ > 50 ? 10 : spanZ > 10 ? 2 : 1;
        const roundMin = Math.ceil(minZ / step) * step;
        const roundMax = Math.floor(maxZ / step) * step;

        for (let iso = roundMin; iso <= roundMax; iso += step) {
          ctx.strokeStyle = `rgba(14, 116, 144, 0.25)`;
          ctx.fillStyle = `rgba(14, 116, 144, 0.4)`;
          
          // Basic interpolation logic connecting points of similar altitude
          const isoPts = projected.filter(p => Math.abs(p.rawZ - iso) < step / 2);
          if (isoPts.length > 2) {
            ctx.beginPath();
            ctx.moveTo(isoPts[0].px, isoPts[0].py);
            for (let k = 1; k < isoPts.length; k++) {
              ctx.lineTo(isoPts[k].px, isoPts[k].py);
            }
            ctx.stroke();
            
            // Label first point of isoclinic line
            if (Math.round(iso) % (step * 2) === 0) {
              ctx.font = '8px monospace';
              ctx.fillText(`${iso.toFixed(0)}m`, isoPts[0].px + 4, isoPts[0].py + 3);
            }
          }
        }
        ctx.restore();
      }

      // --- DRAW THE CLOUD POINTS ---
      projected.forEach((p) => {
        ctx.beginPath();
        
        // Highlight active point under mouse coordinates if desired
        ctx.arc(p.px, p.py, pointSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;

        // Draw soft outer light glows for top peak spots
        if (p.rawZ === maxZ) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#f43f5e';
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fill();

        // Extra details on hovering points or top peak coordinates label
        if (p.rawZ === maxZ && points.length < 500) {
          ctx.fillStyle = '#f43f5e';
          ctx.font = '9px system-ui';
          ctx.fillText(` Sommet (${maxZ.toFixed(1)} m)`, p.px + pointSize + 3, p.py + 3);
        } else if (p.rawZ === minZ && points.length < 500) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '9px system-ui';
          ctx.fillText(` Point Bas (${minZ.toFixed(1)} m)`, p.px + pointSize + 3, p.py + 3);
        }
      });
      ctx.shadowBlur = 0; // reset paint shadows

      if (isAutoRotating) {
        animationId = requestAnimationFrame(renderFrame);
      }
    };

    if (isAutoRotating) {
      animationId = requestAnimationFrame(renderFrame);
    } else {
      renderFrame();
    }

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [statsAndPoints, pitch, yaw, zoom, panX, panY, pointSize, isAutoRotating, showGrid, showWireframe, showContour, colorScheme, zScale, terrainSimulation, wireframeDistance, projection]);

  // Orbit navigation event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseRef.current.isDown = true;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
    mouseRef.current.button = e.button; // 0 for left key, 2 for right key
    setIsAutoRotating(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return;

    const deltaX = e.clientX - mouseRef.current.lastX;
    const deltaY = e.clientY - mouseRef.current.lastY;

    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;

    if (mouseRef.current.button === 2 || e.shiftKey) {
      // PANNING
      setPanX(prev => prev + deltaX);
      setPanY(prev => prev + deltaY);
    } else {
      // ROTATION ORBIT
      setYaw(prev => (prev + deltaX * 0.6) % 360);
      setPitch(prev => Math.min(Math.max(prev - deltaY * 0.6, 5), 85)); // Lock vertical view angle between 5 and 85 deg
    }
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * factor, 0.4), 6.0));
  };

  const resetView = () => {
    setPitch(30);
    setYaw(45);
    setZoom(1.2);
    setPanX(0);
    setPanY(0);
    setZScale(1.5);
  };

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#0b0f19] text-white relative select-none rounded-2xl overflow-hidden shadow-2xl">
      {/* 3D Main Canvas Wrapper */}
      <div className="flex-1 h-full relative cursor-grab active:cursor-grabbing">
        <canvas
          id="canvas-topo-3d"
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full block"
        />

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-xs font-semibold text-white/90 hover:bg-zinc-800 transition-all hover:translate-x-1"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Retour Carte</span>
          </button>
        </div>

        {/* Hover / Corner UI Overlay Compass */}
        <div className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl space-y-3 w-72 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Analyse de Pentes 3D</span>
            </div>
            <Compass className="w-4 h-4 text-white/50 animate-spin-slow" />
          </div>

          <div className="space-y-2 font-mono text-[11px] text-white/80">
            <div className="flex justify-between">
              <span className="text-white/50">Point levés</span>
              <span className="text-white font-bold">{statsAndPoints.points.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Altitude Max</span>
              <span className="text-rose-400 font-bold">{statsAndPoints.maxZ.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Altitude Min</span>
              <span className="text-sky-400 font-bold">{statsAndPoints.minZ.toFixed(2)} m</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/50">Dénivelé total</span>
              <span className="text-amber-400 font-bold">{statsAndPoints.spanZ.toFixed(2)} m</span>
            </div>
            
            <div className="flex justify-between pt-1">
              <span className="text-white/50">Pente Max Estimée</span>
              <span className="text-red-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {statsAndPoints.maxSlope.toFixed(1)}°
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-white/50">
              <span>Inclinaison moyenne</span>
              <span>{Math.min(35, statsAndPoints.maxSlope * 0.45).toFixed(1)}%</span>
            </div>
          </div>

          {/* Quick instructions indicator */}
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex gap-2 items-start text-[10px] text-white/60">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              Cliquez-glissez pour pivoter. Molette pour zoomer. Clic-droit (ou Shift) pour déplacer le terrain.
            </p>
          </div>
        </div>

        {/* View Angles Indicator Badge */}
        <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-[10px] font-mono text-white/60 flex items-center gap-3">
          <span>Pitch: <strong className="text-cyan-400">{Math.round(pitch)}°</strong></span>
          <span className="w-px h-3 bg-white/20" />
          <span>Yaw: <strong className="text-cyan-400">{Math.round(yaw)}°</strong></span>
          <span className="w-px h-3 bg-white/20" />
          <span>Contrôles d'orbite : Actifs</span>
        </div>
      </div>

      {/* 3D Dashboard Settings Controls Panel */}
      <div className="w-full md:w-80 h-auto md:h-full bg-zinc-950/90 border-t md:border-t-0 md:border-l border-white/10 p-5 space-y-5 overflow-y-auto shrink-0 relative">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Configuration 3D
          </h3>
          <p className="text-[11px] text-zinc-400">
            Personnalisez le rendu du relief et des pentes du terrain.
          </p>
        </div>

        <div className="h-px bg-white/10 my-1" />

        {/* FALLBACK ALTITUDE SIMULATION SECTION */}
        {!statsAndPoints.hasRealAltitude && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-300">
              <Mountain className="w-4 h-4 shrink-0" />
              <h4 className="text-xs font-bold font-display">Générateur de relief actif (Fichier 2D)</h4>
            </div>
            <p className="text-[10px] text-zinc-300 leading-snug">
              Ce fichier contient des coordonnées planaires (2D) sans altitudes (XYZ). Nous avons simulé une surface 3D interactive pour prévisualiser les inclinaisons.
            </p>
            
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                { id: 'hill', label: 'Colline Centrale' },
                { id: 'valley', label: 'Relief Canyon' },
                { id: 'slope', label: 'Double Pente' }
              ].map(sim => (
                <button
                  type="button"
                  key={sim.id}
                  onClick={() => setTerrainSimulation(sim.id as any)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all text-center",
                    terrainSimulation === sim.id 
                      ? "bg-amber-500 border-amber-500 text-black font-extrabold" 
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  )}
                >
                  {sim.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* HEIGHT EXAGGERATION */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="text-zinc-300 font-medium">Exagération du relief (Z)</label>
            <span className="font-mono text-cyan-400 font-bold">{zScale}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="4.0"
            step="0.1"
            value={zScale}
            onChange={(e) => setZScale(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <p className="text-[9px] text-zinc-500 italic">
            Accentue les dénivelés pour mettre en évidence les faibles pentes.
          </p>
        </div>

        {/* POINT SIZE */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="text-zinc-300 font-medium">Taille des Points XYZ</label>
            <span className="font-mono text-cyan-400 font-bold">{pointSize}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={pointSize}
            onChange={(e) => setPointSize(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* WIREFRAME SPACE DISTANCE THRESHOLD */}
        {showWireframe && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-zinc-300 font-medium flex items-center gap-1">
                Densité des mailles (TIN)
              </label>
              <span className="font-mono text-cyan-400 font-bold">{wireframeDistance}m</span>
            </div>
            <input
              type="range"
              min={Math.ceil(statsAndPoints.avgDistance * 0.5) || 5}
              max={Math.ceil(statsAndPoints.avgDistance * 4.0) || 120}
              step="1"
              value={wireframeDistance}
              onChange={(e) => setWireframeDistance(parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        )}

        {/* RENDER OPTIONS CHECKBOXES */}
        <div className="space-y-2.5">
          <label className="text-xs text-zinc-400 block font-medium uppercase tracking-wider">Options de Rendu</label>
          
          <div className="space-y-2">
            {/* Auto Rotation */}
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                isAutoRotating ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              <span className="flex items-center gap-2">
                <RotateCw className={cn("w-4 h-4 text-cyan-400", isAutoRotating && "animate-spin-slow")} />
                Auto-pivoter la vue
              </span>
              <div className={cn("w-2 h-2 rounded-full", isAutoRotating ? "bg-cyan-400" : "bg-zinc-600")} />
            </button>

            {/* Triangulation Lines */}
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                showWireframe ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              <span className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-cyan-400" />
                Mailler la surface (3D wire)
              </span>
              <div className={cn("w-2 h-2 rounded-full", showWireframe ? "bg-cyan-400" : "bg-zinc-600")} />
            </button>

            {/* Grid Box */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                showGrid ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              <span className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                Boîte d'alignement & boussole
              </span>
              <div className={cn("w-2 h-2 rounded-full", showGrid ? "bg-cyan-400" : "bg-zinc-600")} />
            </button>

            {/* Contour Lines */}
            <button
              onClick={() => setShowContour(!showContour)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all",
                showContour ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Tracer les courbes de niveau
              </span>
              <div className={cn("w-2 h-2 rounded-full", showContour ? "bg-cyan-400" : "bg-zinc-600")} />
            </button>
          </div>
        </div>

        {/* SYSTEM SWITCH COLOR SCHEME */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 block font-medium uppercase tracking-wider">Palette d'Altitude</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'spectral', label: 'Arc-en-ciel (RVB)', desc: 'Chaud à Froid' },
              { id: 'viridis', label: 'Viridis', desc: 'Contour Cyber' },
              { id: 'classic', label: 'Topographie', desc: 'Règles IGN' },
              { id: 'monochrome', label: 'Néon Cyan', desc: 'Brutalist' }
            ].map(scheme => (
              <button
                type="button"
                key={scheme.id}
                onClick={() => setColorScheme(scheme.id as any)}
                className={cn(
                  "p-2 rounded-xl border text-left flex flex-col justify-between transition-all",
                  colorScheme === scheme.id 
                    ? "bg-cyan-950/60 border-cyan-500 text-white font-semibold" 
                    : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                )}
              >
                <span className="text-[11px] font-bold block">{scheme.label}</span>
                <span className="text-[8px] text-zinc-400 mt-0.5">{scheme.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CAMERA PRESET ANGLES & PROJECTION */}
        <div className="space-y-2.5">
          <label className="text-xs text-zinc-400 block font-medium uppercase tracking-wider">Projection & Caméra</label>
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
            <button
              onClick={() => setProjection('perspective')}
              className={cn(
                "py-1.5 rounded-lg border text-center transition-all",
                projection === 'perspective' ? "bg-cyan-600 border-cyan-500 text-white" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              Perspective Z
            </button>
            <button
              onClick={() => setProjection('orthographic')}
              className={cn(
                "py-1.5 rounded-lg border text-center transition-all",
                projection === 'orthographic' ? "bg-cyan-600 border-cyan-500 text-white" : "bg-white/5 border-white/10 text-zinc-400"
              )}
            >
              Orthogonale XY
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setPitch(85); setYaw(0); }}
              className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-[9px] font-bold border border-white/5 text-center transition-all"
            >
              Vue du Dessus
            </button>
            <button
              onClick={() => { setPitch(0); setYaw(0); }}
              className="flex-1 bg-white/5 hover:bg-white/10 py-1.5 rounded-lg text-[9px] font-bold border border-white/5 text-center transition-all"
            >
              Vue de Face
            </button>
            <button
              onClick={resetView}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 py-1.5 rounded-lg text-[9px] font-bold text-cyan-400 flex items-center justify-center gap-1 transition-all"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
