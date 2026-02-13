import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DeviceContextType {
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string>(() => {
    // Load from localStorage on init
    return localStorage.getItem('selectedDeviceId') || '';
  });

  const setSelectedDeviceId = (deviceId: string) => {
    setSelectedDeviceIdState(deviceId);
    localStorage.setItem('selectedDeviceId', deviceId);
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


