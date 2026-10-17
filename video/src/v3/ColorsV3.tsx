import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, Picture, clamp } from "../design";

// These are the eight actual A / Y2K recommendations in src/templates/registry.ts.
// Each palette stays for exactly 0.5 s, one V4 120 BPM beat. Artwork is never color-processed.
const palettes = [
  { name: "青柠 / 钴蓝", acid: "#d5ec42", blue: "#2949dd" },
  { name: "粉纸 / 墨蓝", acid: "#f2afca", blue: "#253680" },
  { name: "奶油 / 橘红", acid: "#f6e9bd", blue: "#b7472c" },
  { name: "冰蓝 / 深紫", acid: "#badfeb", blue: "#523aac" },
  { name: "紫藤 / 葡萄", acid: "#e4ccf4", blue: "#73338e" },
  { name: "杏橘 / 松绿", acid: "#ffca91", blue: "#255c3e" },
  { name: "玫瑰 / 莓果", acid: "#ffc3dc", blue: "#842e4d" },
  { name: "晴空 / 海蓝", acid: "#c5eaff", blue: "#214bc2" },
];

export function ColorsV3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const index = Math.min(7, Math.max(0, Math.floor(frame / (fps * 0.5))));
  const p = palettes[index];

  return (
    <Base>
      <Brand />
      <div
        style={{
          position: "absolute",
          right: 84,
          top: 64,
          fontSize: 22,
          letterSpacing: 1.1,
          color: "#686c61",
        }}
      >
        YOUR CHARACTER. YOUR COLORS.
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 164,
          fontSize: 82,
          fontWeight: 900,
          letterSpacing: -3,
          lineHeight: 1.12,
          translate: `0 ${interpolate(frame, [0, 0.18 * fps], [15, 0], clamp)}px`,
        }}
      >
        颜色，随你。
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 303,
          width: 280,
          height: 653,
          padding: "24px 21px",
          border: "1px solid #17191430",
          background: "#faf9f4",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
          <span style={{ fontSize: 23, fontWeight: 700 }}>推荐配色</span>
          <span style={{ fontSize: 16, color: "#73776c" }}>A / Y2K</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {palettes.map((color, i) => (
            <div
              key={color.name}
              style={{
                height: 57,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "0 9px",
                border: `2px solid ${i === index ? color.blue : "#1719141c"}`,
                background: i === index ? color.acid : "transparent",
                color: C.ink,
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", width: 43, height: 33, border: "1px solid #17191425", flexShrink: 0 }}>
                <span style={{ width: "50%", background: color.acid }} />
                <span style={{ width: "50%", background: color.blue }} />
              </div>
              <span style={{ fontSize: 21, fontWeight: i === index ? 700 : 400, whiteSpace: "nowrap" }}>{color.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 390,
          top: 303,
          width: 966,
          height: 653,
          overflow: "hidden",
          border: "1px solid #17191430",
          background: p.acid,
          translate: `0 ${interpolate(frame, [0, 0.18 * fps], [15, 0], clamp)}px`,
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
            position: "relative",
            zIndex: 5,
          }}
        >
          {[1, 2, 3].map((n) => <div key={n} style={{ height: 7, width: 7, background: "#9c9e91", borderRadius: "50%" }} />)}
          <span style={{ fontSize: 13, marginLeft: 15 }}>furfolio.pages.dev / preview</span>
        </div>
        <div style={{ position: "relative", height: 615, color: C.ink }}>
          <div style={{ position: "absolute", top: 24, left: 45, fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>CHE.</div>
          <div style={{ position: "absolute", top: 32, left: 184, display: "flex", gap: 25, fontSize: 13 }}>
            <span>关于我</span><span>喜欢的事</span><span>我的片段</span><span>联系</span>
          </div>
          <div style={{ position: "absolute", right: 45, top: 32, fontSize: 13, fontWeight: 700 }}>@che</div>
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 107,
              color: p.blue,
              fontSize: 326,
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: -30,
              rotate: "-4deg",
            }}
          >
            CHE
          </div>
          <div
            style={{
              position: "absolute",
              right: 20,
              top: 96,
              width: 210,
              height: 465,
              backgroundImage: `radial-gradient(${p.blue} 1.1px,transparent 1.1px)`,
              backgroundSize: "7px 7px",
              opacity: 0.25,
              rotate: "7deg",
            }}
          />
          <Picture
            file="che-cutout.png"
            style={{
              position: "absolute",
              bottom: 32,
              right: -12,
              width: 542,
              height: 589,
              objectFit: "contain",
              objectPosition: "center bottom",
            }}
          />
          <div style={{ position: "absolute", left: 48, bottom: 179, fontSize: 105, fontWeight: 900, lineHeight: 1 }}>澈</div>
          <div style={{ position: "absolute", left: 49, bottom: 146, fontSize: 16, fontWeight: 700 }}>@che</div>
          <div style={{ position: "absolute", left: 49, bottom: 76, fontSize: 24, fontWeight: 700, lineHeight: 1.35 }}>Same blue.<br />Different days.</div>
          <div
            style={{
              position: "absolute",
              bottom: -4,
              left: -30,
              width: 1030,
              height: 46,
              background: p.blue,
              color: "#fff",
              rotate: "-1deg",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 3, whiteSpace: "nowrap", translate: `${-seconds * 29}px 0` }}>
              {Array(6).fill("CHE / IN MY OWN COLORS /　").join("")}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 84, bottom: 53, fontSize: 28, fontWeight: 500 }}>每一种，都像你。</div>
      <div style={{ position: "absolute", right: 84, bottom: 57, display: "flex", gap: 6 }}>
        {palettes.map((color, i) => (
          <div key={color.name} style={{ width: 58, height: i === index ? 13 : 7, marginTop: i === index ? 0 : 6, background: color.blue, borderBottom: `3px solid ${color.acid}`, opacity: i === index ? 1 : 0.35 }} />
        ))}
      </div>
    </Base>
  );
}
