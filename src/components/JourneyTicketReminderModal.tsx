import React from 'react';
import { Ticket, ArrowRight, X } from 'lucide-react';

interface JourneyTicketReminderModalProps {
  isOpen: boolean;
  songsCount: number;
  onOpenTicketCounter: () => void;
  onDismiss: () => void;
}

export const JourneyTicketReminderModal: React.FC<JourneyTicketReminderModalProps> = ({
  isOpen,
  songsCount,
  onOpenTicketCounter,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="journeyTicketReminderOverlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-xs sm:max-w-sm bg-[#FFFBEB] text-zinc-900 rounded-xl shadow-2xl p-4 sm:p-5 border-2 border-amber-800 font-ticket text-center max-h-[95vh] overflow-y-auto custom-scroll my-auto">
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-zinc-900 p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-4xl mb-2 animate-bounce">🎫</div>
        <div className="text-[10px] font-bold tracking-widest text-red-700 uppercase">
          सफ़रनामा एक्सप्रेस • टिकट चेकिंग
        </div>
        <h3 className="font-vintage text-2xl font-black mt-1 text-zinc-950">
          कंडक्टर आ गया!
        </h3>
        <p className="text-xs text-zinc-700 mt-2 font-desi leading-relaxed">
          आपने <span className="font-bold text-red-700 font-ticket">{songsCount}</span> गाने सुन लिए हैं! अब खिड़की सीट का पक्का टिकट कटाएँ, इसे सेव करें और नॉन-स्टॉप सफ़र जारी रखें।
        </p>

        <div className="mt-4 space-y-2">
          <button
            onClick={onOpenTicketCounter}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-amber-100 font-desi text-sm font-bold shadow-lg active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Ticket className="w-4 h-4" />
            <span>नया टिकट कटाएँ (Cut Ticket)</span>
          </button>

          <button
            onClick={onDismiss}
            className="w-full py-2 rounded-xl bg-transparent hover:bg-zinc-200/70 text-zinc-600 text-xs font-desi transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>सफ़र जारी रखें</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
