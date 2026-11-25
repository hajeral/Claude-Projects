// Localize the labels baked into the illustrated map SVGs (they are drawn, not <Text>).
const AR_LABELS: [string, string][] = [
  ['THE PEARL', 'اللؤلؤة'], ['WEST BAY', 'الخليج الغربي'], ['AL SADD', 'السد'], ['MSHEIREB', 'مشيرب'],
  ['CORNICHE', 'الكورنيش'], ['Doha Bay', 'خليج الدوحة'],
];
export function localizeMapXml(xml: string, ar: boolean) {
  if (!ar) return xml;
  let out = xml;
  for (const [en, a] of AR_LABELS) out = out.split(`>${en}<`).join(`>${a}<`);
  return out
    .replace(/font-family="Figtree_600SemiBold"/g, 'font-family="IBMPlexSansArabic_600SemiBold"')
    .replace(/font-family="DMSerifDisplay_400Regular"/g, 'font-family="NotoNaskhArabic_700Bold"')
    .replace(/letter-spacing="[^"]*"/g, 'letter-spacing="0"');
}
export const mapLabel = (en: string, ar: boolean) => (ar ? AR_LABELS.find(([e]) => e === en)?.[1] ?? en : en);
