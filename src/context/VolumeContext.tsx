import { createContext, useContext, useState } from "react";

interface VolumeContextType {
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (mute: boolean) => void;
}

const VolumeContext = createContext<VolumeContextType | undefined>(undefined);

export function VolumeProvider({ children }: { children: React.ReactNode }) {
  // 1. Wczytujemy głośność z pamięci (domyślnie 50)
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("appVolume");
    return saved ? parseInt(saved, 10) : 50;
  });

  // 2. Wczytujemy stan wyciszenia (domyślnie false)
  const [isMuted, setIsMutedState] = useState(() => {
    const saved = localStorage.getItem("appMuted");
    return saved === "true";
  });

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem("appVolume", v.toString());
  };

  const setIsMuted = (mute: boolean) => {
    setIsMutedState(mute);
    localStorage.setItem("appMuted", mute.toString());
  };

  return (
    <VolumeContext.Provider value={{ volume, setVolume, isMuted, setIsMuted }}>
      {children}
    </VolumeContext.Provider>
  );
}

export const useVolume = () => {
  const context = useContext(VolumeContext);
  if (!context) {
    throw new Error("useVolume must be used within a VolumeProvider");
  }
  return context;
};