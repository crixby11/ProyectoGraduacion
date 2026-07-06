export const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export function to24h(hour, min, ampm) {
  let h = parseInt(hour) || 0
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${min || '00'}`
}

export function from24h(time24 = '09:00') {
  const [rawH = '9', rawM = '00'] = time24.split(':')
  const h24 = parseInt(rawH) || 9
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 || 12
  const rounded = Math.min(55, Math.round(parseInt(rawM) / 5) * 5)
  return {
    hour: String(h12).padStart(2, '0'),
    min: String(rounded).padStart(2, '0'),
    ampm,
  }
}
