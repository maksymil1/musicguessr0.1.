import { createContext, useContext, useState, type ReactNode } from "react";

interface VolumeContextType {
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
}

const VolumeContext = createContext<VolumeContextType | undefined>(undefined);

export const VolumeProvider = ({ children }: { children: ReactNode }) => {
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <VolumeContext.Provider value={{ volume, setVolume, isMuted, setIsMuted }}>
      {children}
    </VolumeContext.Provider>
  );
};

export const useVolume = () => {
  const context = useContext(VolumeContext);
  if (!context) throw new Error("useVolume must be used within VolumeProvider");
  return context;
};