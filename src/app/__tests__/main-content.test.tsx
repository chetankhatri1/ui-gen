import React from "react";
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock all external dependencies so we can focus on the toggle behavior
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree" />,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor" />,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions" />,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
});

describe("MainContent toggle buttons", () => {
  test("Preview tab is active by default", () => {
    render(<MainContent />);

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    const codeTab = screen.getByRole("tab", { name: "Code" });

    expect(previewTab.getAttribute("data-state")).toBe("active");
    expect(codeTab.getAttribute("data-state")).toBe("inactive");
  });

  test("clicking Code tab makes it active", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    await user.click(screen.getByRole("tab", { name: "Code" }));

    const codeTab = screen.getByRole("tab", { name: "Code" });
    const previewTab = screen.getByRole("tab", { name: "Preview" });

    expect(codeTab.getAttribute("data-state")).toBe("active");
    expect(previewTab.getAttribute("data-state")).toBe("inactive");
  });

  test("clicking Preview tab after Code makes Preview active again", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Switch to Code
    await user.click(screen.getByRole("tab", { name: "Code" }));
    expect(screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")).toBe("active");

    // Switch back to Preview
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(screen.getByRole("tab", { name: "Preview" }).getAttribute("data-state")).toBe("active");
    expect(screen.getByRole("tab", { name: "Code" }).getAttribute("data-state")).toBe("inactive");
  });

  test("both preview and code content are always in the DOM", () => {
    render(<MainContent />);

    // Both should be present in the DOM (CSS visibility approach keeps both mounted)
    expect(screen.getByTestId("preview-frame")).toBeTruthy();
    expect(screen.getByTestId("code-editor")).toBeTruthy();
  });

  test("clicking tabs multiple times toggles correctly", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    const codeTab = screen.getByRole("tab", { name: "Code" });

    // Start: Preview active
    expect(previewTab.getAttribute("data-state")).toBe("active");

    // Click Code
    await user.click(codeTab);
    expect(codeTab.getAttribute("data-state")).toBe("active");

    // Click Preview
    await user.click(previewTab);
    expect(previewTab.getAttribute("data-state")).toBe("active");

    // Click Code again
    await user.click(codeTab);
    expect(codeTab.getAttribute("data-state")).toBe("active");

    // Click Preview again
    await user.click(previewTab);
    expect(previewTab.getAttribute("data-state")).toBe("active");
  });
});
