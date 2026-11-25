// Unknown links show a friendly "page not found" screen. The web preview's own
// entry file (/index.html, /app.html) still opens the app at the splash screen.
import React from 'react';
import { Redirect, usePathname } from 'expo-router';
import { NotFound } from '../components/NotFound';

export default function Unknown() {
  const path = usePathname();
  // The preview is served from a deeper path (…/app.html), so any .html entry opens the app.
  if (!path || path === '/' || /\.html?$/.test(path)) return <Redirect href="/" />;
  return <NotFound kind="page" />;
}
