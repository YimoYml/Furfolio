import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, clamp } from "../design";

const steps = [
  { title: "设计", focus: "自动保存至本地", detail: "不用会代码。随时回到你的草稿。", number: "01" },
  { title: "注册", focus: "设计完成，再创建账号", detail: "准备好发布时，再注册。", number: "02" },
  { title: "发布", focus: "专属链接，分享你的世界", detail: "让大家看见，一个属于你的地方。", number: "03" },
];

export function FlowV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const active = Math.min(2, Math.floor(t / 2));
  const local = t - active * 2;
  return (
    <Base bg={C.cyber} color="#f1f4f5">
      <div style={{ position: "absolute", inset: -50,
        backgroundImage: "linear-gradient(#79edf508 1px, transparent 1px),linear-gradient(90deg,#79edf508 1px, transparent 1px)",
        backgroundSize: "100px 100px", translate: `${t * 3}px ${t * 2}px` }} />
      <Brand dark />
      <div style={{ position: "absolute", left: 84, top: 116, fontSize: 28, color: "#93a9b4" }}>
        在准备好的时候，再让大家看见。
      </div>
      <div style={{ position: "absolute", left: 84, top: 230,
        opacity: interpolate(t, [0, 0.25], [0, 1], clamp),
        translate: `0 ${interpolate(t, [0, 0.46], [35, 0], clamp)}px` }}>
        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.16, letterSpacing: -3.3 }}>先设计，</div>
        <div style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.16, letterSpacing: -3.3, color: C.cyan }}>后注册。</div>
      </div>
      <div style={{ position: "absolute", right: 83, top: 254, fontSize: 194,
        lineHeight: 1, fontWeight: 900, letterSpacing: -12, color: C.cyan,
        opacity: 0.1 }}>{steps[active].number}</div>
      <div style={{ position: "absolute", left: 84, right: 84, top: 569, display: "flex", gap: 28 }}>
        {steps.map((step, i) => (
          <div key={step.title} style={{ flex: 1, borderTop: "1px solid #79edf53b", paddingTop: 21, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: -2, height: 3, background: C.cyan,
              width: i < active ? "100%" : i === active ? `${Math.min(100, local / 2 * 100)}%` : "0%" }} />
            <div style={{ fontSize: 43, fontWeight: 700, color: i === active ? C.cyan : "#819099" }}>
              <span style={{ fontSize: 24, marginRight: 18, fontWeight: 400 }}>{step.number}</span>{step.title}
              {i < 2 ? <span style={{ marginLeft: 35, fontSize: 32, color: "#49616b" }}>→</span> : null}
            </div>
          </div>
        ))}
      </div>
      <div key={active} style={{ position: "absolute", left: 84, right: 84, top: 752,
        opacity: interpolate(local, [0, 0.18], [0.3, 1], clamp),
        translate: `0 ${interpolate(local, [0, 0.3], [16, 0], clamp)}px` }}>
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1, color: C.cyan }}>{steps[active].focus}</div>
        <div style={{ fontSize: 36, marginTop: 22, color: "#c6d1d6" }}>{steps[active].detail}</div>
      </div>
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 69, height: 1, background: "#79edf528" }} />
      <div style={{ position: "absolute", left: 84, bottom: 92, fontSize: 23, letterSpacing: 2, color: "#93a9b4" }}>
        CREATE FIRST. SIGN UP WHEN YOU ARE READY.
      </div>
    </Base>
  );
}
