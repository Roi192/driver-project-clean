//import type { CapacitorConfig } from '@capacitor/cli';

//const config: CapacitorConfig = {
  //appId: 'com.driver.shift',
  //appName: 'Driver Shift',
  //webDir: 'dist'
//};

//export default config;
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.driver.shift',
  appName:  'Driver Shift',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  plugins: {
    Geolocation: {
      // iOS specific configuration
      permissions: {
        location: "always"
      }
    }
  }
};

export default config;
