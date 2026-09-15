import React, { useState, useEffect } from 'react';
import { Ticket, Radio, Sun, CloudRain, CloudFog, Share2 } from 'lucide-react';
import { WeatherType } from '../types';

interface HeaderBarProps {
  passengerCount: number;
  timerBadge: string;
  weather: WeatherType;
  onToggleWeather: () => void;
  onOpenTicketModal: () => void;
  onShareWebsite?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  passengerCount,
  timerBadge,
  weather,
  onToggleWeather,
  onOpenTicketModal,
  onShareWebsite,
}) => {
  const [clockStr, setClockStr] = useState('12:00 AM');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setClockStr(`${hours}:${mins < 10 ? '0' : ''}${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherDetails = () => {
    switch (weather) {
      case 'rain':
        return {
          icon: <CloudRain className="w-3.5 h-3.5 text-cyan-300" />,
          label: 'बारिश',
          subLabel: 'Rain',
          title: 'मौसम: मानसून बारिश (Monsoon Rain) • दबाएँ [W]',
          classes: 'border-cyan-400/40 bg-cyan-950/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.22)]',
        };
      case 'fog':
        return {
          icon: <CloudFog className="w-3.5 h-3.5 text-slate-200" />,
          label: 'कोहरा',
          subLabel: 'Fog',
          title: 'मौसम: हाईवे कोहरा (Highway Fog) • दबाएँ [W]',
          classes: 'border-slate-400/40 bg-slate-800/50 text-slate-200 shadow-[0_0_12px_rgba(148,163,184,0.2)]',
        };
      case 'clear':
      default:
        return {
          icon: <Sun className="w-3.5 h-3.5 text-amber-300" />,
          label: 'साफ़',
          subLabel: 'Clear',
          title: 'मौसम: सुहाना मौसम (Clear Skies) • दबाएँ [W]',
          classes: 'glass-gold-pill text-amber-200 hover:border-amber-400',
        };
    }
  };

  const weatherDetails = getWeatherDetails();

  return (
    <header className="relative z-20 w-full pt-1.5 sm:pt-4 landscape:max-h-[500px]:pt-1 px-3 sm:px-6 md:px-8 flex items-center justify-between text-xs sm:text-sm font-medium gap-1.5 sm:gap-3">
      {/* Live Clock Pill with Frosted Dark Glass & Subtle Golden Glow */}
      <div
        id="liveClock"
        className="glass-gold-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-amber-100/90 font-ticket text-[11px] sm:text-sm tracking-widest drop-shadow flex items-center gap-1.5 shrink-0"
      >
        <Radio className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400" />
        <span>{clockStr}</span>
      </div>

      {/* Passenger Counter Pill with Responsive Text */}
      <div
        id="passengerCounterPill"
        className="glass-gold-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-lg shrink-0"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span id="listenerCount" className="text-amber-200 text-xs font-ticket font-bold">
          {passengerCount}
        </span>
        <span className="text-white/80 text-[10px] sm:text-[11px] font-desi hidden xs:inline sm:hidden">मुसाफ़िर</span>
        <span className="text-white/80 text-[10px] sm:text-[11px] font-desi hidden sm:inline">मुसाफ़िर हाईवे पर</span>
      </div>

      {/* Right Controls: Weather Toggle & Ticket Cut Button */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Weather Toggle Button */}
        <button
          id="headerWeatherBtn"
          onClick={onToggleWeather}
          title={weatherDetails.title}
          aria-label={weatherDetails.title}
          className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full transition active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer border ${weatherDetails.classes}`}
        >
          {weatherDetails.icon}
          <span className="text-[11px] sm:text-xs font-desi font-medium tracking-wide">
            {weatherDetails.label}
          </span>
          <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono hidden md:inline">
            ({weatherDetails.subLabel})
          </span>
        </button>

        {/* Share Website Link Button */}
        {onShareWebsite && (
          <button
            id="headerShareBtn"
            onClick={onShareWebsite}
            title="वेबसाइट शेयर करें / Share Website"
            aria-label="वेबसाइट शेयर करें / Share Website"
            className="glass-gold-pill p-1.5 sm:p-2 rounded-full hover:border-amber-400 text-amber-300 transition active:scale-95 flex items-center justify-center shadow-md group cursor-pointer"
          >
            <Share2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-300 group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Ticket Cut / Saved Action Button - Icon Only */}
        <button
          id="headerTicketBtn"
          onClick={onOpenTicketModal}
          title="सफ़र का टिकट / Cut Ticket"
          aria-label="सफ़र का टिकट / Ticket"
          className="glass-gold-pill p-1.5 sm:p-2 rounded-full hover:border-amber-400 text-amber-300 transition active:scale-95 flex items-center justify-center shadow-md group cursor-pointer"
        >
          <Ticket className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    </header>
  );
};

