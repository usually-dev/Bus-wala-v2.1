import React, { useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { getTrackArtwork, getFallbackArtwork } from '../data/songs';
import { Radio, Search, X } from 'lucide-react';

interface QueueDrawerProps {
  isOpen: boolean;
  songs: Song[];
  currentTrackIdx: number;
  onSelectTrack: (index: number) => void;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  songs,
  currentTrackIdx,
  onSelectTrack,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.movie && s.movie.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (isOpen && activeItemRef.current) {
      setTimeout(() => {
        activeItemRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, [isOpen, currentTrackIdx]);

  return (
    <div
      id="queueDrawer"
      className={`glass-gold-drawer fixed inset-x-0 bottom-0 z-40 max-w-lg mx-auto rounded-t-3xl transition-transform duration-300 transform flex flex-col max-h-[75vh] ${
        isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-amber-400/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400" />
          <span className="font-desi text-sm text-amber-300">
            हाईवे कैसेट प्लेलिस्ट
          </span>
          <span className="text-[10px] font-ticket text-white/60">
            ({songs.length} Highway Cassettes)
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-white/60 hover:text-white text-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Filter Input */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/40" />
          <input
            type="text"
            placeholder="गाना या गायक खोजें (Search songs, artists)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/60 border border-amber-400/25 rounded-xl pl-8 pr-3 py-1.5 text-xs text-amber-100 placeholder-white/40 focus:outline-none focus:border-amber-400 font-ticket"
          />
        </div>
      </div>

      {/* Songs List */}
      <div className="p-2 sm:p-3 overflow-y-auto custom-scroll space-y-1 text-xs flex-1">
        {filteredSongs.length === 0 ? (
          <div className="text-center py-8 text-white/50 font-ticket text-xs">
            कोई गाना नहीं मिला (No songs found)
          </div>
        ) : (
          filteredSongs.map((song) => {
            const actualIdx = songs.findIndex((s) => s.num === song.num);
            const isCurrent = actualIdx === currentTrackIdx;
            return (
              <div
                key={song.num}
                ref={isCurrent ? activeItemRef : null}
                onClick={() => onSelectTrack(actualIdx)}
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition active:scale-[0.99] ${
                  isCurrent
                    ? 'bg-amber-500/20 text-white font-semibold border border-amber-500/50 shadow-md'
                    : 'hover:bg-white/5 text-white/80'
                }`}
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  <span className="font-ticket text-amber-400/70 text-[11px] w-6">
                    #{song.num}
                  </span>
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-amber-400/50 p-0 bg-transparent shadow-sm">
                    <img
                      src={getTrackArtwork(song, actualIdx)}
                      alt="art"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = getFallbackArtwork(song, actualIdx);
                      }}
                      className="w-full h-full object-cover scale-125"
                    />
                  </div>
                  <div className="truncate">
                    <div
                      className={`text-xs font-desi truncate ${
                        isCurrent ? 'text-amber-300 font-bold' : 'text-amber-100'
                      }`}
                    >
                      {song.title}
                    </div>
                    <div className="text-[10px] text-white/60 truncate font-ticket">
                      {song.artist}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-amber-200/60 font-ticket flex-shrink-0">
                  {isCurrent ? '▶ PLAYING' : 'HIGHWAY'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
