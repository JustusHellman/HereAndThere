
import React, { useState, useEffect } from 'react';
import { strings } from '../i18n';

interface JoinGameProps {
  onBack: () => void;
  onJoin: (code: string, name: string, color: string) => void;
  onCodeChange?: (code: string) => void;
  isSearching: boolean;
  isRejoining?: boolean;
  error: string | null;
  prefilledCode?: string;
}

const availableColors = [
  '#6366f1', // Indigo
  '#0d9488', // Teal
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#d946ef', // Fuchsia
  '#111827', // Black
  '#f97316', // Orange
  '#ec4899', // Pink
  '#65a30d', // Lime
  '#dcfea9', // Off-White
];

const customPalette = [
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b', '#000000'
];

const JoinGame: React.FC<JoinGameProps> = ({ onBack, onJoin, onCodeChange, isSearching, isRejoining, error, prefilledCode }) => {
  const [code, setCode] = useState(prefilledCode || '');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(availableColors[0]);
  const [customColor, setCustomColor] = useState('#ffffff');
  const [isCustomColor, setIsCustomColor] = useState(false);

  useEffect(() => {
    if (prefilledCode) {
      setCode(prefilledCode);
    }
  }, [prefilledCode]);

  useEffect(() => {
    if (onCodeChange) {
      const trimmed = code.trim().toUpperCase();
      if (trimmed.length >= 4) {
        onCodeChange(trimmed);
      }
    }
  }, [code, onCodeChange]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f9fbfa] relative">
      {isRejoining && (
        <div className="fixed inset-0 z-[50] bg-[#f9fbfa]/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-6 animate-bounce">
             <div className="w-6 h-6 border-4 border-[#2d4239] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#2d4239]/40 font-black uppercase tracking-[0.4em] text-[10px]">Reconnecting to Expedition...</p>
        </div>
      )}

      <div className="max-w-md w-full">
        <button onClick={onBack} className="mb-8 text-[#0f1a16]/40 hover:text-[#0f1a16] flex items-center font-bold text-xs uppercase tracking-widest transition-all">
           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
           {strings.join.back}
        </button>
        <div className="bg-white rounded-[3rem] p-12 border border-black/5 shadow-[0_40px_80px_-15px_rgba(15,26,22,0.1)]">
          <h2 className="text-3xl font-black text-[#0f1a16] mb-10 text-center tracking-tight uppercase">{strings.join.title}</h2>
          <div className="space-y-6">
            <div className="relative">
              <input 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={strings.join.gameCode} 
                className="w-full px-8 py-5 bg-[#f9fbfa] border-0 rounded-2xl outline-none focus:ring-2 focus:ring-[#0f1a16]/5 uppercase font-bold text-center tracking-[0.3em] text-xl text-[#0f1a16] placeholder:opacity-20 transition-all" 
              />
              {isSearching && (
                <div className="absolute top-1/2 -translate-y-1/2 right-6">
                  <div className="w-2 h-2 rounded-full bg-[#8c6b4f] animate-ping"></div>
                </div>
              )}
            </div>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={strings.join.yourName} 
              className="w-full px-8 py-5 bg-[#f9fbfa] border-0 rounded-2xl outline-none focus:ring-2 focus:ring-[#0f1a16]/5 text-[#0f1a16] font-bold placeholder:opacity-20 transition-all" 
            />
            
            {error && (
              <p className="text-[#7c2d12] text-[10px] font-black uppercase text-center tracking-widest animate-in fade-in zoom-in duration-300">
                {error}
              </p>
            )}

            <div className="space-y-6 pt-2">
              <label className="text-[10px] font-bold text-[#0f1a16]/30 uppercase tracking-[0.4em] ml-2">{strings.lobby.chooseColor}</label>
              
              <div className="grid grid-cols-6 gap-3 justify-items-center">
                {availableColors.map(color => (
                  <button 
                    key={color} 
                    onClick={() => {
                      setSelectedColor(color);
                      setIsCustomColor(false);
                    }} 
                    className={`w-8 h-8 rounded-full transition-all active:scale-90 ${!isCustomColor && selectedColor === color ? 'ring-4 ring-black/10 scale-110 shadow-lg border-2 border-white' : 'opacity-40 hover:opacity-100'}`} 
                    style={{ backgroundColor: color }} 
                  />
                ))}
                
                {/* Custom Color Slot */}
                <div className="relative">
                  <button 
                    onClick={() => setIsCustomColor(true)}
                    className={`w-8 h-8 rounded-full transition-all active:scale-90 flex items-center justify-center overflow-hidden border-2 ${isCustomColor ? 'ring-4 ring-black/10 scale-110 shadow-lg border-white' : 'opacity-40 hover:opacity-100 border-dashed border-[#0f1a16]/20'}`}
                    style={{ 
                      backgroundColor: isCustomColor ? customColor : 'transparent',
                    }}
                  >
                    {!isCustomColor && (
                      <svg className="w-4 h-4 text-[#0f1a16]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12M6 12h12" />
                      </svg>
                    )}
                    {isCustomColor && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Color Board */}
              {isCustomColor && (
                <div className="bg-[#f9fbfa] rounded-2xl p-4 border border-black/5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8px] font-black text-[#0f1a16]/30 uppercase tracking-widest">Color Board</span>
                    <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-black/10">
                      <input 
                        type="color" 
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {customPalette.map(c => (
                      <button 
                        key={c}
                        onClick={() => setCustomColor(c)}
                        className={`w-full aspect-square rounded-md transition-all ${customColor === c ? 'ring-2 ring-[#0f1a16] scale-110 z-10' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => onJoin(code, name, isCustomColor ? customColor : selectedColor)} 
              disabled={!name.trim() || !code.trim()}
              className={`w-full py-5 btn-sleek text-base mt-6 transition-all ${(!name.trim() || !code.trim()) ? 'bg-[#f9fbfa] text-[#0f1a16]/10 shadow-none cursor-not-allowed' : 'btn-sleek-pine'}`}
            >
              {strings.join.joinLobby}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;
