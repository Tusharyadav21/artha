import React from "react";
import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Short"
        component={ShortVideo}
        durationInFrames={1200} // 40 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Technical Short",
          scenes: [
            {
              type: "code",
              start: 0,
              end: 10,
              content: "Let's look at this code snippet.",
              code: "print('Hello World')",
              language: "python"
            }
          ]
        }}
      />
    </>
  );
};
