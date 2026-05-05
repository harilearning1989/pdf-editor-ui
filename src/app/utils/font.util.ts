export function loadGoogleFont(fontName: string, loadedFonts: Set<string>) {
  if (loadedFonts.has(fontName)) return;

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
  link.rel = 'stylesheet';

  document.head.appendChild(link);

  loadedFonts.add(fontName);
}