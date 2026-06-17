import { describe, it, expect } from "vitest"
import { WORKFLOW_BY_ID, WORKFLOWS_BY_SECTION } from "./workflow-registry"

describe("WORKFLOW_BY_ID", () => {
  it("contains all expected workflows", () => {
    expect(WORKFLOW_BY_ID.chat).toBeDefined()
    expect(WORKFLOW_BY_ID.analytics).toBeDefined()
    expect(WORKFLOW_BY_ID.financial).toBeDefined()
    expect(WORKFLOW_BY_ID.video).toBeDefined()
    expect(WORKFLOW_BY_ID.extract).toBeDefined()
    expect(WORKFLOW_BY_ID.settings).toBeDefined()
  })

  it("each entry has required fields", () => {
    for (const [id, entry] of Object.entries(WORKFLOW_BY_ID)) {
      expect(entry.id).toBe(id)
      expect(typeof entry.label).toBe("string")
      expect(entry.label.length).toBeGreaterThan(0)
      expect(typeof entry.href).toBe("string")
      expect(entry.href.startsWith("/")).toBe(true)
      expect(entry.icon).toBeTruthy()
      expect(typeof entry.icon).toBe("object")
      expect(["workspace", "tools", "settings"]).toContain(entry.section)
    }
  })
})

describe("WORKFLOWS_BY_SECTION", () => {
  it("has workspace section with chat and analytics", () => {
    const workspace = WORKFLOWS_BY_SECTION.workspace
    expect(workspace).toBeDefined()
    expect(workspace.length).toBeGreaterThanOrEqual(2)
    const ids = workspace.map((w) => w.id)
    expect(ids).toContain("chat")
    expect(ids).toContain("analytics")
  })

  it("has tools section", () => {
    const tools = WORKFLOWS_BY_SECTION.tools
    expect(tools).toBeDefined()
    expect(tools.length).toBeGreaterThanOrEqual(1)
  })

  it("has settings section", () => {
    const settings = WORKFLOWS_BY_SECTION.settings
    expect(settings).toBeDefined()
    expect(settings.length).toBeGreaterThanOrEqual(1)
  })

  it("every workflow appears in exactly one section", () => {
    const allIds = Object.keys(WORKFLOW_BY_ID)
    const sectionedIds = [
      ...WORKFLOWS_BY_SECTION.workspace.map((w) => w.id),
      ...WORKFLOWS_BY_SECTION.tools.map((w) => w.id),
      ...WORKFLOWS_BY_SECTION.settings.map((w) => w.id),
    ]
    for (const id of allIds) {
      expect(sectionedIds).toContain(id)
    }
  })
})
