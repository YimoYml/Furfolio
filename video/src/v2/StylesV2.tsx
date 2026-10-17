import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, clamp, Picture } from "../design";

const themes = [
  { file: "y2k-desktop.jpg", bg: C.lime, color: C.blue, name: "Y2K COLLAGE", zh: "拼贴你的世界", letter: "A" },
  { file: "minimal-desktop.jpg", bg: "#e9e9e5", color: "#344b40", name: "SOFT MINIMAL", zh: "留白，也是一种表达", letter: "B" },
  { file: "cyber-desktop.jpg", bg: C.cyber, color: C.cyan, name: "HARD CYBER", zh: "另一种频率", letter: "C" },
  { file: "editorial-desktop.jpg", bg: "#f2eadb", color: C.rust, name: "PAPER & INK", zh: "写成一本自己的杂志", letter: "D" },
];

export function StylesV2() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const i = Math.min(3, Math.floor(t));
  const theme = themes[i];
  const local = t - i;
  return (
    <Base bg={theme.bg} color={theme.color}>
      <Brand dark={i === 2} />
      <div style={{ position: "absolute", right: 84, top: 60, fontSize: 36, fontWeight: 700 }}>
        你的风格，不止一种。
      </div>
      <div style={{ position: "absolute", left: 84, top: 158, fontSize: 49,
        fontWeight: 900, letterSpacing: -1 }}>{theme.name}</div>
      <div style={{ position: "absolute", right: 85, top: 142, fontSize: 86,
        fontWeight: 900, lineHeight: 1, opacity: 0.35 }}>{theme.letter}</div>
      <div style={{ position: "absolute", left: 84, top: 250, width: 1272, height: 650,
        overflow: "hidden", border: `1px solid ${theme.color}55`, background: theme.bg,
        translate: `0 ${interpolate(local, [0, 0.22], [14, 0], clamp)}px` }}>
        <Picture file={theme.file} style={{ width: 1272, height: 954, objectFit: "cover",
          objectPosition: "top", scale: interpolate(local, [0, 1], [1.018, 1], clamp) }} />
      </div>
      <div style={{ position: "absolute", left: 84, bottom: 91, fontSize: 36, fontWeight: 700 }}>
        {theme.zh}
      </div>
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 62,
        display: "flex", gap: 12 }}>
        {themes.map((_, n) => (
          <div key={n} style={{ flex: 1, height: 4, background: theme.color,
            opacity: n <= i ? 0.65 : 0.15 }}>
            {n === i ? <div style={{ width: `${Math.min(100, local * 100)}%`, height: 4,
              background: theme.color }} /> : null}
          </div>
        ))}
      </div>
    </Base>
  );
}
