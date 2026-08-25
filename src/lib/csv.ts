/* CSV export. Excel is the reporting tool most small brands actually have, so
   every table in this app can leave as a file. */

/** RFC 4180 quoting — a tea name containing a comma must not split a column. */
function escapeCell(value: string | number): string {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(columns: string[], rows: (string | number)[][]): string {
  return [columns, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

export function downloadFile(filename: string, contents: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoking immediately can cancel the download in some browsers; one frame is
  // enough for the click to have been consumed.
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

/** `elegant-sip-orders-2026-08-24.csv` */
export const stampedName = (base: string, now: Date, extension = 'csv') =>
  `elegant-sip-${base}-${now.toISOString().slice(0, 10)}.${extension}`
