@echo off
echo 🧹 Cleaning React Native build cache...

REM Clean React Native cache
npx react-native start --reset-cache
timeout /t 5 /nobreak >nul
taskkill /f /im node.exe 2>nul

REM Clean Android build
cd android
call gradlew clean
cd ..

REM Clean node modules and reinstall
rmdir /s /q node_modules
npm install

echo ✅ Build cache cleaned successfully!
echo 🚀 You can now run: npm run android
pause
