interface ElectronDesktopSettings {
  nativeNotificationsEnabled: boolean;
  notificationsSupported: boolean;
}

interface Window {
  electronAPI?: {
    readonly isDesktop: true;
    readonly platform: string;
    getDesktopSettings: () => Promise<ElectronDesktopSettings>;
    setNativeNotificationsEnabled: (enabled: boolean) => Promise<ElectronDesktopSettings>;
    notifyStepCompleted: () => void;
  };
}
