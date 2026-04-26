import { createContext, useContext, useState, ReactNode } from "react";

interface EmergencyModeContextType {
  isEmergency: boolean;
  toggleMode: () => void;
  setEmergency: (val: boolean) => void;
}

const EmergencyModeContext = createContext<EmergencyModeContextType>({
  isEmergency: false,
  toggleMode: () => {},
  setEmergency: () => {},
});

export function EmergencyModeProvider({ children }: { children: ReactNode }) {
  const [isEmergency, setIsEmergency] = useState(false);

  const toggleMode = () => setIsEmergency(prev => !prev);

  return (
    <EmergencyModeContext.Provider value={{ isEmergency, toggleMode, setEmergency: setIsEmergency }}>
      {children}
    </EmergencyModeContext.Provider>
  );
}

export function useEmergencyMode() {
  return useContext(EmergencyModeContext);
}