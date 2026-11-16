import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-2.5 rounded-2xl bg-[#1e2030]/95 border border-white/15 text-xs font-medium text-white shadow-2xl backdrop-blur-md flex items-center gap-2">
        <span>{message}</span>
      </div>
    </div>
  );
};
