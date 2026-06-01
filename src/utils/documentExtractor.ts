import { extractTextFromPdf } from './pdfExtractor'

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.csv', '.docx', '.xlsx']

export function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext))
}

export function getSupportedExtensions(): string {
  return SUPPORTED_EXTENSIONS.join(', ')
}

export async function extractTextFromDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.txt') || name.endsWith('.csv')) {
    return await file.text()
  }

  if (name.endsWith('.pdf')) {
    return await extractTextFromPdf(file)
  }

  if (name.endsWith('.docx')) {
    return await extractDocxText(file)
  }

  if (name.endsWith('.xlsx')) {
    return await extractXlsxText(file)
  }

  throw new Error('UNSUPPORTED_FORMAT')
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  // DOCX is a ZIP containing XML. Extract text from word/document.xml
  // by finding XML text content between tags.
  try {
    const blob = new Blob([uint8])
    const entries = await readZipEntries(blob)
    const docEntry = entries.find(e => e.name === 'word/document.xml')
    if (!docEntry) throw new Error('Not a valid DOCX file')

    const xml = await docEntry.text()
    // Strip XML tags and extract text content
    const text = xml
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (text.length < 20) throw new Error('SCAN_PDF')
    return text
  } catch (e: any) {
    if (e.message === 'SCAN_PDF') throw e
    throw new Error('DOCX_PARSE_FAILED')
  }
}

async function extractXlsxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()

  try {
    const blob = new Blob([new Uint8Array(arrayBuffer)])
    const entries = await readZipEntries(blob)

    // Read shared strings (text values used across cells)
    const stringsEntry = entries.find(e => e.name === 'xl/sharedStrings.xml')
    const strings: string[] = []
    if (stringsEntry) {
      const xml = await stringsEntry.text()
      // Shared strings can have <t> inside <si><t>...</t></si> or <si><r><t>...</t></r></si>
      const siBlocks = xml.matchAll(/<si>(.*?)<\/si>/gs)
      for (const si of siBlocks) {
        const tMatches = si[1].matchAll(/<t[^>]*>([^<]*)<\/t>/g)
        const parts: string[] = []
        for (const t of tMatches) {
          parts.push(t[1])
        }
        strings.push(parts.join(''))
      }
    }

    // Read each sheet
    const sheetEntries = entries
      .filter(e => e.name.match(/^xl\/worksheets\/sheet\d+\.xml$/))
      .sort((a, b) => a.name.localeCompare(b.name))

    const lines: string[] = []
    for (const sheet of sheetEntries) {
      const xml = await sheet.text()
      const rows = xml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)
      for (const row of rows) {
        const cells: string[] = []
        // Match each <c> element individually
        const cElements = row[1].matchAll(/<c\b([^>]*)>(.*?)<\/c>|<c\b([^>]*)\/>/gs)
        for (const cEl of cElements) {
          const attrs = cEl[1] ?? cEl[3] ?? ''
          const inner = cEl[2] ?? ''
          const isSharedString = /t="s"/.test(attrs)
          const isInlineStr = /t="inlineStr"/.test(attrs)
          const vMatch = inner.match(/<v>([^<]*)<\/v>/)

          if (isSharedString && vMatch) {
            const idx = parseInt(vMatch[1])
            cells.push(strings[idx] ?? vMatch[1])
          } else if (isInlineStr) {
            const tMatch = inner.match(/<t[^>]*>([^<]*)<\/t>/)
            cells.push(tMatch ? tMatch[1] : '')
          } else if (vMatch) {
            cells.push(vMatch[1])
          } else {
            cells.push('')
          }
        }
        if (cells.some(c => c.trim())) {
          lines.push(cells.join('\t'))
        }
      }
    }

    const text = lines.join('\n').trim()
    if (text.length < 10) throw new Error('SCAN_PDF')
    return text
  } catch (e: any) {
    if (e.message === 'SCAN_PDF') throw e
    throw new Error('XLSX_PARSE_FAILED')
  }
}

interface ZipEntry {
  name: string
  text: () => Promise<string>
}

async function readZipEntries(blob: Blob): Promise<ZipEntry[]> {
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  const entries: ZipEntry[] = []

  // Find end-of-central-directory record (scan from end)
  let eocdOffset = -1
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new Error('Not a valid ZIP file')

  const centralDirOffset = view.getUint32(eocdOffset + 16, true)
  const centralDirSize = view.getUint32(eocdOffset + 12, true)
  let offset = centralDirOffset

  while (offset < centralDirOffset + centralDirSize) {
    if (view.getUint32(offset, true) !== 0x02014b50) break

    const compressionMethod = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const uncompressedSize = view.getUint32(offset + 24, true)
    const nameLen = view.getUint16(offset + 28, true)
    const extraLen = view.getUint16(offset + 30, true)
    const commentLen = view.getUint16(offset + 32, true)
    const localHeaderOffset = view.getUint32(offset + 42, true)

    const nameBytes = new Uint8Array(buffer, offset + 46, nameLen)
    const name = new TextDecoder().decode(nameBytes)

    const localOffset = localHeaderOffset
    const localNameLen = view.getUint16(localOffset + 26, true)
    const localExtraLen = view.getUint16(localOffset + 28, true)
    const dataOffset = localOffset + 30 + localNameLen + localExtraLen

    entries.push({
      name,
      text: async () => {
        if (compressionMethod === 0) {
          // Stored (no compression)
          return new TextDecoder().decode(new Uint8Array(buffer, dataOffset, uncompressedSize))
        } else if (compressionMethod === 8) {
          // Deflate
          const compressed = new Uint8Array(buffer, dataOffset, compressedSize)
          const ds = new DecompressionStream('deflate-raw')
          const writer = ds.writable.getWriter()
          const reader = ds.readable.getReader()
          writer.write(compressed)
          writer.close()
          const chunks: Uint8Array[] = []
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
          }
          const totalLen = chunks.reduce((s, c) => s + c.length, 0)
          const result = new Uint8Array(totalLen)
          let pos = 0
          for (const chunk of chunks) {
            result.set(chunk, pos)
            pos += chunk.length
          }
          return new TextDecoder().decode(result)
        }
        throw new Error(`Unsupported compression: ${compressionMethod}`)
      },
    })

    offset += 46 + nameLen + extraLen + commentLen
  }

  return entries
}
