# Ícones PWA

Ícones SVG fonte estão aqui. **Gere os PNGs** (requeridos pelo manifest) com:

```bash
# Requer ImageMagick (brew install imagemagick / apt install imagemagick)
cd apps/web/public/icons
magick icon.svg -resize 192x192 192.png
magick icon.svg -resize 512x512 512.png
magick icon-maskable.svg -resize 512x512 maskable.png
```

Ou usar um serviço online (https://realfavicongenerator.net) carregando `icon.svg`.

Os paths referenciados em `apps/web/vite.config.ts` são:
- `/icons/192.png`
- `/icons/512.png`
- `/icons/maskable.png`

Sem os PNGs o Lighthouse PWA score cai abaixo de 90.
