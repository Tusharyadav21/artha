import React from "react";
import { 
  AbsoluteFill, 
  Series, 
  interpolate, 
  useCurrentFrame, 
  useVideoConfig 
} from "remotion";
import { CodeScene } from "./scenes/CodeScene";
import { ExplainerScene } from "./scenes/ExplainerScene";

export interface Scene {
  type: "intro" | "code" | "explainer";
  start: number;
  end: number;
  content: string;
  code?: string;
  language?: string;
  highlight_lines?: number[];
  camera_focus?: number[];
}

export interface ShortVideoProps {
  title: string;
  scenes: Scene[];
}

export const ShortVideo: React.FC<ShortVideoProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0f14" }}>
      <Series>
        {scenes.map((scene, i) => {
          const durationInFrames = Math.max(1, (scene.end - scene.start) * fps);
          
          return (
            <Series.Sequence key={i} durationInFrames={durationInFrames}>
              {scene.type === "code" ? (
                <CodeScene {...scene} />
              ) : (
                <ExplainerScene {...scene} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
