import { interpolate } from "remotion";
import {
  useMotionFrame,
  Base,
  Brand,
  C,
  Caption,
  clamp,
  Reveal,
} from "../design";
export function Flow() {
  const f = useMotionFrame();
  return (
    <Base bg={C.cyber} color="#f1f4f5">
      <Brand dark />
      <Caption dark>在准备好的时候，再让大家看见。</Caption>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(#79edf508 1px, transparent 1px),linear-gradient(90deg,#79edf508 1px, transparent 1px)",
          backgroundSize: "100px 100px",
          translate: `${f * 0.12}px ${f * 0.07}px`,
        }}
      />
      <div style={{ position: "absolute", left: 84, top: 250 }}>
        <Reveal size={104}>先设计，</Reveal>
        <Reveal delay={12} size={104} color={C.cyan}>
          后注册。
        </Reveal>
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          top: 630,
          display: "flex",
          alignItems: "center",
          gap: 27,
        }}
      >
        {["设计", "注册", "发布"].map((text, i) => (
          <div
            key={text}
            style={{
              display: "flex",
              gap: 27,
              alignItems: "center",
              flex: 1,
              opacity: interpolate(
                f,
                [23 + i * 19, 40 + i * 19],
                [0.1, 1],
                clamp,
              ),
              translate: `0 ${interpolate(f, [23 + i * 19, 40 + i * 19], [24, 0], clamp)}px`,
            }}
          >
            <div
              style={{
                height: 132,
                borderTop: `1px solid ${C.cyan}`,
                width: "100%",
                paddingTop: 20,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 700,
                  color: i === 0 ? C.cyan : "#e8f1f3",
                }}
              >
                {text}
              </div>
              <div style={{ fontSize: 23, marginTop: 10, color: "#8ba2ac" }}>
                {
                  [
                    "自动保存至本地",
                    "设计完成再创建账号",
                    "专属链接，分享你的世界",
                  ][i]
                }
              </div>
            </div>
            {i < 2 ? (
              <span style={{ fontSize: 35, color: C.cyan }}>→</span>
            ) : null}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 133,
          fontSize: 28,
          opacity: interpolate(f, [88, 109], [0, 1], clamp),
        }}
      >
        从第一笔，到一个可以分享的主页。
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 65,
          left: 84,
          right: 84,
          height: 1,
          background: "#79edf528",
        }}
      />
    </Base>
  );
}

