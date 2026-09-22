import { sanitizeAppData } from '../data/validate'
import type { AppData } from '../domain/types'
import { parseSheets, type Cell, type ParseResult, type RawSheet } from './parseTable'

export type ImportResult =
  | { kind: 'lessons'; fileName: string; result: ParseResult }
  | { kind: 'backup'; fileName: string; data: AppData }

/** Простой CSV-парсер: кавычки, разделитель «;» или «,» (Excel в русской локали сохраняет с «;»). */
export function parseCsv(text: string): Cell[][] {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: Cell[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

export async function readScheduleFile(file: File): Promise<ImportResult> {
  const name = file.name
  const ext = name.split('.').pop()?.toLowerCase()

  if (ext === 'json') {
    const data = sanitizeAppData(JSON.parse(await file.text()))
    if (!data) throw new Error('Файл не похож на резервную копию расписания.')
    return { kind: 'backup', fileName: name, data }
  }

  let sheets: RawSheet[]
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    sheets = [{ name, rows: parseCsv(await file.text()) }]
  } else if (ext === 'xlsx' || ext === 'xlsm') {
    // Библиотека подгружается только при импорте, чтобы не утяжелять основной бандл.
    const { default: readXlsxFile } = await import('read-excel-file/browser')
    const all = await readXlsxFile(file)
    sheets = all.map((s) => ({ name: s.sheet, rows: s.data as unknown as Cell[][] }))
  } else if (ext === 'xls') {
    throw new Error('Старый формат .xls не поддерживается. Сохраните файл как .xlsx или .csv.')
  } else {
    throw new Error('Поддерживаются файлы .xlsx, .csv и .json (резервная копия).')
  }

  return { kind: 'lessons', fileName: name, result: parseSheets(sheets) }
}
