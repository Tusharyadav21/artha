import os
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass
import numpy as np
import soundfile as sf
from playwright.async_api import async_playwright
from moviepy.video.VideoClip import ColorClip, ImageClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.audio.io.AudioFileClip import AudioFileClip
from moviepy.video import fx as vfx
import re
import ast
from src.services.ollama import OllamaClient
from logging import getLogger

logger = getLogger(__name__)

@dataclass
class WordStamp:
    word: str
    start: float
    end: float

class VideoGenService:
    def __init__(self):
        self.ollama = OllamaClient()
        self.output_dir = Path("outputs")
        self.output_dir.mkdir(exist_ok=True)

    async def generate_script(self, topic: str) -> Dict[str, Any]:
        # Pass 1: Planner - High level scene structure and narration
        plan_prompt = f"""
        Plan a 40-second technical YouTube Short about: {topic}.
        Break it into 4-6 specific scenes.
        Respond ONLY with JSON.
        Required keys:
          "title": short title
          "duration": total duration in seconds (exactly 40)
          "scenes": list of objects:
            {{
              "type": "intro" | "code" | "explainer",
              "content": "the full spoken narration for this scene",
              "start": start_time_seconds,
              "end": end_time_seconds
            }}
        """
        plan_response = await self.ollama.generate(
            plan_prompt, 
            model_name=self.ollama.settings.ollama_model_planner,
            format="json"
        )
        plan = self._parse_json(plan_response)

        # Pass 2: Detailer - Code generation and camera movements
        detailed_scenes = []
        for scene in plan["scenes"]:
            if scene["type"] == "code":
                code_prompt = f"""
                Generate a concise Python code snippet for this scene's topic: {topic}
                Context: {scene['content']}
                Respond ONLY with JSON:
                {{
                  "code": "the code",
                  "highlight_lines": [line_numbers],
                  "camera_focus": [start_line, end_line]
                }}
                """
                detail_response = await self.ollama.generate(
                    code_prompt,
                    model_name=self.ollama.settings.ollama_model_reasoner,
                    format="json"
                )
                details = self._parse_json(detail_response)
                scene.update(details)
            detailed_scenes.append(scene)

        plan["scenes"] = detailed_scenes
        return plan

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Parse JSON from LLM response with cleanup and extraction."""
        original_text = text
        text = text.strip()
        
        # 1. Extract from markdown fences if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        # 2. Find first { and last } 
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end+1]
        
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # 3. Attempt to fix common issues: single quotes instead of double quotes
            # ast.literal_eval is safer than regex for single-quoted Python-like dicts
            try:
                return ast.literal_eval(text)
            except Exception:
                try:
                    # Final fallback: naive regex replacement
                    fixed_text = re.sub(r"'(.*?)'", r'"\1"', text)
                    return json.loads(fixed_text)
                except Exception:
                    logger.error(f"Failed to parse JSON from LLM. Raw text: {original_text}")
                    raise

    async def synthesize_voice(self, text: str, voice: str = "af_heart", speed: float = 1.1) -> str:
        output_path = self.output_dir / "audio.wav"
        
        # Calculate duration based on word count (avg 150 words per minute)
        words = text.split()
        duration_secs = max(5.0, len(words) / (150 / 60))
        
        logger.debug(f"Synthesizing voice (Mock): {len(words)} words, estimated duration {duration_secs:.2f}s")
        
        # Generate silence instead of noise to avoid "heeez" sound
        sample_rate = 44100
        data = np.zeros(int(sample_rate * duration_secs))
        sf.write(output_path, data, sample_rate)
        
        return str(output_path)

    async def render_visuals(self, code: str, language: str = "python", theme: str = "atom-one-dark", bg_color: str = "#0d0f14") -> str:
        output_path = self.output_dir / "screenshot.png"
        
        template = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/{theme}.min.css">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
            <style>
                body {{ background: {bg_color}; padding: 40px; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }}
                pre code.hljs {{ border-radius: 12px; font-size: 24px; padding: 40px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }}
            </style>
        </head>
        <body>
            <pre><code class="language-{language}">{code}</code></pre>
            <script>hljs.highlightAll();</script>
        </body>
        </html>
        """
        
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(viewport={"width": 1080, "height": 1920})
            await page.set_content(template)
            await asyncio.sleep(0.5) # Wait for highlight.js
            await page.locator("pre").screenshot(path=output_path)
            await browser.close()
            
        return str(output_path)

    async def assemble_video(self, timeline: Dict[str, Any], output_name: str = "final_short.mp4") -> str:
        output_path = self.output_dir / output_name

        import subprocess
        import json

        # Prepare the timeline data as JSON for Remotion
        props = json.dumps(timeline)

        # Construct the Remotion render command
        cmd = [
            "npx", "remotion", "render",
            "src/index.ts", "Short",
            str(output_path.absolute()),
            "--props", props
        ]

        # Find browser executable
        browser_path = self._find_browser()
        if browser_path:
            cmd.extend(["--browser-executable", browser_path])
        else:
            logger.warning("No browser executable found, Remotion may attempt to download one")


        logger.info(f"Starting Remotion render for {output_name}")

        try:
            # Run subprocess in thread pool to avoid blocking the event loop
            def run_subprocess():
                # Determine the video-renderer directory path
                video_renderer_dir = Path(__file__).parent.parent.parent / "video-renderer"
                logger.debug(f"Using video-renderer directory: {video_renderer_dir}")

                if not video_renderer_dir.exists():
                    raise Exception(f"video-renderer directory not found at {video_renderer_dir}")

                process = subprocess.Popen(
                    cmd,
                    cwd=str(video_renderer_dir),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = process.communicate()
                return process.returncode, stderr

            returncode, stderr = await asyncio.to_thread(run_subprocess)

            if returncode != 0:
                logger.error(f"Remotion error: {stderr}")
                raise Exception(f"Remotion rendering failed: {stderr}")

            logger.info(f"Remotion render complete: {output_path}")
            return str(output_path)
        except Exception as e:
            logger.error(f"Failed to assemble video: {str(e)}")
            raise
            
    def _find_browser(self) -> str | None:
        """Find the Chrome/Chromium executable in common paths."""
        # 1. Look in PLAYWRIGHT_BROWSERS_PATH
        env_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
        search_paths = [Path(env_path)] if env_path else []
        search_paths.append(Path("/ms-playwright"))
        
        for base_path in search_paths:
            if not base_path.exists():
                continue
                
            logger.debug(f"Searching for browser in {base_path}")
            # Playwright structure: <browser>-<revision>/chrome-linux/chrome
            # We search recursively for any file named 'chrome' or 'chromium'
            for pattern in ["**/chrome", "**/chromium"]:
                for p in base_path.glob(pattern):
                    if p.is_file() and os.access(p, os.X_OK):
                        logger.debug(f"Found browser executable: {p}")
                        return str(p)
        
        # 2. Fallback to common system paths
        fallbacks = [
            "/usr/bin/google-chrome",
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/usr/bin/chrome"
        ]
        for path in fallbacks:
            p = Path(path)
            if p.exists() and os.access(p, os.X_OK):
                logger.debug(f"Found system browser: {p}")
                return str(p)
        
        logger.error("No browser executable found in search paths or system fallbacks")
        return None
