import { interpolate } from "remotion";
import { useMotionFrame, Base, Brand, C, clamp, Picture } from "../design";
const themes = [
  {
    file: "y2k-desktop.jpg",
    bg: C.lime,
    color: C.blue,
    name: "Y2K COLLAGE",
    zh: "拼贴你的世界",
    letter: "A",
  },
  {
    file: "minimal-desktop.jpg",
    bg: "#e9e9e5",
    color: "#344b40",
    name: "SOFT MINIMAL",
    zh: "留白，也是一种表达",
    letter: "B",
  },
  {
    file: "cyber-desktop.jpg",
    bg: C.cyber,
    color: C.cyan,
    name: "HARD CYBER",
    zh: "另一种频率",
    letter: "C",
  },
  {
    file: "editorial-desktop.jpg",
    bg: "#f2eadb",
    color: C.rust,
    name: "PAPER & INK",
    zh: "写成一本自己的杂志",
    letter: "D",
  },
];
export function Styles() {
  const f = useMotionFrame();
  const i = Math.min(3, Math.floor(f / 45));
  const t = themes[i];
  const local = f - i * 45;
  return (
    <Base bg={t.bg} color={t.color}>
      <Brand dark={i === 2} />
      <div
        style={{
          position: "absolute",
          right: 84,
          top: 65,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        你的风格，不止一种。
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 190,
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: -1,
        }}
      >
        {t.name}
      </div>
      <div
        style={{
          position: "absolute",
          right: 84,
          top: 160,
          fontSize: 105,
          fontWeight: 900,
          opacity: 0.25,
        }}
      >
        {t.letter}
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 289,
          width: 1272,
          height: 626,
          overflow: "hidden",
          border: `1px solid ${t.color}55`,
          background: t.bg,
          translate: `0 ${interpolate(local, [0, 16], [35, 0], clamp)}px`,
          opacity: interpolate(local, [0, 10], [0.5, 1], clamp),
        }}
      >
        <Picture
          file={t.file}
          style={{
            width: 1272,
            height: 954,
            objectFit: "cover",
            objectPosition: "top",
            scale: interpolate(local, [0, 45], [1.035, 1]),
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 73,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        {t.zh}
      </div>
      <div
        style={{
          position: "absolute",
          right: 84,
          bottom: 74,
          display: "flex",
          gap: 12,
        }}
      >
        {themes.map((_, n) => (
          <div
            key={n}
            style={{
              width: n === i ? 75 : 24,
              height: 4,
              background: t.color,
              opacity: n === i ? 1 : 0.2,
            }}
          />
        ))}
      </div>
    </Base>
  );
}

