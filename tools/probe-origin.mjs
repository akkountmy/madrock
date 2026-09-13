/**
 * Проверка источников: можно ли получить полноразмерный JPEG вместо превью.
 * Печатает вариант адреса, тип содержимого, размер и формат первых байт.
 *
 * Запуск: node tools/probe-origin.mjs
 */
const UA = 'MADROCK-coffee-site/1.0 (source probe)'

const probes = [
  'https://cdn.stocksnap.io/img-thumbs/960w/4DW84GDZ41.jpg',
  'https://cdn.stocksnap.io/img-thumbs/1920w/4DW84GDZ41.jpg',
  'https://cdn.stocksnap.io/img-thumbs/2400w/4DW84GDZ41.jpg',
  'https://cdn.stocksnap.io/img/4DW84GDZ41.jpg',
  'https://stocksnap.io/photo/coffee-latte-4DW84GDZ41',
  'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3Vwd2s2MTcxNDAwMy13aWtpbWVkaWEtaW1hZ2Uta293YmF5M3ouanBn.jpg',
  'https://images.rawpixel.com/editor_2048/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3Vwd2s2MTcxNDAwMy13aWtpbWVkaWEtaW1hZ2Uta293YmF5M3ouanBn.jpg',
  'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3Vwd2s2MTcxNDAwMy13aWtpbWVkaWEtaW1hZ2Uta293YmF5M3ouanBn.jpg?fm=jpg',
  'https://img.rawpixel.com/s3fs-private/rawpixel_images/website_content/a010-markusspiske-14.jpg?w=1600&h=1600&fit=clip&fm=jpg&q=85'
]

const kindOf = (b) => {
  if (b[0] === 0xff && b[1] === 0xd8) return 'JPEG'
  if (b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP') return 'WebP'
  if (b[0] === 0x89 && b[1] === 0x50) return 'PNG'
  return 'другое'
}
const sizeOf = (b) => {
  if (kindOf(b) !== 'JPEG') return ''
  let i = 2
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue }
    const m = b[i + 1]
    if (m >= 0xc0 && m <= 0xc3) return b.readUInt16BE(i + 7) + '×' + b.readUInt16BE(i + 5)
    i += 2 + b.readUInt16BE(i + 2)
  }
  return ''
}

for (const url of probes) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/jpeg,image/*;q=0.8' } })
    if (!res.ok) { console.log('HTTP ' + res.status + '  ' + url.slice(0, 96)); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    console.log(kindOf(buf).padEnd(6) + sizeOf(buf).padEnd(11) + String(Math.round(buf.length / 1024)).padStart(5) + ' КБ  ' + url.slice(0, 96))
  } catch (error) {
    console.log('ошибка   ' + url.slice(0, 80) + ' — ' + String(error && error.message))
  }
}
