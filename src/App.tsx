import { useState, useEffect, useRef, useCallback } from 'react';
import { Song, TicketData, YT, WeatherType } from './types';
import { SONG_CATALOG, getTrackArtwork } from './data/songs';
import { playPaperPunchSound, playBusHornSound, playPneumaticDoorSound, playWeatherToggleSound, getAudioContext } from './utils/audio';
import { HighwayCanvas } from './components/HighwayCanvas';
import { HeaderBar } from './components/HeaderBar';
import { CentralSection } from './components/CentralSection';
import { PlayerDock } from './components/PlayerDock';
import { TicketModal, calculateFare } from './components/TicketModal';
import { TicketShowcaseModal } from './components/TicketShowcaseModal';
import { JourneyTicketReminderModal } from './components/JourneyTicketReminderModal';
import { QueueDrawer } from './components/QueueDrawer';
import { ToastNotification } from './components/ToastNotification';

const TICKET_STORAGE_KEY = 'safarnamaExpressTicketV3';

export default function App() {
  // Playback State
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>(() => {
    const arr = Array.from({ length: SONG_CATALOG.length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [shufflePointer, setShufflePointer] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Highway Passenger Count
  const [passengerCount] = useState(() => Math.floor(480 + Math.random() * 520));

  // Route and Ticket State - Lazily restored from storage on startup
  const [savedTicket, setSavedTicket] = useState<TicketData | null>(() => {
    try {
      const stored = localStorage.getItem(TICKET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.from && parsed?.to) return parsed;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [currentRoute, setCurrentRoute] = useState<{ from: string; to: string }>(() => {
    try {
      const stored = localStorage.getItem(TICKET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.from && parsed?.to) return { from: parsed.from, to: parsed.to };
      }
    } catch {
      // Ignore
    }
    return {
      from: 'पटना (Patna)',
      to: 'बेगूसराय (Begusarai)',
    };
  });

  // Sleep Timer
  const [journeyRemainingSecs, setJourneyRemainingSecs] = useState(0);
  const [isNonStop, setIsNonStop] = useState(true);

  // Bus Horn Visual/Audio Sync
  const [hornTrigger, setHornTrigger] = useState(0);

  // Bus Passenger Entry Door State
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  // Audio Stream Preloading & Buffer Status
  const [isBuffering, setIsBuffering] = useState(false);

  // Modals & Drawers
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Song Completion Tracking (Requirement Q2: Trigger after 3-8 songs)
  const [songsListenedCount, setSongsListenedCount] = useState(0);
  const [reminderTargetThreshold] = useState(() => Math.floor(3 + Math.random() * 5)); // Between 3 and 7
  const [hasPromptedTicketCheck, setHasPromptedTicketCheck] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ msg: string; icon: string } | null>(null);

  // YouTube Player Ref
  const playerRef = useRef<YT.Player | null>(null);
  const isPlayerReadyRef = useRef(false);
  const isDraggingScrubberRef = useRef(false);
  const bgKeepAliveAudioRef = useRef<HTMLAudioElement | null>(null);

  // State synchronization refs to avoid re-triggering effects and callbacks
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;

  const shuffledIndicesRef = useRef(shuffledIndices);
  shuffledIndicesRef.current = shuffledIndices;

  const shufflePointerRef = useRef(shufflePointer);
  shufflePointerRef.current = shufflePointer;

  const currentTrackIdxRef = useRef(currentTrackIdx);
  currentTrackIdxRef.current = currentTrackIdx;

  const songsListenedCountRef = useRef(songsListenedCount);
  songsListenedCountRef.current = songsListenedCount;

  const hasPromptedTicketCheckRef = useRef(hasPromptedTicketCheck);
  hasPromptedTicketCheckRef.current = hasPromptedTicketCheck;

  const showToast = useCallback((msg: string, icon = '✨') => {
    setToast({ msg, icon });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Web Share & URL Copy for Website Visitors
  const handleShareWebsite = useCallback(async () => {
    const shareData = {
      title: 'बस वाला • Bus Wala Highway Radio & Safarnama',
      text: 'रोडवेज़ बस के सफ़र और पुराने गानों का मज़ा लें! बस वाला हाईवे रेडियो 🚌🎶',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall through to clipboard if user dismissed or error
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('वेबसाइट लिंक कॉपी हो गया! दोस्तों के साथ शेयर करें 🔗', '🚌');
    } catch {
      showToast('वेबसाइट: ' + window.location.href, '🚌');
    }
  }, [showToast]);

  // Authentic Bus Horn Trigger (HORN OK PLEASE - sound and visual feedback without intrusive popup)
  const handleHonkHorn = useCallback(() => {
    playBusHornSound();
    setHornTrigger((prev) => prev + 1);
  }, []);

  // Authentic Bus Passenger Door Toggle (बस का मुख्य यात्री प्रवेश द्वार - sound & animation without intrusive popup)
  const handleToggleDoor = useCallback(() => {
    setIsDoorOpen((prev) => {
      const next = !prev;
      playPneumaticDoorSound(next);
      return next;
    });
  }, []);

  // Highway Weather Condition Toggle (सुहाना मौसम / मानसून बारिश / हाईवे कोहरा)
  const handleToggleWeather = useCallback(() => {
    playWeatherToggleSound();
    setWeather((prev) => {
      const next: WeatherType = prev === 'clear' ? 'rain' : prev === 'rain' ? 'fog' : 'clear';
      return next;
    });
  }, []);

  // Global Keyboard shortcuts: 'h'/'H' for horn, 'd'/'D' for bus door, 'w'/'W' for weather toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        handleHonkHorn();
      }
      if (e.key === 'd' || e.key === 'D') {
        handleToggleDoor();
      }
      if (e.key === 'w' || e.key === 'W') {
        handleToggleWeather();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHonkHorn, handleToggleDoor, handleToggleWeather]);

  // Build Shuffle Index Array
  const buildShuffleList = useCallback(() => {
    const arr = Array.from({ length: SONG_CATALOG.length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledIndices(arr);
    setShufflePointer(0);
  }, []);

  // Track Preloading (Warms DNS & Image cache for upcoming track without choking network)
  const preloadUpcomingBatch = useCallback((currentIndex: number) => {
    const nextIdx = (currentIndex + 1) % SONG_CATALOG.length;
    const nextTrack = SONG_CATALOG[nextIdx];
    if (!nextTrack) return;

    // Warm thumbnail in browser memory (instant album art & DNS connection)
    const img = new Image();
    img.src = `https://i.ytimg.com/vi/${nextTrack.ytid}/hqdefault.jpg`;
  }, []);

  // Track Transition
  const loadAndPlayTrack = useCallback(
    (index: number) => {
      setCurrentTrackIdx(index);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);

      const track = SONG_CATALOG[index];
      if (isPlayerReadyRef.current && playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById({
          videoId: track.ytid,
          startSeconds: track.start || 0,
          endSeconds: track.end,
        });
        try {
          if (playerRef.current?.playVideo) {
            playerRef.current.playVideo();
          }
        } catch {}
      }
      setIsPlaying(true);

      // Warm thumbnail for the next track
      preloadUpcomingBatch(index);
    },
    [preloadUpcomingBatch]
  );

  const lastAdvanceTimeRef = useRef(0);
  const handleNextTrack = useCallback(() => {
    const now = Date.now();
    // Enforce 1.5s cooldown to mathematically prevent rapid cascading transitions
    if (now - lastAdvanceTimeRef.current < 1500) {
      return;
    }
    lastAdvanceTimeRef.current = now;

    const nextCount = songsListenedCountRef.current + 1;
    songsListenedCountRef.current = nextCount;
    setSongsListenedCount(nextCount);

    if (nextCount >= reminderTargetThreshold && !hasPromptedTicketCheckRef.current) {
      hasPromptedTicketCheckRef.current = true;
      setIsReminderOpen(true);
      setHasPromptedTicketCheck(true);
    }

    if (isShuffleRef.current && shuffledIndicesRef.current.length > 0) {
      const nextPtr = (shufflePointerRef.current + 1) % shuffledIndicesRef.current.length;
      shufflePointerRef.current = nextPtr;
      setShufflePointer(nextPtr);
      loadAndPlayTrack(shuffledIndicesRef.current[nextPtr]);
    } else {
      const nextIdx = (currentTrackIdxRef.current + 1) % SONG_CATALOG.length;
      loadAndPlayTrack(nextIdx);
    }
  }, [loadAndPlayTrack, reminderTargetThreshold]);

  const handlePrevTrack = useCallback(() => {
    const cur = playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
    if (cur > 3 && playerRef.current?.seekTo) {
      playerRef.current.seekTo(0, true);
      return;
    }
    if (isShuffleRef.current && shuffledIndicesRef.current.length > 0) {
      const prevPtr =
        (shufflePointerRef.current - 1 + shuffledIndicesRef.current.length) %
        shuffledIndicesRef.current.length;
      shufflePointerRef.current = prevPtr;
      setShufflePointer(prevPtr);
      loadAndPlayTrack(shuffledIndicesRef.current[prevPtr]);
    } else {
      const prevIdx =
        (currentTrackIdxRef.current - 1 + SONG_CATALOG.length) % SONG_CATALOG.length;
      loadAndPlayTrack(prevIdx);
    }
  }, [loadAndPlayTrack]);

  const handleNextTrackRef = useRef(handleNextTrack);
  handleNextTrackRef.current = handleNextTrack;

  const handlePrevTrackRef = useRef(handlePrevTrack);
  handlePrevTrackRef.current = handlePrevTrack;

  // Background Audio Keep-Alive & Lock Screen Controls (MediaSession API)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const track = SONG_CATALOG[currentTrackIdx] || SONG_CATALOG[0];
    const artUrl = getTrackArtwork(track, currentTrackIdx);

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'बस वाला • स्टेट रोडवेज सफ़रनामा',
        artwork: [
          { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: artUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set Action Handlers for Lock Screen, Notification Controls & Bluetooth Headsets
      navigator.mediaSession.setActionHandler('play', () => {
        if (playerRef.current?.playVideo) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
        if (bgKeepAliveAudioRef.current) {
          bgKeepAliveAudioRef.current.play().catch(() => {});
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (playerRef.current?.pauseVideo) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
        if (bgKeepAliveAudioRef.current) {
          bgKeepAliveAudioRef.current.pause();
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && details.seekTime !== null) {
          const clamped = Math.max(0, Math.min(duration || 9999, details.seekTime));
          setCurrentTime(clamped);
          if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(clamped, true);
          }
        }
      });
    } catch {}
  }, [currentTrackIdx, isPlaying, duration]);

  // Sync media position state with lock-screen scrubber
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      if (duration > 0 && currentTime >= 0 && currentTime <= duration) {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: 1,
          position: currentTime,
        });
      }
    } catch {}
  }, [currentTime, duration]);

  // Keep-alive silent audio activation to prevent mobile OS throttling when screen locks
  const triggerAudioKeepAlive = () => {
    if (!bgKeepAliveAudioRef.current) return;
    try {
      if (bgKeepAliveAudioRef.current.paused) {
        bgKeepAliveAudioRef.current.play().catch(() => {});
      }
    } catch {}
  };

  // Preload first batch of songs into cache on app boot
  useEffect(() => {
    preloadUpcomingBatch(0);
  }, [preloadUpcomingBatch]);

  const handleTogglePlay = () => {
    getAudioContext();
    triggerAudioKeepAlive();

    if (!isPlayerReadyRef.current || !playerRef.current) {
      loadAndPlayTrack(currentTrackIdx);
      setIsPlaying(true);
      return;
    }

    const state = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
    if (state === YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      if (bgKeepAliveAudioRef.current) {
        bgKeepAliveAudioRef.current.pause();
      }
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      if (bgKeepAliveAudioRef.current) {
        bgKeepAliveAudioRef.current.play().catch(() => {});
      }
    }
  };

  const handleToggleShuffle = () => {
    const nextVal = !isShuffle;
    setIsShuffle(nextVal);
    if (nextVal) {
      buildShuffleList();
      showToast('शफ़ल मोड चालू (Shuffle ON)', '🔀');
    } else {
      showToast('शफ़ल मोड बंद (Shuffle OFF)', '🔁');
    }
  };

  const handleSeek = (sec: number) => {
    isDraggingScrubberRef.current = false;
    const clamped = Math.max(0, Math.min(duration || 9999, sec));
    setCurrentTime(clamped);
    if (isPlayerReadyRef.current && playerRef.current?.seekTo) {
      playerRef.current.seekTo(clamped, true);
      try {
        if (playerRef.current?.setPlaybackQuality) {
          playerRef.current.setPlaybackQuality('small');
        }
      } catch {}
      // Ensure smooth continuous playback during seek jumps
      if (isPlaying && playerRef.current.playVideo) {
        playerRef.current.playVideo();
      }
    }
  };

  const handleScrubStateChange = (scrubbing: boolean) => {
    isDraggingScrubberRef.current = scrubbing;
  };

  // Ticket Punch Action
  const handlePunchTicket = (from: string, to: string, mins: number) => {
    playPaperPunchSound();
    const serial = 'BW-' + Math.floor(100000 + Math.random() * 900000);
    const fare = calculateFare(from, to);
    const durStr = mins === 0 ? '∞ Non-stop' : `${mins} Min`;

    const newTicket: TicketData = {
      serial,
      from,
      to,
      fare,
      duration: durStr,
      seat: '14-W (खिड़की सीट)',
      savedAt: Date.now(),
    };

    setSavedTicket(newTicket);
    setCurrentRoute({ from, to });

    if (mins === 0) {
      setIsNonStop(true);
      setJourneyRemainingSecs(0);
    } else {
      setIsNonStop(false);
      setJourneyRemainingSecs(mins * 60);
    }

    setIsTicketModalOpen(false);
    setIsShowcaseOpen(true);
    if (!isPlaying) {
      handleTogglePlay();
    }
  };

  const handleSaveTicket = () => {
    if (savedTicket) {
      try {
        const payload = {
          serial: String(savedTicket.serial || ''),
          from: String(savedTicket.from || ''),
          to: String(savedTicket.to || ''),
          fare: Number(savedTicket.fare || 0),
          duration: String(savedTicket.duration || ''),
          seat: String(savedTicket.seat || ''),
          savedAt: Number(savedTicket.savedAt || Date.now()),
        };
        localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(payload));
        showToast('🎫 टिकट सेव हो गया। सुखद सफ़र!', '💾');
      } catch (err) {
        console.warn('Save ticket error:', err instanceof Error ? err.message : String(err));
      }
    }
    setIsShowcaseOpen(false);
  };

  const handleStartJourney = () => {
    setIsShowcaseOpen(false);
    showToast('सफ़र शुरू हो गया! खिड़की सीट का आनंद लें 🚌', '🛣️');
    if (!isPlaying) {
      handleTogglePlay();
    }
  };

  // YouTube Engine Init - runs strictly once on mount with clean disposal
  useEffect(() => {
    const initYT = () => {
      if (typeof window.YT === 'undefined' || !window.YT.Player || playerRef.current) return;

      let playerElem = document.getElementById('ytPlayer');
      if (!playerElem) {
        const container = document.getElementById('ytContainer');
        if (container) {
          playerElem = document.createElement('div');
          playerElem.id = 'ytPlayer';
          container.appendChild(playerElem);
        }
      }
      if (!playerElem) return;

      const playerVars: YT.PlayerVars = {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
      };

      try {
        playerRef.current = new window.YT.Player(playerElem.id, {
          height: '200',
          width: '200',
          videoId: SONG_CATALOG[0].ytid,
          playerVars,
          events: {
            onReady: () => {
              isPlayerReadyRef.current = true;
            },
            onStateChange: (e: YT.OnStateChangeEvent) => {
              if (e.data === YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
              } else if (e.data === YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (e.data === YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (e.data === YT.PlayerState.ENDED) {
                setIsBuffering(false);
                handleNextTrackRef.current();
              }
            },
            onError: (err: unknown) => {
              // Extract primitive error code to prevent circular structure serialization issues
              const code =
                typeof err === 'object' && err !== null && 'data' in err
                  ? (err as { data: number }).data
                  : undefined;
              console.warn('YouTube playback event code:', code ?? 'unknown');
              setTimeout(() => {
                handleNextTrackRef.current();
              }, 1200);
            },
          },
        });
      } catch (e) {
        console.warn('YouTube init caught:', e instanceof Error ? e.message : String(e));
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      window.onYouTubeIframeAPIReady = initYT;
    }

    const pollInterval = setInterval(() => {
      if (window.YT && window.YT.Player && !playerRef.current) {
        initYT();
      }
    }, 400);

    return () => {
      clearInterval(pollInterval);
      try {
        if (playerRef.current?.destroy) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } catch {
        // ignore
      }
    };
  }, []);

  // Scrubber & Duration Ticker - runs on mount with stable interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDraggingScrubberRef.current) return;
      if (
        isPlayerReadyRef.current &&
        playerRef.current?.getPlayerState &&
        playerRef.current.getPlayerState() === YT.PlayerState.PLAYING
      ) {
        const cur = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        const dur = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;
        setCurrentTime(cur);
        setDuration(dur);

        // Advance if near the end (guard against 0/invalid initial durations during buffer loading)
        if (dur > 10 && cur >= dur - 0.8) {
          handleNextTrackRef.current();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Sleep Timer Countdown Ticker
  useEffect(() => {
    if (isNonStop) return;

    const interval = setInterval(() => {
      setJourneyRemainingSecs((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isNonStop]);

  // Clean up any legacy background prewarm frames or prefetches if lingering
  useEffect(() => {
    try {
      const oldPrewarm = document.getElementById('yt-prewarm-frame');
      if (oldPrewarm) oldPrewarm.remove();
      for (let i = 0; i < 5; i++) {
        const oldLink = document.getElementById(`yt-preload-slot-${i}`);
        if (oldLink) oldLink.remove();
      }
    } catch {}
  }, []);

  // Handle Journey End Side Effects cleanly outside countdown updater
  useEffect(() => {
    if (!isNonStop && journeyRemainingSecs === 0) {
      if (isPlayerReadyRef.current && playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
      setIsNonStop(true);
      showToast('मंज़िल आ गई! सफ़र यहीं समाप्त होता है।', '🏁');
    }
  }, [journeyRemainingSecs, isNonStop, showToast]);

  const timerBadgeText = isNonStop
    ? '∞ NON-STOP'
    : `${Math.floor(journeyRemainingSecs / 60)}:${
        journeyRemainingSecs % 60 < 10 ? '0' : ''
      }${journeyRemainingSecs % 60}`;

  const currentTrack: Song = SONG_CATALOG[currentTrackIdx] || SONG_CATALOG[0];

  return (
    <div className="relative w-full h-full text-white overflow-hidden bg-slate-950 flex flex-col justify-between select-none">
      {/* Active YouTube Audio Engine Container - placed behind dock with live rendering to avoid browser background audio-frame throttling */}
      <div
        id="ytContainer"
        aria-hidden="true"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: 240,
          height: 180,
          opacity: 0.02,
          pointerEvents: 'none',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <div id="ytPlayer" />
      </div>

      {/* Silent HTML5 Audio Element to keep mobile OS media pipeline active when screen locks */}
      <audio
        ref={bgKeepAliveAudioRef}
        loop
        playsInline
        preload="auto"
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
        style={{ display: 'none' }}
      />

      {/* 60FPS Highway Canvas */}
      <HighwayCanvas
        isPlaying={isPlaying}
        currentRoute={currentRoute}
        hornTrigger={hornTrigger}
        isDoorOpen={isDoorOpen}
        weather={weather}
        onToggleDoor={handleToggleDoor}
        onToggleWeather={handleToggleWeather}
      />

      {/* Film Grain & Dark Gradient Overlays */}
      <div className="film-grain z-10" />
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-[#071224]/50 via-transparent to-[#7a2418]/90" />

      {/* Toast Notification */}
      <ToastNotification message={toast?.msg || null} icon={toast?.icon} />

      {/* 1. Header Bar with Frosted Gold Glassmorphism & Weather Controller */}
      <HeaderBar
        passengerCount={passengerCount}
        timerBadge={timerBadgeText}
        weather={weather}
        onToggleWeather={handleToggleWeather}
        onOpenTicketModal={() => setIsTicketModalOpen(true)}
        onShareWebsite={handleShareWebsite}
      />

      {/* 2. Central Section with Transparent Shayari Card */}
      <CentralSection />

      {/* 3. Bottom Music Player Dock */}
      <PlayerDock
        currentTrack={currentTrack}
        currentTrackIdx={currentTrackIdx}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        isShuffle={isShuffle}
        currentTime={currentTime}
        duration={duration}
        totalTracks={SONG_CATALOG.length}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onToggleShuffle={handleToggleShuffle}
        onToggleQueue={() => setIsQueueDrawerOpen((prev) => !prev)}
        onSeek={handleSeek}
        onScrubStateChange={handleScrubStateChange}
        onHonkHorn={handleHonkHorn}
        hornTrigger={hornTrigger}
        isDoorOpen={isDoorOpen}
        onToggleDoor={handleToggleDoor}
      />

      {/* 4. Slide-up Cassette Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueDrawerOpen}
        songs={SONG_CATALOG}
        currentTrackIdx={currentTrackIdx}
        onSelectTrack={(idx) => {
          loadAndPlayTrack(idx);
          setIsQueueDrawerOpen(false);
        }}
        onClose={() => setIsQueueDrawerOpen(false)}
      />

      {/* 5. Ticket Customization Modal */}
      <TicketModal
        isOpen={isTicketModalOpen}
        currentFrom={currentRoute.from}
        currentTo={currentRoute.to}
        currentMins={isNonStop ? 0 : Math.ceil(journeyRemainingSecs / 60)}
        onClose={() => setIsTicketModalOpen(false)}
        onPunchTicket={handlePunchTicket}
      />

      {/* 6. Punched Physical Ticket Showcase */}
      <TicketShowcaseModal
        isOpen={isShowcaseOpen}
        ticket={savedTicket}
        onSaveTicket={handleSaveTicket}
        onStartJourney={handleStartJourney}
        onClose={() => setIsShowcaseOpen(false)}
      />

      {/* 7. Milestone Ticket Reminder (Triggered ONLY after user listens to 3-8 songs!) */}
      <JourneyTicketReminderModal
        isOpen={isReminderOpen}
        songsCount={songsListenedCount}
        onOpenTicketCounter={() => {
          setIsReminderOpen(false);
          setIsTicketModalOpen(true);
        }}
        onDismiss={() => setIsReminderOpen(false)}
      />
    </div>
  );
}
