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
      }) => Promise<{ filePath: string } | null>;
    };
  }
}
