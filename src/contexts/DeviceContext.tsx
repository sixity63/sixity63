import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface DeviceContextType {
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>('');

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`selectedDeviceId_${user.id}`);
      if (saved) setSelectedDeviceIdState(saved);
      else setSelectedDeviceIdState('');
    } else {
      setSelectedDeviceIdState('');
    }
  }, [user]);

  const setSelectedDeviceId = (deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    if (user?.id) {
      localStorage.setItem(`selectedDeviceId_${user.id}`, deviceId);
    }
  };

  return (
    <DeviceContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}


