#!/bin/sh
# Tạo dist/ (index.html đầy đủ + manifest + icon) từ game.html để deploy
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp icons/*.png dist/
{
  printf '<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="UTF-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-title" content="Tiệm Bánh">\n<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
  printf '<link rel="manifest" href="manifest.webmanifest">\n'
  printf '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">\n'
  printf '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">\n'
  printf '</head>\n<body>\n'
  cat game.html
  printf '\n</body>\n</html>\n'
} > dist/index.html
cat > dist/manifest.webmanifest <<'M'
{
  "name": "Tiệm Bánh Matcha",
  "short_name": "Tiệm Bánh",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#fdf3e4",
  "theme_color": "#fdf3e4",
  "lang": "vi",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
M
echo "Built dist/"
