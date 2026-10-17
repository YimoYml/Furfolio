import { interpolate } from "remotion";
import {
  useMotionFrame,
  Base,
  Brand,
  C,
  Caption,
  clamp,
  PaperDots,
  Picture,
  Reveal,
} from "../design";
export function Devices() {
  const f = useMotionFrame();
  return (
    <Base bg="#eeece3">
      <PaperDots />
      <Brand />
      <Caption>一个主页，适合不同的屏幕。</Caption>
      <div style={{ position: "absolute", left: 84, top: 236, zIndex: 2 }}>
        <Reveal size={82}>桌面与手机，</Reveal>
        <Reveal delay={8} size={82} color={C.blue}>
          都恰好。
        </Reveal>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.7,
            marginTop: 35,
            opacity: interpolate(f, [20, 38], [0, 1], clamp),
          }}
        >
          头像、喜好、画廊，
          <br />
          慢慢展开你的世界。
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 600,
          width: 770,
          height: 369,
          background: C.paper,
          border: "1px solid #17191435",
          padding: 9,
          translate: `${interpolate(f, [0, 34], [-45, 0], clamp)}px 0`,
        }}
      >
        <div
          style={{
            height: 20,
            fontSize: 10,
            letterSpacing: 1,
            padding: "3px 6px",
            color: "#656a5c",
          }}
        >
          YOUR OWN LITTLE WORLD
        </div>
        <div style={{ height: 330, overflow: "hidden" }}>
          <Picture file="y2k-desktop.jpg" style={{ width: 750, height: 562 }} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 126,
          top: 163,
          width: 367,
          height: 821,
          border: "9px solid #171914",
          borderRadius: 37,
          background: C.ink,
          overflow: "hidden",
          translate: `0 ${interpolate(f, [9, 38], [100, 0], clamp)}px`,
          opacity: interpolate(f, [9, 26], [0, 1], clamp),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 349,
            height: 803,
            overflow: "hidden",
            background: C.lime,
          }}
        >
          <Picture
            file="y2k-mobile.jpg"
            style={{
              width: 349,
              height: 2420,
              translate: `0 ${interpolate(f, [43, 130], [0, -1040], clamp)}px`,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 11,
            left: 136,
            width: 80,
            height: 18,
            borderRadius: 12,
            background: C.ink,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 115,
            width: 120,
            height: 4,
            borderRadius: 3,
            background: "#fff",
          }}
        />
      </div>
    </Base>
  );
}

