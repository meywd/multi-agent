import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our cookie preferences
export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
}

// Default preferences (essential cookies are always enabled)
const defaultPreferences: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false
};

// Create context with an initial undefined value
interface CookieConsentContextType {
  preferences: CookiePreferences;
  updatePreferences: (newPreferences: CookiePreferences) => void;
  hasConsented: boolean;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

// Create a provider component
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
  const [hasConsented, setHasConsented] = useState<boolean>(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const storedConsent = localStorage.getItem('cookieConsent');
    
    if (storedConsent) {
      try {
        const parsedPreferences = JSON.parse(storedConsent);
        setPreferences({ 
          ...defaultPreferences, 
          ...parsedPreferences 
        });
        setHasConsented(true);
      } catch (error) {
        console.error('Error parsing stored cookie consent:', error);
        // Reset to default preferences if parsing fails
        localStorage.removeItem('cookieConsent');
        setHasConsented(false);
      }
    } else {
      setHasConsented(false);
    }
  }, []);

  // Update preferences and save to localStorage
  const updatePreferences = (newPreferences: CookiePreferences) => {
    // Ensure essential cookies are always true
    const updatedPreferences = {
      ...newPreferences,
      essential: true // Essential cookies can't be disabled
    };
    
    setPreferences(updatedPreferences);
    localStorage.setItem('cookieConsent', JSON.stringify(updatedPreferences));
    setHasConsented(true);
  };

  // Reset consent
  const resetConsent = () => {
    localStorage.removeItem('cookieConsent');
    setPreferences(defaultPreferences);
    setHasConsented(false);
  };

  // Provide context value
  const contextValue: CookieConsentContextType = {
    preferences,
    updatePreferences,
    hasConsented,
    resetConsent
  };

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
    </CookieConsentContext.Provider>
  );
}

// Custom hook to use the cookie consent context
export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

// Utility functions
export function hasFunctionalConsent() {
  const storedConsent = localStorage.getItem('cookieConsent');
  if (!storedConsent) return false;
  
  try {
    const preferences = JSON.parse(storedConsent);
    return preferences.functional === true;
  } catch {
    return false;
  }
}

export function hasAnalyticsConsent() {
  const storedConsent = localStorage.getItem('cookieConsent');
  if (!storedConsent) return false;
  
  try {
    const preferences = JSON.parse(storedConsent);
    return preferences.analytics === true;
  } catch {
    return false;
  }
}