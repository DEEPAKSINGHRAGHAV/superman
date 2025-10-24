# Environment Configuration Guide

## Overview

ShivikMart Mobile now supports separate development and production configurations with different API URLs.

---

## Configuration Files

### 1. **Environment Config** (`src/config/environment.ts`)
Main configuration file that automatically selects the correct environment based on `__DEV__` flag.

### 2. **Environment Files**
- `.env.development` - Development settings
- `.env.production` - Production settings

---

## API URLs

| Environment | URL | Usage |
|-------------|-----|-------|
| **Development** | `http://localhost:8000/api/v1` | Local testing with USB or WiFi |
| **Production** | `https://api.shivikmart.com/api/v1` | Live production server |

---

## Running the App

### Development Mode

**Android:**
```bash
npm run android:dev
# or
npm run android
```

**iOS:**
```bash
npm run ios:dev
# or
npm run ios
```

**Start Metro Bundler:**
```bash
npm start
# or
npm run start:dev
```

### Production Mode

**Android:**
```bash
npm run android:prod
```

**iOS:**
```bash
npm run ios:prod
```

**Start Metro Bundler (with cache reset):**
```bash
npm run start:prod
```

---

## Building Release APKs/Bundles

### Android Release APK
```bash
npm run build:android:release
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Android App Bundle (for Play Store)
```bash
npm run build:android:bundle
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS Release Build
```bash
npm run build:ios:release
```

---

## WiFi Development Setup

If using WiFi instead of USB cable:

1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Update `.env.development`:
   ```
   API_BASE_URL=http://192.168.1.100:8000/api/v1
   ```
   (Replace `192.168.1.100` with your actual IP)

3. OR update `src/config/environment.ts` directly:
   ```typescript
   const developmentConfig: EnvironmentConfig = {
       apiBaseUrl: 'http://192.168.1.100:8000/api/v1',
       // ...
   };
   ```

4. Restart the app

---

## Environment Detection

The app automatically detects the environment using React Native's `__DEV__` flag:

- **Debug builds** → Development config (localhost)
- **Release builds** → Production config (api.shivikmart.com)

---

## Environment Features

### Development Mode (`__DEV__ = true`)
- ✅ API: `http://localhost:8000/api/v1`
- ✅ Console logging enabled
- ✅ Debug mode enabled
- ✅ Detailed error messages
- ✅ Network request logging

### Production Mode (`__DEV__ = false`)
- ✅ API: `https://api.shivikmart.com/api/v1`
- ✅ Console logging disabled
- ✅ Debug mode disabled
- ✅ Optimized performance
- ✅ Minimal error details

---

## Using Environment Config in Code

### Import Configuration
```typescript
import config, { 
    apiBaseUrl, 
    environment, 
    isProduction, 
    isDev,
    envLog,
    envDebug,
    envError 
} from './config/environment';
```

### Examples

**Check Environment:**
```typescript
if (isDev()) {
    // Development-only code
}

if (isProduction()) {
    // Production-only code
}
```

**Logging:**
```typescript
// Only logs in development
envLog('User logged in:', userData);
envDebug('API Response:', response);

// Always logs (errors)
envError('Failed to fetch products:', error);
```

**Get API URL:**
```typescript
console.log('Current API:', apiBaseUrl);
// Dev: http://localhost:8000/api/v1
// Prod: https://api.shivikmart.com/api/v1
```

---

## Testing Different Environments

### Test Development Setup
1. Run `npm run android:dev`
2. Check app console for:
   ```
   Environment: DEVELOPMENT
   API Base URL: http://localhost:8000/api/v1
   ```
3. Login and verify connection to local backend

### Test Production Setup
1. Build release: `npm run build:android:release`
2. Install APK on device
3. Check app console for:
   ```
   Environment: PRODUCTION
   API Base URL: https://api.shivikmart.com/api/v1
   ```
4. Login and verify connection to production server

---

## Troubleshooting

### Issue: "Cannot connect to server"

**Development:**
- ✅ Backend server running on port 8000?
- ✅ Using USB? Run `adb reverse tcp:8000 tcp:8000`
- ✅ Using WiFi? Check computer IP in config

**Production:**
- ✅ Production server accessible?
- ✅ Check `https://api.shivikmart.com/api/v1/health`
- ✅ SSL certificate valid?

### Issue: Wrong environment detected

Check build mode:
- Debug builds = Development
- Release builds = Production

To force environment:
```typescript
// In src/config/environment.ts
const isDevelopment = true; // Force dev mode
```

### Issue: Old config cached

Clear cache and rebuild:
```bash
npm run start:prod
# or
npx react-native start --reset-cache
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `apiBaseUrl` to `https://api.shivikmart.com/api/v1`
- [ ] Disable console logging (`enableLogging: false`)
- [ ] Disable debug mode (`enableDebug: false`)
- [ ] Build release APK/AAB
- [ ] Test on physical device
- [ ] Verify API connectivity
- [ ] Check SSL certificate
- [ ] Test all features
- [ ] Monitor error logs

---

## Environment Variables Summary

| Variable | Development | Production |
|----------|-------------|------------|
| `apiBaseUrl` | `http://localhost:8000/api/v1` | `https://api.shivikmart.com/api/v1` |
| `environment` | `'development'` | `'production'` |
| `enableLogging` | `true` | `false` |
| `enableDebug` | `true` | `false` |

---

## Advanced Configuration

### Add New Environment Variables

1. Update `EnvironmentConfig` interface:
```typescript
interface EnvironmentConfig {
    apiBaseUrl: string;
    environment: Environment;
    enableLogging: boolean;
    enableDebug: boolean;
    newVariable: string; // Add here
}
```

2. Add to configs:
```typescript
const developmentConfig: EnvironmentConfig = {
    // ...
    newVariable: 'dev-value',
};

const productionConfig: EnvironmentConfig = {
    // ...
    newVariable: 'prod-value',
};
```

3. Export:
```typescript
export const { newVariable } = config;
```

### Add Staging Environment

Create `stagingConfig`:
```typescript
const stagingConfig: EnvironmentConfig = {
    apiBaseUrl: 'https://staging.api.shivikmart.com/api/v1',
    environment: 'production',
    enableLogging: true,
    enableDebug: true,
};
```

---

## Support

For issues or questions:
1. Check this guide
2. Review `src/config/environment.ts`
3. Check console logs for environment info
4. Verify network connectivity

---

**Last Updated:** 2025-10-10  
**Version:** 1.0  
**Status:** ✅ Production Ready

