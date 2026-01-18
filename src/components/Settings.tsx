import { useState } from "react";
import { useVolume } from "../context/VolumeContext"; // Importujemy globalny stan dźwięku

export default function Settings() {
  // Stan lokalny tylko dla otwierania menu i efektu najechania
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Wyciągamy globalne wartości głośności z Contextu
  const { volume, setVolume, isMuted, setIsMuted } = useVolume();

  return (
    <div style={{ position: 'fixed', top: '25px', left: '25px', zIndex: 9999 }}>
      
      {/* PRZYCISK ZĘBATKI */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: isHovered || isOpen ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '14px',
          width: '48px',
          height: '48px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
          transform: isOpen || isHovered ? 'rotate(90deg)' : 'rotate(0deg)',
        }}
        title="Ustawienia"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {/* OKNO USTAWIEŃ */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '0',
          background: 'rgba(10, 10, 10, 0.9)', 
          backdropFilter: 'blur(15px)',
          padding: '20px',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          width: '240px',
          color: 'white',
          boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Ustawienia Gry</h3>
          
          {/* SUWAK GŁOŚNOŚCI */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8rem', opacity: 0.8 }}>
              <span style={{display:'flex', alignItems:'center', gap:'5px'}}>🔊 Głośność</span>
              {/* Wyświetlamy 0 jeśli wyciszone, w innym wypadku wartość z contextu */}
              <span style={{fontWeight:'bold'}}>{isMuted ? 0 : volume}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={isMuted ? 0 : volume} 
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false); // Automatycznie odwycisz przy zmianie suwaka
              }}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#4ade80' }}
            />
          </div>

          {/* PRZYCISK WYCISZENIA */}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: isMuted ? '#e74c3c' : 'rgba(255,255,255,0.08)',
              color: 'white',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: '0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {isMuted ? <span>🔇 ODWYCISZ</span> : <span>🔊 WYCISZ CAŁKOWICIE</span>}
          </button>
        </div>
      )}
    </div>
  );
}