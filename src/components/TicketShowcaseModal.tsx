import React, { useState } from 'react';
import { TicketData } from '../types';
import { Bus, CheckCircle2, Save, X } from 'lucide-react';
import { playStampImpactSound } from '../utils/audio';

interface TicketShowcaseModalProps {
  isOpen: boolean;
  ticket: TicketData | null;
  onSaveTicket: () => void;
  onStartJourney: () => void;
  onClose: () => void;
}

export const TicketShowcaseModal: React.FC<TicketShowcaseModalProps> = ({
  isOpen,
  ticket,
  onSaveTicket,
  onStartJourney,
  onClose,
}) => {
  const [isStamping, setIsStamping] = useState(false);
  const [hasStamped, setHasStamped] = useState(false);

  if (!isOpen || !ticket) return null;

  const handleStartWithStamp = () => {
    if (isStamping) return;

    if (hasStamped) {
      onStartJourney();
      return;
    }

    setIsStamping(true);
    playStampImpactSound();

    setTimeout(() => {
      setHasStamped(true);
      setTimeout(() => {
        setIsStamping(false);
        onStartJourney();
      }, 350);
    }, 450);
  };

  return (
    <div
      id="punchedTicketShowcaseOverlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-xs sm:max-w-sm flex flex-col items-center max-h-[95vh] overflow-y-auto custom-scroll my-auto">
        {/* Printable Physical Ticket with optional paper impact bounce */}
        <div
          className={`ticket-reveal-anim w-full bg-[#fdf8e6] text-zinc-900 p-5 rounded-lg shadow-2xl border-4 border-amber-900/60 font-ticket relative overflow-hidden transition-transform ${
            isStamping ? 'ticket-impact-anim' : ''
          }`}
        >
          {/* Physical Conductor Hole Punch Notch on Ticket Left Edge */}
          {(isStamping || hasStamped) && (
            <div className="absolute -left-2.5 top-[52%] w-5 h-5 rounded-full bg-black/90 border-r-2 border-amber-900/40 z-20 shadow-inner" />
          )}

          <button
            onClick={onClose}
            className="absolute top-2 right-2.5 text-zinc-500 hover:text-zinc-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center pb-2.5 border-b-2 border-dashed border-zinc-800">
            <div className="text-[9px] font-bold text-red-700 tracking-wider">
              ★★★ STATE ROADWAYS SAFARNAMA EXPRESS ★★★
            </div>
            <h3 className="font-vintage text-3xl font-black text-zinc-950 my-0.5">
              सफ़रनामा टिकट
            </h3>
            <div className="text-[9px] text-zinc-500">
              NON-REFUNDABLE • HIGHWAY SLEEPER
            </div>
          </div>

          <div className="py-3 space-y-1.5 text-xs font-ticket">
            <div className="flex justify-between">
              <span className="text-zinc-500">TICKET SERIAL:</span>
              <span className="font-bold text-red-700 tracking-wide">
                {ticket.serial}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">SEAT:</span>
              <span className="font-bold text-zinc-900 bg-amber-200 px-1 rounded">
                {ticket.seat || '14-W (खिड़की सीट)'}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-1">
              <span className="text-zinc-500">FROM:</span>
              <span className="font-bold text-zinc-900 truncate max-w-[170px]">
                {ticket.from}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">TO:</span>
              <span className="font-bold text-zinc-900 truncate max-w-[170px]">
                {ticket.to}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-1">
              <span className="text-zinc-500">DURATION:</span>
              <span className="font-bold text-emerald-800 font-desi">
                {ticket.duration}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-300 pt-1">
              <span className="text-zinc-500 font-bold">FARE (किराया):</span>
              <span className="font-bold text-red-700 text-sm">
                ₹{ticket.fare}
              </span>
            </div>
          </div>

          <div className="my-2.5 ticket-dashed-cut"></div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-[8px] uppercase text-zinc-400">
                AUTHORIZED STAMP
              </div>
              <div className="font-vintage text-blue-900 font-bold text-xs italic rotate-[-4deg]">
                रामलाल कंडक्टर ✓
              </div>
            </div>

            {/* Dynamic Conductor Punched / Confirmed Rubber Stamp */}
            <div className="relative flex items-center justify-center">
              {isStamping && (
                <div className="absolute w-16 h-16 rounded-full border-2 border-red-600/70 ink-ring-burst pointer-events-none" />
              )}
              <div
                className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center p-1 select-none transition-all ${
                  isStamping
                    ? 'stamp-slam-anim border-red-700 bg-red-600/10 shadow-lg shadow-red-700/30'
                    : hasStamped
                    ? 'rotate-[-12deg] border-red-700 bg-red-600/10 shadow-inner'
                    : 'rotate-[-12deg] border-red-700/60 bg-red-600/5'
                }`}
              >
                <div className="text-[5.5px] font-extrabold text-red-700 tracking-wider leading-none">
                  ★ ROADWAYS ★
                </div>
                <div className="text-[9px] font-black text-red-800 uppercase tracking-tight leading-none my-0.5">
                  PUNCHED
                </div>
                <div className="text-[6px] font-bold text-red-700 uppercase leading-none">
                  CONFIRMED ✓
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onSaveTicket()}
            className="py-2.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-amber-100 text-[11px] font-desi tracking-wide rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>टिकट सेव करें</span>
          </button>
          <button
            onClick={handleStartWithStamp}
            disabled={isStamping}
            className="py-2.5 px-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-[11px] font-desi tracking-wide rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80"
          >
            {isStamping ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 animate-spin" />
                <span>पंच हो रहा है...</span>
              </>
            ) : (
              <>
                <Bus className="w-3.5 h-3.5" />
                <span>सफ़र शुरू करें</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
