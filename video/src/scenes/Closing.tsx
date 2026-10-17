import { interpolate } from "remotion";
import {
  useMotionFrame,
  Base,
  C,
  clamp,
  PaperDots,
  Reveal,
  Ticker,
} from "../design";
export function Closing() {
  const f = useMotionFrame();
  return (
    <Base bg={C.lime}>
      <PaperDots />
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 84,
          fontSize: 28,
          fontWeight: 500,
        }}
      >
        FOR EVERY KIND OF YOU.
      </div>
      <div style={{ position: "absolute", top: 254, left: 84 }}>
        <Reveal size={82}>只需要，成为你自己。</Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 74,
          top: 425,
          fontSize: 174,
          fontWeight: 900,
          letterSpacing: -11,
          color: C.blue,
          opacity: interpolate(f, [12, 31], [0, 1], clamp),
          translate: `0 ${interpolate(f, [12, 39], [45, 0], clamp)}px`,
        }}
      >
        FURFOLIO.
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 674,
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: -1,
          opacity: interpolate(f, [27, 44], [0, 1], clamp),
        }}
      >
        furfolio.pages.dev
      </div>
      <div
        style={{
          position: "absolute",
          right: 84,
          top: 682,
          fontSize: 30,
          fontWeight: 700,
          padding: "18px 26px",
          background: C.ink,
          color: "#fff",
          opacity: interpolate(f, [38, 55], [0, 1], clamp),
        }}
      >
        开始我的主页 ↗
      </div>
      <Ticker bottom={110} bg={C.ink} />
      <div style={{ position: "absolute", left: 84, bottom: 46, fontSize: 19 }}>
        示例角色素材仅用于演示；你的主页使用个人上传图片。
      </div>
    </Base>
  );
}


