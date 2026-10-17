import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Base, Brand, C, Cursor, Picture } from "../design";

const soft = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};

const original = "喜欢蓝色，也喜欢自由。";
const replacement = "追着光，也追着热爱。";

/** One draft value drives both the editor field and the template preview. */
export function EditorV3() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const selected = seconds >= 0.85 && seconds < 1.25;
  const focused = seconds >= 0.75;
  const typing = seconds >= 1.25 && seconds < 4;
  const complete = seconds >= 4;
  const characterCount = Math.min(
    replacement.length,
    Math.max(0, Math.floor(((seconds - 1.45) / 2.55) * replacement.length) + 1),
  );
  const value = seconds < 1.25 ? original : seconds < 1.45 ? "" : replacement.slice(0, characterCount);
  const caret = focused && !selected && !complete && Math.floor(seconds * 2.7) % 2 === 0;

  return (
    <Base>
      <Brand />
      <div style={{ position: "absolute", right: 84, top: 63, fontSize: 28, color: "#626657" }}>
        左边修改，右边同步。
      </div>
      <div style={{
        position: "absolute", left: 84, top: 166, fontSize: 92,
        fontWeight: 900, letterSpacing: -4, lineHeight: 1.15,
        opacity: interpolate(frame, [0, 0.22 * fps], [0.4, 1], soft),
        translate: `0 ${interpolate(frame, [0, 0.36 * fps], [26, 0], soft)}px`,
      }}>
        改一句，就看见。
      </div>

      <div style={{
        position: "absolute", left: 84, top: 311, width: 1272, height: 650,
        border: "1px solid #17191435", background: "#e9e9e1", overflow: "hidden",
        translate: `0 ${interpolate(frame, [0, 0.38 * fps], [20, 0], soft)}px`,
      }}>
        <div style={{
          height: 32, display: "flex", alignItems: "center", gap: 7, paddingLeft: 16,
          background: C.paper, borderBottom: "1px solid #17191425",
        }}>
          {[0, 1, 2].map((n) => <div key={n} style={{ width: 7, height: 7, borderRadius: "50%", background: "#969a8b" }} />)}
          <span style={{ fontSize: 13, marginLeft: 14 }}>furfolio.pages.dev / editor</span>
        </div>
        <div style={{
          position: "relative", height: 56, background: C.paper, display: "flex",
          alignItems: "center", justifyContent: "space-between", padding: "0 27px",
          borderBottom: "1px solid #17191425",
        }}>
          <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: -1 }}>FURFOLIO<span style={{ color: C.blue }}>.</span></span>
          <span style={{ position: "absolute", left: 191, fontSize: 16, color: "#767a6b" }}>我的主页　 /　 A · Y2K</span>
          <div style={{ display: "flex", alignItems: "center", gap: 23, fontSize: 15 }}>
            <span style={{ color: complete ? "#4c7047" : "#72776b" }}>● {typing ? "正在保存…" : "已保存至本地"}</span>
            <span style={{ fontWeight: 700 }}>完整预览 ↗</span>
            <span style={{ background: C.ink, color: "#fff", padding: "11px 15px", fontWeight: 700 }}>发布主页 ↗</span>
          </div>
        </div>

        <div style={{ position: "relative", height: 562, display: "flex" }}>
          <div style={{ position: "relative", width: 430, flexShrink: 0, background: C.paper, borderRight: "1px solid #17191425" }}>
            <div style={{ position: "absolute", left: 28, top: 20, display: "flex", gap: 5, fontSize: 16 }}>
              <span style={{ padding: "7px 14px", background: "#eeede5" }}>1 主题</span>
              <span style={{ padding: "7px 14px", background: C.lime, fontWeight: 700 }}>2 开场</span>
              <span style={{ padding: "7px 14px", background: "#eeede5" }}>3 关于</span>
            </div>
            <div style={{ position: "absolute", left: 28, top: 69, fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>你的开场。</div>

            <div style={{ position: "absolute", left: 28, top: 126, fontSize: 18, fontWeight: 700 }}>角色名称 / 昵称</div>
            <div style={{
              position: "absolute", left: 28, top: 154, width: 374, height: 52,
              border: "1px solid #17191435", background: "#fffefa", display: "flex", alignItems: "center", padding: "0 17px", boxSizing: "border-box",
              fontSize: 28, fontWeight: 700,
            }}>澈</div>

            <div style={{ position: "absolute", left: 28, top: 236, fontSize: 18, fontWeight: 700 }}>个性签名</div>
            <div role="textbox" aria-label="个性签名" aria-multiline="true" style={{
              position: "absolute", left: 28, top: 266, width: 374, height: 126,
              border: `2px solid ${focused ? C.blue : "#17191435"}`,
              background: "#fffefa", padding: "17px 17px", boxSizing: "border-box",
              fontSize: 28, fontWeight: 500, lineHeight: 1.55, wordBreak: "break-all",
            }}>
              <span style={{ background: selected ? C.blue : "transparent", color: selected ? "#fff" : C.ink }}>{value}</span>
              {caret ? <span style={{ display: "inline-block", width: 2, height: 31, marginLeft: 2, background: C.blue, verticalAlign: "-4px" }} /> : null}
              <svg width="13" height="13" viewBox="0 0 13 13" style={{ position: "absolute", right: 4, bottom: 4, opacity: 0.35 }}>
                <path d="M2 11L11 2M7 11L11 7" stroke={C.ink} strokeWidth="1" />
              </svg>
            </div>
            <div style={{ position: "absolute", right: 30, top: 402, fontSize: 15, color: "#7a7e70" }}>{value.length} / 80</div>

            <div style={{ position: "absolute", left: 28, top: 423, fontSize: 18, fontWeight: 700 }}>个性签名字体</div>
            <div style={{
              position: "absolute", left: 28, top: 451, width: 374, height: 44,
              border: "1px solid #17191435", background: "#fffefa", padding: "0 17px", boxSizing: "border-box",
              display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 18,
            }}><span>跟随模板</span><span>⌄</span></div>
            <div style={{ position: "absolute", left: 28, top: 523, fontSize: 17, color: complete ? "#4c7047" : "#777b6e" }}>
              {complete ? "✓ 已保存至本地" : "每次修改都会自动保存。"}
            </div>
          </div>

          <div style={{ position: "relative", flex: 1 }}>
            <div style={{ position: "absolute", left: 24, top: 13, display: "flex", alignItems: "center", fontSize: 16 }}>
              <span style={{ background: C.ink, color: "#fff", padding: "8px 17px" }}>桌面</span>
              <span style={{ background: C.paper, padding: "8px 17px", border: "1px solid #17191425" }}>手机</span>
            </div>
            <div style={{ position: "absolute", right: 24, top: 22, color: C.blue, fontSize: 17, fontWeight: 700 }}>
              <span style={{ display: "inline-block", width: 7, height: 7, marginRight: 8, borderRadius: "50%", background: C.blue }} />实时预览
            </div>

            <div style={{
              position: "absolute", left: 24, top: 61, width: 792, height: 477,
              border: "1px solid #17191435", background: C.lime, overflow: "hidden",
            }}>
              <div style={{
                height: 41, display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 24px", borderBottom: "1px solid #17191450", position: "relative", zIndex: 4,
              }}>
                <span style={{ fontSize: 19, fontWeight: 900 }}>CHE<span style={{ color: C.blue }}>.</span></span>
                <span style={{ fontSize: 14 }}>关于我　　喜欢的事　　我的片段　　联系</span>
              </div>

              <div style={{
                position: "absolute", left: 29, top: 53, fontSize: 166, color: C.blue,
                fontWeight: 900, letterSpacing: -15, lineHeight: 1, rotate: "-4deg", zIndex: 0,
              }}>CHE</div>
              <Picture file="che-cutout.png" style={{
                position: "absolute", left: 395, top: 48, width: 398, height: 399,
                objectFit: "contain", objectPosition: "center bottom", zIndex: 1,
              }} />
              <div style={{ position: "absolute", left: 31, top: 224, fontSize: 52, fontWeight: 900, lineHeight: 1, zIndex: 2 }}>澈</div>
              <div style={{ position: "absolute", left: 34, top: 282, fontSize: 17, letterSpacing: 2, zIndex: 2 }}>@CHE.BLUE</div>
              <div style={{
                position: "absolute", left: 32, top: 322, width: 365, minHeight: 94, zIndex: 3,
                fontSize: 32, fontWeight: 700, lineHeight: 1.5, wordBreak: "break-all",
              }}>{value || "\u00a0"}</div>
              <div style={{
                position: "absolute", left: 32, top: 416, width: 69, height: 2,
                background: C.ink, rotate: "-2deg", zIndex: 3,
              }} />
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: 0, height: 35,
                background: C.blue, color: "#fff", display: "flex", alignItems: "center",
                whiteSpace: "nowrap", overflow: "hidden", zIndex: 4,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2.5, translate: `${-seconds * 22}px 0` }}>
                  CHE / IN MY OWN COLORS / CHE / IN MY OWN COLORS / CHE / IN MY OWN COLORS /
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 84, right: 84, top: 986, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 33, fontWeight: 700 }}>让主页，说你的话。</span>
        <span style={{ color: "#626657", fontSize: 28 }}>不用写代码。</span>
      </div>

      <div style={{ opacity: interpolate(frame, [0.15 * fps, 0.45 * fps, 1.2 * fps, 1.45 * fps], [0, 1, 1, 0], soft) }}>
        <Cursor
          x={interpolate(frame, [0.15 * fps, 0.75 * fps], [671, 253], soft)}
          y={interpolate(frame, [0.15 * fps, 0.75 * fps], [599, 691], soft)}
          click={seconds >= 0.75 && seconds < 0.87}
        />
      </div>
    </Base>
  );
}
