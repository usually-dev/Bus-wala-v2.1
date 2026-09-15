// Web Audio Context for Ticket SFX (Selection click & Printing/Cutting sound)
import busHornAudioUrl from '../assets/bus_horn.wav';

let audioCtx: AudioContext | null = null;
let customHornAudio: HTMLAudioElement | null = null;

// Dedicated Bus Horn Audio Asset Pipeline
export const HORN_AUDIO_DURATION_MS = 3850;
let defaultHornAudio: HTMLAudioElement | null = null;
let defaultHornBuffer: AudioBuffer | null = null;
let isHornBufferLoading = false;

// Initialize and preload the bus horn audio asset
function initDefaultHornAsset(): void {
  if (typeof window === 'undefined') return;

  try {
    if (!defaultHornAudio) {
      defaultHornAudio = new Audio(busHornAudioUrl);
      defaultHornAudio.preload = 'auto';
    }
  } catch (e) {
    console.warn('HTMLAudio initialization for horn asset skipped:', e);
  }

  // Pre-decode into Web Audio AudioBuffer for zero-latency instantaneous triggering
  if (!defaultHornBuffer && !isHornBufferLoading) {
    isHornBufferLoading = true;
    fetch(busHornAudioUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arrayBuf) => {
        const ctx = getAudioContext();
        return ctx.decodeAudioData(arrayBuf);
      })
      .then((decoded) => {
        defaultHornBuffer = decoded;
      })
      .catch((err) => {
        console.warn('WebAudio decode for bus horn asset fallback to HTMLAudio:', err);
      })
      .finally(() => {
        isHornBufferLoading = false;
      });
  }
}

// Automatically initiate asset load in browser
if (typeof window !== 'undefined') {
  initDefaultHornAsset();
}

/**
 * Register or set a custom horn audio file/URL.
 * If set, playBusHornSound() will play this file; otherwise it plays the high-fidelity synthesizer.
 */
export function setCustomHornAudio(source: string | File | Blob): void {
  try {
    if (typeof source === 'string') {
      customHornAudio = new Audio(source);
    } else {
      const url = URL.createObjectURL(source);
      customHornAudio = new Audio(url);
    }
    customHornAudio.preload = 'auto';
  } catch (err) {
    console.warn('Failed to set custom horn audio:', err);
  }
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Crisp tactile click sound when toggling cities, presets, or timer options in ticket modal
 */
export function playTicketSelectionSound(): void {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // High frequency subtle click
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, t0);
    osc.frequency.exponentialRampToValueAtTime(600, t0 + 0.035);

    gain.gain.setValueAtTime(0.22, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.04);
  } catch (err) {
    console.warn('Selection click SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Authentic bus conductor handheld machine:
 * Dot-matrix ticket printing buzz/whir pulses followed by mechanical blade cut & paper tear snap!
 */
export function playTicketPrintAndCutSound(): void {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // 1. Dot-matrix print feed pulses (3 rapid needle chatter bursts: "krr-krr-krr")
    for (let i = 0; i < 4; i++) {
      const pulseTime = t0 + i * 0.055;

      // Print needle burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + i * 90, pulseTime);
      osc.frequency.setValueAtTime(1400 - i * 60, pulseTime + 0.02);

      gain.gain.setValueAtTime(0.18, pulseTime);
      gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(pulseTime);
      osc.stop(pulseTime + 0.04);
    }

    // 2. Mechanical Ticket Cutter Blade Snap & Paper Tear (at t0 + 0.24s)
    const cutTime = t0 + 0.24;

    // High snap of metal shear blade
    const bladeOsc = ctx.createOscillator();
    const bladeGain = ctx.createGain();
    bladeOsc.type = 'triangle';
    bladeOsc.frequency.setValueAtTime(3200, cutTime);
    bladeOsc.frequency.exponentialRampToValueAtTime(320, cutTime + 0.08);

    bladeGain.gain.setValueAtTime(0.45, cutTime);
    bladeGain.gain.exponentialRampToValueAtTime(0.001, cutTime + 0.09);

    bladeOsc.connect(bladeGain);
    bladeGain.connect(ctx.destination);
    bladeOsc.start(cutTime);
    bladeOsc.stop(cutTime + 0.1);

    // Paper tear friction noise (filtered noise buffer)
    const bufferSize = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      output[j] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, cutTime);
    filter.Q.setValueAtTime(1.8, cutTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38, cutTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, cutTime + 0.11);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(cutTime);
    whiteNoise.stop(cutTime + 0.12);
  } catch (err) {
    console.warn('Print & Cut SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Iconic Indian Highway Musical Pressure Horn (मल्टी-टोन म्यूजिकल एयर हॉर्न)
 * Plays the authentic high-fidelity bus pressure horn audio asset.
 * Synchronized with the visual acoustic soundwaves in HighwayCanvas and horn button bounce.
 */
export function playBusHornSound(): void {
  // Ensure audio asset is initialized
  initDefaultHornAsset();

  // 1. If custom audio file has been registered by user, prioritize playing it
  if (customHornAudio) {
    try {
      customHornAudio.currentTime = 0;
      customHornAudio.play().catch((err) => {
        console.warn('Custom horn audio playback failed, falling back to default horn asset:', err);
        playDefaultHorn();
      });
      return;
    } catch {
      // Fall through to default horn
    }
  }

  playDefaultHorn();
}

function playDefaultHorn(): void {
  // Try ultra-low latency Web Audio AudioBuffer playback for millisecond-perfect visual sync
  try {
    const ctx = getAudioContext();
    if (defaultHornBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = defaultHornBuffer;

      const gain = ctx.createGain();
      gain.gain.value = 0.95;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
      return;
    }
  } catch (err) {
    console.warn('WebAudio buffer horn play error, falling back to HTMLAudio:', err);
  }

  // Fallback to preloaded HTMLAudioElement
  if (defaultHornAudio) {
    try {
      defaultHornAudio.currentTime = 0;
      defaultHornAudio.play().catch((err) => {
        console.warn('HTMLAudio horn play failed, falling back to synthesis:', err);
        playSynthHorn();
      });
      return;
    } catch {
      // Fall through to synthesis
    }
  }

  // Fallback to high-fidelity synthesized multi-tone horn
  playSynthHorn();
}

function playSynthHorn(): void {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // Melodic notes sequence (Full authentic Indian truck/bus air horn fanfare motif - 3.85s)
    const melody = [
      { start: t0 + 0.00, dur: 0.15, f1: 659.25, f2: 830.61, gain: 0.48 }, // E5
      { start: t0 + 0.18, dur: 0.14, f1: 587.33, f2: 739.99, gain: 0.48 }, // D5
      { start: t0 + 0.35, dur: 0.16, f1: 523.25, f2: 659.25, gain: 0.50 }, // C5
      { start: t0 + 0.55, dur: 0.18, f1: 587.33, f2: 739.99, gain: 0.50 }, // D5
      { start: t0 + 0.76, dur: 0.15, f1: 659.25, f2: 830.61, gain: 0.52 }, // E5
      { start: t0 + 0.94, dur: 0.14, f1: 659.25, f2: 830.61, gain: 0.52 }, // E5
      { start: t0 + 1.11, dur: 0.22, f1: 659.25, f2: 830.61, gain: 0.54 }, // E5
      { start: t0 + 1.36, dur: 0.15, f1: 587.33, f2: 739.99, gain: 0.50 }, // D5
      { start: t0 + 1.54, dur: 0.15, f1: 587.33, f2: 739.99, gain: 0.50 }, // D5
      { start: t0 + 1.72, dur: 0.22, f1: 587.33, f2: 739.99, gain: 0.52 }, // D5
      // Triplet fanfare buildup
      { start: t0 + 1.98, dur: 0.13, f1: 659.25, f2: 830.61, gain: 0.54 }, // E5
      { start: t0 + 2.14, dur: 0.13, f1: 783.99, f2: 987.77, gain: 0.56 }, // G5
      { start: t0 + 2.30, dur: 0.14, f1: 880.00, f2: 1108.73, gain: 0.58 }, // A5
      // Grand final air-horn fanfare chord (dual high-power blast - 1.25s)
      { start: t0 + 2.48, dur: 1.15, f1: 659.25, f2: 830.61, gain: 0.62 }, // Full power blast
    ];

    melody.forEach(({ start, dur, f1, f2, gain: peakGain }) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const oscSub = ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(f1, start);
      osc1.frequency.linearRampToValueAtTime(f1 * 0.985, start + dur);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(f2, start);
      osc2.frequency.linearRampToValueAtTime(f2 * 0.985, start + dur);

      oscSub.type = 'triangle';
      oscSub.frequency.setValueAtTime(f1 * 0.5, start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f1 * 1.6, start);
      filter.Q.setValueAtTime(2.4, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peakGain, start + 0.025);
      gain.gain.setValueAtTime(peakGain, start + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      oscSub.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(start);
      osc2.start(start);
      oscSub.start(start);

      osc1.stop(start + dur + 0.02);
      osc2.stop(start + dur + 0.02);
      oscSub.stop(start + dur + 0.02);
    });

    // Pneumatic air brake / compressor release hiss at the end (हवा का प्रेशर रिलीज़)
    const hissStart = t0 + 3.65;
    const hissDur = 0.25;
    const bufferSize = Math.floor(ctx.sampleRate * hissDur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      output[j] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, hissStart);
    noiseFilter.Q.setValueAtTime(1.5, hissStart);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, hissStart);
    noiseGain.gain.linearRampToValueAtTime(0.18, hissStart + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, hissStart + hissDur);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseSource.start(hissStart);
    noiseSource.stop(hissStart + hissDur + 0.05);
  } catch (err) {
    console.warn('Bus musical horn SFX error:', err instanceof Error ? err.message : String(err));
  }
}

// Keep backwards-compatible export
export const playPaperPunchSound = playTicketPrintAndCutSound;

/**
 * Authentic rubber conductor stamp slam impact SFX
 * Physical thud on paper followed by ink smack and resonance
 */
export function playStampImpactSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;

    // 1. Heavy physical paper impact thud (लोहे की मोहर की भारी चोट)
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(160, t0);
    thudOsc.frequency.exponentialRampToValueAtTime(32, t0 + 0.09);

    thudGain.gain.setValueAtTime(0.45, t0);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(t0);
    thudOsc.stop(t0 + 0.1);

    // 2. High frequency ink smack / snap (गीली स्याही की छपाक)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sine';
    snapOsc.frequency.setValueAtTime(1400, t0);
    snapOsc.frequency.exponentialRampToValueAtTime(220, t0 + 0.045);

    snapGain.gain.setValueAtTime(0.35, t0);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(t0);
    snapOsc.stop(t0 + 0.05);
  } catch (err) {
    console.warn('Stamp impact SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Authentic Indian Bus Pneumatic Door Sound (बस के न्यूमेटिक दरवाजे की आवाज)
 * Atmospheric air-piston whoosh release with mechanical latch click.
 */
export function playPneumaticDoorSound(isOpen: boolean): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;
    const dur = 0.32;

    // 1. Air release hiss / pneumatic piston puff
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      output[j] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOpen ? 2200 : 2800, t0);
    filter.Q.setValueAtTime(1.8, t0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.24, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(t0);
    noiseSource.stop(t0 + dur + 0.02);

    // 2. Mechanical latch clack / metal engagement thud
    const clickStart = t0 + (isOpen ? 0.05 : 0.22);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isOpen ? 240 : 160, clickStart);
    osc.frequency.exponentialRampToValueAtTime(40, clickStart + 0.06);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.25, clickStart);
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickStart + 0.06);

    osc.connect(clickGain);
    clickGain.connect(ctx.destination);

    osc.start(clickStart);
    osc.stop(clickStart + 0.07);
  } catch (err) {
    console.warn('Bus door SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Ambient Monsoon Rain Loop (सावन की फुहार / बस की खिड़की पर बारिश)
 * Synthesizes soft, soothing rain patter on the bus body using filtered pink noise
 */
let rainSource: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

export function startAmbientRainSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (rainSource) {
      return; // Already running
    }

    const sampleRate = ctx.sampleRate;
    const dur = 4.0; // 4 second seamless looping buffer
    const bufferSize = Math.floor(sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink/Brown noise generator for rich rain sound
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Dual filters: Bandpass to simulate rain on bus roof + glass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);

    const gain = ctx.createGain();
    // Gentle fade in
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    rainSource = source;
    rainGain = gain;
  } catch (err) {
    console.warn('Start rain SFX error:', err instanceof Error ? err.message : String(err));
  }
}

export function stopAmbientRainSound(): void {
  try {
    if (rainGain && rainSource) {
      const ctx = getAudioContext();
      const t = ctx.currentTime;
      rainGain.gain.cancelScheduledValues(t);
      rainGain.gain.setValueAtTime(rainGain.gain.value, t);
      rainGain.gain.linearRampToValueAtTime(0.0001, t + 0.6);

      const src = rainSource;
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {}
      }, 700);

      rainSource = null;
      rainGain = null;
    }
  } catch (err) {
    console.warn('Stop rain SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Distant Highway Thunder Rumble (दूर गरजते बादल)
 */
export function playDistantThunderSound(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const t0 = ctx.currentTime;
    const dur = 2.4;

    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, t0);
    filter.frequency.exponentialRampToValueAtTime(45, t0 + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.065, t0 + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t0);
    noise.stop(t0 + dur + 0.1);
  } catch (err) {
    console.warn('Thunder SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Weather state toggle tactile click
 */
export function playWeatherToggleSound(): void {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.04);

    gain.gain.setValueAtTime(0.15, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.05);
  } catch (err) {
    console.warn('Weather toggle SFX error:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Authentic highway fuel filling sound (डीजल टंकी रिफिलिंग साउंड):
 * Nozzle insert latch click -> rushing diesel fluid flow & liquid glug-glug bubbles -> nozzle shutoff snap!
 */
export function playFuelFillingSound(durationSec = 1.8): void {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // 1. Initial metallic nozzle trigger latch ("CLACK")
    const latchOsc = ctx.createOscillator();
    const latchGain = ctx.createGain();
    latchOsc.type = 'square';
    latchOsc.frequency.setValueAtTime(420, t0);
    latchOsc.frequency.exponentialRampToValueAtTime(120, t0 + 0.06);
    latchGain.gain.setValueAtTime(0.35, t0);
    latchGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
    latchOsc.connect(latchGain);
    latchGain.connect(ctx.destination);
    latchOsc.start(t0);
    latchOsc.stop(t0 + 0.08);

    // 2. High-speed rushing diesel fluid flow (bandpassed white noise with resonance)
    const flowDur = Math.max(0.6, durationSec - 0.25);
    const flowBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * flowDur), ctx.sampleRate);
    const flowData = flowBuffer.getChannelData(0);
    for (let i = 0; i < flowData.length; i++) {
      flowData[i] = Math.random() * 2 - 1;
    }
    const flowSource = ctx.createBufferSource();
    flowSource.buffer = flowBuffer;

    const flowFilter = ctx.createBiquadFilter();
    flowFilter.type = 'bandpass';
    flowFilter.frequency.setValueAtTime(700, t0 + 0.05);
    flowFilter.frequency.linearRampToValueAtTime(1100, t0 + flowDur * 0.8);
    flowFilter.Q.setValueAtTime(2.2, t0 + 0.05);

    const flowGain = ctx.createGain();
    flowGain.gain.setValueAtTime(0.001, t0);
    flowGain.gain.linearRampToValueAtTime(0.38, t0 + 0.12);
    flowGain.gain.setValueAtTime(0.38, t0 + flowDur - 0.15);
    flowGain.gain.exponentialRampToValueAtTime(0.001, t0 + flowDur);

    flowSource.connect(flowFilter);
    flowFilter.connect(flowGain);
    flowGain.connect(ctx.destination);
    flowSource.start(t0 + 0.04);
    flowSource.stop(t0 + flowDur + 0.05);

    // 3. Liquid gurgling/bubbling harmonics (swelling pitch mimicking filling chamber)
    const bubbleCount = 7;
    for (let b = 0; b < bubbleCount; b++) {
      const bTime = t0 + 0.15 + b * (flowDur / bubbleCount);
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      const baseFreq = 220 + b * 45;
      bOsc.frequency.setValueAtTime(baseFreq, bTime);
      bOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, bTime + 0.08);

      bGain.gain.setValueAtTime(0.18, bTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, bTime + 0.09);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(bTime);
      bOsc.stop(bTime + 0.1);
    }

    // 4. Final automatic nozzle shutoff click-clack (कट-ऑफ स्नैप)
    const shutoffTime = t0 + flowDur;
    const snapOsc1 = ctx.createOscillator();
    const snapGain1 = ctx.createGain();
    snapOsc1.type = 'triangle';
    snapOsc1.frequency.setValueAtTime(1800, shutoffTime);
    snapOsc1.frequency.exponentialRampToValueAtTime(240, shutoffTime + 0.05);
    snapGain1.gain.setValueAtTime(0.42, shutoffTime);
    snapGain1.gain.exponentialRampToValueAtTime(0.001, shutoffTime + 0.06);
    snapOsc1.connect(snapGain1);
    snapGain1.connect(ctx.destination);
    snapOsc1.start(shutoffTime);
    snapOsc1.stop(shutoffTime + 0.07);

    const snapOsc2 = ctx.createOscillator();
    const snapGain2 = ctx.createGain();
    snapOsc2.type = 'square';
    snapOsc2.frequency.setValueAtTime(520, shutoffTime + 0.04);
    snapOsc2.frequency.exponentialRampToValueAtTime(100, shutoffTime + 0.1);
    snapGain2.gain.setValueAtTime(0.35, shutoffTime + 0.04);
    snapGain2.gain.exponentialRampToValueAtTime(0.001, shutoffTime + 0.11);
    snapOsc2.connect(snapGain2);
    snapGain2.connect(ctx.destination);
    snapOsc2.start(shutoffTime + 0.04);
    snapOsc2.stop(shutoffTime + 0.12);
  } catch (err) {
    console.warn('Fuel filling SFX error:', err instanceof Error ? err.message : String(err));
  }
}


