import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../types';
import { playDistantThunderSound, playFuelFillingSound } from '../utils/audio';

interface HighwayCanvasProps {
  isPlaying: boolean;
  currentRoute: { from: string; to: string };
  hornTrigger?: number;
  isDoorOpen?: boolean;
  weather?: WeatherType;
  onToggleDoor?: () => void;
  onToggleWeather?: () => void;
}

interface TelephonePole {
  x: number;
}

interface DustParticle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
  alpha: number;
  layer: 'bg' | 'fg';
}

interface SplashRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface TyreSpray {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FogBand {
  yRatio: number;
  heightRatio: number;
  speed: number;
  offset: number;
  alpha: number;
}

interface Milestone {
  x: number;
  km: number;
}

interface RoadFeature {
  x: number;
  type: 'breaker' | 'pothole';
  width: number;
  height: number;
}

export const HighwayCanvas: React.FC<HighwayCanvasProps> = ({
  isPlaying,
  currentRoute,
  hornTrigger = 0,
  isDoorOpen = false,
  weather = 'clear',
  onToggleDoor,
  onToggleWeather,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // References for animation state
  const stateRef = useRef({
    isPlaying,
    currentRoute,
    roadOffset: 0,
    wheelAngle: 0,
    width: 0,
    height: 0,
    weather,
    poles: [] as TelephonePole[],
    milestones: [] as Milestone[],
    particles: [] as DustParticle[],
    rainDrops: [] as RainDrop[],
    splashes: [] as SplashRipple[],
    tyreSprays: [] as TyreSpray[],
    fogBands: [] as FogBand[],
    roadFeatures: [] as RoadFeature[],
    frontSuspension: 0,
    frontSuspensionVel: 0,
    rearSuspension: 0,
    rearSuspensionVel: 0,
    animationFrameId: 0,
    lastTime: 0,
    lastHornTrigger: hornTrigger,
    lastHonkTime: 0,
    lastLightningTime: 0,
    lightningFlashAlpha: 0,
    isDoorOpen,
    doorProgress: isDoorOpen ? 1 : 0,
    doorHitBox: { x: 0, y: 0, w: 0, h: 0 },
    tankHitBox: { x: 0, y: 0, w: 0, h: 0 },
    refuelingUntil: 0,
    lastRefuelTapTime: 0,
    lastToggleTime: 0,
    onToggleDoor,
    onToggleWeather,
  });

  // Keep stateRef in sync with latest props without extra effects
  stateRef.current.isPlaying = isPlaying;
  stateRef.current.currentRoute = currentRoute;
  stateRef.current.isDoorOpen = isDoorOpen;
  stateRef.current.weather = weather;
  stateRef.current.onToggleDoor = onToggleDoor;
  stateRef.current.onToggleWeather = onToggleWeather;
  if (hornTrigger > 0 && hornTrigger !== stateRef.current.lastHornTrigger) {
    stateRef.current.lastHornTrigger = hornTrigger;
    stateRef.current.lastHonkTime = performance.now();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const poleSpacing = 380;

    const getScreenDimensions = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { w: Math.round(rect.width), h: Math.round(rect.height) };
        }
      }
      const w = window.innerWidth || document.documentElement.clientWidth || 360;
      const h = window.innerHeight || document.documentElement.clientHeight || 640;
      return { w: Math.max(w, 100), h: Math.max(h, 100) };
    };

    const initPoles = (width: number) => {
      const poles: TelephonePole[] = [];
      // Initialize starting deep off-screen to the left (-poleSpacing * 2) so wires never disappear
      for (let x = -poleSpacing * 2.2; x < width + poleSpacing * 2.8; x += poleSpacing) {
        poles.push({ x });
      }
      return poles;
    };

    const initMilestones = (width: number) => [
      { x: width + 200, km: 42 },
      { x: width + 850, km: 38 },
    ];

    const initParticles = (width: number, height: number) => {
      const particles: DustParticle[] = [];
      for (let i = 0; i < 45; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2 + 1,
          speed: Math.random() * 3 + 2,
          alpha: Math.random() * 0.4 + 0.1,
        });
      }
      return particles;
    };

    const initRoadFeatures = (w: number): RoadFeature[] => [
      { x: w * 3.2, type: 'breaker', width: 46, height: 6.5 },
      { x: w * 7.5, type: 'pothole', width: 42, height: 5.0 },
    ];

    const initRainDrops = (width: number, height: number): RainDrop[] => {
      const count = Math.floor(Math.max(90, Math.min(260, width * 0.28)));
      const drops: RainDrop[] = [];
      for (let i = 0; i < count; i++) {
        drops.push({
          x: Math.random() * (width + 300) - 150,
          y: Math.random() * (height + 100) - 50,
          len: Math.random() * 20 + 14,
          speed: Math.random() * 12 + 18,
          alpha: Math.random() * 0.4 + 0.35,
          layer: Math.random() > 0.45 ? 'fg' : 'bg',
        });
      }
      return drops;
    };

    const initFogBands = (): FogBand[] => [
      { yRatio: 0.44, heightRatio: 0.22, speed: 0.45, offset: 0, alpha: 0.28 },
      { yRatio: 0.52, heightRatio: 0.26, speed: 0.85, offset: 120, alpha: 0.38 },
      { yRatio: 0.62, heightRatio: 0.30, speed: 1.35, offset: 240, alpha: 0.45 },
      { yRatio: 0.72, heightRatio: 0.34, speed: 1.85, offset: 360, alpha: 0.30 },
    ];

    const initialSize = getScreenDimensions();
    stateRef.current.width = initialSize.w;
    stateRef.current.height = initialSize.h;
    stateRef.current.poles = initPoles(initialSize.w);
    stateRef.current.milestones = initMilestones(initialSize.w);
    stateRef.current.particles = initParticles(initialSize.w, initialSize.h);
    stateRef.current.rainDrops = initRainDrops(initialSize.w, initialSize.h);
    stateRef.current.fogBands = initFogBands();
    stateRef.current.roadFeatures = initRoadFeatures(initialSize.w);

    const applyCanvasSize = (w: number, h: number) => {
      if (!canvas || !ctx || w <= 0 || h <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      stateRef.current.width = w;
      stateRef.current.height = h;
      stateRef.current.lastTime = 0;

      // Expand telephone poles across left and right boundaries to guarantee unbreakable continuous wire flow
      const poles = stateRef.current.poles;
      let minPoleX = Infinity;
      let maxPoleX = -Infinity;
      poles.forEach((p) => {
        if (p.x < minPoleX) minPoleX = p.x;
        if (p.x > maxPoleX) maxPoleX = p.x;
      });
      while (minPoleX > -poleSpacing * 2.2) {
        minPoleX -= poleSpacing;
        poles.unshift({ x: minPoleX });
      }
      while (maxPoleX < w + poleSpacing * 2.8) {
        maxPoleX += poleSpacing;
        poles.push({ x: maxPoleX });
      }

      // Re-bound any ambient dust particles that lie outside the new view bounds
      stateRef.current.particles.forEach((p) => {
        if (p.x > w) p.x = Math.random() * w;
        if (p.y > h) p.y = Math.random() * h;
      });

      // Update rain drops on resize across responsive devices (portrait <-> landscape)
      const targetDropCount = Math.floor(Math.max(90, Math.min(260, w * 0.28)));
      if (Math.abs(stateRef.current.rainDrops.length - targetDropCount) > 25) {
        stateRef.current.rainDrops = initRainDrops(w, h);
      } else {
        stateRef.current.rainDrops.forEach((d) => {
          if (d.x > w + 200) d.x = Math.random() * (w + 200) - 100;
          if (d.y > h + 100) d.y = Math.random() * (h + 100) - 50;
        });
      }
    };

    applyCanvasSize(initialSize.w, initialSize.h);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      const { w, h } = getScreenDimensions();
      applyCanvasSize(w, h);
    };

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleResize();
      }, 50);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        stateRef.current.lastTime = 0;
      }
    };

    // Responsive ResizeObserver on canvas container element
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          if (cr.width > 0 && cr.height > 0) {
            const w = Math.round(cr.width);
            const h = Math.round(cr.height);
            if (stateRef.current.width !== w || stateRef.current.height !== h) {
              if (resizeTimer) clearTimeout(resizeTimer);
              resizeTimer = setTimeout(() => {
                applyCanvasSize(w, h);
              }, 40);
            }
          }
        }
      });
      const target = containerRef.current || canvas.parentElement || canvas;
      if (target) {
        observer.observe(target);
      }
    }

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const drawWheel = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      radius: number,
      angle: number,
      compressionDisp: number = 0
    ) => {
      context.save();
      context.translate(cx, cy);

      // Natural rubber contact squish under bus weight and roadway bumps
      const squishY = Math.max(0, -compressionDisp * 0.22);

      // 1. Deep Matte Black Commercial Rubber Tyre
      context.fillStyle = '#09090b';
      context.beginPath();
      // Outer rubber casing with subtle bottom contact flatten
      context.ellipse(0, squishY * 0.35, radius * 1.01, radius - squishY * 0.45, 0, 0, Math.PI * 2);
      context.fill();

      // 2. Heavy-Duty Rotating Tread Lugs (16 perimeter grip notches rotating with wheelAngle)
      context.save();
      context.rotate(angle);
      context.fillStyle = '#020203';
      const numTreads = 16;
      for (let t = 0; t < numTreads; t++) {
        const tAngle = (t * Math.PI * 2) / numTreads;
        context.save();
        context.rotate(tAngle);
        context.fillRect(radius * 0.86, -radius * 0.08, radius * 0.16, radius * 0.16);
        context.restore();
      }
      context.restore();

      // 3. Sidewall Rubber Bevel & Radial Contour Line
      context.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      context.lineWidth = 1.6;
      context.beginPath();
      context.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
      context.stroke();

      // Sidewall branding/embossing radial ring (Commercial Heavy Tyre)
      context.strokeStyle = '#27272a';
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.stroke();

      // 4. Commercial Heavy Duty Steel Disc Rim (Beveled Gunmetal & Chrome Lip)
      const rimRadius = radius * 0.60;
      const rimGrad = context.createRadialGradient(-2, -2, 1, 0, 0, rimRadius);
      rimGrad.addColorStop(0, '#a1a1aa');
      rimGrad.addColorStop(0.5, '#71717a');
      rimGrad.addColorStop(0.85, '#3f3f46');
      rimGrad.addColorStop(1, '#18181b');
      context.fillStyle = rimGrad;
      context.beginPath();
      context.arc(0, 0, rimRadius, 0, Math.PI * 2);
      context.fill();

      // Chrome Outer Rim Lip
      context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(0, 0, rimRadius, 0, Math.PI * 2);
      context.stroke();

      // 5. Six Circular Rim Ventilation / Cooling Holes rotating with angle
      context.save();
      context.rotate(angle);
      context.fillStyle = '#09090b';
      const numVentHoles = 6;
      const ventRadius = rimRadius * 0.15;
      const ventOrbit = rimRadius * 0.62;
      for (let v = 0; v < numVentHoles; v++) {
        const vAngle = (v * Math.PI * 2) / numVentHoles;
        const vx = Math.cos(vAngle) * ventOrbit;
        const vy = Math.sin(vAngle) * ventOrbit;
        context.beginPath();
        context.arc(vx, vy, ventRadius, 0, Math.PI * 2);
        context.fill();
        // Subtle highlight around vent hole
        context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        context.lineWidth = 0.8;
        context.stroke();
      }

      // 6. Ring of 8 Heavy Steel Wheel Lug Nuts / Studs
      context.fillStyle = '#f4f4f5';
      const numLugs = 8;
      const lugOrbit = rimRadius * 0.35;
      for (let l = 0; l < numLugs; l++) {
        const lAngle = (l * Math.PI * 2) / numLugs;
        const lx = Math.cos(lAngle) * lugOrbit;
        const ly = Math.sin(lAngle) * lugOrbit;
        context.beginPath();
        context.arc(lx, ly, 1.8, 0, Math.PI * 2);
        context.fill();
      }
      context.restore();

      // 7. Central Grease Hub Cap with metallic highlight
      const hubGrad = context.createRadialGradient(-1, -1, 0, 0, 0, rimRadius * 0.22);
      hubGrad.addColorStop(0, '#52525b');
      hubGrad.addColorStop(0.7, '#27272a');
      hubGrad.addColorStop(1, '#09090b');
      context.fillStyle = hubGrad;
      context.beginPath();
      context.arc(0, 0, rimRadius * 0.22, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#e4e4e7';
      context.lineWidth = 1;
      context.stroke();

      // Central axle nut highlight
      context.fillStyle = '#fbbf24';
      context.beginPath();
      context.arc(0, 0, rimRadius * 0.08, 0, Math.PI * 2);
      context.fill();

      context.restore();
    };

    const drawBus = (
      context: CanvasRenderingContext2D,
      w: number,
      h: number,
      timestamp: number,
      roadY: number,
      wheelAngle: number,
      activeRoute: { from: string; to: string },
      playing: boolean,
      isFog: boolean = false,
      isRain: boolean = false
    ) => {
      const isLandscapeMobile = h < 520 && w > h;
      const isMobile = w < 640 && !isLandscapeMobile;
      const busWidth = isLandscapeMobile
        ? Math.min(380, h * 0.95, w * 0.52)
        : isMobile
        ? Math.min(310, w * 0.82)
        : Math.min(460, w * 0.58);
      const busHeight = busWidth * 0.44;

      // Vertical bounce matching highway cruising
      const bounce = Math.sin(timestamp * 0.009) * (playing ? 2.2 : 0.8);
      const busX = (w - busWidth) * 0.5;

      // Dynamic suspension response from speed breakers and potholes
      const frontSusp = stateRef.current.frontSuspension;
      const rearSusp = stateRef.current.rearSuspension;
      const chassisDisp = (frontSusp + rearSusp) * 0.5;

      // Wheel sizing and true 70–75% body tuck with dynamic suspension travel
      const wheelR = busWidth * 0.068;
      const frontWheelX = busX + busWidth * 0.81;
      const rearWheelX = busX + busWidth * 0.23;

      const frontWheelCenterY = roadY - wheelR + bounce + frontSusp;
      const rearWheelCenterY = roadY - wheelR + bounce + rearSusp;

      // Lower skirt reaches down to roadY - 0.55 * wheelR, leaving only lower ~27% of wheel exposed
      const skirtY = roadY - 0.55 * wheelR + bounce + chassisDisp;
      const busY = skirtY - busHeight;

      // Dynamic chassis pitch angle tilting on road bumps or potholes
      const pitchAngle = Math.atan2(frontSusp - rearSusp, frontWheelX - rearWheelX) * 0.65;

      context.save();

      // 1. Realistic ground shadow: soft blurred and contoured precisely to the bus chassis & tires
      context.save();
      // Outer ambient soft blur shadow
      context.filter = 'blur(10px)';
      context.fillStyle = 'rgba(2, 4, 10, 0.70)';
      context.beginPath();
      context.roundRect(
        busX - busWidth * 0.03,
        roadY - 2,
        busWidth * 1.06,
        Math.max(16, busHeight * 0.24),
        [16, 12, 12, 16]
      );
      context.fill();

      // Inner dense chassis shadow with softer blur
      context.filter = 'blur(3.5px)';
      context.fillStyle = 'rgba(0, 0, 0, 0.90)';
      context.beginPath();
      context.roundRect(
        busX + busWidth * 0.02,
        roadY,
        busWidth * 0.96,
        Math.max(10, busHeight * 0.15),
        [12, 8, 8, 12]
      );
      context.fill();

      // Dense contact patches under the two tires
      context.fillStyle = '#000000';
      context.beginPath();
      context.ellipse(rearWheelX, roadY + wheelR * 0.12, wheelR * 0.9, 3.5, 0, 0, Math.PI * 2);
      context.ellipse(frontWheelX, roadY + wheelR * 0.12, wheelR * 0.9, 3.5, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();

      // 2. Wheel arch cutouts & Wheel Well Insets
      // Draw wheels FIRST with dynamic ground compression and suspension travel
      drawWheel(context, rearWheelX, rearWheelCenterY, wheelR, wheelAngle, rearSusp);
      drawWheel(context, frontWheelX, frontWheelCenterY, wheelR, wheelAngle, frontSusp);

      // Bus body transform with pitch tilt on speed breakers & potholes
      context.save();
      context.translate(busX + busWidth * 0.5, skirtY);
      context.rotate(pitchAngle);
      context.translate(-(busX + busWidth * 0.5), -skirtY);

      // 4. Lower Bus Body (State Roadways Crimson Red)
      const bodyGrad = context.createLinearGradient(0, busY + busHeight * 0.38, 0, skirtY);
      bodyGrad.addColorStop(0, '#b82618');
      bodyGrad.addColorStop(0.5, '#921c12');
      bodyGrad.addColorStop(1, '#69120a');
      context.fillStyle = bodyGrad;

      // Calculate smooth tangent intersection of wheel arch radius with lower skirt line
      const archR = wheelR * 1.18;
      const wheelNominalCenterY = roadY - wheelR;
      const dy = Math.max(0, skirtY - wheelNominalCenterY);
      const dX = Math.sqrt(Math.max(0, archR * archR - dy * dy));
      const archAngle = Math.asin(Math.min(0.99, dy / archR));

      // Custom path for bus lower body with circular wheel arch cutouts seamlessly joining the skirt line
      context.beginPath();
      context.moveTo(busX, busY + busHeight * 0.4);
      context.lineTo(busX + busWidth, busY + busHeight * 0.4);
      context.lineTo(busX + busWidth, skirtY);

      // Front wheel arch cutout connected seamlessly to lower skirt edge
      context.lineTo(frontWheelX + dX, skirtY);
      context.arc(frontWheelX, wheelNominalCenterY, archR, archAngle, Math.PI - archAngle, true);
      context.lineTo(rearWheelX + dX, skirtY);

      // Rear wheel arch cutout connected seamlessly to lower skirt edge
      context.arc(rearWheelX, wheelNominalCenterY, archR, archAngle, Math.PI - archAngle, true);
      context.lineTo(busX, skirtY);
      context.closePath();
      context.fill();

      // Continuous connected lower edge line drawn across the bus bottom and tyre covers
      context.strokeStyle = '#09090b';
      context.lineWidth = 2.4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(busX + busWidth, skirtY);
      context.lineTo(frontWheelX + dX, skirtY);
      context.arc(frontWheelX, wheelNominalCenterY, archR, archAngle, Math.PI - archAngle, true);
      context.lineTo(rearWheelX + dX, skirtY);
      context.arc(rearWheelX, wheelNominalCenterY, archR, archAngle, Math.PI - archAngle, true);
      context.lineTo(busX, skirtY);
      context.stroke();

      // Subtle metallic trim highlight line immediately above the lower skirt edge for sharp, crisp definition
      context.strokeStyle = 'rgba(254, 240, 138, 0.45)';
      context.lineWidth = 1.0;
      context.beginPath();
      context.moveTo(busX + busWidth, skirtY - 2);
      context.lineTo(frontWheelX + dX + 1, skirtY - 2);
      context.moveTo(frontWheelX - dX - 1, skirtY - 2);
      context.lineTo(rearWheelX + dX + 1, skirtY - 2);
      context.moveTo(rearWheelX - dX - 1, skirtY - 2);
      context.lineTo(busX, skirtY - 2);
      context.stroke();

      // 4b. Rectangular Fuel Tank Between Rear Tyre and Passenger Door (डीजल टंकी: "सच्चा साथी")
      // User requirement: Placed between door and back tyre, static plain white painted text "सच्चा साथी"
      const doorPosX = busX + busWidth * 0.572;
      const midSpanStart = rearWheelX + dX + 6;
      const midSpanEnd = doorPosX - 6;
      const midSpanW = midSpanEnd - midSpanStart;
      if (midSpanW > 25) {
        const tankW = Math.max(38, midSpanW * 0.86);
        const tankX = midSpanStart + (midSpanW - tankW) * 0.5;
        const tankH = Math.max(14, busHeight * 0.165);
        const tankY = skirtY - tankH * 0.81;

        // Record hit-box for interactive clicks/taps
        stateRef.current.tankHitBox = {
          x: tankX,
          y: tankY,
          w: tankW,
          h: tankH,
        };

        const isRefueling = performance.now() < stateRef.current.refuelingUntil;

        // Soft ground/chassis shadow under the tank
        context.fillStyle = 'rgba(0, 0, 0, 0.55)';
        context.beginPath();
        context.roundRect(tankX + 1, tankY + 2, tankW, tankH, 3);
        context.fill();

        // Metallic brushed steel fuel tank canister
        const tankGrad = context.createLinearGradient(tankX, tankY, tankX, tankY + tankH);
        tankGrad.addColorStop(0, '#334155');
        tankGrad.addColorStop(0.25, '#1e293b');
        tankGrad.addColorStop(0.75, '#0f172a');
        tankGrad.addColorStop(1, '#090d16');
        context.fillStyle = tankGrad;
        context.beginPath();
        context.roundRect(tankX, tankY, tankW, tankH, 3);
        context.fill();

        // Tank outer frame
        context.strokeStyle = isRefueling ? '#38bdf8' : '#475569';
        context.lineWidth = isRefueling ? 1.6 : 1.2;
        context.stroke();

        // Subtle horizontal brushed metallic specular stripe
        context.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        context.lineWidth = 0.8;
        context.beginPath();
        context.moveTo(tankX + 3, tankY + tankH * 0.26);
        context.lineTo(tankX + tankW - 3, tankY + tankH * 0.26);
        context.stroke();

        // Heavy-duty vertical mounting straps (टंकी क्लैंप)
        const strapRatios = [0.18, 0.82];
        strapRatios.forEach((ratio) => {
          const sx = tankX + tankW * ratio;
          context.fillStyle = '#1e293b';
          context.fillRect(sx - 1.8, tankY - 1.5, 3.6, tankH + 3);
          context.strokeStyle = '#64748b';
          context.lineWidth = 0.7;
          context.strokeRect(sx - 1.8, tankY - 1.5, 3.6, tankH + 3);

          // Rivet bolts
          context.fillStyle = '#cbd5e1';
          context.beginPath();
          context.arc(sx, tankY + 1.8, 0.9, 0, Math.PI * 2);
          context.arc(sx, tankY + tankH - 1.8, 0.9, 0, Math.PI * 2);
          context.fill();
        });

        // Vintage brass fuel cap & filler neck
        const capX = tankX + tankW * 0.88;
        const capY = tankY - 2.8;
        context.fillStyle = '#334155';
        context.fillRect(capX - 2, capY, 4, 3);
        context.fillStyle = isRefueling ? '#22c55e' : '#d97706';
        context.beginPath();
        context.roundRect(capX - 3.5, capY - 2.2, 7, 2.6, 1);
        context.fill();
        context.strokeStyle = isRefueling ? '#86efac' : '#fef08a';
        context.lineWidth = 0.8;
        context.stroke();

        // Refueling active visual cue (nozzle hose indicator)
        if (isRefueling) {
          // Fuel pump nozzle plugged into tank cap
          context.strokeStyle = '#10b981';
          context.lineWidth = 2.2;
          context.beginPath();
          context.moveTo(capX, capY - 2.2);
          context.lineTo(capX + 8, capY - 14);
          context.lineTo(capX + 16, capY - 10);
          context.stroke();

          // Green LED pump indicator dot
          context.fillStyle = '#22c55e';
          context.beginPath();
          context.arc(capX, capY - 3, 2, 0, Math.PI * 2);
          context.fill();
        }

        // Hand-painted Highway Bus Slogan: "सच्चा साथी" (Saacha Saathi)
        // User request: Plain white colour se painted text karo jisme normally koii animation nahi hogii
        const sloganText = 'सच्चा साथी';
        context.save();
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;

        // Auto-fit slogan to available space between straps
        const availableTextW = tankW * 0.62;
        let sloganFontSize = Math.max(6.5, Math.min(9.5, tankH * 0.46));
        context.font = `bold ${sloganFontSize}px "Yatra One", cursive`;
        while (context.measureText(sloganText).width > availableTextW && sloganFontSize > 4.5) {
          sloganFontSize -= 0.5;
          context.font = `bold ${sloganFontSize}px "Yatra One", cursive`;
        }

        // Plain crisp white painted text per user request
        context.fillStyle = '#ffffff';
        context.fillText(sloganText, tankX + tankW * 0.5, tankY + tankH * 0.54);

        // Flanking clean white decorative dots if space permits
        const textMetric = context.measureText(sloganText).width;
        if (availableTextW - textMetric > 6) {
          context.fillStyle = '#f8fafc';
          const dotOffset = textMetric * 0.5 + 3.5;
          context.fillText('•', tankX + tankW * 0.5 - dotOffset, tankY + tankH * 0.54);
          context.fillText('•', tankX + tankW * 0.5 + dotOffset, tankY + tankH * 0.54);
        }
        context.restore();
      }

      // 5. Upper Bus Body (Retro Indian Highway Golden Ochre)
      const roofGrad = context.createLinearGradient(0, busY, 0, busY + busHeight * 0.4);
      roofGrad.addColorStop(0, '#fbbf24');
      roofGrad.addColorStop(1, '#e69a0c');
      context.fillStyle = roofGrad;
      context.beginPath();
      context.roundRect(busX, busY, busWidth, busHeight * 0.4, [16, 18, 0, 0]);
      context.fill();

      // 6. Beltlines and Divider Strips
      context.fillStyle = '#14532d';
      context.fillRect(busX, busY + busHeight * 0.4, busWidth, 5);
      context.fillStyle = 'rgba(254, 240, 138, 0.65)';
      context.fillRect(busX, busY + busHeight * 0.4 + 5, busWidth, 1.5);

      // 7. Bus Side Branding (Safarnama Express) with subtle, low-intensity and delayed neon stroke
      const neonTime = timestamp * 0.0022; // Relaxed, delayed breathing cycle
      const blinkPulse = (Math.sin(neonTime) + 1) * 0.5;
      const glowAlpha = 0.22 + blinkPulse * 0.30; // Soft, low-intensity glow

      const brandingSize = Math.max(10.5, busWidth * 0.035);
      const brandingX = busX + busWidth * 0.08;
      const brandingY = busY + busHeight * 0.68;

      context.save();
      context.font = `bold ${brandingSize}px "Yatra One", cursive`;
      context.textAlign = 'left';

      const titleText = 'सफ़रनामा एक्सप्रेस';
      const textW = context.measureText(titleText).width;
      const starRadius = Math.max(2.4, brandingSize * 0.24); // Refined, smaller side stars
      const starCenterY = brandingY - brandingSize * 0.32;
      const starGap = brandingSize * 0.42;
      const leftStarX = brandingX + starRadius;
      const textX = leftStarX + starRadius + starGap;
      const rightStarX = textX + textW + starGap + starRadius;

      const drawSmallSideStar = (cx: number, cy: number, r: number) => {
        context.beginPath();
        for (let i = 0; i < 5; i++) {
          const aExt = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          const aInt = aExt + Math.PI / 5;
          const x1 = cx + Math.cos(aExt) * r;
          const y1 = cy + Math.sin(aExt) * r;
          const x2 = cx + Math.cos(aInt) * (r * 0.43);
          const y2 = cy + Math.sin(aInt) * (r * 0.43);
          if (i === 0) context.moveTo(x1, y1);
          else context.lineTo(x1, y1);
          context.lineTo(x2, y2);
        }
        context.closePath();
      };

      // Soft, low-intensity outer neon stroke
      context.strokeStyle = `rgba(251, 191, 36, ${glowAlpha * 0.75})`;
      context.lineWidth = 1.8;
      context.shadowColor = `rgba(245, 158, 11, ${glowAlpha * 0.65})`;
      context.shadowBlur = 3 + blinkPulse * 4;
      context.strokeText(titleText, textX, brandingY);
      drawSmallSideStar(leftStarX, starCenterY, starRadius);
      context.stroke();
      drawSmallSideStar(rightStarX, starCenterY, starRadius);
      context.stroke();

      // Delicate inner stroke highlight
      context.strokeStyle = `rgba(254, 240, 138, ${glowAlpha * 0.85})`;
      context.lineWidth = 1.0;
      context.shadowBlur = 0;
      context.strokeText(titleText, textX, brandingY);
      drawSmallSideStar(leftStarX, starCenterY, starRadius);
      context.stroke();
      drawSmallSideStar(rightStarX, starCenterY, starRadius);
      context.stroke();

      // Core illuminated text and star fill
      context.fillStyle = '#fffbeb';
      context.fillText(titleText, textX, brandingY);
      drawSmallSideStar(leftStarX, starCenterY, starRadius);
      context.fill();
      drawSmallSideStar(rightStarX, starCenterY, starRadius);
      context.fill();
      context.restore();

      // 8. Decorated Roof Luggage Carrier (पारंपरिक भारतीय बस कैरियर)
      const carrierX = busX + busWidth * 0.09;
      const carrierW = busWidth * 0.72;
      const carrierH = Math.max(16, busHeight * 0.16);
      const carrierY = busY - carrierH;

      // 8a. Carrier Back Railing & Floor Base (drawn behind luggage)
      context.strokeStyle = '#94a3b8';
      context.lineWidth = 1.6;
      context.beginPath();
      // Back top rail
      context.moveTo(carrierX, carrierY + 1);
      context.lineTo(carrierX + carrierW, carrierY + 1);
      // Back mid rail
      context.moveTo(carrierX, carrierY + carrierH * 0.5);
      context.lineTo(carrierX + carrierW, carrierY + carrierH * 0.5);
      // Back vertical stanchions
      for (let p = 1; p < 7; p++) {
        const px = carrierX + (carrierW * p) / 7;
        context.moveTo(px, carrierY + 1);
        context.lineTo(px, busY);
      }
      context.stroke();

      // 8b. Luggage Objects Placed Securely in the Middle of Carrier
      // Left and right clearances ensure objects are safely flanked by white security rods on both sides
      const sideClearance = carrierW * 0.075;
      const middleAvailableW = carrierW - sideClearance * 2;

      // Object 1 (Left-Mid): Heavy Olive Canvas Tarpaulin Mound (तिरपाल)
      const tarpX = carrierX + sideClearance;
      const tarpW = middleAvailableW * 0.38;
      const tarpH = carrierH * 1.30;
      const tarpY = busY - tarpH;

      const tarpGrad = context.createLinearGradient(tarpX, tarpY, tarpX, busY);
      tarpGrad.addColorStop(0, '#3f6212');
      tarpGrad.addColorStop(0.5, '#365314');
      tarpGrad.addColorStop(1, '#1a2e05');
      context.fillStyle = tarpGrad;
      context.beginPath();
      context.moveTo(tarpX, busY);
      context.quadraticCurveTo(tarpX, tarpY + 4, tarpX + 10, tarpY);
      context.quadraticCurveTo(tarpX + tarpW * 0.45, tarpY - 4, tarpX + tarpW - 8, tarpY + 2);
      context.quadraticCurveTo(tarpX + tarpW, tarpY + 6, tarpX + tarpW, busY);
      context.closePath();
      context.fill();
      context.strokeStyle = '#1a2e05';
      context.lineWidth = 1.2;
      context.stroke();

      // Tension ropes crisscrossing the tarpaulin (सुनहरी रस्सियों के फंदे)
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 1.3;
      context.beginPath();
      context.moveTo(tarpX + 6, busY);
      context.lineTo(tarpX + tarpW * 0.42, tarpY + 2);
      context.lineTo(tarpX + tarpW - 5, busY);
      context.moveTo(tarpX + tarpW * 0.15, busY);
      context.lineTo(tarpX + tarpW * 0.78, tarpY + 1);
      context.lineTo(tarpX + tarpW * 0.35, busY);
      context.stroke();

      // Object 2 (Dead Center): Richly Decorated Indian Vintage Peti / Royal Travel Trunk
      const trunkX = tarpX + tarpW + middleAvailableW * 0.025;
      const trunkW = middleAvailableW * 0.33;
      const trunkH = carrierH * 0.96;
      const trunkY = busY - trunkH;

      // Domed/arched lid contour
      const lidH = trunkH * 0.34;
      const trunkGrad = context.createLinearGradient(trunkX, trunkY, trunkX, busY);
      trunkGrad.addColorStop(0, '#0284c7'); // Peacock royal blue
      trunkGrad.addColorStop(0.3, '#0369a1');
      trunkGrad.addColorStop(0.85, '#075985');
      trunkGrad.addColorStop(1, '#0c4a6e');

      context.fillStyle = trunkGrad;
      context.beginPath();
      context.roundRect(trunkX, trunkY, trunkW, trunkH, [4, 4, 2, 2]);
      context.fill();

      // Metallic frame border
      context.strokeStyle = '#0f172a';
      context.lineWidth = 1.2;
      context.stroke();

      // Decorated lid seam with antique gold trim
      context.fillStyle = '#fbbf24';
      context.fillRect(trunkX + 1, trunkY + lidH - 1.5, trunkW - 2, 2.2);

      // Traditional Rajasthani/Indian folk painted borders along lid
      context.fillStyle = '#fef08a';
      const dotCount = Math.floor(trunkW / 4.5);
      for (let d = 0; d < dotCount; d++) {
        const dx = trunkX + 3 + d * 4.2;
        context.beginPath();
        context.arc(dx, trunkY + lidH * 0.45, 0.75, 0, Math.PI * 2);
        context.fill();
      }

      // Embossed horizontal metal strengthening flutes/ribs across the lower body
      context.strokeStyle = 'rgba(254, 240, 138, 0.55)';
      context.lineWidth = 0.9;
      context.beginPath();
      context.moveTo(trunkX + 3, trunkY + lidH + (trunkH - lidH) * 0.4);
      context.lineTo(trunkX + trunkW - 3, trunkY + lidH + (trunkH - lidH) * 0.4);
      context.moveTo(trunkX + 3, trunkY + lidH + (trunkH - lidH) * 0.75);
      context.lineTo(trunkX + trunkW - 3, trunkY + lidH + (trunkH - lidH) * 0.75);
      context.stroke();

      // Center decorative floral mandala / rosette emblem (पारंपरिक नक्काशी)
      const rosetteX = trunkX + trunkW * 0.5;
      const rosetteY = trunkY + lidH + (trunkH - lidH) * 0.42;
      context.fillStyle = '#fbbf24';
      context.beginPath();
      context.arc(rosetteX, rosetteY, 3.2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#b91c1c';
      context.beginPath();
      context.arc(rosetteX, rosetteY, 1.3, 0, Math.PI * 2);
      context.fill();

      // Antique brass corner reinforcement brackets on all 4 corners (कोने की पीतल पत्ती)
      const cornerSize = Math.max(3.5, trunkW * 0.12);
      const drawCornerBracket = (cx: number, cy: number, flipX: boolean, flipY: boolean) => {
        context.fillStyle = '#f59e0b';
        context.beginPath();
        context.moveTo(cx, cy);
        context.lineTo(cx + (flipX ? -cornerSize : cornerSize), cy);
        context.lineTo(cx, cy + (flipY ? -cornerSize : cornerSize));
        context.closePath();
        context.fill();
        context.strokeStyle = '#d97706';
        context.lineWidth = 0.6;
        context.stroke();
        // Tiny brass rivet dot
        context.fillStyle = '#fef08a';
        context.beginPath();
        context.arc(
          cx + (flipX ? -cornerSize * 0.35 : cornerSize * 0.35),
          cy + (flipY ? -cornerSize * 0.35 : cornerSize * 0.35),
          0.65,
          0,
          Math.PI * 2
        );
        context.fill();
      };
      drawCornerBracket(trunkX + 1, trunkY + 1, false, false);
      drawCornerBracket(trunkX + trunkW - 1, trunkY + 1, true, false);
      drawCornerBracket(trunkX + 1, trunkY + trunkH - 1, false, true);
      drawCornerBracket(trunkX + trunkW - 1, trunkY + trunkH - 1, true, true);

      // Dual vertical security straps with golden buckles
      const strapX1 = trunkX + trunkW * 0.24;
      const strapX2 = trunkX + trunkW * 0.76;
      [strapX1, strapX2].forEach((sx) => {
        // Dark leather strap
        context.fillStyle = '#451a03';
        context.fillRect(sx - 1.2, trunkY + 1, 2.4, trunkH - 2);
        // Golden buckle
        context.fillStyle = '#fbbf24';
        context.fillRect(sx - 2, trunkY + lidH - 1, 4, 2.8);
        context.strokeStyle = '#78350f';
        context.lineWidth = 0.5;
        context.strokeRect(sx - 2, trunkY + lidH - 1, 4, 2.8);
      });

      // Traditional Indian brass hasp & staple lock with hanging vintage padlock (पीतल की कुंडी और ताला)
      context.fillStyle = '#fde047';
      context.fillRect(rosetteX - 1.8, trunkY + lidH - 2, 3.6, 5);
      context.strokeStyle = '#b45309';
      context.lineWidth = 0.6;
      context.strokeRect(rosetteX - 1.8, trunkY + lidH - 2, 3.6, 5);
      // Small hanging brass padlock
      context.fillStyle = '#d97706';
      context.beginPath();
      context.roundRect(rosetteX - 1.5, trunkY + lidH + 3.2, 3, 3.2, 0.8);
      context.fill();
      context.strokeStyle = '#78350f';
      context.lineWidth = 0.5;
      context.stroke();

      // Side curved brass carrying handles
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 1.0;
      context.beginPath();
      context.arc(trunkX + 2, trunkY + trunkH * 0.6, 1.8, Math.PI * 0.5, Math.PI * 1.5);
      context.arc(trunkX + trunkW - 2, trunkY + trunkH * 0.6, 1.8, Math.PI * 1.5, Math.PI * 0.5);
      context.stroke();

      // Object 3 (Right-Mid): Vintage Leather Travel Suitcase / Bag (पारंपरिक सूटकेस)
      const suitX = trunkX + trunkW + middleAvailableW * 0.025;
      const suitW = middleAvailableW * 0.24;
      const suitH = carrierH * 0.80;
      const suitY = busY - suitH;

      context.fillStyle = '#7f1d1d'; // Rich vintage oxblood leather
      context.beginPath();
      context.roundRect(suitX, suitY, suitW, suitH, 2.5);
      context.fill();
      context.strokeStyle = '#450a0a';
      context.lineWidth = 1.0;
      context.stroke();

      // Leather binding straps
      context.fillStyle = '#451a03';
      context.fillRect(suitX + suitW * 0.22, suitY, 2.2, suitH);
      context.fillRect(suitX + suitW * 0.72, suitY, 2.2, suitH);

      // Polished brass corner protectors and center lock
      context.fillStyle = '#fbbf24';
      context.fillRect(suitX + suitW * 0.19, suitY + suitH * 0.44, 3.8, 2.8);
      context.fillRect(suitX + suitW * 0.69, suitY + suitH * 0.44, 3.8, 2.8);
      context.fillRect(suitX + suitW * 0.44, suitY + suitH * 0.40, suitW * 0.14, 3.8);

      // Suitcase top handle
      context.strokeStyle = '#451a03';
      context.lineWidth = 1.4;
      context.beginPath();
      context.moveTo(suitX + suitW * 0.38, suitY);
      context.quadraticCurveTo(suitX + suitW * 0.5, suitY - 3.5, suitX + suitW * 0.62, suitY);
      context.stroke();

      // 8c. Front & Both Sides Secured White Rods (Storage carrier ke dono sides secure)
      // High-grade white/chrome safety rails drawn OVER the luggage to securely enclose the objects
      context.save();
      context.strokeStyle = '#f8fafc'; // Crisp, high-visibility white steel rods
      context.lineWidth = 2.4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.shadowColor = 'rgba(0, 0, 0, 0.65)';
      context.shadowBlur = 3;
      context.shadowOffsetY = 1;

      context.beginPath();
      // Top continuous perimeter white rail
      context.moveTo(carrierX, carrierY);
      context.lineTo(carrierX + carrierW, carrierY);

      // Mid continuous horizontal white rail
      context.moveTo(carrierX, carrierY + carrierH * 0.52);
      context.lineTo(carrierX + carrierW, carrierY + carrierH * 0.52);

      // Bottom roof-level mounting rail
      context.moveTo(carrierX, busY);
      context.lineTo(carrierX + carrierW, busY);

      // LEFT SIDE SECURITY CAGE (Dono sides secure: left end rods)
      // Double vertical posts
      context.moveTo(carrierX, carrierY);
      context.lineTo(carrierX, busY);
      context.moveTo(carrierX + 6, carrierY);
      context.lineTo(carrierX + 6, busY);
      // Diagonal corner security truss brace on left
      context.moveTo(carrierX, busY);
      context.lineTo(carrierX + 12, carrierY);

      // RIGHT SIDE SECURITY CAGE (Dono sides secure: right end rods)
      // Double vertical posts
      context.moveTo(carrierX + carrierW, carrierY);
      context.lineTo(carrierX + carrierW, busY);
      context.moveTo(carrierX + carrierW - 6, carrierY);
      context.lineTo(carrierX + carrierW - 6, busY);
      // Diagonal corner security truss brace on right
      context.moveTo(carrierX + carrierW, busY);
      context.lineTo(carrierX + carrierW - 12, carrierY);

      // Front vertical safety rods spaced across the length, securing middle objects
      const frontPosts = 8;
      for (let p = 1; p < frontPosts; p++) {
        const px = carrierX + (carrierW * p) / frontPosts;
        context.moveTo(px, carrierY);
        context.lineTo(px, busY);
      }
      context.stroke();

      // Metallic specular highlight line running through white rods
      context.shadowBlur = 0;
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1.0;
      context.beginPath();
      context.moveTo(carrierX, carrierY - 0.6);
      context.lineTo(carrierX + carrierW, carrierY - 0.6);
      context.stroke();

      // Brass finials / polished corner caps on all 4 corners
      context.fillStyle = '#f59e0b';
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 0.8;
      const cornerPoints = [
        [carrierX, carrierY],
        [carrierX + 6, carrierY],
        [carrierX + carrierW - 6, carrierY],
        [carrierX + carrierW, carrierY],
      ];
      cornerPoints.forEach(([cx, cy]) => {
        context.beginPath();
        context.arc(cx, cy, 2.4, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      });

      // Festive Indian Bus Tricolor Ribbons / Pennants fluttering along the front white rail
      const pennantColors = ['#f97316', '#ffffff', '#22c55e', '#f97316', '#ffffff', '#22c55e'];
      pennantColors.forEach((color, idx) => {
        const px = carrierX + 16 + idx * (carrierW * 0.055);
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(px, carrierY + carrierH * 0.52);
        context.lineTo(px + 6, carrierY + carrierH * 0.52);
        context.lineTo(px + 3, carrierY + carrierH * 0.52 + 7);
        context.closePath();
        context.fill();
      });
      context.restore();

      // 9. Passenger Windows (Three evenly spaced illuminated windows with warm decor, curtains & safety bars)
      // Scaled smaller in width and height per user request
      const passengerStartX = busX + busWidth * 0.082;
      const passengerEndX = busX + busWidth * 0.548;
      const passengerGap = busWidth * 0.025;
      const passengerWindowW = (passengerEndX - passengerStartX - passengerGap * 2) / 3;
      // Lowered windowY and smaller windowH for compact windows
      const windowY = busY + busHeight * 0.142;
      const windowH = busHeight * 0.198;

      for (let i = 0; i < 3; i++) {
        const wx = passengerStartX + i * (passengerWindowW + passengerGap);

        // Window warm interior illuminated glass
        const winGrad = context.createLinearGradient(wx, windowY, wx, windowY + windowH);
        winGrad.addColorStop(0, 'rgba(254, 240, 138, 0.98)');
        winGrad.addColorStop(1, 'rgba(250, 204, 21, 0.88)');
        context.fillStyle = winGrad;
        context.beginPath();
        context.roundRect(wx, windowY, passengerWindowW, windowH, 4);
        context.fill();

        // Polished window perimeter frame
        context.strokeStyle = '#0f172a';
        context.lineWidth = 1.8;
        context.stroke();

        // Window Decor: Scalloped Indian Bus Curtains (पर्दे) along the top of each window
        context.fillStyle = '#991b1b'; // Classic velvet maroon curtain
        context.beginPath();
        context.moveTo(wx + 1, windowY + 1);
        context.lineTo(wx + passengerWindowW - 1, windowY + 1);
        context.lineTo(wx + passengerWindowW - 1, windowY + windowH * 0.28);
        // Scalloped drape curves
        const scallopCount = 3;
        const sw = (passengerWindowW - 2) / scallopCount;
        for (let s = scallopCount - 1; s >= 0; s--) {
          const sx1 = wx + 1 + s * sw;
          const sx2 = sx1 + sw;
          context.quadraticCurveTo(
            (sx1 + sx2) / 2,
            windowY + windowH * 0.38,
            sx1,
            windowY + windowH * 0.28
          );
        }
        context.closePath();
        context.fill();

        // Golden tassel tie-back on the left side of curtain
        context.fillStyle = '#fde047';
        context.fillRect(wx + 2, windowY + windowH * 0.26, 3, 5);

        // Dual horizontal brass safety guard rails (खिड़की की सुरक्षा सलाखें)
        context.strokeStyle = 'rgba(217, 119, 6, 0.92)'; // Polished brass
        context.lineWidth = 1.3;
        context.beginPath();
        context.moveTo(wx + 1, windowY + windowH * 0.58);
        context.lineTo(wx + passengerWindowW - 1, windowY + windowH * 0.58);
        context.moveTo(wx + 1, windowY + windowH * 0.78);
        context.lineTo(wx + passengerWindowW - 1, windowY + windowH * 0.78);
        context.stroke();

        // Specular diagonal glass reflection
        context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        context.lineWidth = 1.1;
        context.beginPath();
        context.moveTo(wx + 4, windowY + windowH * 0.85);
        context.lineTo(wx + passengerWindowW * 0.45, windowY + 3);
        context.stroke();
      }

      // 9b. Authentic Indian Roadways Passenger Entry Door (बस का मुख्य यात्री प्रवेश द्वार - Bi-Fold Accordion Door with Footsteps & Inspection Glass)
      // Wider horizontal footprint with compact, realistic vertical height (smaller)
      const doorX = busX + busWidth * 0.572;
      const doorW = busWidth * 0.156;
      const doorTopY = busY + busHeight * 0.170;
      const doorBottomY = skirtY - 1.5;
      const doorH = doorBottomY - doorTopY;
      const doorProg = Math.max(0, Math.min(1, stateRef.current.doorProgress));

      // Record hit-box for interactive clicks/hover
      stateRef.current.doorHitBox = {
        x: doorX,
        y: doorTopY,
        w: doorW,
        h: doorH,
      };

      context.save();

      // A. Richly Decorated Bus Cabin Interior & Boarding Stairwell (सजी-धजी सीढ़ियाँ और केबिन)
      // Decorates the entire door cavity with warm cabin light, marigold toran, teak panelling, seats, & illuminated steps
      const cabGrad = context.createLinearGradient(doorX, doorTopY, doorX, doorBottomY);
      cabGrad.addColorStop(0, '#fef08a'); // Warm ceiling glow
      cabGrad.addColorStop(0.22, '#d97706'); // Warm interior amber light
      cabGrad.addColorStop(0.55, '#78350f'); // Teak wood bulkhead
      cabGrad.addColorStop(1, '#291104'); // Deep stairwell base
      context.fillStyle = cabGrad;
      context.beginPath();
      context.roundRect(doorX, doorTopY, doorW, doorH, [2, 2, 0, 0]);
      context.fill();

      // 1. Interior Ceiling Dome Light Fixture (अंदर की छत की बत्ती)
      context.fillStyle = '#fffbeb';
      context.beginPath();
      context.ellipse(doorX + doorW * 0.5, doorTopY + 3, doorW * 0.28, 2.2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#fef08a';
      context.lineWidth = 0.8;
      context.stroke();

      // 2. Traditional Indian Bus Toran / Festive Marigold Floral Garland (गेंदे के फूलों की तोरण)
      // Strung across the top of the passenger entryway arch
      const marigoldCount = 6;
      const mgRadius = Math.max(1.8, doorW * 0.045);
      for (let m = 0; m < marigoldCount; m++) {
        const mgX = doorX + (doorW * (m + 0.5)) / marigoldCount;
        const mgSag = Math.sin(((m + 0.5) / marigoldCount) * Math.PI) * 2.8;
        const mgY = doorTopY + 5.2 + mgSag;

        // Alternating saffron-orange and golden-yellow marigolds
        context.fillStyle = m % 2 === 0 ? '#f97316' : '#eab308';
        context.beginPath();
        context.arc(mgX, mgY, mgRadius, 0, Math.PI * 2);
        context.fill();
        // Inner petal highlight
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(mgX, mgY, mgRadius * 0.35, 0, Math.PI * 2);
        context.fill();
      }
      // Green garland string
      context.strokeStyle = '#15803d';
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(doorX + 2, doorTopY + 5);
      for (let m = 0; m < marigoldCount; m++) {
        const mgX = doorX + (doorW * (m + 0.5)) / marigoldCount;
        const mgSag = Math.sin(((m + 0.5) / marigoldCount) * Math.PI) * 2.8;
        context.lineTo(mgX, doorTopY + 5.2 + mgSag);
      }
      context.lineTo(doorX + doorW - 2, doorTopY + 5);
      context.stroke();

      // 3. Visible Passenger High-Back Seat Cushion & Partition Wall (यात्री सीट और केबिन दीवार)
      const seatBackY = doorTopY + doorH * 0.16;
      const seatBackH = doorH * 0.35;
      const seatW = doorW * 0.44;
      const seatX = doorX + doorW * 0.50;

      // Classic Roadways Green Rexine / Velvet Upholstered Seat Back
      context.fillStyle = '#166534';
      context.beginPath();
      context.roundRect(seatX, seatBackY, seatW, seatBackH, [4, 4, 1, 1]);
      context.fill();
      context.strokeStyle = '#14532d';
      context.lineWidth = 0.9;
      context.stroke();

      // Fluted seat stitching lines
      context.strokeStyle = 'rgba(254, 240, 138, 0.4)';
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(seatX + seatW * 0.33, seatBackY + 2);
      context.lineTo(seatX + seatW * 0.33, seatBackY + seatBackH - 2);
      context.moveTo(seatX + seatW * 0.67, seatBackY + 2);
      context.lineTo(seatX + seatW * 0.67, seatBackY + seatBackH - 2);
      context.stroke();

      // Polished chrome top grab handle on the passenger seat
      context.strokeStyle = '#f8fafc';
      context.lineWidth = 1.2;
      context.beginPath();
      context.roundRect(seatX + 2, seatBackY - 3.2, seatW - 4, 3.6, 1.5);
      context.stroke();

      // 4. Polished Wood-grain Sidewall Panels with Brass Trim on Left & Right
      const panelW = Math.max(3.5, doorW * 0.11);
      // Left sidewall panel
      const lPanelGrad = context.createLinearGradient(doorX, doorTopY, doorX + panelW, doorTopY);
      lPanelGrad.addColorStop(0, '#451a03');
      lPanelGrad.addColorStop(0.6, '#78350f');
      lPanelGrad.addColorStop(1, '#9a3412');
      context.fillStyle = lPanelGrad;
      context.fillRect(doorX + 1, doorTopY + 8, panelW, doorH - 9);

      // Right sidewall panel
      const rPanelGrad = context.createLinearGradient(doorX + doorW - panelW, doorTopY, doorX + doorW, doorTopY);
      rPanelGrad.addColorStop(0, '#9a3412');
      rPanelGrad.addColorStop(0.4, '#78350f');
      rPanelGrad.addColorStop(1, '#451a03');
      context.fillStyle = rPanelGrad;
      context.fillRect(doorX + doorW - panelW - 1, doorTopY + 8, panelW, doorH - 9);

      // Polished Brass trim bead along the inner sidewall edges
      context.fillStyle = '#fde047';
      context.fillRect(doorX + panelW, doorTopY + 8, 1.2, doorH - 9);
      context.fillRect(doorX + doorW - panelW - 1.2, doorTopY + 8, 1.2, doorH - 9);

      // 5. Three Decorated Passenger Boarding Steps (सीढ़ियाँ)
      const stepCount = 3;
      const stepWellH = doorH * 0.52; // Generous step well covering the lower half
      const stepH = stepWellH / stepCount;

      for (let s = 0; s < stepCount; s++) {
        const sy = doorBottomY - (stepCount - s) * stepH;
        const stepWidth = doorW - 2;
        const stepLeft = doorX + 1;

        // Step Riser: Antique polished brass kickplate (पीतल की राइज़र प्लेट)
        const riserH = stepH * 0.42;
        const riserGrad = context.createLinearGradient(stepLeft, sy + stepH - riserH, stepLeft, sy + stepH);
        riserGrad.addColorStop(0, '#f59e0b');
        riserGrad.addColorStop(0.5, '#d97706');
        riserGrad.addColorStop(1, '#b45309');
        context.fillStyle = riserGrad;
        context.fillRect(stepLeft, sy + stepH - riserH, stepWidth, riserH);

        // Concealed step-courtesy LED light bar shining down onto next tread
        context.fillStyle = 'rgba(254, 240, 138, 0.95)';
        context.fillRect(stepLeft + 4, sy + stepH - riserH + 0.5, stepWidth - 8, 1.2);

        // Step Tread Surface: Textured deep charcoal anti-slip grooved rubber mat
        const treadH = stepH - riserH;
        context.fillStyle = '#18181b';
        context.fillRect(stepLeft, sy, stepWidth, treadH);

        // Anti-slip ribbed grooves on tread
        context.strokeStyle = '#27272a';
        context.lineWidth = 0.8;
        context.beginPath();
        for (let gx = stepLeft + 3; gx < stepLeft + stepWidth - 3; gx += 3.5) {
          context.moveTo(gx, sy + 1);
          context.lineTo(gx, sy + treadH - 1);
        }
        context.stroke();

        // High-visibility Safety Yellow & Black Chevron/Border Nosing (पीली सुरक्षा पट्टी)
        context.fillStyle = '#facc15';
        context.fillRect(stepLeft, sy + treadH - 1.8, stepWidth, 2.0);
        context.fillStyle = '#09090b';
        // Tiny warning grip studs on nosing
        for (let bx = stepLeft + 4; bx < stepLeft + stepWidth - 4; bx += 7) {
          context.fillRect(bx, sy + treadH - 1.8, 2.5, 2.0);
        }
      }

      // 6. Side Wall Curved Brass Boarding Handrail (चढ़ने का हैंडरेल)
      context.strokeStyle = '#fde047';
      context.lineWidth = 1.8;
      context.beginPath();
      context.moveTo(doorX + panelW + 2, doorTopY + doorH * 0.28);
      context.lineTo(doorX + panelW + 2, doorBottomY - 6);
      context.stroke();
      // Wall mounting brackets
      context.fillStyle = '#78350f';
      context.fillRect(doorX + panelW - 1, doorTopY + doorH * 0.32, 3.5, 2.5);
      context.fillRect(doorX + panelW - 1, doorBottomY - 10, 3.5, 2.5);

      // 7. Vertical Polished Boarding Grab-Pole (यात्री चढ़ने का मुख्य स्टील पाइप)
      const poleX = doorX + doorW * 0.44;
      context.strokeStyle = '#f8fafc';
      context.lineWidth = 2.4;
      context.beginPath();
      context.moveTo(poleX, doorTopY + 4);
      context.lineTo(poleX, doorBottomY - 2);
      context.stroke();
      // Polished specular highlight along pole
      context.strokeStyle = '#38bdf8';
      context.lineWidth = 0.8;
      context.beginPath();
      context.moveTo(poleX - 0.5, doorTopY + 5);
      context.lineTo(poleX - 0.5, doorBottomY - 3);
      context.stroke();

      // Textured rubberized yellow safety grip sleeve in the middle of the pole
      const sleeveY = doorTopY + doorH * 0.35;
      const sleeveH = doorH * 0.28;
      context.fillStyle = '#eab308';
      context.fillRect(poleX - 1.8, sleeveY, 3.6, sleeveH);
      context.strokeStyle = '#a16207';
      context.lineWidth = 0.6;
      context.strokeRect(poleX - 1.8, sleeveY, 3.6, sleeveH);
      // Grip texture rings
      context.strokeStyle = '#713f12';
      context.lineWidth = 0.6;
      context.beginPath();
      for (let gy = sleeveY + 3; gy < sleeveY + sleeveH; gy += 4) {
        context.moveTo(poleX - 1.8, gy);
        context.lineTo(poleX + 1.8, gy);
      }
      context.stroke();

      // 8. Conductor Vintage Brass Ticket Bell Lanyard Cord (कंडक्टर की घंटी की रस्सी)
      context.strokeStyle = '#ef4444'; // Traditional red braided pull cord
      context.lineWidth = 1.0;
      context.beginPath();
      context.moveTo(doorX + doorW * 0.82, doorTopY + 4);
      context.quadraticCurveTo(
        doorX + doorW * 0.86,
        doorTopY + doorH * 0.35,
        doorX + doorW * 0.78,
        doorTopY + doorH * 0.50
      );
      context.stroke();
      // Little brass bell toggle at end of cord
      context.fillStyle = '#fde047';
      context.beginPath();
      context.arc(doorX + doorW * 0.78, doorTopY + doorH * 0.50, 2, 0, Math.PI * 2);
      context.fill();

      // B. Folding Bi-Fold Accordion Leaves (दो पल्ले वाला मुड़ने वाला दरवाजा)
      const halfW = doorW * 0.5;
      // When doorProg is 0: each leaf width is halfW (closed, meeting in center)
      // When doorProg is 1: each leaf folds up to the edge pillar (open)
      const leafFoldW = halfW * (1 - doorProg * 0.78);
      const rightLeafX = doorX + doorW - leafFoldW;

      const drawDoorLeaf = (lx: number, lw: number, isRight: boolean) => {
        if (lw <= 2) return;
        const splitY = busY + busHeight * 0.43;

        // Upper painted ochre panel
        const upGrad = context.createLinearGradient(lx, doorTopY, lx + lw, doorTopY);
        upGrad.addColorStop(0, '#eab308');
        upGrad.addColorStop(0.5, '#f59e0b');
        upGrad.addColorStop(1, '#d97706');
        context.fillStyle = upGrad;
        context.fillRect(lx, doorTopY, lw, splitY - doorTopY);

        // Lower painted crimson red panel
        const lowGrad = context.createLinearGradient(lx, splitY, lx + lw, splitY);
        lowGrad.addColorStop(0, '#991b1b');
        lowGrad.addColorStop(0.5, '#b91c1c');
        lowGrad.addColorStop(1, '#7f1d1d');
        context.fillStyle = lowGrad;
        context.fillRect(lx, splitY, lw, doorBottomY - splitY);

        // Leaf perimeter frame
        context.strokeStyle = '#09090b';
        context.lineWidth = 1.3;
        context.strokeRect(lx, doorTopY, lw, doorH);

        // Windows on leaf (Upper View Window & Lower Inspection Glass)
        if (lw > 4) {
          const uWinX = lx + 2.2;
          const uWinW = Math.max(2.5, lw - 4.4);
          const uWinY = doorTopY + 4;
          const uWinH = Math.max(10, doorH * 0.38);

          // Upper Viewing Glass: Geometric rounded rectangular shape with rubber perimeter gasket
          context.fillStyle = '#09090b';
          context.beginPath();
          context.roundRect(uWinX - 0.8, uWinY - 0.8, uWinW + 1.6, uWinH + 1.6, 2.5);
          context.fill();

          const uWinGrad = context.createLinearGradient(uWinX, uWinY, uWinX, uWinY + uWinH);
          uWinGrad.addColorStop(0, 'rgba(254, 240, 138, 0.98)');
          uWinGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.90)');
          uWinGrad.addColorStop(1, 'rgba(217, 119, 6, 0.84)');
          context.fillStyle = uWinGrad;
          context.beginPath();
          context.roundRect(uWinX, uWinY, uWinW, uWinH, 2);
          context.fill();

          // Upper velvet maroon scalloped curtain with golden hem
          context.fillStyle = '#991b1b';
          context.beginPath();
          context.roundRect(uWinX, uWinY, uWinW, uWinH * 0.30, [2, 2, 0, 0]);
          context.fill();
          context.strokeStyle = '#fbbf24';
          context.lineWidth = 0.7;
          context.beginPath();
          context.moveTo(uWinX, uWinY + uWinH * 0.30);
          context.lineTo(uWinX + uWinW, uWinY + uWinH * 0.30);
          context.stroke();

          // Diagonal glass specular reflection streak
          if (lw > 8) {
            context.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            context.lineWidth = 0.9;
            context.beginPath();
            context.moveTo(uWinX + 2, uWinY + uWinH - 3);
            context.lineTo(uWinX + uWinW - 2, uWinY + 3);
            context.stroke();
          }

          // Lower Inspection Window (पायदान शीशा - footstep observation glass)
          const lWinY = splitY + (doorBottomY - splitY) * 0.18;
          const lWinH = (doorBottomY - splitY) * 0.44;
          context.fillStyle = '#09090b';
          context.beginPath();
          context.roundRect(uWinX - 0.8, lWinY - 0.8, uWinW + 1.6, lWinH + 1.6, 2.5);
          context.fill();

          const lWinGrad = context.createLinearGradient(uWinX, lWinY, uWinX, lWinY + lWinH);
          lWinGrad.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
          lWinGrad.addColorStop(1, 'rgba(217, 119, 6, 0.82)');
          context.fillStyle = lWinGrad;
          context.beginPath();
          context.roundRect(uWinX, lWinY, uWinW, lWinH, 2);
          context.fill();

          // Horizontal protective brass wire across lower inspection glass
          context.strokeStyle = 'rgba(251, 191, 36, 0.92)';
          context.lineWidth = 0.8;
          context.beginPath();
          context.moveTo(uWinX + 1, lWinY + lWinH * 0.5);
          context.lineTo(uWinX + uWinW - 1, lWinY + lWinH * 0.5);
          context.stroke();
        }

        // Heavy-Duty Antique Brass Door Latch Handle (on right leaf)
        if (isRight && lw > 7) {
          const handleY = splitY - 4;
          context.fillStyle = '#fbbf24';
          context.fillRect(lx + 2.2, handleY, 4, 8);
          context.fillStyle = '#451a03';
          context.fillRect(lx + 3, handleY + 2, 2.4, 4);
        }
      };

      // Draw Left Leaf
      drawDoorLeaf(doorX, leafFoldW, false);
      // Draw Right Leaf
      drawDoorLeaf(rightLeafX, leafFoldW, true);

      // Center Rubber Weather-Seal Bead (काली रबर बीडिंग) when door is mostly closed
      if (doorProg < 0.15) {
        context.fillStyle = '#09090b';
        context.fillRect(doorX + doorW * 0.5 - 1.2, doorTopY, 2.4, doorH);
      }

      // C. Outer Heavy Door Frame
      context.strokeStyle = '#0a0a0c';
      context.lineWidth = 2.0;
      context.beginPath();
      context.roundRect(doorX, doorTopY, doorW, doorH, [2, 2, 0, 0]);
      context.stroke();

      // 3 Heavy-Duty Hinges on Door Outer Posts
      [0.12, 0.50, 0.88].forEach((hRatio) => {
        const hy = doorTopY + doorH * hRatio;
        context.fillStyle = '#475569';
        context.fillRect(doorX - 1.8, hy - 3, 3, 6);
        context.fillRect(doorX + doorW - 1.2, hy - 3, 3, 6);
        context.fillStyle = '#fbbf24';
        context.fillRect(doorX - 1.2, hy - 1.5, 1.8, 3);
        context.fillRect(doorX + doorW - 0.6, hy - 1.5, 1.8, 3);
      });

      // D. Ribbed Non-Slip Metal Footboard Edge (पायदान / फुटस्टेप)
      context.fillStyle = '#0f172a';
      context.fillRect(doorX - 2, doorBottomY - 2.5, doorW + 4, 4.5);
      // Safety yellow alternating diagonal warning lines along the footstep
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 1.3;
      context.beginPath();
      for (let fx = doorX - 1; fx < doorX + doorW + 2; fx += 5) {
        context.moveTo(fx, doorBottomY + 2);
        context.lineTo(fx + 3, doorBottomY - 2.5);
      }
      context.stroke();

      // E. "प्रवेश" (ENTRY) Retro Painted Transom Glass Plate Above Door
      const signW = Math.min(62, doorW * 0.76);
      const signH = Math.max(10, busHeight * 0.052);
      const signX = doorX + (doorW - signW) * 0.5;
      const signY = doorTopY - signH - 3.2;

      // Outer rubber gasket border
      context.fillStyle = '#0a0a0c';
      context.beginPath();
      context.roundRect(signX - 1, signY - 1, signW + 2, signH + 2, [3, 3, 2, 2]);
      context.fill();

      // Transom glass plate background
      const signGrad = context.createLinearGradient(signX, signY, signX, signY + signH);
      signGrad.addColorStop(0, '#991b1b');
      signGrad.addColorStop(1, '#660e0e');
      context.fillStyle = signGrad;
      context.beginPath();
      context.roundRect(signX, signY, signW, signH, [2.5, 2.5, 1.5, 1.5]);
      context.fill();

      // Polished brass rim
      context.strokeStyle = '#fbbf24';
      context.lineWidth = 1.1;
      context.stroke();

      // Sign lettering: "प्रवेश"
      const signFontSize = Math.max(6, signH * 0.72);
      context.font = `bold ${signFontSize}px "Yatra One", cursive`;
      context.fillStyle = '#fef08a';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('प्रवेश', signX + signW * 0.5, signY + signH * 0.54);
      context.textAlign = 'left';

      // F. Iconic Indian Roadways Convex Side Mirror (कंडक्टर / ड्राइवर साइड ग्लास / रियर-व्यू मिरर)
      const mirrorPillarX = doorX + doorW + 2.5;
      const mirrorArmW = Math.max(10, busWidth * 0.024);
      const mirrorHeadW = Math.max(8.5, busWidth * 0.020);
      const mirrorHeadH = Math.max(22, busHeight * 0.165);
      const mirrorHeadX = mirrorPillarX + mirrorArmW * 0.85;
      const mirrorHeadY = doorTopY - 4;

      // Heavy-duty dual tubular mounting brackets (स्टील पाइप क्लैंप)
      context.strokeStyle = '#334155';
      context.lineWidth = 2.0;
      context.lineCap = 'round';
      // Upper mounting arm extending out
      context.beginPath();
      context.moveTo(mirrorPillarX, doorTopY + 1);
      context.lineTo(mirrorHeadX + 2, mirrorHeadY + 4);
      context.stroke();
      // Lower mounting arm extending out
      context.beginPath();
      context.moveTo(mirrorPillarX, doorTopY + 19);
      context.lineTo(mirrorHeadX + 2, mirrorHeadY + mirrorHeadH - 4);
      context.stroke();

      // Chrome highlight along tubular brackets
      context.strokeStyle = '#94a3b8';
      context.lineWidth = 0.8;
      context.beginPath();
      context.moveTo(mirrorPillarX + 1, doorTopY);
      context.lineTo(mirrorHeadX + 1, mirrorHeadY + 3);
      context.stroke();

      // Mirror Casing Outer Shell (aerodynamic black rubber/chrome bezel)
      context.fillStyle = '#0f172a';
      context.beginPath();
      context.roundRect(mirrorHeadX, mirrorHeadY, mirrorHeadW, mirrorHeadH, [3.5, 3.5, 3.5, 3.5]);
      context.fill();
      context.strokeStyle = '#475569';
      context.lineWidth = 1.2;
      context.stroke();

      // High-Gloss Convex Reflective Mirror Glass (शीशा / काँच)
      const mirrorGlassGrad = context.createLinearGradient(
        mirrorHeadX,
        mirrorHeadY,
        mirrorHeadX + mirrorHeadW,
        mirrorHeadY + mirrorHeadH
      );
      mirrorGlassGrad.addColorStop(0, '#bae6fd'); // Sky reflection
      mirrorGlassGrad.addColorStop(0.45, '#e0f2fe');
      mirrorGlassGrad.addColorStop(0.55, '#fdba74'); // Warm horizon road reflection
      mirrorGlassGrad.addColorStop(1, '#9a3412');
      context.fillStyle = mirrorGlassGrad;
      context.beginPath();
      context.roundRect(mirrorHeadX + 1.2, mirrorHeadY + 1.2, mirrorHeadW - 2.4, mirrorHeadH - 2.4, [2.5, 2.5, 2.5, 2.5]);
      context.fill();

      // Specular Sun Glare Slash across mirror
      context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      context.lineWidth = 1.0;
      context.beginPath();
      context.moveTo(mirrorHeadX + 2.5, mirrorHeadY + mirrorHeadH * 0.7);
      context.lineTo(mirrorHeadX + mirrorHeadW - 2.5, mirrorHeadY + mirrorHeadH * 0.25);
      context.stroke();

      context.restore();

      // 10. Front Driver Windshield
      const driverX = busX + busWidth * 0.755;
      const driverW = busWidth * 0.165;
      const driverY = windowY;
      const driverH = windowH;

      const glassGrad = context.createLinearGradient(driverX, driverY, driverX + driverW, driverY + driverH);
      glassGrad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
      glassGrad.addColorStop(1, 'rgba(186, 220, 245, 0.82)');
      context.fillStyle = glassGrad;
      context.beginPath();
      context.roundRect(driverX, driverY, driverW, driverH, [2, 5, 2, 2]);
      context.fill();
      context.strokeStyle = '#0f172a';
      context.lineWidth = 1.8;
      context.stroke();

      // 11. Bus Route Nameplate (Synced with selected ticket route!)
      const boardX = driverX - busWidth * 0.005;
      const boardW = driverW + busWidth * 0.01;
      const boardY = busY + busHeight * 0.005;
      const boardH = Math.max(13, busHeight * 0.075);
      context.fillStyle = '#09090b';
      context.fillRect(boardX, boardY, boardW, boardH);

      // Clean route string e.g. "पटना ➔ बेगूसराय"
      const fromShort = activeRoute.from.split(' ')[0] || activeRoute.from;
      const toShort = activeRoute.to.split(' ')[0] || activeRoute.to;
      const routeText = `${fromShort} ➔ ${toShort}`;

      let boardFontSize = Math.max(6.5, busWidth * 0.024);
      context.font = `bold ${boardFontSize}px "Yatra One", cursive`;
      while (context.measureText(routeText).width > boardW - 6 && boardFontSize > 5) {
        boardFontSize -= 0.5;
        context.font = `bold ${boardFontSize}px "Yatra One", cursive`;
      }
      context.fillStyle = '#fef08a';
      context.textAlign = 'center';
      context.fillText(routeText, boardX + boardW / 2, boardY + boardH * 0.78);
      context.textAlign = 'left';

      // 12. Headlight fixture (Refined small round lamp with chrome rim)
      const hlR = Math.max(2.5, busWidth * 0.015);
      const hlX = busX + busWidth - hlR - 2.5;
      const hlY = busY + busHeight * 0.63;

      const haloGrad = context.createRadialGradient(hlX, hlY, 1, hlX, hlY, hlR * 1.7);
      haloGrad.addColorStop(0, 'rgba(255, 248, 200, 0.28)');
      haloGrad.addColorStop(1, 'rgba(255, 248, 200, 0)');
      context.fillStyle = haloGrad;
      context.beginPath();
      context.arc(hlX, hlY, hlR * 1.7, 0, Math.PI * 2);
      context.fill();

      const lampGrad = context.createRadialGradient(hlX - hlR * 0.3, hlY - hlR * 0.3, hlR * 0.1, hlX, hlY, hlR);
      lampGrad.addColorStop(0, '#fffbe8');
      lampGrad.addColorStop(0.55, '#fde68a');
      lampGrad.addColorStop(1, '#c99a2e');
      context.fillStyle = lampGrad;
      context.beginPath();
      context.arc(hlX, hlY, hlR, 0, Math.PI * 2);
      context.fill();

      // Chrome rim
      context.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      context.lineWidth = 0.85;
      context.beginPath();
      context.arc(hlX, hlY, hlR, 0, Math.PI * 2);
      context.stroke();

      // Specular reflection
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.beginPath();
      context.arc(hlX - hlR * 0.3, hlY - hlR * 0.3, hlR * 0.22, 0, Math.PI * 2);
      context.fill();

      // 13. Headlight Light Beam Cone (PROJECTED ON TOP OF BUS - bus ke upar se!)
      // Originates directly at headlight symbol start, passes through lens and over the front of the bus, fanning out wide across the highway
      const beamStartX = hlX - hlR * 0.25;
      const beamLength = Math.max(busWidth * 2.4, w - beamStartX + (isFog ? 140 : 100));
      const coneSpread = Math.max(busHeight * (isFog ? 2.1 : 1.65), busWidth * (isFog ? 0.96 : 0.78));

      context.save();

      // Atmospheric wide ambient cone with soft transparent blur
      context.filter = isFog ? 'blur(20px)' : 'blur(16px)';
      const wideGrad = context.createLinearGradient(beamStartX, hlY, beamStartX + beamLength, hlY);
      wideGrad.addColorStop(0, isFog ? 'rgba(255, 248, 200, 0.62)' : 'rgba(255, 248, 200, 0.42)');
      wideGrad.addColorStop(0.12, isFog ? 'rgba(254, 240, 138, 0.44)' : 'rgba(254, 240, 138, 0.28)');
      wideGrad.addColorStop(0.48, isFog ? 'rgba(254, 240, 138, 0.20)' : 'rgba(254, 240, 138, 0.10)');
      wideGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');

      context.fillStyle = wideGrad;
      context.beginPath();
      context.moveTo(beamStartX, hlY - hlR * 0.6);
      context.lineTo(beamStartX, hlY + hlR * 0.6);
      context.lineTo(beamStartX + beamLength, hlY + coneSpread);
      context.lineTo(beamStartX + beamLength, hlY - coneSpread);
      context.closePath();
      context.fill();

      // Mid-range high-transparency cone
      context.filter = isFog ? 'blur(10px)' : 'blur(8px)';
      const midGrad = context.createLinearGradient(beamStartX, hlY, beamStartX + beamLength * 0.88, hlY);
      midGrad.addColorStop(0, isFog ? 'rgba(255, 252, 225, 0.75)' : 'rgba(255, 252, 225, 0.55)');
      midGrad.addColorStop(0.2, isFog ? 'rgba(254, 240, 138, 0.50)' : 'rgba(254, 240, 138, 0.34)');
      midGrad.addColorStop(0.65, isFog ? 'rgba(253, 224, 71, 0.20)' : 'rgba(253, 224, 71, 0.11)');
      midGrad.addColorStop(1, 'rgba(253, 224, 71, 0.0)');

      context.fillStyle = midGrad;
      context.beginPath();
      context.moveTo(beamStartX, hlY - hlR * 0.4);
      context.lineTo(beamStartX, hlY + hlR * 0.4);
      context.lineTo(beamStartX + beamLength * 0.88, hlY + coneSpread * 0.65);
      context.lineTo(beamStartX + beamLength * 0.88, hlY - coneSpread * 0.65);
      context.closePath();
      context.fill();

      // Soft luminous core beam
      context.filter = isFog ? 'blur(5px)' : 'blur(4px)';
      const coreGrad = context.createLinearGradient(beamStartX, hlY, beamStartX + beamLength * 0.65, hlY);
      coreGrad.addColorStop(0, isFog ? 'rgba(255, 255, 245, 0.90)' : 'rgba(255, 255, 245, 0.72)');
      coreGrad.addColorStop(0.18, isFog ? 'rgba(255, 250, 210, 0.60)' : 'rgba(255, 250, 210, 0.42)');
      coreGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');

      context.fillStyle = coreGrad;
      context.beginPath();
      context.moveTo(beamStartX, hlY - hlR * 0.22);
      context.lineTo(beamStartX, hlY + hlR * 0.22);
      context.lineTo(beamStartX + beamLength * 0.65, hlY + coneSpread * 0.28);
      context.lineTo(beamStartX + beamLength * 0.65, hlY - coneSpread * 0.28);
      context.closePath();
      context.fill();

      // Road asphalt illumination pool directly cast ahead on the ground
      const roadPoolGrad = context.createRadialGradient(
        beamStartX + busWidth * 0.52,
        roadY + 12,
        15,
        beamStartX + busWidth * 0.58,
        roadY + 12,
        busWidth * 0.82
      );
      roadPoolGrad.addColorStop(0, isFog ? 'rgba(255, 248, 200, 0.42)' : 'rgba(255, 248, 200, 0.28)');
      roadPoolGrad.addColorStop(0.45, isFog ? 'rgba(254, 240, 138, 0.18)' : 'rgba(254, 240, 138, 0.10)');
      roadPoolGrad.addColorStop(1, 'rgba(254, 240, 138, 0.0)');
      context.filter = 'blur(14px)';
      context.fillStyle = roadPoolGrad;
      context.beginPath();
      context.ellipse(
        beamStartX + busWidth * 0.52,
        roadY + 14,
        busWidth * 0.78,
        Math.max(14, busHeight * 0.24),
        0,
        0,
        Math.PI * 2
      );
      context.fill();

      // Floating illuminated mist motes inside the headlight beam in fog mode
      if (isFog) {
        context.save();
        context.filter = 'blur(1px)';
        context.fillStyle = 'rgba(255, 250, 220, 0.7)';
        const numMotes = 12;
        for (let m = 0; m < numMotes; m++) {
          const progress = ((timestamp * 0.0007 + m * (1 / numMotes)) % 1);
          const moteX = beamStartX + progress * (w - beamStartX);
          const yWave = Math.sin(m * 2.1 + timestamp * 0.003) * coneSpread * progress * 0.6;
          const moteY = hlY + yWave;
          const alpha = Math.sin(progress * Math.PI) * 0.65;
          context.fillStyle = `rgba(255, 252, 225, ${alpha})`;
          context.beginPath();
          context.arc(moteX, moteY, 1.2, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }

      // 14. Musical Horn Acoustic Soundwave Ripples (radiating forward when honked)
      const timeSinceHonk = performance.now() - stateRef.current.lastHonkTime;
      const HORN_ANIM_MS = 3850;
      if (timeSinceHonk < HORN_ANIM_MS) {
        const honkProgress = timeSinceHonk / HORN_ANIM_MS;
        context.save();
        context.filter = 'none';

        // Multi-frequency acoustic soundwave fronts radiating forward in sync with horn fanfare
        const numWaves = 4;
        for (let wIdx = 0; wIdx < numWaves; wIdx++) {
          const wavePhase = (honkProgress * 4.6 + wIdx * 0.25) % 1;
          const waveR = hlR * 1.8 + wavePhase * (busWidth * 0.72);
          const waveAlpha = Math.sin(wavePhase * Math.PI) * (1 - honkProgress * 0.45);
          if (waveAlpha > 0.04) {
            // Bright golden acoustic pressure shockwaves
            context.strokeStyle = `rgba(254, 240, 138, ${waveAlpha * 0.90})`;
            context.lineWidth = 2.4 * (1 - wavePhase * 0.4);
            context.beginPath();
            // Radiates forward into the highway ahead from front of bus
            context.arc(hlX, hlY, waveR, -Math.PI * 0.28, Math.PI * 0.28);
            context.stroke();

            // Inner high-pressure crest
            if (wavePhase > 0.1 && wavePhase < 0.85) {
              context.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.65})`;
              context.lineWidth = 1.2;
              context.beginPath();
              context.arc(hlX, hlY, waveR * 0.96, -Math.PI * 0.22, Math.PI * 0.22);
              context.stroke();
            }
          }
        }
        context.restore();
      }

      context.restore();

      context.restore(); // Restore bus body pitch transform
      context.restore(); // Restore overall bus draw context
    };

    const render = (timestamp: number) => {
      // Calculate delta time in ms since previous frame, normalized to 60fps (16.6667ms)
      if (!stateRef.current.lastTime) {
        stateRef.current.lastTime = timestamp;
      }
      const rawDelta = timestamp - stateRef.current.lastTime;
      stateRef.current.lastTime = timestamp;

      // Clamp delta to prevent sudden jumps when switching tabs or backgrounding (max 100ms, min 0ms)
      const clampedDelta = Math.min(Math.max(rawDelta, 0), 100);
      // Normalized delta scale factor: exactly 1.0 at 60fps (1000/60 = 16.6667ms)
      const dt = clampedDelta / (1000 / 60);

      const w = stateRef.current.width || canvas.clientWidth || window.innerWidth;
      const h = stateRef.current.height || canvas.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const isRefueling = performance.now() < stateRef.current.refuelingUntil;
      const playing = stateRef.current.isPlaying && !isRefueling;
      const baseSpeed = isRefueling ? 0 : playing ? 5.8 : 1.8;
      const speedMultiplier = baseSpeed * dt;
      stateRef.current.roadOffset += speedMultiplier;
      stateRef.current.wheelAngle += speedMultiplier * 0.04;

      // Smooth pneumatic door spring animation (0 = closed, 1 = open)
      const targetDoor = stateRef.current.isDoorOpen ? 1 : 0;
      stateRef.current.doorProgress += (targetDoor - stateRef.current.doorProgress) * Math.min(1, 0.14 * dt);

      const weather = stateRef.current.weather || 'clear';
      const isRain = weather === 'rain';
      const isFog = weather === 'fog';

      // Lightning timing in rain mode (occasional distant highway thunderstorm)
      if (isRain) {
        if (!stateRef.current.lastLightningTime) {
          stateRef.current.lastLightningTime = timestamp + 4000 + Math.random() * 4000;
        }
        if (timestamp > stateRef.current.lastLightningTime) {
          stateRef.current.lastLightningTime = timestamp + 11000 + Math.random() * 12000;
          stateRef.current.lightningFlashAlpha = 0.85;
          playDistantThunderSound();
        }
        if (stateRef.current.lightningFlashAlpha > 0) {
          stateRef.current.lightningFlashAlpha -= 0.045 * dt;
          if (stateRef.current.lightningFlashAlpha < 0) stateRef.current.lightningFlashAlpha = 0;
        }
      } else {
        stateRef.current.lightningFlashAlpha = 0;
      }

      // 1. Highway Sky (Weather-Adaptive)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      if (isRain) {
        skyGrad.addColorStop(0, '#060e1a');
        skyGrad.addColorStop(0.48, '#0d1a29');
        skyGrad.addColorStop(0.72, '#182736');
        skyGrad.addColorStop(1, '#0e1620');
      } else if (isFog) {
        skyGrad.addColorStop(0, '#0a121c');
        skyGrad.addColorStop(0.48, '#162332');
        skyGrad.addColorStop(0.72, '#243245');
        skyGrad.addColorStop(1, '#192433');
      } else {
        skyGrad.addColorStop(0, '#071224');
        skyGrad.addColorStop(0.48, '#182742');
        skyGrad.addColorStop(0.72, '#7a2418');
        skyGrad.addColorStop(1, '#3b0b05');
      }
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Distant lightning flash illuminating overcast sky
      if (isRain && stateRef.current.lightningFlashAlpha > 0) {
        ctx.fillStyle = `rgba(224, 242, 254, ${stateRef.current.lightningFlashAlpha * 0.70})`;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Distant Horizon Hills
      const horizonY = h * 0.51;
      ctx.fillStyle = isRain ? '#040810' : isFog ? '#162332' : '#08101e';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      for (let x = 0; x <= w; x += 30) {
        const my =
          Math.sin((x + stateRef.current.roadOffset * 0.12) * 0.006) * 25 +
          Math.cos(x * 0.01) * 16;
        ctx.lineTo(x, horizonY - 45 - my);
      }
      ctx.lineTo(w, horizonY);
      ctx.closePath();
      ctx.fill();

      // 3. Telephone Poles & Overhead Swaying Utility Wires (Continuous Endless Loop)
      ctx.strokeStyle = '#050c18';
      ctx.lineWidth = 4;
      const poles = stateRef.current.poles;

      // Update positions
      poles.forEach((pole) => {
        pole.x -= speedMultiplier * 0.9;
      });

      // Find current rightmost pole position
      let maxPoleX = -Infinity;
      poles.forEach((p) => {
        if (p.x > maxPoleX) maxPoleX = p.x;
      });

      // Wrap poles ONLY when they have travelled deep off-screen to the left (-poleSpacing * 2.2)
      // This guarantees that wires entering the screen from the left never disappear or clip
      const wrapThreshold = -poleSpacing * 2.2;
      poles.forEach((pole) => {
        if (pole.x < wrapThreshold) {
          pole.x = maxPoleX + poleSpacing;
          maxPoleX = pole.x;
        }
      });

      // Sort poles so wires connect adjacent poles strictly from left to right in sequence
      poles.sort((a, b) => a.x - b.x);

      const poleTopY = horizonY - 140;
      for (let i = 0; i < poles.length; i++) {
        const pole = poles[i];

        // Draw vertical pole
        ctx.beginPath();
        ctx.moveTo(pole.x, horizonY + 20);
        ctx.lineTo(pole.x, poleTopY);
        ctx.stroke();

        // Crossbar
        ctx.beginPath();
        ctx.moveTo(pole.x - 24, poleTopY + 15);
        ctx.lineTo(pole.x + 24, poleTopY + 15);
        ctx.stroke();

        // Insulator pins
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(pole.x - 22, poleTopY + 9, 5, 6);
        ctx.fillRect(pole.x + 17, poleTopY + 9, 5, 6);

        // Draw continuous unbroken wires to next pole
        if (i < poles.length - 1) {
          const nextPole = poles[i + 1];
          const dist = nextPole.x - pole.x;
          if (dist > 0 && dist < poleSpacing * 1.8) {
            ctx.save();
            // Sway animation based on speed and time
            const sway = Math.sin(timestamp * 0.0022 + pole.x * 0.005) * 4;

            // Wire 1: Crossbar left-insulator line
            ctx.strokeStyle = 'rgba(10, 20, 35, 0.50)';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(pole.x - 20, poleTopY + 12);
            ctx.quadraticCurveTo(
              (pole.x + nextPole.x) / 2,
              poleTopY + 42 + sway,
              nextPole.x - 20,
              poleTopY + 12
            );
            ctx.stroke();

            // Wire 2: Crossbar right-insulator line
            ctx.strokeStyle = 'rgba(10, 20, 35, 0.40)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pole.x + 20, poleTopY + 12);
            ctx.quadraticCurveTo(
              (pole.x + nextPole.x) / 2,
              poleTopY + 36 + sway * 0.8,
              nextPole.x + 20,
              poleTopY + 12
            );
            ctx.stroke();

            // Wire 3: High-tension top apex line
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.32)';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(pole.x, poleTopY);
            ctx.quadraticCurveTo(
              (pole.x + nextPole.x) / 2,
              poleTopY + 22 + sway * 0.6,
              nextPole.x,
              poleTopY
            );
            ctx.stroke();

            ctx.restore();
          }
        }
      }

      // 4. Highway Asphalt Road Surface (Weather-Adaptive)
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      if (isRain) {
        roadGrad.addColorStop(0, '#0a1322');
        roadGrad.addColorStop(0.28, '#050b12');
        roadGrad.addColorStop(1, '#020406');
      } else if (isFog) {
        roadGrad.addColorStop(0, '#1a2432');
        roadGrad.addColorStop(0.28, '#0f1620');
        roadGrad.addColorStop(1, '#080c12');
      } else {
        roadGrad.addColorStop(0, '#53170e');
        roadGrad.addColorStop(0.28, '#240804');
        roadGrad.addColorStop(1, '#0c0302');
      }
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      // Road shoulder dust border
      ctx.fillStyle = isRain ? '#03060c' : isFog ? '#121922' : '#180603';
      ctx.fillRect(0, horizonY, w, 18);

      const roadY = h * 0.605;

      // 5. Road Surface Features (Speed Breakers & Potholes / गड्ढे)
      const roadFeatures = stateRef.current.roadFeatures;
      // Compute aspect ratio & mobile landscape detection
      const isLandscapeMobile = h < 520 && w > h;
      const isMobile = w < 640 && !isLandscapeMobile;
      // In mobile landscape (e.g. 844x390, 740x360), constrain bus width so bus doesn't push off-screen
      const busWidth = isLandscapeMobile
        ? Math.min(380, h * 0.95, w * 0.52)
        : isMobile
        ? Math.min(310, w * 0.82)
        : Math.min(460, w * 0.58);
      const busX = (w - busWidth) * 0.5;
      const frontWheelX = busX + busWidth * 0.81;
      const rearWheelX = busX + busWidth * 0.23;

      let frontImpulse = 0;
      let rearImpulse = 0;

      roadFeatures.forEach((rf) => {
        rf.x -= speedMultiplier;
        if (rf.x < -180) {
          const maxFeatureX = roadFeatures.reduce((max, f) => Math.max(max, f.x), w);
          // Infrequent breaker & pothole appearance (spaced out widely for smooth journey)
          rf.x = maxFeatureX + Math.random() * 2200 + 3200;
          rf.type = Math.random() > 0.48 ? 'breaker' : 'pothole';
        }

        // Render features within viewport
        if (rf.x > -70 && rf.x < w + 70) {
          if (rf.type === 'breaker') {
            // Speed Breaker (गति अवरोधक): asphalt hump with yellow warning chevron stripes
            const bh = rf.height;
            const bw = rf.width;
            const by = roadY;

            // Breaker shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(rf.x, by + 3.5, bw * 0.52, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Breaker hump body
            const bGrad = ctx.createLinearGradient(rf.x - bw * 0.5, by, rf.x + bw * 0.5, by);
            bGrad.addColorStop(0, '#2b0f07');
            bGrad.addColorStop(0.5, '#4e1e12');
            bGrad.addColorStop(1, '#2b0f07');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.ellipse(rf.x, by - bh * 0.35, bw * 0.5, bh * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();

            // Warning yellow zebra stripes
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(rf.x, by - bh * 0.35, bw * 0.48, bh * 0.6, 0, 0, Math.PI * 2);
            ctx.clip();

            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3.2;
            for (let sx = rf.x - bw * 0.6; sx < rf.x + bw * 0.6; sx += 8) {
              ctx.beginPath();
              ctx.moveTo(sx - 3, by - bh);
              ctx.lineTo(sx + 3, by + 4);
              ctx.stroke();
            }
            ctx.restore();
          } else {
            // Road Pothole (गड्ढा): Sunken asphalt crater with chipped stone edge
            const pw = rf.width;
            const ph = rf.height;
            const py = roadY + 2;

            // Inner dark crater depression
            ctx.fillStyle = '#060201';
            ctx.beginPath();
            ctx.ellipse(rf.x, py, pw * 0.5, ph * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Chipped asphalt edge
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.22)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Loose gravel particles inside pothole
            ctx.fillStyle = '#71717a';
            ctx.fillRect(rf.x - pw * 0.25, py - 1, 2, 2);
            ctx.fillRect(rf.x + pw * 0.2, py + 1, 2.5, 1.8);
          }
        }

        // Wheel collision detection
        const radiusHit = rf.width * 0.5;

        // Front wheel contact
        const distFront = Math.abs(frontWheelX - rf.x);
        if (distFront < radiusHit) {
          const factor = Math.cos((distFront / radiusHit) * (Math.PI * 0.5));
          if (rf.type === 'breaker') {
            frontImpulse -= factor * rf.height * 0.85; // Bump upwards (negative Y)
          } else {
            frontImpulse += factor * rf.height * 0.65; // Dip into pothole
          }
        }

        // Rear wheel contact
        const distRear = Math.abs(rearWheelX - rf.x);
        if (distRear < radiusHit) {
          const factor = Math.cos((distRear / radiusHit) * (Math.PI * 0.5));
          if (rf.type === 'breaker') {
            rearImpulse -= factor * rf.height * 0.85;
          } else {
            rearImpulse += factor * rf.height * 0.65;
          }
        }
      });

      // Realistic Spring-Damper Suspension Physics (Leaf spring + shock absorber)
      const springK = 0.26;
      const damping = 0.74;

      const frontForce = (frontImpulse - stateRef.current.frontSuspension) * springK;
      stateRef.current.frontSuspensionVel = (stateRef.current.frontSuspensionVel + frontForce) * damping;
      stateRef.current.frontSuspension += stateRef.current.frontSuspensionVel * dt;

      const rearForce = (rearImpulse - stateRef.current.rearSuspension) * springK;
      stateRef.current.rearSuspensionVel = (stateRef.current.rearSuspensionVel + rearForce) * damping;
      stateRef.current.rearSuspension += stateRef.current.rearSuspensionVel * dt;

      // 6. Road Milestones (NH-31)
      const milestones = stateRef.current.milestones;
      milestones.forEach((stone) => {
        stone.x -= speedMultiplier * 1.2;
        if (stone.x < -100) stone.x = w + Math.random() * 500 + 400;

        const msX = stone.x;
        const msY = horizonY + 6;

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(msX, msY, 28, 36, [14, 14, 2, 2]);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(msX, msY, 28, 14, [14, 14, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('NH31', msX + 4, msY + 10);
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`${stone.km}`, msX + 7, msY + 28);
      });

      // 7. Dashed Highway Center Strip
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([38, 26]);
      ctx.lineDashOffset = -stateRef.current.roadOffset;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.64);
      ctx.lineTo(w, h * 0.64);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8. Wet Road Sheen & Asphalt Reflections (Rain Mode)
      if (isRain) {
        // Specular tarmac wet sheen
        const sheenGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
        sheenGrad.addColorStop(0.35, 'rgba(147, 197, 253, 0.07)');
        sheenGrad.addColorStop(0.75, 'rgba(191, 219, 254, 0.05)');
        sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        // Reflection of glowing yellow destination nameplate on wet road
        const signReflectX = busX + busWidth * 0.42;
        const signReflect = ctx.createRadialGradient(signReflectX, roadY + 22, 6, signReflectX, roadY + 22, busWidth * 0.36);
        signReflect.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
        signReflect.addColorStop(0.65, 'rgba(245, 158, 11, 0.03)');
        signReflect.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        ctx.fillStyle = signReflect;
        ctx.fillRect(busX, roadY + 4, busWidth, h - roadY);

        // Reflection of red tail light on wet road
        const tailReflectX = busX + 12;
        const tailReflect = ctx.createRadialGradient(tailReflectX, roadY + 20, 3, tailReflectX, roadY + 20, 48);
        tailReflect.addColorStop(0, 'rgba(239, 68, 68, 0.16)');
        tailReflect.addColorStop(0.65, 'rgba(185, 28, 28, 0.04)');
        tailReflect.addColorStop(1, 'rgba(185, 28, 28, 0.0)');
        ctx.fillStyle = tailReflect;
        ctx.fillRect(tailReflectX - 48, roadY + 4, 96, h - roadY);
      }

      // 9. Ambient Highway Dust Particles (Clear weather) or Background Mist
      if (!isRain) {
        const particles = stateRef.current.particles;
        particles.forEach((p) => {
          const pSpeed = (playing ? p.speed * 2.3 : p.speed) * dt;
          p.x -= pSpeed;
          if (p.x < 0) {
            p.x = w + 20;
            p.y = horizonY + Math.random() * (h - horizonY);
          }
          ctx.fillStyle = isFog
            ? `rgba(203, 213, 225, ${p.alpha * 0.45})`
            : `rgba(255, 195, 150, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 10. Background Fog Banks (Behind Bus)
      if (isFog) {
        const bands = stateRef.current.fogBands;
        bands.slice(0, 2).forEach((b) => {
          b.offset += b.speed * (playing ? 1.4 : 0.5) * dt;
          const yPos = h * b.yRatio;
          const bandHeight = h * b.heightRatio;
          const fogGrad = ctx.createLinearGradient(0, yPos - bandHeight * 0.5, 0, yPos + bandHeight * 0.5);
          fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
          fogGrad.addColorStop(0.5, `rgba(148, 163, 184, ${b.alpha * 0.65})`);
          fogGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, yPos - bandHeight * 0.5, w, bandHeight);
        });
      }

      // 11. Background Rain Streaks & Road Splashes (Behind Bus)
      if (isRain) {
        const rainAngle = playing ? -0.42 : -0.22;
        const rainDropVx = Math.sin(rainAngle) * (playing ? 26 : 14);
        const rainDropVy = Math.cos(rainAngle) * 24;

        ctx.strokeStyle = 'rgba(186, 220, 245, 0.35)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        const drops = stateRef.current.rainDrops;
        drops.forEach((drop) => {
          drop.x += rainDropVx * dt;
          drop.y += rainDropVy * dt;

          if (drop.y > h + 20 || drop.x < -120) {
            drop.y = -Math.random() * 80 - 10;
            drop.x = Math.random() * (w + 240) - 20;

            // Spawn road splash
            if (Math.random() > 0.45) {
              const spY = roadY + Math.random() * (h - roadY - 10);
              if (spY < h && stateRef.current.splashes.length < 50) {
                stateRef.current.splashes.push({
                  x: drop.x,
                  y: spY,
                  radius: 0.8,
                  maxRadius: Math.random() * 4 + 2.5,
                  alpha: 0.65,
                });
              }
            }
          }

          if (drop.layer === 'bg') {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - Math.sin(rainAngle) * drop.len, drop.y - Math.cos(rainAngle) * drop.len);
          }
        });
        ctx.stroke();

        // Render Road Splashes
        const splashes = stateRef.current.splashes;
        for (let sIdx = splashes.length - 1; sIdx >= 0; sIdx--) {
          const sp = splashes[sIdx];
          sp.radius += 0.38 * dt;
          sp.alpha -= 0.04 * dt;
          if (sp.alpha <= 0 || sp.radius >= sp.maxRadius) {
            splashes.splice(sIdx, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(224, 242, 254, ${sp.alpha * 0.55})`;
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, sp.radius * 2.2, sp.radius * 0.6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Tyre Water Spray (पहियों का पानी / Water rooster-tail from spinning wheels)
        const tyreSprays = stateRef.current.tyreSprays;
        if (playing && Math.random() > 0.25 && tyreSprays.length < 60) {
          // Rear wheel spray
          tyreSprays.push({
            x: rearWheelX - Math.random() * 12,
            y: roadY + 12 - Math.random() * 5,
            vx: -Math.random() * 7 - 4,
            vy: -Math.random() * 2.8 + 0.4,
            radius: Math.random() * 2.2 + 1.2,
            alpha: 0.35,
            life: 0,
            maxLife: 18 + Math.random() * 14,
          });
          // Front wheel spray
          tyreSprays.push({
            x: frontWheelX - Math.random() * 12,
            y: roadY + 12 - Math.random() * 5,
            vx: -Math.random() * 6 - 3.5,
            vy: -Math.random() * 2.5 + 0.4,
            radius: Math.random() * 1.8 + 1.0,
            alpha: 0.30,
            life: 0,
            maxLife: 15 + Math.random() * 12,
          });
        }

        for (let tIdx = tyreSprays.length - 1; tIdx >= 0; tIdx--) {
          const tp = tyreSprays[tIdx];
          tp.x += tp.vx * dt;
          tp.y += tp.vy * dt;
          tp.radius += 0.16 * dt;
          tp.life += dt;
          tp.alpha = 0.36 * (1 - tp.life / tp.maxLife);
          if (tp.life >= tp.maxLife) {
            tyreSprays.splice(tIdx, 1);
            continue;
          }
          ctx.fillStyle = `rgba(214, 235, 252, ${tp.alpha})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, tp.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 12. Draw Vintage State Roadways Bus with true tucked wheels, dynamic route nameplate & soft headlight cone
      drawBus(
        ctx,
        w,
        h,
        timestamp,
        roadY,
        stateRef.current.wheelAngle,
        stateRef.current.currentRoute,
        playing,
        isFog,
        isRain
      );

      // 13. Foreground Weather Overlays (In front of bus and road)
      if (isRain) {
        // Foreground high-speed rain streaks
        const rainAngle = playing ? -0.42 : -0.22;
        ctx.strokeStyle = 'rgba(214, 238, 255, 0.65)';
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        const drops = stateRef.current.rainDrops;
        drops.forEach((drop) => {
          if (drop.layer === 'fg') {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - Math.sin(rainAngle) * drop.len, drop.y - Math.cos(rainAngle) * drop.len);
          }
        });
        ctx.stroke();
      } else if (isFog) {
        // Foreground rolling mist wisps
        const bands = stateRef.current.fogBands;
        bands.slice(2).forEach((b, idx) => {
          b.offset += b.speed * (playing ? 1.6 : 0.65) * dt;
          const yPos = h * b.yRatio;
          const bandHeight = h * b.heightRatio;
          const fogGrad = ctx.createLinearGradient(0, yPos - bandHeight * 0.5, 0, yPos + bandHeight * 0.5);
          fogGrad.addColorStop(0, 'rgba(203, 213, 225, 0)');
          fogGrad.addColorStop(0.5, `rgba(226, 232, 240, ${b.alpha * (idx === 0 ? 0.45 : 0.32)})`);
          fogGrad.addColorStop(1, 'rgba(203, 213, 225, 0)');
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, yPos - bandHeight * 0.5, w, bandHeight);
        });
      }

      stateRef.current.animationFrameId = requestAnimationFrame(render);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(render);

    const triggerDoorToggle = () => {
      const now = performance.now();
      if (now - stateRef.current.lastToggleTime < 380) return; // Prevent double-trigger from touchstart + click
      stateRef.current.lastToggleTime = now;
      if (stateRef.current.onToggleDoor) {
        stateRef.current.onToggleDoor();
      }
    };

    const triggerRefuel = () => {
      const now = performance.now();
      if (now - stateRef.current.lastRefuelTapTime < 500) return;
      stateRef.current.lastRefuelTapTime = now;
      playFuelFillingSound(1.8);
      // Bus stops for 1800ms while refueling!
      stateRef.current.refuelingUntil = now + 1800;
    };

    const isPointInDoor = (px: number, py: number) => {
      const box = stateRef.current.doorHitBox;
      if (!box || box.w <= 0 || box.h <= 0) return false;
      return (
        px >= box.x - 22 &&
        px <= box.x + box.w + 22 &&
        py >= box.y - 18 &&
        py <= box.y + box.h + 24
      );
    };

    const isPointInTank = (px: number, py: number) => {
      const box = stateRef.current.tankHitBox;
      if (!box || box.w <= 0 || box.h <= 0) return false;
      return (
        px >= box.x - 8 &&
        px <= box.x + box.w + 8 &&
        py >= box.y - 12 &&
        py <= box.y + box.h + 14
      );
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      if (isPointInTank(clickX, clickY)) {
        triggerRefuel();
      } else if (isPointInDoor(clickX, clickY)) {
        triggerDoorToggle();
      }
    };

    const handleCanvasTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        if (isPointInTank(touchX, touchY)) {
          if (e.cancelable) e.preventDefault();
          triggerRefuel();
        } else if (isPointInDoor(touchX, touchY)) {
          if (e.cancelable) e.preventDefault();
          triggerDoorToggle();
        }
      }
    };

    const handleCanvasMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (isPointInTank(mx, my)) {
        canvas.style.cursor = 'pointer';
        canvas.title = 'डीजल टंकी (Fuel Tank): डीजल भरवाने के लिए क्लिक करें (बस रुकेगी)';
      } else if (isPointInDoor(mx, my)) {
        canvas.style.cursor = 'pointer';
        canvas.title = stateRef.current.isDoorOpen
          ? 'बस का मुख्य दरवाजा खुला है - बंद करने के लिए क्लिक या टैप करें'
          : 'बस का मुख्य दरवाजा बंद है - खोलने के लिए क्लिक या टैप करें';
      } else {
        canvas.style.cursor = 'default';
        canvas.title = '';
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouchStart, { passive: false });
    canvas.addEventListener('mousemove', handleCanvasMouseMove);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('touchstart', handleCanvasTouchStart);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      cancelAnimationFrame(stateRef.current.animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="highwayCanvasContainer"
      className="absolute inset-0 w-full h-full overflow-hidden z-0"
    >
      <canvas
        id="highwayCanvasElement"
        ref={canvasRef}
        className="block w-full h-full pointer-events-auto"
      />
    </div>
  );
};
