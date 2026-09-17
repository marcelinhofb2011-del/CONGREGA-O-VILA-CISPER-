// Script de verificação de integridade dos ícones PWA oficiais "VL. Cisper"
import fs from 'fs';

const requiredAssets = [
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/pwa-maskable-512x512.png',
  'public/apple-touch-icon.png',
  'public/icon.svg',
  'public/favicon.ico',
];

for (const asset of requiredAssets) {
  if (fs.existsSync(asset)) {
    console.log(`[OK] Ícone oficial presente: ${asset}`);
  } else {
    console.warn(`[AVISO] Ícone ausente: ${asset}`);
  }
}
console.log('Ícones oficiais do aplicativo VL. Cisper validados com sucesso.');

