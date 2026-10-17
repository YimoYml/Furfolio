import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { OpeningV3 } from "./v3/OpeningV3";
import { StylesV2 } from "./v2/StylesV2";
import { EditorV3 } from "./v3/EditorV3";
import { ColorsV3 } from "./v3/ColorsV3";
import { DevicesV2 } from "./v2/DevicesV2";
import { FlowV3 } from "./v3/FlowV3";
import { ClosingV2 } from "./v2/ClosingV2";

export function PromoV3() {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence name="角色开场 · 多停留1.5秒" durationInFrames={3.5 * fps} premountFor={fps}>
          <OpeningV3 />
        </Series.Sequence>
        <Series.Sequence name="四种设计风格" durationInFrames={4 * fps} premountFor={fps}>
          <StylesV2 />
        </Series.Sequence>
        <Series.Sequence name="修改文案 · 同步实时预览" durationInFrames={6.5 * fps} premountFor={fps}>
          <EditorV3 />
        </Series.Sequence>
        <Series.Sequence name="八组配色 · 统一每0.5秒切换" durationInFrames={4 * fps} premountFor={fps}>
          <ColorsV3 />
        </Series.Sequence>
        <Series.Sequence name="桌面与手机" durationInFrames={4 * fps} premountFor={fps}>
          <DevicesV2 />
        </Series.Sequence>
        <Series.Sequence name="先设计后注册 · 简洁三步" durationInFrames={4 * fps} premountFor={fps}>
          <FlowV3 />
        </Series.Sequence>
        <Series.Sequence name="开始你的主页" durationInFrames={4 * fps} premountFor={fps}>
          <ClosingV2 />
        </Series.Sequence>
      </Series>
      <Audio name="已确认配乐 · Minimal Groove V4" src={staticFile("audio/furfolio-minimal-groove-v4.wav")} premountFor={fps} />
    </AbsoluteFill>
  );
}
