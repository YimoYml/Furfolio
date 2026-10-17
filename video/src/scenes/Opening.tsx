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
  Ticker,
} from "../design";
export function Opening() {
  const f = useMotionFrame();
  return (
    <Base>
      <PaperDots />
      <Brand />
      <Caption>一个属于你的地方。</Caption>
      <div style={{ position: "absolute", left: 84, top: 310, zIndex: 2 }}>
        <Reveal delay={2}>把你的角色，</Reveal>
        <Reveal delay={10}>
          带到<span style={{ color: C.blue }}>网上。</span>
        </Reveal>
        <div
          style={{
            height: 11,
            background: C.lime,
            width: interpolate(f, [27, 48], [0, 420], clamp),
            marginTop: 17,
            rotate: "-1.8deg",
          }}
        />
        <div
          style={{
            fontSize: 30,
            marginTop: 36,
            opacity: interpolate(f, [34, 54], [0, 1], clamp),
          }}
        >
          为 Furry 社群准备的个人主页制作所。
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 800,
          top: 174,
          width: 550,
          height: 690,
          background: C.lime,
          rotate: `${interpolate(f, [10, 42], [8, 3], clamp)}deg`,
          translate: `0 ${interpolate(f, [10, 42], [130, 0], clamp)}px`,
          opacity: interpolate(f, [10, 30], [0, 1], clamp),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 38,
            left: 20,
            fontSize: 220,
            fontWeight: 900,
            color: C.blue,
            letterSpacing: -15,
            lineHeight: 1,
          }}
        >
          CHE
        </div>
        <Picture
          file="che-cutout.png"
          style={{
            position: "absolute",
            height: 680,
            width: 490,
            bottom: 0,
            right: -5,
            objectFit: "contain",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 28,
            left: 25,
            fontSize: 29,
            fontWeight: 900,
          }}
        >
          澈 / CHE
        </div>
      </div>
      <Ticker bottom={110} rotate={-1} />
      <div
        style={{
          position: "absolute",
          bottom: 45,
          left: 84,
          fontSize: 20,
          letterSpacing: 2,
        }}
      >
        YOUR CHARACTER. YOUR COLORS.
      </div>
    </Base>
  );
}


