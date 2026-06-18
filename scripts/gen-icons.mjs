import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const svgPath = path.join(__dirname, '..', 'public', 'icon.svg')

async function main() {
  const svg = readFileSync(svgPath)
  await sharp(svg, { density: 384 })
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon-192.png'))
  await sharp(svg, { density: 768 })
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon-512.png'))
  console.log('icons generated')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
