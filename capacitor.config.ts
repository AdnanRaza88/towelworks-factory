import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.towelworks.factory",
  appName: "TowelWorks",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
