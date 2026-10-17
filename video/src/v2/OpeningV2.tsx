import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, clamp, PaperDots, Picture, Ticker } from "../design";

export function OpeningV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <Base>
      <PaperDots />
      <Brand />
      <div style={{ position: "absolute", left: 84, top: 116, fontSize: 28, color: "#686c61" }}>
        一个属于你的地方。
      </div>
      <div style={{ position: "absolute", left: 84, top: 278, zIndex: 2 }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 98, fontWeight: 900, lineHeight: 1.22, letterSpacing: -3.3,
            translate: `0 ${interpolate(t, [0, 0.36], [65, 0], clamp)}px`,
            opacity: interpolate(t, [0, 0.22], [0, 1], clamp) }}>
            把你的角色，
          </div>
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 98, fontWeight: 900, lineHeight: 1.22, letterSpacing: -3.3,
            translate: `0 ${interpolate(t, [0.06, 0.46], [72, 0], clamp)}px`,
            opacity: interpolate(t, [0.06, 0.29], [0, 1], clamp) }}>
            带到<span style={{ color: C.blue }}>网上。</span>
          </div>
        </div>
        <div style={{ height: 11, width: interpolate(t, [0.18, 0.52], [0, 420], clamp),
          background: C.lime, marginTop: 19, rotate: "-1.8deg" }} />
        <div style={{ fontSize: 36, lineHeight: 1.5, marginTop: 30,
          opacity: interpolate(t, [0.24, 0.55], [0, 1], clamp) }}>
          给 Furry 社群的<br />个人主页制作所。
        </div>
      </div>
      <div style={{ position: "absolute", left: 805, top: 160, width: 530, height: 710,
        background: C.lime,
        rotate: `${interpolate(t, [0, 0.52], [6, 2.5], clamp)}deg`,
        translate: `0 ${interpolate(t, [0, 0.52], [68, 0], clamp)}px`,
        opacity: interpolate(t, [0, 0.25], [0, 1], clamp) }}>
        <div style={{ position: "absolute", top: 34, left: 15, fontSize: 220,
          fontWeight: 900, color: C.blue, letterSpacing: -15, lineHeight: 1 }}>CHE</div>
        <Picture file="che-cutout.png" style={{ position: "absolute", height: 710,
          width: 490, bottom: 0, right: -5, objectFit: "contain" }} />
        <div style={{ position: "absolute", bottom: 25, left: 24, fontSize: 32, fontWeight: 900 }}>
          澈 / CHE
        </div>
      </div>
      <Ticker bottom={105} rotate={-1} />
      <div style={{ position: "absolute", bottom: 44, left: 84, fontSize: 22, letterSpacing: 2 }}>
        YOUR CHARACTER. YOUR COLORS.
      </div>
    </Base>
  );
}
