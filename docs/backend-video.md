# Video Generation Pipeline & Remotion Rendering

This document details the React-based video synthesis engine, script planning passes, and Playwright screenshot rendering within the backend.

---

## 🎬 1. Remotion Video Synthesis

The backend houses a specialized short-form video generation pipeline located in `backend/video-renderer/`.
* **Remotion Framework**: Leverages Remotion (`remotion`, `@remotion/cli`, `@remotion/renderer`) to define timelines and animate canvas elements using standard React components.
* **Component Architecture**:
  - `src/Root.tsx`: Declares composition targets, framerates (30fps), canvas viewport dimensions (1080x1920 portrait format), and timeline props.
  - `src/ShortVideo.tsx`: Renders narration voice clips, subtitle tracks, background tracks, and screen captures.

---

## 🤖 2. Script Generation Passes (Ollama)

Creating a technical YouTube Short follows a structured two-pass LLM workflow in `src/services/video_gen.py`:

```
                    ┌──> 1. Planner Pass (Ollama qwen2.5:3b) ──> Timeline Schedule
                    │
Topic Input Query ──┤
                    │
                    └──> 2. Detailer Pass (Ollama Reasoner)  ──> Code Highlights & Camera Focus
```

1. **Pass 1 (Planner)**: Prompt Ollama (`qwen2.5:3b`) to partition a topic into a 40-second timeline schedule containingIntro, Code Highlights, and Explainer scenes in JSON formats.
2. **Pass 2 (Detailer)**: For each `code` scene in the schedule, the reasoner model generates structured code snippets, highlight coordinates (`highlight_lines`), and layout parameters (`camera_focus`).

---

## 🖥️ 3. Playwright Headless visual rendering

To display code blocks cleanly on portrait screens:
* **The HTML Template**: The service compiles the generated code block into an HTML mockup page equipped with `highlight.js` styling (Atom Dark theme).
* **Capture Execution**: Headless Playwright launches a Chromium browser, sets portrait viewports (1080x1920), loads the HTML page, triggers code highlighting, captures a high-resolution screenshot of the `<pre>` tag, and writes the asset to `outputs/screenshot.png`.

---

## ⚙️ 4. Thread-Safe Subprocess Rendering

Generating the final video requires running the Remotion CLI via subprocess:
```bash
bunx remotion render src/index.ts Short --props <timeline_json>
```

### Async Loop Protection
* **The Problem**: Remotion rendering is highly CPU-bound and blocks execution threads. Running it directly inside an async FastAPI route would block the main event loop, causing API requests to hang.
* **Our Solution**: The subprocess execution is wrapped inside a dedicated thread pool using `asyncio.to_thread()`:
  ```python
  # Offload block execution to thread pool to preserve event loop health
  returncode, stderr = await asyncio.to_thread(run_subprocess)
  ```
