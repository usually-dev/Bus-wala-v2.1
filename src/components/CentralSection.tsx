import React, { useState, useEffect } from 'react';
import { SHAYARI_LIST } from '../data/shayari';
import { RotateCw } from 'lucide-react';

interface CentralSectionProps {}

export const CentralSection: React.FC<CentralSectionProps> = () => {
  const [shayariIdx, setShayariIdx] = useState(0);
  const [fadeState, setFadeState] = useState(true);

  const cycleShayari = () => {
    setFadeState(false);
    setTimeout(() => {
      setShayariIdx((prev) => (prev + 1) % SHAYARI_LIST.length);
      setFadeState(true);
    }, 200);
  };

  // Highway Shayari automatic rotation between 16 and 39 seconds
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const scheduleNext = () => {
      const minMs = 16 * 1000;
      const maxMs = 39 * 1000;
      const delay = Math.floor(minMs + Math.random() * (maxMs - minMs + 1));
      timerId = setTimeout(() => {
        cycleShayari();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => clearTimeout(timerId);
  }, []);

  return (
    <section className="relative z-20 flex-1 flex flex-col items-center justify-between py-1 sm:py-3 px-4 pointer-events-none min-h-0">
      {/* Retro Title Branding - Compact on short landscape screens */}
      <div className="text-center pt-0.5 sm:pt-2 pointer-events-none select-none">
        <h1 className="text-3xl sm:text-6xl md:text-7xl landscape:max-h-[500px]:text-3xl font-vintage tracking-wider text-amber-100 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
          बस वाला
        </h1>
        <p className="text-[9px] sm:text-xs landscape:max-h-[500px]:text-[9px] text-amber-300/90 tracking-widest uppercase font-ticket mt-0.5 sm:mt-1">
          HIGHWAY STEREO • YOUTUBE NOSTALGIC RADIO
        </p>
      </div>

      {/* Transparent open center spacing for canvas bus */}
      <div className="flex-1 w-full pointer-events-none min-h-[40px] landscape:max-h-[500px]:min-h-[20px]" />

      {/* Shayari Display: Completely transparent with NO dark panel or borders */}
      <div
        id="shayariDisplayCard"
        className="w-full max-w-lg flex flex-col items-center gap-1 pointer-events-none pb-1 sm:pb-2 bg-transparent border-0 shadow-none text-center"
      >
        <div className="flex items-center justify-center gap-2 text-amber-100 text-[11px] sm:text-sm md:text-base landscape:max-h-[500px]:text-xs font-desi drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] px-4 pointer-events-none">
          <span
            id="shayariText"
            className={`transition-opacity duration-300 ${
              fadeState ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {SHAYARI_LIST[shayariIdx]}
          </span>
          <button
            onClick={cycleShayari}
            title="अगली शायरी (Next Quote)"
            className="text-amber-300/70 hover:text-amber-300 transition p-1 hover:rotate-90 active:scale-90 text-sm cursor-pointer flex-shrink-0 pointer-events-auto"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
};
