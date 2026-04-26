import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/**
 * Export array of objects to CSV file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Filename for download (without extension)
 */
export function exportToCSV(data, filename = 'export') {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export array of objects to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Filename for download (without extension)
 * @param {string} sheetName - Name of the sheet in Excel
 */
export function exportToExcel(data, filename = 'export', sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Auto-size columns
  const maxWidth = 30
  const colWidths = []
  const headers = Object.keys(data[0])
  headers.forEach((header) => {
    colWidths.push({ wch: Math.min(header.length + 2, maxWidth) })
  })
  worksheet['!cols'] = colWidths

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
