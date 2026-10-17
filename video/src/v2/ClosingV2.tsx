import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, C, clamp, PaperDots, Ticker } from "../design";

export function ClosingV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <Base bg={C.lime}>
      <PaperDots />
      <div style={{ position: "absolute", top: 90, left: 84, fontSize: 28, fontWeight: 500 }}>
        FOR EVERY KIND OF YOU.
      </div>
      <div style={{ position: "absolute", top: 239, left: 84, fontSize: 82,
        fontWeight: 900, letterSpacing: -3, lineHeight: 1.2,
        translate: `0 ${interpolate(t, [0, 0.4], [40, 0], clamp)}px`,
        opacity: interpolate(t, [0, 0.26], [0, 1], clamp) }}>
        只需要，成为你自己。
      </div>
      <div style={{ position: "absolute", left: 75, top: 410, fontSize: 174,
        fontWeight: 900, letterSpacing: -11, color: C.blue,
        opacity: interpolate(t, [0.08, 0.35], [0, 1], clamp),
        translate: `0 ${interpolate(t, [0.08, 0.54], [32, 0], clamp)}px` }}>FURFOLIO.</div>
      <div style={{ position: "absolute", left: 84, top: 675, fontSize: 48,
        fontWeight: 700, letterSpacing: -1,
        opacity: interpolate(t, [0.2, 0.55], [0, 1], clamp) }}>furfolio.pages.dev</div>
      <div style={{ position: "absolute", right: 84, top: 677, fontSize: 34,
        fontWeight: 700, padding: "17px 25px", background: C.ink, color: "#fff",
        opacity: interpolate(t, [0.28, 0.64], [0, 1], clamp),
        translate: `0 ${interpolate(t, [0.28, 0.7], [14, 0], clamp)}px` }}>
        开始我的主页 ↗
      </div>
      <Ticker bottom={110} bg={C.ink} />
      <div style={{ position: "absolute", left: 84, bottom: 45, fontSize: 23 }}>
        示例角色素材仅用于演示；你的主页使用个人上传图片。
      </div>
    </Base>
  );
}
