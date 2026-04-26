// Generates PNG icon set from SVG sources in public/icons/
// Uses sharp (bundled with Next.js) — run with: node scripts/generate-icons.js
const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const iconsDir = path.join(__dirname, '..', 'public', 'icons')
const publicDir = path.join(__dirname, '..', 'public')
const iconSvg     = path.join(iconsDir, 'icon.svg')
const maskableSvg = path.join(iconsDir, 'icon-maskable.svg')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function run() {
  // Regular rounded-corner icons
  for (const size of sizes) {
    await sharp(iconSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`))
    console.log(`✓ icon-${size}x${size}.png`)
  }

  // Maskable (full-bleed, for Android adaptive icons)
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'))
  console.log('✓ icon-maskable-512x512.png')

  // Apple touch icon (180x180, maskable for consistent look)
  await sharp(maskableSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')

  // Favicon (32x32)
  await sharp(iconSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'))
  console.log('✓ favicon.png')

  console.log('\nDone. Update manifest.json to reference the new PNG files if needed.')
}

run().catch(err => { console.error(err); process.exit(1) })
