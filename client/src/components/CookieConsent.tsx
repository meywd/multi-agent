import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X, Cookie, Shield, Settings } from 'lucide-react';
import { 
  useCookieConsent, 
  CookiePreferences 
} from '@/context/cookie-consent-context';

// Helper function to safely convert string to CookiePreferences key
function isCookiePreferenceKey(key: string): key is keyof CookiePreferences {
  return ['essential', 'functional', 'analytics'].includes(key);
}

// Cookie types with their descriptions
const cookieTypes = [
  {
    id: 'essential',
    name: 'Essential',
    description: 'Necessary for the website to function properly. Cannot be disabled.',
    required: true
  },
  {
    id: 'functional',
    name: 'Functional',
    description: 'Enables website functionality like saving preferences and improved user experience.',
    required: false
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Helps us understand how visitors interact with the website to improve its performance.',
    required: false
  }
];

export function CookieConsent() {
  // State for settings dialog
  const [showSettings, setShowSettings] = useState(false);
  // Get context values and functions
  const { preferences, updatePreferences, hasConsented } = useCookieConsent();
  
  // Temporary state for dialog preferences
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(preferences);

  // Accept all cookies
  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true
    };
    updatePreferences(allAccepted);
    setTempPreferences(allAccepted);
    setShowSettings(false);
  };

  // Accept only essential cookies
  const acceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false
    };
    updatePreferences(essentialOnly);
    setTempPreferences(essentialOnly);
    setShowSettings(false);
  };

  // Handle toggle change in the settings dialog
  const handleToggleChange = (id: keyof CookiePreferences, checked: boolean) => {
    setTempPreferences(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  // Save current preferences from the dialog
  const saveCurrentPreferences = () => {
    updatePreferences(tempPreferences);
    setShowSettings(false);
  };
  
  // Open settings and initialize temporary preferences
  const openSettings = () => {
    setTempPreferences(preferences);
    setShowSettings(true);
  };

  // If user has already given consent, show only the settings button
  if (hasConsented) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full shadow-md"
          onClick={openSettings}
        >
          <Cookie className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-background p-4 shadow-lg z-50 border-t">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cookie className="h-6 w-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Cookie Consent</h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies to improve your experience on our site. You can choose which cookies you want to accept.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 ml-0 sm:ml-4">
              <Button size="sm" variant="outline" onClick={openSettings}>
                Cookie Settings
              </Button>
              <Button size="sm" variant="secondary" onClick={acceptEssential}>
                Essential Only
              </Button>
              <Button size="sm" variant="default" onClick={acceptAll}>
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to accept. Essential cookies cannot be disabled as they are required for the website to function properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {cookieTypes.map((type) => (
              <div key={type.id} className="flex items-start justify-between space-x-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label htmlFor={type.id} className="font-medium">
                      {type.name} Cookies
                    </Label>
                    {type.required && (
                      <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </div>
                <Switch
                  id={type.id}
                  checked={isCookiePreferenceKey(type.id) ? tempPreferences[type.id] : false}
                  disabled={type.required}
                  onCheckedChange={(checked) => {
                    if (isCookiePreferenceKey(type.id)) {
                      handleToggleChange(type.id, checked);
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button variant="secondary" size="sm" onClick={acceptEssential}>
              Essential Only
            </Button>
            <Button variant="default" size="sm" onClick={acceptAll}>
              Accept All
            </Button>
            <Button size="sm" onClick={saveCurrentPreferences}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}