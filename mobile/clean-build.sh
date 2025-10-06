#!/bin/bash

echo "🧹 Cleaning React Native build cache..."

# Clean React Native cache
npx react-native start --reset-cache &
sleep 5
kill %1

# Clean Android build
cd android
./gradlew clean
cd ..

# Clean iOS build (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    cd ios
    rm -rf build/
    rm -rf Pods/
    rm -rf Podfile.lock
    pod install
    cd ..
fi

# Clean node modules and reinstall
rm -rf node_modules/
npm install

echo "✅ Build cache cleaned successfully!"
echo "🚀 You can now run: npm run android"
