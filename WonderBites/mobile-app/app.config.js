// Adds the Google Maps keys for the search map at build time (keeps them out of app.json).
//   GOOGLE_MAPS_ANDROID_KEY  needed for Android builds (Expo Go works without it)
//   GOOGLE_MAPS_IOS_KEY      optional: iPhone then uses the brand-styled Google map too;
//                            without it the iPhone shows Apple Maps
module.exports = ({ config }) => {
  const android = process.env.GOOGLE_MAPS_ANDROID_KEY;
  const ios = process.env.GOOGLE_MAPS_IOS_KEY;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', { ...(android ? { androidGoogleMapsApiKey: android } : {}), ...(ios ? { iosGoogleMapsApiKey: ios } : {}) }],
    ],
    extra: { ...(config.extra ?? {}), googleMapsIos: !!ios },
  };
};
