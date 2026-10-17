import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, Cursor, Picture } from "../design";

const soft = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

export function EditorV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  return (
    <Base>
      <Brand />
      <div style={{ position: "absolute", right: 84, top: 62, fontSize: 28, color: "#626657" }}>
        无需代码，边编辑边预览。
      </div>
      <div style={{
        position: "absolute", left: 84, top: 168, fontSize: 92,
        fontWeight: 900, letterSpacing: -4, lineHeight: 1.15,
        translate: `0 ${interpolate(frame, [0, 0.36 * fps], [28, 0], soft)}px`,
        opacity: interpolate(frame, [0, 0.2 * fps], [0.3, 1], soft),
      }}>
        {seconds < 2 ? "从素材，到主页。" : "边调整，边看见。"}
      </div>
      <div style={{
        position: "absolute", left: 84, top: 311, width: 1272, height: 630,
        background: "#ecebe3", border: "1px solid #17191435", overflow: "hidden",
        translate: `0 ${interpolate(frame, [0, 0.44 * fps], [24, 0], soft)}px`,
      }}>
        <div style={{ height: 38, display: "flex", alignItems: "center", gap: 7, paddingLeft: 16,
          background: C.paper, borderBottom: "1px solid #17191425" }}>
          {[0, 1, 2].map((n) => <div key={n} style={{ width: 7, height: 7, borderRadius: "50%", background: "#969a8b" }} />)}
          <span style={{ fontSize: 14, marginLeft: 15 }}>furfolio.pages.dev / editor</span>
        </div>
        <div style={{ position: "relative", height: 590, overflow: "hidden" }}>
          <Picture file="editor-lime.jpg" style={{
            width: 1272, height: 954, transformOrigin: "74% 28%",
            scale: interpolate(frame, [1.5 * fps, 3.6 * fps], [1, 1.045], soft),
            translate: `0 ${interpolate(frame, [1.5 * fps, 3.6 * fps], [0, -28], soft)}px`,
          }} />
        </div>
      </div>
      <Cursor
        x={interpolate(frame, [0, 0.7 * fps, 1.5 * fps, 2.3 * fps, 3.5 * fps], [1150, 968, 968, 460, 480], soft)}
        y={interpolate(frame, [0, 0.7 * fps, 1.5 * fps, 2.3 * fps, 3.5 * fps], [720, 545, 545, 690, 696], soft)}
      />
      <div style={{ position: "absolute", left: 84, right: 84, top: 978,
        display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 35, fontWeight: 700 }}>
        <span>选图、写字、调排版。</span>
        <span style={{ color: C.blue }}>每一步，都能看见。</span>
      </div>
    </Base>
  );
}
