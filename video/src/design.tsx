import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  delayRender,
  continueRender,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";

export const C = {
  paper: "#f7f5ee",
  ink: "#171914",
  lime: "#d5ec42",
  blue: "#2949dd",
  cyber: "#080f15",
  cyan: "#79edf5",
  rust: "#b3452b",
};
export const settle = Easing.bezier(0.22, 1, 0.36, 1);
export const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: settle,
};
// Design keyframes use a 30-unit-per-second clock, independent of export fps.
export function useMotionFrame() {
  return (useCurrentFrame() * 30) / useVideoConfig().fps;
}
export const chinese =
  "把你的角色带到网上一个属于地方风格不止一种拼贴世界留白也是表达另一频率写成自己的杂志放进真实文字图片喜欢事随心配色桌面与手机都恰好先设计后注册不用会代码自动保存本地开始我的主页发布分享澈轻盈动效适合社群音乐摄影游戏" +
  "颜色随你每一种都像青柠钴蓝粉纸墨奶油橘红冰深紫藤葡萄杏松绿玫瑰莓果晴空海推荐配色给头像画廊展开世界在准备好的时候再让大家看见至时回草稿完成创建账号专属链接只需要成为自己示例角色素材仅演使用人传无边编辑预览从到调整选写字排版步能屏幕" +
  "爱板场称次段改跟关光话就句联名模昵签热说题体同系性修已由右着正追左";

let ready: Promise<void> | undefined;
const loadFonts = () =>
  (ready ??= (async () => {
    await Promise.all(
      [400, 700, 900].map((weight) =>
        loadFont({
          family: "Satoshi",
          url: staticFile(`fonts/satoshi-${weight}.woff2`),
          weight: String(weight),
        }),
      ),
    );
    const css = await fetch(staticFile("fonts/notosanssc.css")).then((r) =>
      r.text(),
    );
    const rules = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
    await Promise.all(
      rules.map(async ([, rule]) => {
        const unicode = rule.match(/unicode-range:\s*([^;]+);/)?.[1];
        const file = rule.match(/url\(\.\/([^)]*)\)/)?.[1];
        if (!unicode || !file) return;
        const ranges = unicode.split(",").map((v) =>
          v
            .trim()
            .slice(2)
            .split("-")
            .map((n) => parseInt(n, 16)),
        );
        if (
          ![...chinese].some((ch) =>
            ranges.some(
              ([a, b]) =>
                ch.codePointAt(0)! >= a && ch.codePointAt(0)! <= (b ?? a),
            ),
          )
        )
          return;
        const face = new FontFace(
          "Noto Sans SC",
          `url(${staticFile("fonts/" + file)})`,
          { weight: "100 900", unicodeRange: unicode },
        );
        (
          document.fonts as FontFaceSet & {
            add: (face: FontFace) => FontFaceSet;
          }
        ).add(await face.load());
      }),
    );
  })());
export function FontGate() {
  const [handle] = useState(() => delayRender("Load local Furfolio fonts"));
  useEffect(() => {
    loadFonts().then(() => continueRender(handle));
  }, [handle]);
  return null;
}
export function Base({
  children,
  bg = C.paper,
  color = C.ink,
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
}) {
  return (
    <AbsoluteFill
      style={{
        background: bg,
        color,
        fontFamily: 'Satoshi, "Noto Sans SC", sans-serif',
        overflow: "hidden",
      }}
    >
      <FontGate />
      {children}
    </AbsoluteFill>
  );
}
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 58,
        fontSize: 30,
        fontWeight: 900,
        letterSpacing: -1.4,
        color: dark ? "#fff" : C.ink,
      }}
    >
      FURFOLIO<span style={{ color: dark ? C.cyan : C.blue }}>.</span>
    </div>
  );
}
export function Caption({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  const f = useMotionFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 84,
        top: 113,
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: 0.5,
        color: dark ? "#93a9b4" : "#686c61",
        opacity: interpolate(f, [8, 25], [0, 1], clamp),
      }}
    >
      {children}
    </div>
  );
}
export function Reveal({
  children,
  delay = 0,
  size = 92,
  color,
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}) {
  const f = useMotionFrame();
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <div
        style={{
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1.19,
          letterSpacing: -3.3,
          color,
          translate: `0 ${interpolate(f, [delay, delay + 26], [115, 0], clamp)}%`,
          opacity: interpolate(f, [delay, delay + 18], [0, 1], clamp),
        }}
      >
        {children}
      </div>
    </div>
  );
}
export function Picture({
  file,
  style = {},
}: {
  file: string;
  style?: React.CSSProperties;
}) {
  const { fps } = useVideoConfig();
  return (
    <CanvasImage
      premountFor={fps}
      src={staticFile("images/" + file)}
      style={style}
    />
  );
}
export function Ticker({
  text = "FOR EVERY KIND OF YOU /",
  bg = C.blue,
  color = "#fff",
  top,
  bottom = 0,
  rotate = 0,
}: {
  text?: string;
  bg?: string;
  color?: string;
  top?: number;
  bottom?: number;
  rotate?: number;
}) {
  const f = useMotionFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: -100,
        right: -100,
        ...(top !== undefined ? { top } : { bottom }),
        height: 54,
        background: bg,
        color,
        rotate: `${rotate}deg`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 4,
          translate: `${-f * 1.25}px 0`,
        }}
      >
        {Array(14)
          .fill(text + "　 ")
          .join("")}
      </div>
    </div>
  );
}
export function PaperDots({ color = C.ink }: { color?: string }) {
  return (
    <AbsoluteFill
      style={{
        opacity: 0.065,
        backgroundImage: `radial-gradient(${color} .85px,transparent .85px)`,
        backgroundSize: "6px 6px",
        pointerEvents: "none",
      }}
    />
  );
}
export function Cursor({
  x,
  y,
  click = false,
}: {
  x: number;
  y: number;
  click?: boolean;
}) {
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 5 }}>
      {click ? (
        <div
          style={{
            position: "absolute",
            left: -14,
            top: -14,
            width: 50,
            height: 50,
            border: "2px solid " + C.blue,
            borderRadius: "50%",
            opacity: 0.4,
          }}
        />
      ) : null}
      <svg width="38" height="44" viewBox="0 0 38 44">
        <path
          d="M3 2 L3 33 L12 26 L20 42 L28 37 L20 23 L34 22Z"
          fill="#fff"
          stroke={C.ink}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
