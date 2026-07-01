import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatInput } from "./chat-input"

describe("ChatInput", () => {
  const defaultProps = {
    question: "",
    onQuestionChange: vi.fn(),
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onLibraryClick: vi.fn(),
    isStreaming: false,
    isLoadingMessages: false,
    hasActiveProject: true,
    webSearchEnabled: false,
    onWebSearchToggle: vi.fn(),
    selectedModel: "qwen2.5:7b",
    onModelChange: vi.fn(),
  }

  const findSubmitButton = (container: HTMLElement) =>
    container.querySelector('button[type="submit"]') as HTMLButtonElement | null

  it("renders textarea and send button", () => {
    const { container } = render(<ChatInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/ask anything/i)).toBeInTheDocument()
    const btn = findSubmitButton(container)
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it("enables send button when question is not empty", () => {
    const { container } = render(<ChatInput {...defaultProps} question="Hello" />)
    const btn = findSubmitButton(container)
    expect(btn).not.toBeDisabled()
  })

  it("calls onSubmit on form submit", async () => {
    const onSubmit = vi.fn()
    const { container } = render(<ChatInput {...defaultProps} question="test" onSubmit={onSubmit} />)
    const form = container.querySelector("form")!
    fireEvent.submit(form)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("disables input when streaming", () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />)
    expect(screen.getByPlaceholderText(/ask anything/i)).toBeDisabled()
  })

  it("shows web search toggle", () => {
    render(<ChatInput {...defaultProps} />)
    expect(screen.getByText(/web/i)).toBeInTheDocument()
  })

  it("calls onWebSearchToggle when web button clicked", async () => {
    const onToggle = vi.fn()
    render(<ChatInput {...defaultProps} onWebSearchToggle={onToggle} />)
    await userEvent.click(screen.getByText(/web/i))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
