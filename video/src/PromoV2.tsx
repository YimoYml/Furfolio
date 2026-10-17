import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { OpeningV2 } from "./v2/OpeningV2";
import { StylesV2 } from "./v2/StylesV2";
import { EditorV2 } from "./v2/EditorV2";
import { ColorsV2 } from "./v2/ColorsV2";
import { DevicesV2 } from "./v2/DevicesV2";
import { FlowV2 } from "./v2/FlowV2";
import { ClosingV2 } from "./v2/ClosingV2";

export function PromoV2() {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Series>
        <Series.Sequence name="角色开场 · 直接入场" durationInFrames={2 * fps} premountFor={fps}>
          <OpeningV2 />
        </Series.Sequence>
        <Series.Sequence name="四种风格 · 每秒一种" durationInFrames={4 * fps} premountFor={fps}>
          <StylesV2 />
        </Series.Sequence>
        <Series.Sequence name="编辑与实时预览" durationInFrames={4 * fps} premountFor={fps}>
          <EditorV2 />
        </Series.Sequence>
        <Series.Sequence name="八组配色 · 0.5–1秒切换" durationInFrames={6 * fps} premountFor={fps}>
          <ColorsV2 />
        </Series.Sequence>
        <Series.Sequence name="桌面与手机" durationInFrames={4 * fps} premountFor={fps}>
          <DevicesV2 />
        </Series.Sequence>
        <Series.Sequence name="先设计后注册 · 三步推进" durationInFrames={6 * fps} premountFor={fps}>
          <FlowV2 />
        </Series.Sequence>
        <Series.Sequence name="开始你的主页" durationInFrames={4 * fps} premountFor={fps}>
          <ClosingV2 />
        </Series.Sequence>
      </Series>
      <Audio name="已确认配乐 · Ambient House V3" src={staticFile("audio/furfolio-ambient-house-v3.wav")} premountFor={fps} />
    </AbsoluteFill>
  );
}
