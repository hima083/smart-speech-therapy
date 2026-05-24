import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [patientInfo, setPatientInfo] = useState({
    name: '', age: '', sessionType: '', therapist: '',
  });

  return (
    <AppContext.Provider value={{ analysisResult, setAnalysisResult, patientInfo, setPatientInfo }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
