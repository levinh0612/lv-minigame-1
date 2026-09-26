#!/bin/sh
# Tạo index.html đầy đủ (có doctype, meta mobile) từ game.html để deploy
cd "$(dirname "$0")"
mkdir -p dist
{
  printf '<!DOCTYPE html>\n<html lang="vi">\n<head>\n<meta charset="UTF-8">\n'
  printf '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
  printf '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
  printf '<meta name="apple-mobile-web-app-title" content="Tiệm Bánh">\n<link rel="manifest" href="manifest.webmanifest">\n'
  printf '</head>\n<body>\n'
  cat game.html
  printf '\n</body>\n</html>\n'
} > dist/index.html
cat > dist/manifest.webmanifest <<'M'
{"name":"Tiệm Bánh Matcha","short_name":"Tiệm Bánh","start_url":".","display":"standalone","background_color":"#fdf3e4","theme_color":"#fdf3e4","lang":"vi"}
M
echo "Built dist/index.html"
