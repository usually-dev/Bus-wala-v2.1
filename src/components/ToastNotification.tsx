import React from 'react';

interface ToastNotificationProps {
  message: string | null;
  icon?: string;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  icon = '✨',
}) => {
  if (!message) return null;

  return (
    <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none transition-all duration-300">
      <div className="bg-black/90 text-amber-200 text-xs px-4 py-2 rounded-full border border-amber-400/40 shadow-2xl backdrop-blur-md flex items-center gap-2 font-ticket animate-bounce">
        <span>{icon}</span>
        <span>{message}</span>
      </div>
    </div>
  );
};
