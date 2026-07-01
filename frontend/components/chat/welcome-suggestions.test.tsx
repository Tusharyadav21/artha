import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WelcomeSuggestions } from "./welcome-suggestions"

describe("WelcomeSuggestions", () => {
  it("renders project name", () => {
    render(<WelcomeSuggestions projectName="My Project" onSuggestionClick={vi.fn()} />)
    expect(screen.getByText(/my project/i)).toBeInTheDocument()
  })

  it("renders suggestion cards", () => {
    render(<WelcomeSuggestions projectName="Test" onSuggestionClick={vi.fn()} />)
    expect(screen.getByText(/summarize kubernetes/i)).toBeInTheDocument()
    expect(screen.getByText(/explain rbac/i)).toBeInTheDocument()
  })

  it("calls onSuggestionClick when a suggestion is clicked", async () => {
    const onClick = vi.fn()
    render(<WelcomeSuggestions projectName="Test" onSuggestionClick={onClick} />)
    await userEvent.click(screen.getByText(/summarize kubernetes/i))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledWith("Give me a quick rundown of K8s networking.")
  })
})
