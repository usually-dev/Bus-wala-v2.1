import React, { useState } from 'react';
import { RouteOption } from '../types';
import { Scissors, X } from 'lucide-react';
import { playTicketSelectionSound, playTicketPrintAndCutSound } from '../utils/audio';

interface TicketModalProps {
  isOpen: boolean;
  currentFrom: string;
  currentTo: string;
  currentMins: number;
  onClose: () => void;
  onPunchTicket: (from: string, to: string, mins: number) => void;
}

const PRESET_ROUTES: RouteOption[] = [
  { from: 'पटना (Patna)', to: 'बेगूसराय (Begusarai)', fare: 95 },
  { from: 'दरभंगा (Darbhanga)', to: 'समस्तीपुर (Samastipur)', fare: 35 },
  { from: 'पटना (Patna)', to: 'मुजफ्फरपुर (Muzaffarpur)', fare: 60 },
  { from: 'पटना (Patna)', to: 'गया (Gaya)', fare: 75 },
  { from: 'जयपुर (Jaipur)', to: 'जोधपुर (Jodhpur)', fare: 195 },
  { from: 'दिल्ली (Delhi)', to: 'मनाली (Manali)', fare: 340 },
  { from: 'मुंबई (Mumbai)', to: 'गोवा (Goa)', fare: 320 },
];

/**
 * Realistic Indian State Roadways fare calculation based on genuine distance tariffs
 */
export function calculateFare(fromCity: string, toCity: string): number {
  const f = (fromCity || '').toLowerCase();
  const t = (toCity || '').toLowerCase();

  // Standard Roadways pairs
  if ((f.includes('दरभंगा') || f.includes('darbhanga')) && (t.includes('समस्तीपुर') || t.includes('samastipur'))) return 35;
  if ((f.includes('समस्तीपुर') || f.includes('samastipur')) && (t.includes('दरभंगा') || t.includes('darbhanga'))) return 35;
  if ((f.includes('पटना') || f.includes('patna')) && (t.includes('बेगूसराय') || t.includes('begusarai'))) return 95;
  if ((f.includes('बेगूसराय') || f.includes('begusarai')) && (t.includes('पटना') || t.includes('patna'))) return 95;
  if ((f.includes('पटना') || f.includes('patna')) && (t.includes('मुजफ्फरपुर') || t.includes('muzaffarpur'))) return 60;
  if ((f.includes('पटना') || f.includes('patna')) && (t.includes('गया') || t.includes('gaya'))) return 75;
  if ((f.includes('पटना') || f.includes('patna')) && (t.includes('भागलपुर') || t.includes('bhagalpur'))) return 135;
  if ((f.includes('दिल्ली') || f.includes('delhi')) && (t.includes('मनाली') || t.includes('manali'))) return 340;
  if ((f.includes('जयपुर') || f.includes('jaipur')) && (t.includes('जोधपुर') || t.includes('jodhpur'))) return 195;
  if ((f.includes('मुंबई') || f.includes('mumbai')) && (t.includes('गोवा') || t.includes('goa'))) return 320;

  // General realistic distance tariff (₹35 to ₹180 range, neat multiples of 5)
  const str = (fromCity + '➔' + toCity).trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.round((35 + (Math.abs(hash) % 130)) / 5) * 5;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  isOpen,
  currentFrom,
  currentTo,
  currentMins,
  onClose,
  onPunchTicket,
}) => {
  const [fromCity, setFromCity] = useState(currentFrom || 'पटना (Patna)');
  const [toCity, setToCity] = useState(currentTo || 'बेगूसराय (Begusarai)');
  const [selectedMins, setSelectedMins] = useState(currentMins);

  if (!isOpen) return null;

  const fare = calculateFare(fromCity, toCity);

  const handlePresetSelect = (preset: RouteOption) => {
    playTicketSelectionSound();
    setFromCity(preset.from);
    setToCity(preset.to);
  };

  const handleTimerSelect = (mins: number) => {
    playTicketSelectionSound();
    setSelectedMins(mins);
  };

  const handlePunch = () => {
    playTicketPrintAndCutSound();
    onPunchTicket(fromCity, toCity, selectedMins);
  };

  return (
    <div
      id="ticketModalOverlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#FFFBEB] text-zinc-900 rounded-xl shadow-2xl p-4 sm:p-5 border-2 border-amber-800 font-ticket max-h-[94vh] overflow-y-auto custom-scroll my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-3 text-zinc-600 hover:text-zinc-950 text-xl font-bold p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ticket Header */}
        <div className="text-center pb-2 border-b-2 border-zinc-900">
          <div className="text-[10px] font-bold tracking-widest text-red-700 uppercase">
            ★ STATE ROADWAYS • SAFARNAMA EXPRESS ★
          </div>
          <h2 className="font-vintage text-3xl font-black text-zinc-950 mt-0.5">
            सफ़रनामा टिकट
          </h2>
          <div className="text-[10px] text-zinc-600 uppercase font-ticket">
            Window Khidki Seat • Highway Sleeper
          </div>
        </div>

        {/* Live Route Summary */}
        <div className="py-3 space-y-2 text-xs border-b-2 border-zinc-900 font-ticket">
          <div className="flex justify-between items-center">
            <span className="text-zinc-600">TICKET NO:</span>
            <span className="font-bold text-red-700 tracking-wider">
              BW-786042
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-600">ROUTE:</span>
            <span className="font-bold text-zinc-900 font-desi text-sm">
              {fromCity} ➔ {toCity}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-600">SEAT:</span>
            <span className="font-bold text-zinc-900 bg-amber-300/60 px-1 rounded">
              14-W (खिड़की सीट)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-600">JOURNEY:</span>
            <span className="font-bold text-emerald-800 font-desi">
              {selectedMins === 0 ? '∞ नॉन-स्टॉप (Non-Stop)' : `${selectedMins} मिनट (Timer)`}
            </span>
          </div>
        </div>

        <div className="my-3 ticket-dashed-cut"></div>

        {/* Destination & City Selector */}
        <div className="mb-3.5 bg-amber-50/90 p-3 rounded-lg border border-amber-300 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-zinc-900 font-desi">
              📍 कहाँ से कहाँ तक का टिकट?
            </label>
            <span className="text-[11px] font-ticket font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300">
              किराया: ₹{fare}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-2.5">
            <div>
              <label className="block text-[9px] text-zinc-600 font-ticket font-bold uppercase mb-0.5">
                कहाँ से (FROM):
              </label>
              <input
                type="text"
                list="fromCitiesList"
                value={fromCity}
                onChange={(e) => setFromCity(e.target.value)}
                className="w-full bg-white border border-zinc-400 text-zinc-900 text-xs font-desi rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <datalist id="fromCitiesList">
                <option value="पटना (Patna)" />
                <option value="दिल्ली (Delhi)" />
                <option value="मुंबई (Mumbai)" />
                <option value="जयपुर (Jaipur)" />
                <option value="दरभंगा (Darbhanga)" />
                <option value="समस्तीपुर (Samastipur)" />
              </datalist>
            </div>
            <div>
              <label className="block text-[9px] text-zinc-600 font-ticket font-bold uppercase mb-0.5">
                कहाँ तक (TO):
              </label>
              <input
                type="text"
                list="toCitiesList"
                value={toCity}
                onChange={(e) => setToCity(e.target.value)}
                className="w-full bg-white border border-zinc-400 text-zinc-900 text-xs font-desi rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <datalist id="toCitiesList">
                <option value="बेगूसराय (Begusarai)" />
                <option value="मनाली (Manali)" />
                <option value="गोवा (Goa)" />
                <option value="मुजफ्फरपुर (Muzaffarpur)" />
                <option value="भागलपुर (Bhagalpur)" />
                <option value="गया (Gaya)" />
                <option value="जोधपुर (Jodhpur)" />
              </datalist>
            </div>
          </div>

          {/* Popular Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-desi custom-scroll">
            <span className="text-zinc-500 font-bold whitespace-nowrap">पॉपुलर:</span>
            {PRESET_ROUTES.map((route, i) => {
              const norm = (s: string) => s.toLowerCase().trim();
              const fIn = norm(fromCity);
              const tIn = norm(toCity);
              const rF = norm(route.from);
              const rT = norm(route.to);
              const shortF = norm(route.from.split(' ')[0]);
              const shortT = norm(route.to.split(' ')[0]);
              const isSelected =
                (fIn === rF && tIn === rT) ||
                ((fIn === shortF || fIn.startsWith(shortF)) && (tIn === shortT || tIn.startsWith(shortT)));

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePresetSelect(route)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded transition cursor-pointer font-desi ${
                    isSelected
                      ? 'border-2 border-red-700 bg-red-100 text-red-900 font-bold shadow-sm'
                      : 'border border-zinc-300 bg-white text-zinc-800 hover:bg-amber-100'
                  }`}
                >
                  {route.from.split(' ')[0]} ➔ {route.to.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sleep Timer Options */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold text-zinc-800 font-desi mb-1.5">
            सफ़र की अवधि (SLEEP TIMER):
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-ticket">
            {[15, 30, 60, 0].map((mins) => {
              const isSelected = selectedMins === mins;
              const label = mins === 0 ? '∞ Non-stop' : mins === 60 ? '1 Hour' : `${mins} Min`;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleTimerSelect(mins)}
                  className={`py-1.5 px-1 rounded transition cursor-pointer ${
                    isSelected
                      ? 'border-2 border-red-700 bg-red-100 text-red-900 font-bold shadow-sm'
                      : 'border border-zinc-400 bg-zinc-100 text-zinc-800 hover:bg-amber-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer with Conductor Stamp and Cut Action */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-[9px] uppercase text-zinc-500 font-ticket">
              CONDUCTOR STAMP
            </div>
            <div className="text-sm font-vintage text-blue-900 font-bold italic rotate-[-3deg]">
              रामलाल कंडक्टर ✓
            </div>
          </div>
          <button
            onClick={handlePunch}
            className="px-4 py-2 bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-amber-100 rounded-md font-desi text-xs tracking-wider uppercase shadow-md active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>नया टिकट काटो</span>
          </button>
        </div>
      </div>
    </div>
  );
};
