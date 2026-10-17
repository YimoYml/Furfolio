import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, clamp, PaperDots, Picture } from "../design";

export function DevicesV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <Base bg="#eeece3">
      <PaperDots />
      <Brand />
      <div style={{ position: "absolute", left: 84, top: 116, fontSize: 28, color: "#686c61" }}>
        一个主页，适合不同的屏幕。
      </div>
      <div style={{ position: "absolute", left: 84, top: 236, zIndex: 2,
        opacity: interpolate(t, [0, 0.26], [0, 1], clamp),
        translate: `0 ${interpolate(t, [0, 0.4], [28, 0], clamp)}px` }}>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.2, letterSpacing: -3 }}>桌面与手机，</div>
        <div style={{ fontSize: 84, fontWeight: 900, lineHeight: 1.2, letterSpacing: -3, color: C.blue }}>都恰好。</div>
        <div style={{ fontSize: 36, lineHeight: 1.55, marginTop: 29 }}>
          头像、喜好、画廊，<br />展开你的世界。
        </div>
      </div>
      <div style={{ position: "absolute", left: 84, top: 615, width: 770, height: 354,
        background: C.paper, border: "1px solid #17191435", padding: 9,
        translate: `${interpolate(t, [0, 0.45], [-38, 0], clamp)}px 0`,
        opacity: interpolate(t, [0, 0.24], [0, 1], clamp) }}>
        <div style={{ height: 20, fontSize: 11, letterSpacing: 1, padding: "3px 6px", color: "#656a5c" }}>
          YOUR OWN LITTLE WORLD
        </div>
        <div style={{ height: 315, overflow: "hidden" }}>
          <Picture file="y2k-desktop.jpg" style={{ width: 750, height: 562 }} />
        </div>
      </div>
      <div style={{ position: "absolute", right: 113, top: 155, width: 367, height: 821,
        border: "9px solid #171914", borderRadius: 37, background: C.ink, overflow: "hidden",
        translate: `0 ${interpolate(t, [0.04, 0.5], [60, 0], clamp)}px`,
        opacity: interpolate(t, [0.04, 0.28], [0, 1], clamp) }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 349, height: 803,
          overflow: "hidden", background: C.lime }}>
          <Picture file="y2k-mobile.jpg" style={{ width: 349, height: 2420,
            translate: `0 ${interpolate(t, [1, 1.8, 2.55, 3.3], [0, -550, -960, -1390], clamp)}px` }} />
        </div>
        <div style={{ position: "absolute", top: 11, left: 136, width: 80, height: 18,
          borderRadius: 12, background: C.ink }} />
        <div style={{ position: "absolute", bottom: 12, left: 115, width: 120, height: 4,
          borderRadius: 3, background: "#fff" }} />
      </div>
    </Base>
  );
}
