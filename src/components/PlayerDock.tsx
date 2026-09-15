import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { getTrackArtwork, getFallbackArtwork } from '../data/songs';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  ListMusic,
  Megaphone,
} from 'lucide-react';

interface PlayerDockProps {
  currentTrack: Song;
  currentTrackIdx: number;
  isPlaying: boolean;
  isBuffering?: boolean;
  isShuffle: boolean;
  currentTime: number;
  duration: number;
  totalTracks: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleShuffle: () => void;
  onToggleQueue: () => void;
  onSeek: (seconds: number) => void;
  onScrubStateChange?: (isScrubbing: boolean) => void;
  onHonkHorn?: () => void;
  hornTrigger?: number;
  isDoorOpen?: boolean;
  onToggleDoor?: () => void;
}

export const PlayerDock: React.FC<PlayerDockProps> = ({
  currentTrack,
  currentTrackIdx,
  isPlaying,
  isShuffle,
  currentTime,
  duration,
  totalTracks,
  onTogglePlay,
  onNext,
  onPrev,
  onToggleShuffle,
  onToggleQueue,
  onSeek,
  onScrubStateChange,
  onHonkHorn,
  hornTrigger = 0,
}) => {
  const [isHonkAnimating, setIsHonkAnimating] = useState(false);
  const prevHornRef = useRef(hornTrigger);

  // High-performance local scrubbing state to prevent network flooding and audio stutter
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  useEffect(() => {
    if (!isScrubbing) {
      setScrubValue(currentTime);
    }
  }, [currentTime, isScrubbing]);

  useEffect(() => {
    if (hornTrigger > 0 && hornTrigger !== prevHornRef.current) {
      prevHornRef.current = hornTrigger;
      setIsHonkAnimating(true);
      const timer = setTimeout(() => {
        setIsHonkAnimating(false);
      }, 3850); // Synchronized with full duration of the musical horn audio
      return () => clearTimeout(timer);
    }
  }, [hornTrigger]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const handlePointerDown = () => {
    setIsScrubbing(true);
    setScrubValue(currentTime);
    onScrubStateChange?.(true);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubValue(val);
  };

  const commitSeek = () => {
    if (isScrubbing) {
      setIsScrubbing(false);
      onSeek(scrubValue);
      onScrubStateChange?.(false);
    }
  };

  return (
    <footer className="relative z-30 w-full px-3 sm:px-6 pb-2 sm:pb-6 landscape:max-h-[500px]:pb-1.5 flex justify-center">
      {/* Player Card with Frosted Dark Glass & Subtle Golden Glow */}
      <div className="glass-gold-player w-full max-w-md md:max-w-lg rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 landscape:max-h-[500px]:p-2 text-white shadow-2xl transition-all">
        {/* Track Details & Circular Album Cover */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Pure Circular Album Cover - Full Bleed Fit */}
          <div className="relative w-10 h-10 sm:w-14 sm:h-14 landscape:max-h-[500px]:w-9 landscape:max-h-[500px]:h-9 flex-shrink-0 rounded-full overflow-hidden shadow-xl border-2 border-amber-400/70 p-0 bg-transparent">
            <img
              src={getTrackArtwork(currentTrack, currentTrackIdx)}
              alt="Cover Art"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = getFallbackArtwork(currentTrack, currentTrackIdx);
              }}
              className={`w-full h-full object-cover scale-125 ${
                isPlaying ? 'disc-spinning' : 'disc-paused'
              }`}
            />
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-ticket text-amber-300 bg-black/60 px-1.5 py-0.5 rounded border border-amber-400/25">
                #{currentTrack.num}
              </span>
              <h3 className="text-xs sm:text-base landscape:max-h-[500px]:text-xs font-bold font-desi text-amber-100 tracking-wide truncate">
                {currentTrack.title}
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs text-amber-200/80 truncate font-ticket mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="mt-1.5 sm:mt-2.5 px-0.5 landscape:max-h-[500px]:mt-1">
          <div className="relative w-full flex items-center py-0.5 sm:py-1">
            <input
              type="range"
              min={0}
              max={duration > 0 ? duration : 100}
              value={activeTime}
              onPointerDown={handlePointerDown}
              onTouchStart={handlePointerDown}
              onMouseDown={handlePointerDown}
              onChange={handleSliderChange}
              onPointerUp={commitSeek}
              onTouchEnd={commitSeek}
              onMouseUp={commitSeek}
              onKeyUp={commitSeek}
              className="scrubber-slider cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f59e0b ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`,
              }}
              aria-label="Song progress scrubber"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-amber-200/80 font-ticket mt-0.5 px-0.5">
            <span>{formatTime(activeTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between px-2 sm:px-6 mt-1 sm:mt-2">
          {/* Shuffle Toggle */}
          <button
            onClick={onToggleShuffle}
            className={`p-1.5 transition cursor-pointer active:scale-90 ${
              isShuffle ? 'text-amber-400' : 'text-white/60 hover:text-white'
            }`}
            title="शफ़ल मोड (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Song */}
          <button
            onClick={onPrev}
            className="text-white/80 hover:text-white transition p-2 active:scale-95 cursor-pointer"
            title="पिछला गाना (Previous)"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Master Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition cursor-pointer"
            title={isPlaying ? 'रोकें (Pause)' : 'बजाएँ (Play)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Song */}
          <button
            onClick={onNext}
            className="text-white/80 hover:text-white transition p-2 active:scale-95 cursor-pointer"
            title="अगला गाना (Next)"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Authentic Indian Bus Musical Horn Button */}
          <div className="relative flex items-center justify-center">
            {/* Expanding glowing pulse ring on horn trigger */}
            {isHonkAnimating && (
              <span
                key={hornTrigger}
                className="horn-glow-ring pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300 bg-amber-400/25"
              />
            )}
            <button
              onClick={onHonkHorn}
              className={`p-1.5 transition cursor-pointer relative group flex items-center justify-center rounded-full ${
                isHonkAnimating
                  ? 'horn-honking text-amber-200 bg-amber-500/40 shadow-[0_0_18px_rgba(245,158,11,0.9)] scale-120 ring-2 ring-amber-300/80'
                  : 'text-amber-300/85 hover:text-amber-100 hover:scale-115 active:scale-90 hover:bg-amber-500/20'
              }`}
              title="बस का म्यूजिकल हॉर्न (HORN OK PLEASE - दबाएँ या 'H' दबाएँ)"
              aria-label="Bus Musical Horn"
            >
              <Megaphone
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 -rotate-12 transition-transform ${
                  isHonkAnimating ? 'drop-shadow-[0_0_10px_rgba(251,191,36,1)] scale-110' : ''
                }`}
              />
            </button>
          </div>

          {/* Playlist Queue Drawer Toggle */}
          <button
            onClick={onToggleQueue}
            className="text-white/60 hover:text-white transition p-1.5 relative cursor-pointer active:scale-90"
            title="कैसेट सूची (Playlist Queue)"
          >
            <ListMusic className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[9px] font-ticket font-bold px-1 rounded-full">
              {totalTracks}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};
