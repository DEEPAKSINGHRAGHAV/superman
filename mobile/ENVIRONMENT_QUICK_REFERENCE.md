# Environment Configuration - Quick Reference

## 🚀 Quick Setup

### Development (Default)
```bash
npm run android       # or npm run android:dev
npm run ios           # or npm run ios:dev
```
**API:** `http://localhost:8000/api/v1`

### Production
```bash
npm run android:prod
npm run ios:prod
```
**API:** `https://api.shivikmart.com/api/v1`

---

## 📦 Build Commands

```bash
# Development
npm run android:dev               # Run Android in debug mode
npm run ios:dev                   # Run iOS in debug mode

# Production  
npm run android:prod              # Run Android in release mode
npm run ios:prod                  # Run iOS in release mode

# Build Release APK
npm run build:android:release     # APK for distribution

# Build App Bundle (Play Store)
npm run build:android:bundle      # AAB for Google Play

# iOS Release
npm run build:ios:release         # iOS release build
```

---

## 🌐 API URLs

| Mode | URL |
|------|-----|
| **Dev** | `http://localhost:8000/api/v1` |
| **Prod** | `https://api.shivikmart.com/api/v1` |

---

## 🔧 WiFi Development

If not using USB cable:

1. Get your computer's IP
2. Edit `mobile/src/config/environment.ts`:

```typescript
const developmentConfig: EnvironmentConfig = {
    apiBaseUrl: 'http://YOUR_IP:8000/api/v1', // e.g., 192.168.1.100
    // ...
};
```

3. Restart app

---

## 💻 Environment Detection

- **Debug builds** → Development (localhost)
- **Release builds** → Production (api.shivikmart.com)

Automatically handled by `__DEV__` flag.

---

## 📝 Using in Code

```typescript
import { 
    apiBaseUrl,      // Current API URL
    isProduction,    // Check if production
    isDev,          // Check if development
    envLog,         // Logs only in dev
    envError        // Always logs errors
} from './config/environment';

// Check environment
if (isDev()) {
    envLog('Development mode active');
}

// Log conditionally
envLog('This only shows in development');
envError('This always shows', error);
```

---

## ✅ Quick Test

### Test Development
1. Run: `npm run android:dev`
2. Look for console output:
   ```
   Environment: DEVELOPMENT
   API Base URL: http://localhost:8000/api/v1
   ```

### Test Production
1. Build: `npm run build:android:release`
2. Install APK
3. Look for console output:
   ```
   Environment: PRODUCTION
   API Base URL: https://api.shivikmart.com/api/v1
   ```

---

## 🐛 Troubleshooting

**Can't connect in dev:**
- Backend running? `npm start` in backend folder
- USB? Run: `adb reverse tcp:8000 tcp:8000`
- WiFi? Update IP in config

**Wrong environment:**
- Debug build = Dev mode
- Release build = Prod mode
- Clear cache: `npm run start:prod`

---

## 📂 Files Created

```
mobile/
├── src/
│   └── config/
│       └── environment.ts          ← Main config file
├── ENVIRONMENT_SETUP.md            ← Detailed guide
└── ENVIRONMENT_QUICK_REFERENCE.md  ← This file
```

---

## 🎯 Key Points

✅ **Automatic switching** - Debug = Dev, Release = Prod  
✅ **No code changes** - Environment auto-detected  
✅ **WiFi friendly** - Easy IP configuration  
✅ **Console control** - Logging only in dev  
✅ **Production ready** - Secure prod config  

---

For detailed information, see `ENVIRONMENT_SETUP.md`

