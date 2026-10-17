import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Opening } from "./scenes/Opening";
import { Styles } from "./scenes/Styles";
import { Editor } from "./scenes/Editor";
import { Devices } from "./scenes/Devices";
import { Flow } from "./scenes/Flow";
import { Closing } from "./scenes/Closing";
export function Promo() {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence
          name="角色开场"
          durationInFrames={4 * fps}
          premountFor={fps}
        >
          <Opening />
        </Series.Sequence>
        <Series.Sequence
          name="四种设计风格"
          durationInFrames={6 * fps}
          premountFor={fps}
        >
          <Styles />
        </Series.Sequence>
        <Series.Sequence
          name="真实编辑与配色"
          durationInFrames={6 * fps}
          premountFor={fps}
        >
          <Editor />
        </Series.Sequence>
        <Series.Sequence
          name="桌面与手机"
          durationInFrames={5 * fps}
          premountFor={fps}
        >
          <Devices />
        </Series.Sequence>
        <Series.Sequence
          name="先设计后注册"
          durationInFrames={5 * fps}
          premountFor={fps}
        >
          <Flow />
        </Series.Sequence>
        <Series.Sequence
          name="开始你的主页"
          durationInFrames={4 * fps}
          premountFor={fps}
        >
          <Closing />
        </Series.Sequence>
      </Series>
      <Audio
        name="原创配乐 · Own Colors"
        src={staticFile("audio/furfolio-bed.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
}
