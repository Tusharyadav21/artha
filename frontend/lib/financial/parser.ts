export interface Transaction {
  date: string
  description: string
  debit: number | null
  credit: number | null
  balance: number | null
}

function isAmountToken(s: string): boolean {
  return /^[+-]?\s*[₹$€]?\s*[\d,]+\.\d{2}$/.test(s.trim())
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/[₹$€,\s]/g, ""))
}

function normalizeDate(d: string): string {
  d = d.replace(/[-\u2013\u2014]/g, "/")
  const parts = d.split("/")
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`
    if (parts[2].length === 2) return `${parts[0]}/${parts[1]}/20${parts[2]}`
    return d
  }
  return d
}

export function parseTransactions(text: string): Transaction[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const results: Transaction[] = []
  let buffer: string[] = []

  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/
  const amountRegex = /[+-]?\s*[₹$€]?\s*[\d,]+\.\d{2}/

  for (const line of lines) {
    if (line.length < 5) continue
    if (/^(page|date|statement|account|period|opening|closing|grand\s*total)/i.test(line)) continue
    if (/^\d{1,2}\s+\d{1,2}\s+\d{2,4}/.test(line)) continue
    if (/^\d{4,10}$/.test(line)) continue

    const hasDate = dateRegex.test(line)
    const hasAmount = amountRegex.test(line)

    if (hasDate && hasAmount) {
      if (buffer.length > 0) {
        const merged = buffer.join(" ")
        const parsed = parseSingleLine(merged, dateRegex, amountRegex)
        if (parsed) results.push(parsed)
        buffer = []
      }
      const parsed = parseSingleLine(line, dateRegex, amountRegex)
      if (parsed) results.push(parsed)
    } else if (hasDate && !hasAmount) {
      if (buffer.length > 0) {
        const merged = buffer.join(" ")
        const parsed = parseSingleLine(merged, dateRegex, amountRegex)
        if (parsed) results.push(parsed)
        buffer = []
      }
      buffer.push(line)
    } else if (!hasDate && hasAmount && results.length > 0) {
      const prev = results[results.length - 1]
      const amt = parseAmount(line.match(amountRegex)![0])
      const amounts = [...line.matchAll(new RegExp(amountRegex.source, "g"))].map((m) => parseAmount(m[0]))

      if (amounts.length >= 2) {
        prev.description += " " + line.replace(amountRegex, "").trim()
        prev.debit = parseAmount(String(amounts[0]))
        prev.credit = parseAmount(String(amounts[1]))
        if (amounts[2] !== undefined) prev.balance = parseAmount(String(amounts[2]))
      } else {
        if (prev.debit === null && prev.credit === null) {
          if (line.toLowerCase().includes("dr") || prev.description.toLowerCase().includes("dr") || prev.description.toLowerCase().includes("debited") || prev.description.toLowerCase().includes("withdraw")) {
            prev.debit = amt
          } else {
            prev.credit = amt
          }
        }
        prev.description += " " + line.replace(amountRegex, "").trim()
      }
    } else {
      if (buffer.length > 0) {
        buffer[buffer.length - 1] += " " + line
      }
    }
  }

  if (buffer.length > 0) {
    const merged = buffer.join(" ")
    const parsed = parseSingleLine(merged, dateRegex, amountRegex)
    if (parsed) results.push(parsed)
  }

  return results
}

function parseSingleLine(line: string, dateRegex: RegExp, amountRegex: RegExp): Transaction | null {
  const dateMatch = line.match(dateRegex)
  if (!dateMatch) return null

  const date = normalizeDate(dateMatch[1])
  const rest = line.replace(dateRegex, "").trim()

  if (rest.length < 3) return null

  const amountMatches = [...rest.matchAll(new RegExp(amountRegex.source, "g"))]
  const amounts = amountMatches.map((m) => parseAmount(m[0]))

  if (amounts.length === 0) return null

  let description = rest.replace(new RegExp(amountRegex.source, "g"), "").trim()
  description = description.replace(/^[-–—\s]+/, "").trim()
  description = description.replace(/[-–—]+\s*$/, "").trim()
  description = description.replace(/\s+/g, " ").trim()

  let debit: number | null = null
  let credit: number | null = null
  let balance: number | null = null

  if (amounts.length >= 3) {
    if (lineIncludesDebit(line)) {
      debit = Math.abs(amounts[0])
      credit = Math.abs(amounts[1])
      balance = Math.abs(amounts[2])
    } else if (lineIncludesCredit(line)) {
      credit = Math.abs(amounts[0])
      debit = Math.abs(amounts[1])
      balance = Math.abs(amounts[2])
    } else {
      const first = Math.abs(amounts[0])
      const second = Math.abs(amounts[1])
      const third = Math.abs(amounts[2])
      if (first + second === third || Math.abs(first + second - third) < 1) {
        credit = first
        debit = second
        balance = third
      } else if (first + third === second || Math.abs(first + third - second) < 1) {
        credit = first
        balance = second
        debit = third
      } else {
        debit = first
        credit = second
        balance = third
      }
    }
  } else if (amounts.length === 2) {
    const first = Math.abs(amounts[0])
    const second = Math.abs(amounts[1])

    if (lineIncludesDebit(line)) {
      debit = first
      balance = second
    } else if (lineIncludesCredit(line)) {
      credit = first
      balance = second
    } else {
      if (Math.abs(amounts[0]) < 0 || isNegativeAmount(rest, amountMatches[0][0])) {
        debit = first
        balance = second
      } else {
        credit = first
        balance = second
      }
    }
  } else {
    const amt = Math.abs(amounts[0])
    if (lineIncludesDebit(line) || isNegativeAmount(rest, amountMatches[0][0])) {
      debit = amt
    } else if (lineIncludesCredit(line)) {
      credit = amt
    } else {
      const lower = description.toLowerCase()
      if (/^(dr|withdraw|paid|debited|charged)/.test(lower) || lower.includes(" dr ") || lower.startsWith("dr ")) {
        debit = amt
      } else {
        credit = amt
      }
    }
  }

  if (description.length > 200) {
    description = description.slice(0, 200)
  }

  if (description.length < 150 && (debit !== null || credit !== null)) {
    description = description.replace(/\s+/g, " ").trim()
    if (!description) return null
    return { date, description, debit, credit, balance }
  }

  return null
}

function lineIncludesDebit(line: string): boolean {
  const lower = line.toLowerCase()
  if (/\b(dr|debit|debited|withdraw|withdrawal|paid|charge|charged)\b/.test(lower)) return true
  return false
}

function lineIncludesCredit(line: string): boolean {
  const lower = line.toLowerCase()
  if (/\b(cr|credit|credited|deposit|deposited)\b/.test(lower)) return true
  return false
}

function isNegativeAmount(line: string, amountStr: string): boolean {
  if (amountStr.startsWith("-") || amountStr.startsWith("–") || amountStr.startsWith("—")) return true
  const idx = line.indexOf(amountStr)
  if (idx > 0) {
    const before = line[idx - 1]
    if (before === "-" || before === "–" || before === "—") return true
  }
  return false
}

export function parseTableData(items: Array<{ str: string; x: number; y: number; width: number; height: number }>): Transaction[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)

  const yThreshold = 5
  const rows: Array<Array<{ str: string; x: number }>> = []
  let currentRow: Array<{ str: string; x: number }> = []
  let lastY = sorted[0].y

  for (const item of sorted) {
    if (Math.abs(item.y - lastY) > yThreshold) {
      if (currentRow.length > 0) {
        rows.push(currentRow.sort((a, b) => a.x - b.x))
      }
      currentRow = []
      lastY = item.y
    }
    currentRow.push({ str: item.str, x: item.x })
  }
  if (currentRow.length > 0) {
    rows.push(currentRow.sort((a, b) => a.x - b.x))
  }

  const textRows = rows.map((row) => row.map((t) => t.str).join(" "))

  const amountColIndices = findAmountColumns(rows)
  const results: Transaction[] = []

  for (const row of rows) {
    const textRow = row.map((t) => t.str).join(" ")
    if (row.length < 3) continue
    if (/^(page|date|statement|account|period|opening|closing|grand\s*total)/i.test(textRow)) continue

    const dateCols = row.filter((t) => /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(t.str))
    if (dateCols.length === 0) continue
    const date = normalizeDate(dateCols[0].str)

    const amountCols = amountColIndices.map((idx) => (row[idx] ? parseAmount(row[idx].str) : null)).filter((a): a is number => a !== null)
    if (amountCols.length === 0) continue

    let description = row
      .filter((t, i) => !amountColIndices.includes(i) && !/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(t.str) && t.str !== dateCols[0].str)
      .map((t) => t.str)
      .join(" ")
      .trim()

    let debit: number | null = null
    let credit: number | null = null
    let balance: number | null = null

    if (amountCols.length >= 3) {
      debit = Math.abs(amountCols[0])
      credit = Math.abs(amountCols[1])
      balance = Math.abs(amountCols[2])
    } else if (amountCols.length === 2) {
      if (textRow.includes("Dr") || textRow.toLowerCase().includes("dr ")) {
        debit = Math.abs(amountCols[0])
        balance = Math.abs(amountCols[1])
      } else {
        credit = Math.abs(amountCols[0])
        balance = Math.abs(amountCols[1])
      }
    } else {
      if (textRow.includes("Dr") || textRow.toLowerCase().includes("dr ")) {
        debit = Math.abs(amountCols[0])
      } else {
        credit = Math.abs(amountCols[0])
      }
    }

    if (description.length > 200) description = description.slice(0, 200)

    results.push({ date, description: description || "—", debit, credit, balance })
  }

  return results
}

function findAmountColumns(rows: Array<Array<{ str: string; x: number }>>): number[] {
  const colCounts = rows.map((r) => r.length)
  const maxCols = Math.max(...colCounts, 0)
  if (maxCols < 2) return []

  const amountColIndex: number[] = []
  for (let col = 0; col < maxCols; col++) {
    let amountCount = 0
    for (const row of rows) {
      if (row[col] && isAmountToken(row[col].str)) amountCount++
    }
    if (amountCount >= Math.ceil(rows.length * 0.3)) {
      amountColIndex.push(col)
    }
  }

  if (amountColIndex.length === 0 && maxCols >= 3) {
    amountColIndex.push(maxCols - 3, maxCols - 2, maxCols - 1)
  }

  return amountColIndex.slice(0, 3)
}

export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
