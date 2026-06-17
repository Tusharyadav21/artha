import { describe, it, expect } from "vitest"
import { formatAmount, parseTransactions, parseTableData } from "./parser"

describe("formatAmount", () => {
  it("formats INR currency", () => {
    expect(formatAmount(1234.5)).toBe("₹1,234.50")
  })

  it("formats zero", () => {
    expect(formatAmount(0)).toBe("₹0.00")
  })

  it("formats large numbers", () => {
    expect(formatAmount(100000)).toBe("₹1,00,000.00")
  })

  it("formats negative amounts", () => {
    expect(formatAmount(-500)).toBe("-₹500.00")
  })
})

describe("parseTransactions", () => {
  it("parses a standard bank statement line", () => {
    const text = "01/04/2024 UPI PAYMENT 123.45 5000.00"
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe("01/04/2024")
    expect(result[0].description).toContain("UPI PAYMENT")
    expect(result[0].debit).toBeNull()
    expect(result[0].credit).toBeCloseTo(123.45)
    expect(result[0].balance).toBeCloseTo(5000.0)
  })

  it("parses a debit transaction", () => {
    const text = "15/03/2024 ATM WITHDRAWAL 2000.00 15000.00"
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].debit).toBeCloseTo(2000.0)
    expect(result[0].credit).toBeNull()
    expect(result[0].balance).toBeCloseTo(15000.0)
  })

  it("parses multiple transactions", () => {
    const text = `01/04/2024 UPI PAYMENT 500.00 10000.00
02/04/2024 SALARY CREDIT 50000.00 60000.00
03/04/2024 RENT PAYMENT 15000.00 45000.00`
    const result = parseTransactions(text)
    expect(result).toHaveLength(3)
    expect(result[1].credit).toBeCloseTo(50000.0)
  })

  it("handles descriptions up to 150 chars", () => {
    const desc = "Payment " + "for ".repeat(20)
    const text = `01/04/2024 ${desc} 100.00 500.00`
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].description.length).toBeLessThanOrEqual(200)
  })

  it("skips header lines", () => {
    const text = `DATE PARTICULARS WITHDRAWAL DEPOSIT BALANCE
01/04/2024 UPI PAYMENT 500.00 0.00 10000.00`
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].description).toContain("UPI PAYMENT")
  })

  it("handles Dr/Cr notation", () => {
    const text = "01/04/2024 POS PURCHASE Dr 1500.00 8500.00"
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].debit).toBeCloseTo(1500.0)
    expect(result[0].credit).toBeNull()
  })

  it("returns empty for non-transaction text", () => {
    const text = "This is just some random text without any transaction data"
    const result = parseTransactions(text)
    expect(result).toHaveLength(0)
  })

  it("handles ₹ symbol in amounts", () => {
    const text = "01/04/2024 PAYMENT ₹500.00 ₹9500.00"
    const result = parseTransactions(text)
    expect(result).toHaveLength(1)
    expect(result[0].credit).toBeCloseTo(500.0)
    expect(result[0].balance).toBeCloseTo(9500.0)
  })
})

describe("parseTableData", () => {
  it("parses positioned items into transactions", () => {
    const items = [
      { str: "01/04/2024", x: 50, y: 100, width: 60, height: 10 },
      { str: "UPI", x: 120, y: 100, width: 20, height: 10 },
      { str: "PAYMENT", x: 145, y: 100, width: 40, height: 10 },
      { str: "500.00", x: 300, y: 100, width: 40, height: 10 },
      { str: "10000.00", x: 400, y: 100, width: 50, height: 10 },
      { str: "02/04/2024", x: 50, y: 70, width: 60, height: 10 },
      { str: "SALARY", x: 120, y: 70, width: 30, height: 10 },
      { str: "50000.00", x: 300, y: 70, width: 50, height: 10 },
      { str: "60000.00", x: 400, y: 70, width: 50, height: 10 },
    ]
    const result = parseTableData(items)
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0].date).toBe("01/04/2024")
    expect(result[1].credit).toBeCloseTo(50000.0)
  })

  it("returns empty for empty input", () => {
    expect(parseTableData([])).toHaveLength(0)
  })
})
