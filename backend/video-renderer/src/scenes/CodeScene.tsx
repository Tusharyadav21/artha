import React from "react";
import { 
  AbsoluteFill, 
  interpolate, 
  spring, 
  useCurrentFrame, 
  useVideoConfig 
} from "remotion";

export interface CodeSceneProps {
  content: string;
  code?: string;
  language?: string;
  highlight_lines?: number[];
  camera_focus?: number[];
}

export const CodeScene: React.FC<CodeSceneProps> = ({ 
  code, 
  content, 
  highlight_lines 
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Smooth cinematic zoom (Ken Burns)
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [1, 1.15],
    { extrapolateRight: "clamp" }
  );

  // Entrance animation
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ 
      opacity,
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "60px"
    }}>
      <div style={{
        transform: `scale(${scale})`,
        width: "100%",
        backgroundColor: "#1e1e1e",
        borderRadius: "24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        {/* Mocking code view for now, will integrate Shiki in next step */}
        <pre style={{
          padding: "40px",
          color: "#d4d4d4",
          fontSize: "28px",
          fontFamily: "JetBrains Mono, monospace",
          lineHeight: "1.5"
        }}>
          <code>{code}</code>
        </pre>
      </div>

      {/* Narrative Subtitle Overlay */}
      <div style={{
        position: "absolute",
        bottom: "150px",
        left: "60px",
        right: "60px",
        textAlign: "center",
        color: "white",
        fontSize: "42px",
        fontWeight: "600",
        textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        fontFamily: "Inter, sans-serif"
      }}>
        {content}
      </div>
    </AbsoluteFill>
  );
};
