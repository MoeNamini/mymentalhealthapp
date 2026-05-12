// App.jsx — complete
// Changes in this version:
// - Font: Caveat (clean handwriting, Google Fonts)
// - Reminder modal: Time + Widget only (no interval tab)
//   Repeat toggle shows number (1-60) + unit when enabled
// - Login fix: navigates to search after successful email login
// - Pick logic: API call happens on reminder Save, not on "Let's do this"
// - Button text: "Let's do this" (was "I will try this")
// - Light theme: monochrome black/white
// - Dark theme:  monochrome black/white

import { useState, useEffect, createContext, useContext } from "react"
import axios from "axios"

// ─── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  light: {
    bg: "#f4f4f4",
    card: "#ffffff",
    text: "#0d0d0d",
    subtext: "#5a5a5a",
    border: "#dcdcdc",
    accent: "#111111",
    accentText: "#ffffff",
    input: "#ffffff",
    inputBorder: "#cccccc",
    soft: "#efefef",
    header: "linear-gradient(160deg, #111111 0%, #383838 100%)",
    btnPrimary: "#111111",
    btnSuccess: "#2a2a2a",
    btnNeutral: "#f0f0f0",
    btnNeutralText: "#222222",
    shadow: "0 2px 14px rgba(0,0,0,0.09)",
    divider: "#e4e4e4",
    tag: "#efefef",
    tagText: "#333333",
    streakOn: "#111111",
    streakOff: "#dddddd",
    spinnerBg: "#e0e0e0",
    spinnerFg: "#111111",
  },
  dark: {
    bg: "#0c0c0c",
    card: "#181818",
    text: "#f2f2f2",
    subtext: "#7a7a7a",
    border: "#272727",
    accent: "#ebebeb",
    accentText: "#111111",
    input: "#222222",
    inputBorder: "#333333",
    soft: "#1e1e1e",
    header: "linear-gradient(160deg, #000000 0%, #1c1c1c 100%)",
    btnPrimary: "#ebebeb",
    btnSuccess: "#d0d0d0",
    btnNeutral: "#272727",
    btnNeutralText: "#ebebeb",
    shadow: "0 2px 16px rgba(0,0,0,0.5)",
    divider: "#272727",
    tag: "#242424",
    tagText: "#cccccc",
    streakOn: "#ebebeb",
    streakOff: "#333333",
    spinnerBg: "#2a2a2a",
    spinnerFg: "#ebebeb",
  },
  soft: {
    bg: "#f0e9de",
    card: "#faf3e8",
    text: "#352014",
    subtext: "#8a6f58",
    border: "#dfd0bc",
    accent: "#9e6b3f",
    accentText: "#faf3e8",
    input: "#fdf7ef",
    inputBorder: "#d5c0a8",
    soft: "#ece2d4",
    header: "linear-gradient(160deg, #7d5230 0%, #b8875a 100%)",
    btnPrimary: "#9e6b3f",
    btnSuccess: "#5e7d48",
    btnNeutral: "#ece2d4",
    btnNeutralText: "#352014",
    shadow: "0 2px 14px rgba(80,40,10,0.10)",
    divider: "#dfd0bc",
    tag: "#ece2d4",
    tagText: "#6b4826",
    streakOn: "#5e7d48",
    streakOff: "#d5c0a8",
    spinnerBg: "#dfd0bc",
    spinnerFg: "#9e6b3f",
  },
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppCtx = createContext(null)
const useApp = () => useContext(AppCtx)

function setupAxios(token) {
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
  else delete axios.defaults.headers.common["Authorization"]
}

// ─── SHARED: Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  const { t } = useApp()
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%", margin: "0 auto",
      border: `4px solid ${t.spinnerBg}`,
      borderTop: `4px solid ${t.spinnerFg}`,
      animation: "spin 0.75s linear infinite",
    }} />
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
// FIX: receives onNavigate and calls onNavigate("search") after successful login
function LoginPage({ onNavigate }) {
  const { t, setUser, setToken } = useApp()
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const inputStyle = {
    width: "100%", padding: "13px 15px", borderRadius: 10, fontSize: 16,
    border: `1.5px solid ${t.inputBorder}`, background: t.input,
    color: t.text, marginBottom: 18, boxSizing: "border-box",
  }
  const labelStyle = {
    fontSize: 13, fontWeight: 700, color: t.subtext,
    display: "block", marginBottom: 6,
  }

  async function submit() {
    setError("")
    if (!email || !password) { setError("Please fill in all fields"); return }
    if (mode === "signup" && !name) { setError("Please enter your name"); return }
    setLoading(true)
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup"
      const body = mode === "login" ? { email, password } : { name, email, password }
      const res = await axios.post(url, body)
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("user", JSON.stringify(res.data.user))
      setupAxios(res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      onNavigate("search")   // ← FIX: navigate after successful login
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong. Check the API server is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: t.bg, padding: 16
    }}>
      <div style={{
        background: t.card, borderRadius: 20, padding: "44px 40px",
        width: "100%", maxWidth: 420, boxShadow: t.shadow
      }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: t.text }}>MindActions</div>
          <div style={{ fontSize: 16, color: t.subtext, marginTop: 4 }}>
            {mode === "login" ? "Welcome back" : "Create your free account"}
          </div>
        </div>

        {error && (
          <div style={{
            padding: "12px 15px", borderRadius: 9, marginBottom: 18,
            background: t.soft, border: `1px solid ${t.border}`,
            color: t.text, fontSize: 15
          }}>
            {error}
          </div>
        )}

        {mode === "signup" && (
          <>
            <label style={labelStyle}>Full name</label>
            <input style={inputStyle} placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)} />
          </>
        )}

        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" placeholder="you@email.com"
          value={email} onChange={e => setEmail(e.target.value)} />

        <label style={labelStyle}>Password</label>
        <input style={inputStyle} type="password" placeholder="Minimum 8 characters"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()} />

        <button onClick={submit} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: t.btnPrimary, color: t.accentText, fontWeight: 700,
          fontSize: 16, cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1, marginBottom: 16,
        }}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>

        <div style={{
          textAlign: "center", fontSize: 13, color: t.subtext,
          marginBottom: 16, letterSpacing: 0.5
        }}>
          or continue with
        </div>

        {[
          {
            label: "Continue with Google",
            href: "/api/auth/google",
            icon: (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            ),
          },
          {
            label: "Continue with X (Twitter)",
            href: "/api/auth/twitter",
            icon: (
              <svg width="17" height="17" viewBox="0 0 24 24" fill={t.text}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            ),
          },
        ].map(o => (
          <button key={o.href} onClick={() => window.location.href = o.href} style={{
            width: "100%", padding: "12px 16px", borderRadius: 11,
            border: `1.5px solid ${t.border}`, background: t.card, color: t.text,
            fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            {o.icon}{o.label}
          </button>
        ))}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 15, color: t.subtext }}>
          {mode === "login" ? "No account?" : "Already have an account?"}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }}
            style={{ color: t.accent, fontWeight: 700, cursor: "pointer", marginLeft: 6 }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── AUTH CALLBACK ────────────────────────────────────────────────────────────
function AuthCallback({ onNavigate }) {
  const { t, setUser, setToken } = useApp()
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) { onNavigate("login"); return }
    setupAxios(token)
    axios.get("/api/auth/me").then(res => {
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(res.data))
      setToken(token)
      setUser(res.data)
      onNavigate("search")
    }).catch(() => onNavigate("login"))
  }, [])
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: useApp().t.bg
    }}>
      <p style={{ color: useApp().t.subtext, fontSize: 17 }}>Signing you in...</p>
    </div>
  )
}

// ─── REMINDER MODAL ───────────────────────────────────────────────────────────
// Tab: "Time" — time of day picker + optional repeat (number 1-60 + unit)
// Tab: "Widget" — home screen shortcut instructions
// onPickConfirmed: called after save so ActionCard can update its pick count
function ReminderModal({ action, onClose, isEdit = false, onPickConfirmed }) {
  const { t } = useApp()
  const [tab, setTab] = useState("time")
  const [hour, setHour] = useState("08")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState("AM")
  const [repeat, setRepeat] = useState(false)
  const [repeatNum, setRepeatNum] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState("hour")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const inputBase = {
    background: t.input, border: `1.5px solid ${t.inputBorder}`,
    borderRadius: 10, color: t.text, textAlign: "center",
  }

  // ── Clamp helpers ──
  function updateHour(v) {
    const n = Math.min(12, Math.max(1, parseInt(v) || 1))
    setHour(String(n).padStart(2, "0"))
  }
  function updateMinute(v) {
    const n = Math.min(59, Math.max(0, parseInt(v) || 0))
    setMinute(String(n).padStart(2, "0"))
  }
  function updateRepeatNum(v) {
    setRepeatNum(Math.min(60, Math.max(1, parseInt(v) || 1)))
  }

  async function save() {
    setSaving(true)
    try {
      // Save reminder settings
      await axios.post("/api/profile/reminder", {
        action_id: action.id,
        reminder_type: tab,
        frequency_type: tab === "time" && repeat ? repeatUnit : null,
        frequency_value: tab === "time" && repeat ? repeatNum : null,
        clock_time: tab === "time" ? `${hour}:${minute} ${ampm}` : null,
      })

      // FIX: pick API call happens HERE, only when user saves the reminder
      if (!isEdit && onPickConfirmed) {
        await onPickConfirmed()
      }

      // Schedule browser notification if permission granted
      if (tab === "time" && repeat) {
        if ("Notification" in window) await Notification.requestPermission()
        if (Notification.permission === "granted") {
          const ms = repeatUnit === "minute" ? repeatNum * 60000
            : repeatUnit === "hour" ? repeatNum * 3600000
              : repeatNum * 86400000
          setInterval(() => new Notification("Action reminder", {
            body: action.text, tag: `action-${action.id}`,
          }), ms)
        }
      }

      setSaved(true)
    } catch (e) {
      console.error("Reminder save failed", e)
    } finally {
      setSaving(false)
    }
  }

  // ── Success screen ──
  if (saved) return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20
    }}>
      <div style={{
        background: t.card, borderRadius: 22, padding: "52px 44px",
        maxWidth: 540, width: "100%", textAlign: "center", boxShadow: t.shadow
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          border: `2px solid ${t.accent}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 22px"
        }}>
          <svg width="26" height="26" viewBox="0 0 26 26">
            <path d="M4 13l7 7 11-11" stroke={t.accent} strokeWidth="2.5"
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 10 }}>
          Reminder {isEdit ? "updated" : "saved"}
        </div>
        <div style={{ fontSize: 16, color: t.subtext, marginBottom: 32, lineHeight: 1.7 }}>
          {tab === "time"
            ? repeat
              ? `You will be reminded at ${hour}:${minute} ${ampm}, repeating every ${repeatNum} ${repeatUnit}(s)`
              : `You will be reminded at ${hour}:${minute} ${ampm}`
            : "Add this app to your home screen to use the widget shortcut"}
        </div>
        <button onClick={onClose} style={{
          width: "100%", padding: "15px", borderRadius: 12, border: "none",
          background: t.btnPrimary, color: t.accentText,
          fontWeight: 700, fontSize: 17, cursor: "pointer",
        }}>
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20
    }} onClick={onClose}>
      <div style={{
        background: t.card, borderRadius: 22, padding: "44px 44px 36px",
        maxWidth: 580, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
        maxHeight: "92vh", overflowY: "auto"
      }}
        onClick={e => e.stopPropagation()}>

        {/* Title + action text */}
        <div style={{ fontSize: 26, fontWeight: 700, color: t.text, marginBottom: 8 }}>
          {isEdit ? "Change Reminder" : "Set a Reminder"}
        </div>
        <div style={{
          fontSize: 15, color: t.subtext, marginBottom: 28, lineHeight: 1.5,
          paddingLeft: 12, borderLeft: `3px solid ${t.accent}`
        }}>
          {action.text}
        </div>

        {/* Tab row — Time / Widget only */}
        <div style={{
          display: "flex", background: t.soft, borderRadius: 12,
          padding: 5, gap: 5, marginBottom: 36
        }}>
          {["time", "widget"].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} style={{
              flex: 1, padding: "13px 0", borderRadius: 9, border: "none",
              background: tab === tb ? t.accent : "transparent",
              color: tab === tb ? t.accentText : t.subtext,
              fontWeight: 700, fontSize: 16, cursor: "pointer",
              textTransform: "capitalize",
            }}>
              {tb === "time" ? "Time" : "Widget"}
            </button>
          ))}
        </div>

        {/* ── TIME TAB ── */}
        {tab === "time" && (
          <div>
            {/* Section label */}
            <div style={{
              fontSize: 13, fontWeight: 700, color: t.subtext,
              textTransform: "uppercase", letterSpacing: 1, marginBottom: 16
            }}>
              Time of the day
            </div>

            {/* Hour : Minute  AM/PM */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
              {/* Hour box */}
              <input
                type="number" min="1" max="12" value={hour}
                onChange={e => updateHour(e.target.value)}
                style={{ ...inputBase, width: 88, padding: "18px 0", fontSize: 32, fontWeight: 800 }}
              />
              <span style={{ fontSize: 34, fontWeight: 800, color: t.text }}>:</span>
              {/* Minute box */}
              <input
                type="number" min="0" max="59" value={minute}
                onChange={e => updateMinute(e.target.value)}
                style={{ ...inputBase, width: 88, padding: "18px 0", fontSize: 32, fontWeight: 800 }}
              />
              {/* AM / PM stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginLeft: 4 }}>
                <button onClick={() => setAmpm("AM")} style={{
                  padding: "12px 20px", borderRadius: 10,
                  border: `1.5px solid ${t.inputBorder}`,
                  background: ampm === "AM" ? t.accent : t.input,
                  color: ampm === "AM" ? t.accentText : t.subtext,
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}>AM</button>
                <button onClick={() => setAmpm("PM")} style={{
                  padding: "12px 20px", borderRadius: 10,
                  border: `1.5px solid ${t.inputBorder}`,
                  background: ampm === "PM" ? t.accent : t.input,
                  color: ampm === "PM" ? t.accentText : t.subtext,
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}>PM</button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.divider, marginBottom: 28 }} />

            {/* Repeat toggle */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: repeat ? 22 : 0
            }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: t.text }}>Repeat</span>
              {/* Toggle switch */}
              <div onClick={() => setRepeat(v => !v)} style={{
                width: 50, height: 28, borderRadius: 14, cursor: "pointer",
                background: repeat ? t.accent : t.inputBorder,
                position: "relative", transition: "background 0.2s",
              }}>
                <div style={{
                  position: "absolute", top: 4,
                  left: repeat ? 26 : 4, width: 20, height: 20,
                  borderRadius: "50%", background: "#ffffff",
                  transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }} />
              </div>
            </div>

            {/* Repeat options — only shown when repeat is ON */}
            {repeat && (
              <div>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: t.subtext,
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 14
                }}>
                  Repeat every
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  {/* Number input 1–60 */}
                  <input
                    type="number" min="1" max="60" value={repeatNum}
                    onChange={e => updateRepeatNum(e.target.value)}
                    style={{
                      ...inputBase, width: 96, padding: "16px 0",
                      fontSize: 28, fontWeight: 800,
                    }}
                  />
                  {/* Unit selector */}
                  <select value={repeatUnit} onChange={e => setRepeatUnit(e.target.value)}
                    style={{
                      flex: 1, padding: "14px 18px", borderRadius: 10,
                      border: `1.5px solid ${t.inputBorder}`,
                      background: t.input, color: t.text,
                      fontSize: 16, cursor: "pointer",
                    }}>
                    <option value="minute">Minute(s)</option>
                    <option value="hour">Hour(s)</option>
                    <option value="day">Day(s)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WIDGET TAB ── */}
        {tab === "widget" && (
          <div style={{
            background: t.soft, borderRadius: 14, padding: "24px 26px",
            border: `1px solid ${t.border}`
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginBottom: 14 }}>
              Add to Home Screen
            </div>
            <div style={{ fontSize: 15, color: t.subtext, lineHeight: 2 }}>
              1. Open this app in your phone browser<br />
              2. Tap the Share button (iOS) or the menu (Android)<br />
              3. Select "Add to Home Screen"<br />
              4. Tap the shortcut anytime to see this action
            </div>
          </div>
        )}

        {/* Save / Cancel */}
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={save} disabled={saving} style={{
            width: "100%", padding: "16px", borderRadius: 12, border: "none",
            background: t.btnPrimary, color: t.accentText,
            fontWeight: 700, fontSize: 17, cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? "Saving..." : isEdit ? "Update Reminder" : "Save Reminder"}
          </button>
          <button onClick={onClose} style={{
            width: "100%", padding: "14px", borderRadius: 12,
            border: `1px solid ${t.border}`, background: "transparent",
            color: t.subtext, fontWeight: 600, fontSize: 16, cursor: "pointer",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DIFFICULTY POPUP ─────────────────────────────────────────────────────────
function DifficultyPopup({ actionId, onClose }) {
  const { t } = useApp()
  const [chosen, setChosen] = useState(null)

  async function pick(difficulty) {
    setChosen(difficulty)
    await axios.post(`/api/profile/actions/${actionId}/complete`,
      { source: "notification", difficulty }).catch(() => { })
    setTimeout(onClose, 1400)
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 3000, padding: 20
    }}>
      <div style={{
        background: t.card, borderRadius: 20, padding: "40px 36px",
        maxWidth: 380, width: "100%", textAlign: "center", boxShadow: t.shadow
      }}>
        {chosen ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: `2px solid ${t.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M4 12l6 6 10-10" stroke={t.accent} strokeWidth="2.5"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Logged</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 23, fontWeight: 700, color: t.text, marginBottom: 8 }}>
              How hard was it?
            </div>
            <div style={{ fontSize: 15, color: t.subtext, marginBottom: 28, lineHeight: 1.6 }}>
              Your feedback improves future recommendations
            </div>
            {[["Easy", "easy"], ["Not Hard", "medium"], ["Hard", "hard"]].map(([label, val]) => (
              <button key={val} onClick={() => pick(val)} style={{
                display: "block", width: "100%", padding: "14px", borderRadius: 11,
                border: `1.5px solid ${t.border}`, background: t.soft,
                color: t.text, fontWeight: 700, fontSize: 16,
                cursor: "pointer", marginBottom: 10,
              }}>{label}</button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── VIDEO MODAL ──────────────────────────────────────────────────────────────
function VideoModal({ embedUrl, title, onClose }) {
  const { t } = useApp()
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16
    }} onClick={onClose}>
      <div style={{
        background: t.card, borderRadius: 18, maxWidth: 800,
        width: "100%", overflow: "hidden"
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: `1px solid ${t.divider}`
        }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: t.subtext, flex: 1,
            marginRight: 12, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>{title}</p>
          <button onClick={onClose} style={{
            background: t.soft, border: "none",
            borderRadius: 8, width: 32, height: 32,
            cursor: "pointer", color: t.subtext,
            fontSize: 18, fontWeight: 700
          }}>×</button>
        </div>
        <iframe src={embedUrl} title={title} allowFullScreen frameBorder="0"
          style={{ width: "100%", aspectRatio: "16/9", display: "block" }} />
        <a href={embedUrl.replace("/embed/", "/watch?v=")} target="_blank" rel="noreferrer"
          style={{
            display: "block", textAlign: "center", padding: 10,
            fontSize: 14, color: t.subtext, textDecoration: "none"
          }}>
          Open in YouTube
        </a>
      </div>
    </div>
  )
}

// ─── CATEGORY TAG + DIFFICULTY DOTS ──────────────────────────────────────────
function CatTag({ category }) {
  const { t } = useApp()
  return (
    <span style={{
      padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 700,
      background: t.tag, color: t.tagText, textTransform: "capitalize"
    }}>
      {(category || "").replace("_", " ")}
    </span>
  )
}
function DiffDots({ level }) {
  const { t } = useApp()
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 12, color: t.subtext, marginRight: 4 }}>difficulty</span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          display: "inline-block",
          background: i < (level || 1) ? t.accent : t.soft,
          border: `1px solid ${t.border}`
        }} />
      ))}
    </div>
  )
}

// ─── ACTION CARD (search results) ─────────────────────────────────────────────
// FIX: "Let's do this" opens reminder modal without API call
// The pick API call happens inside ReminderModal.save() via onPickConfirmed callback
function ActionCard({ action, onVideoOpen }) {
  const { t } = useApp()
  const [showBenefit, setShowBenefit] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [picked, setPicked] = useState(false)
  const [hovStar, setHovStar] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [ratingDone, setRatingDone] = useState(false)
  const [pickCount, setPickCount] = useState(action.times_picked || 0)

  // Called by ReminderModal after successful save
  async function handlePickConfirmed() {
    try {
      const res = await axios.post(`/api/profile/actions/${action.id}/pick`)
      setPickCount(res.data.times_picked)
      setPicked(true)
    } catch (e) { console.error(e) }
  }

  async function rate(stars) {
    if (ratingDone) return
    setUserRating(stars)
    await axios.post(`/api/actions/${action.id}/rate`, { rating: stars }).catch(() => { })
    setRatingDone(true)
  }

  return (
    <>
      <div style={{
        background: t.card, borderRadius: 16, padding: "22px 24px",
        boxShadow: t.shadow, marginBottom: 14, border: `1px solid ${t.border}`
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 13
        }}>
          <CatTag category={action.category} />
          <DiffDots level={action.difficulty} />
        </div>

        <p style={{
          fontSize: 17, fontWeight: 600, color: t.text,
          lineHeight: 1.55, marginBottom: 14
        }}>{action.text}</p>

        {showBenefit && (
          <div style={{
            background: t.soft, borderRadius: 10, padding: "14px 16px",
            marginBottom: 14, border: `1px solid ${t.border}`
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, color: t.subtext,
              textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5
            }}>
              Why this helps
            </p>
            <p style={{ fontSize: 15, color: t.text, lineHeight: 1.65 }}>{action.benefit}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: t.subtext }}>{pickCount} picked</span>
          {action.avg_rating > 0 && (
            <span style={{ fontSize: 14, color: t.subtext }}>{action.avg_rating}/5 rating</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: t.subtext, marginRight: 6 }}>
            {ratingDone ? "Thank you" : "Rate this action"}
          </span>
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s}
              onMouseEnter={() => !ratingDone && setHovStar(s)}
              onMouseLeave={() => setHovStar(0)}
              onClick={() => rate(s)}
              style={{
                fontSize: 21, cursor: ratingDone ? "default" : "pointer",
                color: s <= (hovStar || userRating) ? t.accent : t.border,
                transition: "color 0.1s"
              }}>
              {s <= (hovStar || userRating) ? "★" : "☆"}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => setShowBenefit(v => !v)} style={{
            padding: "10px 18px", borderRadius: 10,
            border: `1.5px solid ${t.border}`, background: "transparent",
            color: t.text, fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            {showBenefit ? "Hide Reason" : "Show Why"}
          </button>

          <button onClick={() => onVideoOpen(action.embed_url, action.video_title)} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#cc0000", color: "#fff",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            Watch Video
          </button>

          {/* FIX: no API call here — just opens reminder modal */}
          <button onClick={() => { if (!picked) setShowReminder(true) }} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: picked ? t.soft : t.btnPrimary,
            color: picked ? t.subtext : t.accentText,
            fontWeight: 700, fontSize: 15, cursor: picked ? "default" : "pointer",
          }}>
            {picked ? "Added to profile" : "Let's do this"}
          </button>
        </div>
      </div>

      {showReminder && (
        <ReminderModal
          action={action}
          onClose={() => setShowReminder(false)}
          onPickConfirmed={handlePickConfirmed}
        />
      )}
    </>
  )
}

// ─── STREAK CELEBRATION MODAL ─────────────────────────────────────────────────
// Shows automatically when the user hits a 7, 30, or 90-day streak milestone.
// Displays a badge and share buttons for Twitter/X and LinkedIn.
function StreakCelebration({ actionText, milestone, actionId, onClose }) {
  const { t } = useApp()
  const [copiedIG, setCopiedIG] = useState(false)
  const [copiedStory, setCopiedStory] = useState(false)

  const MILESTONE_DATA = {
    7: { label: "7-Day Streak", message: "One full week of showing up every day.", badge: "7" },
    30: { label: "30-Day Streak", message: "One full month of consistent action.", badge: "30" },
    90: { label: "90-Day Streak", message: "Ninety days. This is now a real habit.", badge: "90" },
  }
  const data = MILESTONE_DATA[milestone] || MILESTONE_DATA[7]

  const shareText = `I just hit a ${data.label} on MindActions!\n\nMy action: "${actionText}"\n\n${data.message}\n\n#MindActions #Habits #PersonalGrowth`

  const storyText = `Day ${milestone} streak\n\n"${actionText}"\n\n#MindActions`

  async function acknowledge() {
    await axios.post("/api/profile/milestones/acknowledge", {
      action_id: actionId,
      milestone,
    }).catch(e => console.error("Acknowledge failed:", e.response?.data))
  }

  async function handleClose() {
    await acknowledge()
    onClose()
  }

  // LinkedIn: opens composer with text pre-filled
  function shareLinkedIn() {
    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank", "width=700,height=600")
  }

  // Twitter/X
  function shareTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    window.open(url, "_blank", "width=600,height=400")
  }

  // Instagram post: copy text then open Instagram
  async function shareInstagram() {
    await navigator.clipboard.writeText(shareText)
    setCopiedIG(true)
    setTimeout(() => {
      setCopiedIG(false)
      // On mobile this opens the Instagram app; on desktop opens instagram.com
      window.open("https://www.instagram.com/", "_blank")
    }, 1200)
  }

  // Instagram Story: copy shorter story text then open Instagram
  async function shareInstagramStory() {
    await navigator.clipboard.writeText(storyText)
    setCopiedStory(true)
    setTimeout(() => {
      setCopiedStory(false)
      // On mobile: deep link to Instagram Stories camera
      // On desktop: opens instagram.com (stories can only be posted from mobile app)
      const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
      if (isMobile) {
        window.open("instagram://story-camera", "_blank")
      } else {
        window.open("https://www.instagram.com/", "_blank")
      }
    }, 1200)
  }

  const btnBase = {
    padding: "11px 14px", borderRadius: 10,
    border: `1.5px solid ${t.border}`, background: t.card,
    color: t.text, fontWeight: 700, fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "opacity 0.15s",
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 4000, padding: 20
    }}>
      <div style={{
        background: t.card, borderRadius: 24, padding: "48px 40px",
        maxWidth: 520, width: "100%", textAlign: "center",
        boxShadow: "0 40px 100px rgba(0,0,0,0.4)"
      }}>

        {/* Badge — large number circle */}
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          border: `3px solid ${t.accent}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 22px", fontSize: 36, fontWeight: 900,
          color: t.accent
        }}>
          {data.badge}
        </div>

        <div style={{ fontSize: 30, fontWeight: 800, color: t.text, marginBottom: 8 }}>
          {data.label}
        </div>
        <div style={{ fontSize: 16, color: t.subtext, marginBottom: 14, lineHeight: 1.6 }}>
          {data.message}
        </div>
        <div style={{
          fontSize: 14, color: t.subtext, marginBottom: 32,
          padding: "12px 16px", background: t.soft, borderRadius: 10,
          borderLeft: `3px solid ${t.accent}`, textAlign: "left",
          fontStyle: "italic", lineHeight: 1.5
        }}>
          "{actionText}"
        </div>

        <div style={{
          fontSize: 12, fontWeight: 700, color: t.subtext,
          textTransform: "uppercase", letterSpacing: 1, marginBottom: 14
        }}>
          Share your achievement
        </div>

        {/* Share buttons — 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>

          {/* Twitter/X */}
          <button onClick={shareTwitter} style={btnBase}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={t.text}>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            X (Twitter)
          </button>

          {/* LinkedIn — text pre-filled in composer */}
          <button onClick={shareLinkedIn} style={btnBase}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#0077b5">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>

          {/* Instagram Post */}
          <button onClick={async () => {
            await navigator.clipboard.writeText(shareText)
            setCopiedIG(true)
            setTimeout(() => setCopiedIG(false), 2000)
          }} style={btnBase}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={t.text} strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copiedIG ? "Copied!" : "Copy Text"}
          </button>

          {/* Instagram Story */}
          <button onClick={shareInstagramStory} style={btnBase}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={t.text} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="5" />
            </svg>
            {copiedStory ? "Copied — open Instagram" : "Instagram Story"}
          </button>

        </div>

        {/* Note about Instagram */}
        <p style={{ fontSize: 12, color: t.subtext, marginBottom: 24, lineHeight: 1.6 }}>
          For Instagram: text is copied to your clipboard automatically.
          Paste it when Instagram opens. On mobile, this opens the app directly.
        </p>

        <button onClick={handleClose} style={{
          width: "100%", padding: "15px", borderRadius: 12, border: "none",
          background: t.btnPrimary, color: t.accentText,
          fontWeight: 700, fontSize: 17, cursor: "pointer",
        }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ─── EVENING CHECK-IN MODAL ───────────────────────────────────────────────────
// Appears when the user hasn't completed an action by the end of the day.
// Asks "What stopped you?" and saves the response to the database.
function EveningCheckin({ action, onClose }) {
  const { t } = useApp()
  const [response, setResponse] = useState("")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!response.trim()) { onClose(); return }
    setSaving(true)
    try {
      await axios.post("/api/profile/missed", {
        action_id: action.id,
        response: response.trim(),
      })
      setSaved(true)
      setTimeout(onClose, 1600)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 3500, padding: 20
    }}>
      <div style={{
        background: t.card, borderRadius: 22, padding: "44px 40px",
        maxWidth: 480, width: "100%", boxShadow: t.shadow
      }}>
        {saved ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: `2px solid ${t.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M4 12l6 6 10-10" stroke={t.accent} strokeWidth="2.5"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>
              Response saved
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 8 }}>
              What stopped you?
            </div>
            <div style={{ fontSize: 15, color: t.subtext, marginBottom: 8, lineHeight: 1.5 }}>
              You did not complete your action today:
            </div>
            <div style={{
              fontSize: 15, color: t.text, fontStyle: "italic",
              paddingLeft: 12, borderLeft: `3px solid ${t.accent}`,
              marginBottom: 24, lineHeight: 1.5
            }}>
              "{action.text}"
            </div>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Tell us what got in the way — your answer helps you understand patterns over time"
              rows={4}
              style={{
                width: "100%", padding: "13px 15px", borderRadius: 10,
                border: `1.5px solid ${t.inputBorder}`, background: t.input,
                color: t.text, fontSize: 15, resize: "vertical",
                lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box",
                marginBottom: 18
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleSave} disabled={saving} style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: t.btnPrimary, color: t.accentText,
                fontWeight: 700, fontSize: 16, cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}>
                {saving ? "Saving..." : "Save Response"}
              </button>
              <button onClick={onClose} style={{
                width: "100%", padding: "13px", borderRadius: 12,
                border: `1px solid ${t.border}`, background: "transparent",
                color: t.subtext, fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}>
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── PROFILE ACTION CARD ──────────────────────────────────────────────────────
function ProfileActionCard({ a, onVideoOpen }) {
  const { t } = useApp()
  const [showReminder, setShowReminder] = useState(false)
  const [completed, setCompleted] = useState(false)

  async function markComplete() {
    if (completed) return
    await axios.post(`/api/profile/actions/${a.id}/complete`, { source: "profile" }).catch(() => { })
    setCompleted(true)
  }

  return (
    <>
      <div style={{
        background: t.card, borderRadius: 16, padding: "22px 24px",
        border: `1px solid ${t.border}`, marginBottom: 14, boxShadow: t.shadow
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 11
        }}>
          <CatTag category={a.category} />
          <span style={{ fontSize: 13, color: t.subtext }}>
            Added {new Date(a.picked_at).toLocaleDateString()}
          </span>
        </div>

        <p style={{
          fontSize: 16, fontWeight: 700, color: t.text,
          lineHeight: 1.5, marginBottom: 16
        }}>{a.text}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button onClick={() => onVideoOpen(a.embed_url, a.video_title)} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#cc0000", color: "#fff",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            Watch Video
          </button>

          <button onClick={markComplete} style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: completed ? t.soft : t.btnSuccess,
            color: completed ? t.subtext : t.accentText,
            fontWeight: 700, fontSize: 15,
            cursor: completed ? "default" : "pointer",
          }}>
            {completed ? "Completed" : "Action Complete"}
          </button>

          <button onClick={() => setShowReminder(true)} style={{
            padding: "10px 18px", borderRadius: 10,
            border: `1.5px solid ${t.border}`, background: "transparent",
            color: t.text, fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}>
            Change Reminder
          </button>
        </div>
      </div>

      {showReminder && (
        <ReminderModal action={a} isEdit={true} onClose={() => setShowReminder(false)} />
      )}
    </>
  )
}

// ─── SEARCH PAGE ──────────────────────────────────────────────────────────────
function SearchPage({ onNavigate }) {
  const { t, user, logout } = useApp()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState(null)
  const [videoModal, setVideoModal] = useState(null)

  useEffect(() => {
    axios.get("/api/categories").then(r => setCategories(r.data.categories)).catch(() => { })
  }, [])

  useEffect(() => { if (searched) doSearch() }, [activeCat])

  async function doSearch() {
    if (!query.trim()) return
    setLoading(true); setError(null)
    try {
      const params = { q: query, limit: 12 }
      if (activeCat) params.category = activeCat
      const res = await axios.get("/api/search", { params })
      setResults(res.data.results)
      setSearched(true)
    } catch {
      setError("Search failed. Make sure Ollama is running — open a terminal and run: ollama serve")
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      <div style={{ background: t.header, padding: "24px 24px 30px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 22
          }}>
            <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>MindActions</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onNavigate("profile")} style={{
                padding: "8px 18px", borderRadius: 20, border: "none",
                background: "rgba(255,255,255,0.15)", color: "#fff",
                fontWeight: 600, fontSize: 14, cursor: "pointer"
              }}>
                {user?.name?.split(" ")[0] || "Profile"}
              </button>
              <button onClick={logout} style={{
                padding: "8px 16px", borderRadius: 20, border: "none",
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                fontSize: 14, cursor: "pointer"
              }}>
                Log out
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, maxWidth: 660, margin: "0 auto 16px" }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Describe how you feel or what you want to improve"
              style={{
                flex: 1, padding: "14px 18px", borderRadius: 12, border: "none",
                fontSize: 15, background: "#fff", color: "#111",
                boxShadow: "0 2px 16px rgba(0,0,0,0.2)"
              }} />
            <button onClick={doSearch} style={{
              padding: "14px 22px", borderRadius: 12, border: "none",
              background: "#fff", color: "#111", fontWeight: 700,
              fontSize: 15, cursor: "pointer"
            }}>
              Search
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
            {categories.map(c => (
              <button key={c.name}
                onClick={() => setActiveCat(activeCat === c.name ? null : c.name)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "none",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  background: activeCat === c.name ? "#fff"
                    : "rgba(255,255,255,0.15)",
                  color: activeCat === c.name ? "#111" : "rgba(255,255,255,0.9)"
                }}>
                {c.name.replace("_", " ")}
                <span style={{ marginLeft: 5, opacity: 0.6, fontSize: 11 }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <Spinner />
            <p style={{ color: t.subtext, marginTop: 16, fontSize: 16 }}>
              Finding the best actions for you...
            </p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            padding: "14px 18px", borderRadius: 10, marginBottom: 16,
            background: t.soft, border: `1px solid ${t.border}`,
            color: t.text, fontSize: 15
          }}>{error}</div>
        )}

        {!loading && searched && (
          <p style={{ fontSize: 14, color: t.subtext, marginBottom: 16 }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
            {activeCat ? ` in "${activeCat.replace("_", " ")}"` : ""}
          </p>
        )}

        {!loading && results.map(a => (
          <ActionCard key={a.id} action={a}
            onVideoOpen={(url, title) => setVideoModal({ url, title })} />
        ))}

        {!loading && searched && results.length === 0 && !error && (
          <p style={{ textAlign: "center", color: t.subtext, padding: "48px 0", fontSize: 16 }}>
            No results found. Try different words or remove the category filter.
          </p>
        )}

        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              border: `2px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 22px"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="10" cy="10" r="6" stroke={t.subtext} strokeWidth="2" fill="none" />
                <path d="M14 14l5 5" stroke={t.subtext} strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 10 }}>
              What is on your mind?
            </p>
            <p style={{ fontSize: 16, color: t.subtext, lineHeight: 1.8 }}>
              Search by how you feel, not just keywords.<br />
              Try "can not focus" or "too much stress"
            </p>
          </div>
        )}
      </div>

      {videoModal && (
        <VideoModal embedUrl={videoModal.url} title={videoModal.title}
          onClose={() => setVideoModal(null)} />
      )}
    </div>
  )
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ onNavigate }) {
  const { t, user, logout } = useApp()
  const [actions, setActions] = useState([])
  const [streaks, setStreaks] = useState({})
  const [view, setView] = useState(7)
  const [loading, setLoading] = useState(true)
  const [videoModal, setVideoModal] = useState(null)
  // Celebration state — stores { actionText, milestone, actionId } when a milestone is hit
  const [celebration, setCelebration] = useState(null)
  // Evening check-in state — stores the action object when it's time to check in
  const [checkin, setCheckin] = useState(null)

  useEffect(() => {
    axios.get("/api/profile/actions").then(async res => {
      const fetchedActions = res.data.actions
      setActions(fetchedActions)

      const s = {}
      for (const a of fetchedActions) {
        try {
          // Fetch streak data for each action
          const sr = await axios.get(`/api/profile/streak/${a.id}`)
          s[a.id] = sr.data

          // Check if this action has a new unacknowledged milestone
          // Only check if streak > 0 to avoid unnecessary calls
          if (sr.data.streak > 0) {
            const milestoneRes = await axios.get(`/api/profile/milestones/${a.id}`)
            console.log("Milestone check for action", a.id, ":", milestoneRes.data)
            if (milestoneRes.data.celebrate) {
              // Show celebration for the first milestone we find
              // (if multiple exist, we'll show them one by one on future page loads)
              if (!celebration) {
                setCelebration({
                  actionText: a.text,
                  milestone: milestoneRes.data.celebrate,
                  actionId: a.id,
                })
              }
            }
          }
        } catch { }
      }
      setStreaks(s)
      setLoading(false)

      // Evening check-in logic:
      // Check time — if it's between 8pm and midnight, and user hasn't completed
      // any action today, show the check-in for the first uncompleted action
      const now = new Date()
      const hour = now.getHours()
      if (hour >= 20) {
        const today = new Date().toISOString().split("T")[0]
        for (const a of fetchedActions) {
          const streak = s[a.id]
          if (!streak) continue
          const completedToday = streak.days_7?.[streak.days_7.length - 1]?.completed
          if (!completedToday) {
            // Check localStorage so we only show the check-in once per day per action
            const key = `checkin_shown_${a.id}_${today}`
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, "1")
              setCheckin(a)
              break // show for the first uncompleted action only
            }
          }
        }
      }

    }).catch(() => setLoading(false))
  }, [])

  // Streak dots visual — circles showing completion per day
  function StreakDots({ actionId }) {
    const data = streaks[actionId]
    if (!data) return null
    const days = view === 7 ? data.days_7 : view === 30 ? data.days_30 : data.days_90
    if (!days) return null
    const sz = view === 7 ? 24 : view === 30 ? 15 : 9
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 6 }}>
          {days.map((d, i) => (
            <div key={i} title={d.date} style={{
              width: sz, height: sz, borderRadius: "50%",
              background: d.completed ? t.streakOn : t.streakOff,
              opacity: d.completed ? 1 : 0.4,
            }} />
          ))}
        </div>
        {data.streak > 0 && (
          <p style={{ fontSize: 14, color: t.accent, fontWeight: 700 }}>
            {data.streak}-day streak
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>

      {/* Header */}
      <div style={{ background: t.header, padding: "28px 24px 36px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 26
          }}>
            <button onClick={() => onNavigate("search")} style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 20, padding: "8px 18px", color: "#fff",
              fontWeight: 600, cursor: "pointer", fontSize: 14
            }}>
              Back to Search
            </button>
            <button onClick={logout} style={{
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: 20, padding: "8px 16px",
              color: "rgba(255,255,255,0.75)", fontSize: 14, cursor: "pointer"
            }}>
              Log out
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "#fff"
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 20 }}>{user?.name}</p>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* 7 / 30 / 90 day view selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[7, 30, 90].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "9px 22px", borderRadius: 20,
              border: `1px solid ${t.border}`,
              background: view === v ? t.accent : "transparent",
              color: view === v ? t.accentText : t.subtext,
              fontWeight: 700, fontSize: 14, cursor: "pointer"
            }}>
              {v} days
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <Spinner />
            <p style={{ color: t.subtext, marginTop: 16, fontSize: 15 }}>
              Loading your actions...
            </p>
          </div>
        )}

        {!loading && actions.length === 0 && (
          <div style={{ textAlign: "center", padding: "72px 0" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: `2px solid ${t.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px"
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22">
                <path d="M11 2v18M2 11h18" stroke={t.subtext} strokeWidth="2"
                  strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 8 }}>
              No actions yet
            </p>
            <p style={{ fontSize: 15, color: t.subtext, marginBottom: 24, lineHeight: 1.6 }}>
              Search for actions and tap "Let's do this" to add them here
            </p>
            <button onClick={() => onNavigate("search")} style={{
              padding: "13px 28px", borderRadius: 12, border: "none",
              background: t.btnPrimary, color: t.accentText,
              fontWeight: 700, fontSize: 16, cursor: "pointer"
            }}>
              Find Actions
            </button>
          </div>
        )}

        {actions.map(a => (
          <div key={a.id}>
            <StreakDots actionId={a.id} />
            <ProfileActionCard
              a={a}
              onVideoOpen={(url, title) => setVideoModal({ url, title })}
            />
          </div>
        ))}
      </div>

      {/* Celebration popup — appears when a milestone is newly hit */}
      {celebration && (
        <StreakCelebration
          actionText={celebration.actionText}
          milestone={celebration.milestone}
          actionId={celebration.actionId}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Evening check-in popup */}
      {checkin && (
        <EveningCheckin
          action={checkin}
          onClose={() => setCheckin(null)}
        />
      )}

      {videoModal && (
        <VideoModal embedUrl={videoModal.url} title={videoModal.title}
          onClose={() => setVideoModal(null)} />
      )}
    </div>
  )
}

// ─── THEME PICKER ─────────────────────────────────────────────────────────────
function ThemePicker() {
  const { themeName, setThemeName, t } = useApp()
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 500,
      background: t.card, borderRadius: 30, padding: "5px 6px",
      boxShadow: t.shadow, border: `1px solid ${t.border}`,
      display: "flex", gap: 4
    }}>
      {["light", "dark", "soft"].map(id => (
        <button key={id} onClick={() => setThemeName(id)} style={{
          padding: "8px 16px", borderRadius: 22, border: "none",
          background: themeName === id ? THEMES[id].accent : "transparent",
          color: themeName === id ? THEMES[id].accentText : t.subtext,
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          textTransform: "capitalize", transition: "all 0.15s",
        }}>{id}</button>
      ))}
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [themeName, setThemeNameState] = useState(
    () => localStorage.getItem("theme") || "light"
  )
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem("token") || null)
  const [page, setPage] = useState(null)

  const t = THEMES[themeName] || THEMES.light

  function setThemeName(name) {
    setThemeNameState(name)
    localStorage.setItem("theme", name)
    if (token) axios.patch("/api/auth/theme", { theme: name }).catch(() => { })
  }

  function logout() {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setupAxios(null)
    setUser(null)
    setToken(null)
    setPage("login")
  }

  useEffect(() => {
    if (token) setupAxios(token)
    if (window.location.pathname.startsWith("/auth/callback")) {
      setPage("callback"); return
    }
    // FIX: only check user+token, not page state
    setPage(user && token ? "search" : "login")
  }, [])

  const ctx = { t, themeName, setThemeName, user, setUser, token, setToken, logout }

  function render() {
    if (!page) return null
    if (page === "callback") return <AuthCallback onNavigate={setPage} />
    if (!user || !token) return <LoginPage onNavigate={setPage} />
    if (page === "profile") return <ProfilePage onNavigate={setPage} />
    return <SearchPage onNavigate={setPage} />
  }

  return (
    <AppCtx.Provider value={ctx}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Caveat', cursive;
          background: ${t.bg};
        }
        input, select, button, textarea { font-family: 'Caveat', cursive; }
        input:focus, select:focus { outline: 2px solid ${t.accent}; outline-offset: 2px; }
        select { appearance: none; -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${t.soft}; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
      `}</style>
      {render()}
      <ThemePicker />
    </AppCtx.Provider>
  )
}