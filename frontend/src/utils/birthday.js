// Public profiles expose birthdays as "MM-DD" only (no year). Formats in UTC so
// the day never shifts with the viewer's timezone.
export function formatBirthday(mmdd) {
  const m = /^(\d{2})-(\d{2})$/.exec(mmdd || '')
  if (!m) return null
  return new Date(Date.UTC(2000, Number(m[1]) - 1, Number(m[2])))
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
}
