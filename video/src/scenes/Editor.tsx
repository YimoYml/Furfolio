import { interpolate } from "remotion";
import {
  useMotionFrame,
  Base,
  Brand,
  C,
  Caption,
  clamp,
  Cursor,
  Picture,
  Reveal,
} from "../design";
export function Editor() {
  const f = useMotionFrame();
  return (
    <Base>
      <Brand />
      <Caption>不需要会写代码。</Caption>
      <div style={{ position: "absolute", left: 84, top: 180 }}>
        <Reveal size={76}>放进真实的你。</Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 316,
          width: 1272,
          height: 644,
          border: "1px solid #17191430",
          overflow: "hidden",
          background: "#ecebe3",
          translate: `0 ${interpolate(f, [8, 36], [55, 0], clamp)}px`,
          opacity: interpolate(f, [8, 25], [0, 1], clamp),
        }}
      >
        <div
          style={{
            height: 38,
            display: "flex",
            alignItems: "center",
            gap: 7,
            paddingLeft: 16,
            borderBottom: "1px solid #17191425",
            background: C.paper,
          }}
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                height: 7,
                width: 7,
                background: "#9c9e91",
                borderRadius: "50%",
              }}
            />
          ))}
          <span style={{ fontSize: 13, marginLeft: 15 }}>
            furfolio.pages.dev / editor
          </span>
        </div>
        <div style={{ position: "relative", width: 1272, height: 954 }}>
          <Picture
            file="editor-lime.jpg"
            style={{
              width: 1272,
              height: 954,
              position: "absolute",
              left: 0,
              top: 0,
            }}
          />
          <Picture
            file="editor-pink.jpg"
            style={{
              width: 1272,
              height: 954,
              position: "absolute",
              left: 0,
              top: 0,
              opacity: interpolate(f, [84, 100], [0, 1], clamp),
            }}
          />
        </div>
      </div>
      <Cursor
        x={interpolate(f, [42, 75], [1210, 300], clamp)}
        y={interpolate(f, [42, 75], [867, 852], clamp)}
        click={f >= 82 && f < 94}
      />
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 84,
          fontSize: 28,
          fontWeight: 500,
        }}
      >
        文字、图片、喜欢的事。
        <span style={{ color: C.blue, marginLeft: 42 }}>配色也随你。</span>
      </div>
    </Base>
  );
}

