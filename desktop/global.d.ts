export {};

declare global {
  interface Window {
    openwaveDesktop?: {
      isDesktop: true;
      platform: string;
      openProject: () => Promise<{ filePath: string; contents: string } | null>;
      saveProject: (payload: {
        suggestedName: string;
        contents: string;
        filePath?: string;
        saveAs?: boolean;
      }) => Promise<{ filePath: string } | null>;
      autosaveProject: (contents: string) => Promise<boolean>;
      getRecovery: () => Promise<string | null>;
      clearRecovery: () => Promise<boolean>;
      getRecentProjects: () => Promise<string[]>;
      onMenuAction: (
        callback: (action: 'open' | 'save' | 'save-as') => void,
      ) => () => void;
    };
  }
}
