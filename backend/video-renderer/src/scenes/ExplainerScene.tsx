import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export interface ExplainerSceneProps {
  content: string;
}

export const ExplainerScene: React.FC<ExplainerSceneProps> = ({ content }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0]
  );

  return (
    <AbsoluteFill style={{
      backgroundColor: "#0d0f14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px",
      opacity
    }}>
      <h1 style={{
        color: "white",
        fontSize: "64px",
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        lineHeight: "1.2",
        fontWeight: "800",
        background: "linear-gradient(to right, #fff, #999)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }}>
        {content}
      </h1>
    </AbsoluteFill>
  );
};
