Live-mode safety test (simulated server, no real accounts or payments).

    npx -y esbuild@0.24.0 tests/live/test.ts --bundle --platform=node --format=cjs --outfile=/tmp/live.js \
      --define:process.env.EXPO_PUBLIC_API_URL='"http://api.test"' --define:process.env.EXPO_PUBLIC_PAYMENT_PROVIDER='"server"' \
      --alias:react-native=./tests/live/stubs/rn.js --alias:@react-native-async-storage/async-storage=./tests/live/stubs/as.js \
      --alias:expo-secure-store=./tests/live/stubs/ss.js --alias:expo-localization=./tests/live/stubs/loc.js && node /tmp/live.js
