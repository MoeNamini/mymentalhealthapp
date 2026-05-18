// App.jsx — complete
// Changes in this version:
// - Restored missing SearchPage component
// - Includes Custom Action "+" button, Share Modals, Journal flows, and 10% larger fonts
// - Includes Custom Scrollbars and Glassmorphic popups

import { useState, useEffect, createContext, useContext } from "react"
import axios from "axios"

// ─── THEMES (Desaturated, Matte, Neumorphic) ──────────────────────────────────
const THEMES = {
  calm: {
    bg: "#627D85", shadowDark: "#23454fff", shadowLight: "#a9c4cdff", text: "#4dc4b2ff", subtext: "#10a0bdff", accent: "#D0D4D0",
    accentText: "#1a1b1d", tag: "#4dc4b2ff", streakOn: "#075f79ff", streakOff: "#c5cfca", placeholder: "rgba(162, 195, 232, 0.4)", bgRGB: "98, 125, 133", selectionBg: "rgba(208, 212, 208, 0.35)"
  },
  light: {
    bg: "#dcdcdcec", shadowDark: "#c4c1bc", shadowLight: "#ffffff", text: "#403d39", subtext: "#7a7771", accent: "#728c82",
    accentText: "#ffffff", tag: "#d8d5cf", streakOn: "#728c82", streakOff: "#d1cec8", placeholder: "rgba(64, 61, 57, 0.45)", bgRGB: "220, 220, 220", selectionBg: "rgba(114, 140, 130, 0.3)"
  },
  dark: {
    bg: "#2b2d30", shadowDark: "#1d1e20", shadowLight: "#393c40", text: "#dcdedf", subtext: "#8b8f94", accent: "#c49a78",
    accentText: "#1a1b1d", tag: "#222426", streakOn: "#c49a78", streakOff: "#202224", placeholder: "rgba(220, 222, 223, 0.4)", bgRGB: "43, 45, 48", selectionBg: "rgba(196, 154, 120, 0.3)"
  },
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const AppCtx = createContext(null)
const useApp = () => useContext(AppCtx)

function setupAxios(token) {
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
  else delete axios.defaults.headers.common["Authorization"]
}

// ─── SHARED LOADERS & CONTROLS ────────────────────────────────────────────────
function Spinner() {
  const { t } = useApp()
  return <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto", border: `5px solid ${t.shadowDark}`, borderTop: `5px solid ${t.accent}`, animation: "spin 0.75s linear infinite" }} />
}

function BreathingLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, padding: "20px 0" }}>
      <div className="neu-inset skeleton-breathe" style={{ height: 260, borderRadius: 28, width: "100%" }} />
      <div className="neu-inset skeleton-breathe" style={{ height: 260, borderRadius: 28, width: "100%" }} />
    </div>
  )
}

function ZenDial({ value, min, max, onChange, label }) {
  const { t } = useApp()
  return (
    <div className="neu-inset" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", borderRadius: "20px", width: 110 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.subtext, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <button className="neu-btn-flat" onClick={() => onChange(value >= max ? min : value + 1)} style={{ padding: "10px", width: "100%", fontSize: 24 }}>▲</button>
      <div style={{ fontSize: 44, fontWeight: 800, color: t.text, margin: "12px 0" }}>{String(value).padStart(2, "0")}</div>
      <button className="neu-btn-flat" onClick={() => onChange(value <= min ? max : value - 1)} style={{ padding: "10px", width: "100%", fontSize: 24 }}>▼</button>
    </div>
  )
}

function ElasticSlider({ options, value, onChange }) {
  const idx = options.indexOf(value)
  return (
    <div className="neu-inset" style={{ display: "flex", position: "relative", borderRadius: 30, padding: 8, width: "100%", maxWidth: 500, margin: "0 auto 36px" }}>
      <div className="neu-btn" style={{ position: "absolute", top: 8, bottom: 8, zIndex: 1, width: `calc(${100 / options.length}% - 16px)`, left: `calc(${idx * (100 / options.length)}% + 8px)`, transition: "left 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)", borderRadius: 22 }} />
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{ flex: 1, padding: "14px 0", border: "none", background: "transparent", color: value === opt ? "var(--accent)" : "var(--subtext)", fontWeight: 700, fontSize: 20, zIndex: 2, cursor: "pointer", transition: "color 0.4s" }}>
          {opt} days
        </button>
      ))}
    </div>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onNavigate }) {
  const { t, setUser, setToken } = useApp()
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
      onNavigate("search")
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.")
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="neu-inset" style={{ padding: "50px 46px", width: "100%", maxWidth: 460, borderRadius: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: t.text }}>MindActions</div>
          <div style={{ fontSize: 20, color: t.subtext, marginTop: 6 }}>{mode === "login" ? "Welcome back" : "Create your free account"}</div>
        </div>
        {error && <div className="neu-card" style={{ padding: "14px 18px", marginBottom: 20, color: t.text, fontSize: 18 }}>{error}</div>}
        {mode === "signup" && (
          <>
            <label className="input-label">Full name</label>
            <input className="neu-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
          </>
        )}
        <label className="input-label">Email</label>
        <input className="neu-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
        <label className="input-label">Password</label>
        <input className="neu-input" type="password" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
        <button className="neu-btn neu-btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "20px", fontSize: 20, marginBottom: 28, marginTop: 36 }}>
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", fontSize: 16, color: t.subtext, marginBottom: 18 }}>or continue with</div>
        {[
          { label: "LinkedIn", href: "/api/auth/google", icon: <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#0A66C2" d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.27c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 11.27h-3v-5.6c0-3.36-4-3.11-4 0v5.6h-3v-10h3v1.48c1.39-2.57 7-2.77 7 2.47v6.05z" /></svg> },
          { label: "X (Twitter)", href: "/api/auth/twitter", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill={t.text}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
        ].map(o => (
          <button key={o.label} onClick={() => window.location.href = o.href} className="neu-btn" style={{ width: "100%", padding: "18px 20px", fontSize: 18, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            Continue with {o.label}
          </button>
        ))}
        <div style={{ textAlign: "center", marginTop: 28, fontSize: 18, color: t.subtext }}>
          {mode === "login" ? "No account?" : "Already have an account?"}
          <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }} style={{ color: t.accent, fontWeight: 700, cursor: "pointer", marginLeft: 8 }}>{mode === "login" ? "Sign up" : "Log in"}</span>
        </div>
      </div>
    </div>
  )
}

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
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: useApp().t.subtext, fontSize: 20 }}>Signing you in...</p></div>
}

// ─── SHARE & NOTIFICATION MODALS ──────────────────────────────────────────────
function ShareModal({ action, context, onClose, onFinish }) {
  const { t } = useApp()
  let title = "Share"; let sub = ""
  if (context === "commitment") { title = "Make a Commitment"; sub = "Do you wanna make a commitment by sharing this challenge?" }
  else if (context === "completed") { title = "Action Completed"; sub = "Share your success and inspire others!" }
  else if (context === "milestone") { title = "Milestone Reached"; sub = "Incredible dedication! Share your streak." }

  const shareText = `I'm tracking "${action.text}" on MindActions!`

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 20, color: t.subtext, marginBottom: 30, lineHeight: 1.6 }}>{sub}</div>
        <div className="neu-inset" style={{ padding: 24, fontSize: 20, color: t.text, fontStyle: "italic", lineHeight: 1.6, marginBottom: 32, borderRadius: 20 }}>"{action.text}"</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(shareText)}`)} className="neu-btn" style={{ padding: "16px", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>🟦 LinkedIn</button>
          <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`)} className="neu-btn" style={{ padding: "16px", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>⬛ X (Twitter)</button>
          <button onClick={() => window.open("https://instagram.com")} className="neu-btn" style={{ padding: "16px", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>📸 IG Story</button>
          <button onClick={() => { navigator.clipboard.writeText(shareText); alert("Copied!") }} className="neu-btn" style={{ padding: "16px", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>📋 Copy Text</button>
        </div>
        <button className="neu-btn neu-btn-primary" onClick={() => { onClose(); if (onFinish) onFinish() }} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Done</button>
      </div>
    </div>
  )
}

function ActiveNotificationModal({ action, onSnooze, onDone }) {
  const { t } = useApp()
  return (
    <div className="glass-modal" onClick={() => { }}>
      <div className="neu-card" style={{ padding: "50px 40px", maxWidth: 460, width: "100%", textAlign: "center", animation: "slideDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
        <style>{`@keyframes slideDown { from { transform: translateY(-50px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
        <div className="neu-inset" style={{ width: 70, height: 70, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <span style={{ fontSize: 34 }}>🔔</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Time for your action</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: t.text, marginBottom: 44, lineHeight: 1.5 }}>{action.text}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button onClick={() => onDone(action)} className="neu-btn neu-btn-primary" style={{ padding: "22px", fontSize: 22 }}>Done — Log It</button>
          <button onClick={() => onSnooze(action)} className="neu-btn" style={{ padding: "18px", fontSize: 19 }}>Snooze, 15 minutes</button>
        </div>
      </div>
    </div>
  )
}

function MissedStreakModal({ count, onClose }) {
  const { t, setGenericJournalModal } = useApp()
  function handleFeedback() { onClose(); setGenericJournalModal(true) }
  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "50px 40px", maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div className="neu-inset" style={{ width: 70, height: 70, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <span style={{ fontSize: 34 }}>🌱</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 20, lineHeight: 1.5 }}>
          {count === 3 ? "Don't loose hope, many others have done it, you can do it too." : "Don't let anything stop you, even this app. Even if it is not good enough, do your Action and tell us how we can make it better."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {count >= 4 && <button onClick={handleFeedback} className="neu-btn neu-btn-primary" style={{ padding: "18px", fontSize: 20 }}>Give us Feedback</button>}
          <button onClick={onClose} className={count >= 4 ? "neu-btn" : "neu-btn neu-btn-primary"} style={{ padding: "18px", fontSize: 20 }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── REMINDER MODAL ───────────────────────────────────────────────────────────
function ReminderModal({ action, onClose, isEdit = false, onPickConfirmed }) {
  const { t, scheduleNotification } = useApp()
  const [tab, setTab] = useState("time")
  const [hour, setHour] = useState("08")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState("AM")
  const [repeat, setRepeat] = useState(false)
  const [repeatNum, setRepeatNum] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState("hour")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  useEffect(() => {
    axios.get(`/api/profile/reminder/${action.id}`)
      .then(res => {
        if (res.data.exists) {
          setTab(res.data.reminder_type || "time")
          setHour(res.data.target_hour || "08")
          setMinute(res.data.target_minute || "00")
          setAmpm(res.data.target_ampm || "AM")
          if (res.data.frequency_type) { setRepeat(true); setRepeatUnit(res.data.frequency_type); setRepeatNum(res.data.frequency_value || 1) }
        }
      }).catch(() => { }).finally(() => setLoadingInitial(false))
  }, [action.id])

  function updateHour(v) { setHour(String(Math.min(12, Math.max(1, parseInt(v) || 1))).padStart(2, "0")) }
  function updateMinute(v) { setMinute(String(Math.min(59, Math.max(0, parseInt(v) || 0))).padStart(2, "0")) }

  async function save() {
    setSaving(true)
    try {
      await axios.post("/api/profile/reminder", {
        action_id: action.id, reminder_type: tab, frequency_type: repeat && tab === "time" ? repeatUnit : null,
        frequency_value: repeat && tab === "time" ? repeatNum : null, target_hour: String(hour).padStart(2, '0'), target_minute: String(minute).padStart(2, '0'), target_ampm: ampm
      })
      if (tab === "time") {
        const now = new Date(); const target = new Date()
        let h = parseInt(hour); if (ampm === "PM" && h !== 12) h += 12; if (ampm === "AM" && h === 12) h = 0
        target.setHours(h, parseInt(minute), 0, 0)
        let repeatMs = null;
        if (repeat) repeatMs = repeatUnit === "minute" ? repeatNum * 60000 : repeatUnit === "hour" ? repeatNum * 3600000 : repeatNum * 86400000;
        if (target <= now) { if (repeatMs) { while (target <= now) target.setTime(target.getTime() + repeatMs); } else { target.setDate(target.getDate() + 1); } }
        scheduleNotification({ ...action, streak: action.streak || 0 }, target - now, repeatMs)
      }
      if (!isEdit && onPickConfirmed) await onPickConfirmed()
      setSaved(true)
    } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  if (loadingInitial) return <div className="glass-modal"><div className="neu-card" style={{ padding: 50 }}><Spinner /></div></div>

  if (saved) return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "60px 50px", maxWidth: 580, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div className="neu-inset" style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <svg width="34" height="34" viewBox="0 0 26 26"><path d="M4 13l7 7 11-11" stroke={t.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14 }}>Reminder {isEdit ? "updated" : "saved"}</div>
        <div style={{ fontSize: 21, color: t.subtext, marginBottom: 40, lineHeight: 1.8 }}>
          {tab === "time" ? (repeat ? `You will be reminded at ${hour}:${minute} ${ampm}, repeating every ${repeatNum} ${repeatUnit}(s)` : `You will be reminded at ${hour}:${minute} ${ampm}`) : "Add this app to your home screen to use the widget shortcut"}
        </div>
        <button onClick={onClose} className="neu-btn neu-btn-primary" style={{ width: "100%", padding: "20px", fontSize: 21 }}>Done</button>
      </div>
    </div>
  )

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "54px 48px", maxWidth: 620, width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, fontWeight: 700, color: t.text, marginBottom: 14 }}>{isEdit ? "Change Reminder" : "Set a Reminder"}</div>
        <div style={{ fontSize: 20, color: t.subtext, marginBottom: 36, lineHeight: 1.6, paddingLeft: 18, borderLeft: `4px solid ${t.accent}` }}>{action.text}</div>

        <div className="neu-inset" style={{ display: "flex", padding: 8, gap: 8, marginBottom: 44, borderRadius: 18 }}>
          {["time", "widget"].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} className={tab === tb ? "neu-btn active-tab" : "neu-btn-flat"} style={{ flex: 1, padding: "18px 0", borderRadius: 14, textTransform: "capitalize", fontSize: 20 }}>{tb === "time" ? "Time" : "Widget"}</button>
          ))}
        </div>

        {tab === "time" && (
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Time of the day</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 40 }}>
              <ZenDial value={parseInt(hour)} min={1} max={12} onChange={v => setHour(String(v).padStart(2, "0"))} label="Hour" />
              <span style={{ fontSize: 44, fontWeight: 800, color: t.text, paddingBottom: 16 }}>:</span>
              <ZenDial value={parseInt(minute)} min={0} max={59} onChange={v => setMinute(String(v).padStart(2, "0"))} label="Minute" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginLeft: 12 }}>
                <button onClick={() => setAmpm("AM")} className={ampm === "AM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>AM</button>
                <button onClick={() => setAmpm("PM")} className={ampm === "PM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>PM</button>
              </div>
            </div>
            <div style={{ height: 2, background: t.shadowDark, opacity: 0.2, marginBottom: 36 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: repeat ? 28 : 0 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: t.text }}>Repeat Reminder</span>
              <div onClick={() => setRepeat(v => !v)} className={repeat ? "neu-inset" : "neu-card"} style={{ width: 66, height: 38, borderRadius: 19, cursor: "pointer", position: "relative" }}>
                <div style={{ position: "absolute", top: 4, left: repeat ? 32 : 4, width: 30, height: 30, borderRadius: "50%", background: repeat ? t.accent : t.subtext, transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} />
              </div>
            </div>
            {repeat && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Repeat every</div>
                <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                  <input type="number" min="1" max="60" value={repeatNum} onChange={e => setRepeatNum(Math.max(1, parseInt(e.target.value) || 1))} className="neu-input" style={{ width: 120, padding: "20px 0", fontSize: 34, fontWeight: 800, textAlign: "center" }} />
                  <select value={repeatUnit} onChange={e => setRepeatUnit(e.target.value)} className="neu-input" style={{ flex: 1, padding: "0 24px", cursor: "pointer", fontSize: 22 }}>
                    <option value="minute">Minute(s)</option>
                    <option value="hour">Hour(s)</option>
                    <option value="day">Day(s)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "widget" && (
          <div className="neu-inset" style={{ padding: "30px 32px", borderRadius: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 18 }}>Add to Home Screen</div>
            <div style={{ fontSize: 19, color: t.subtext, lineHeight: 1.8 }}>
              1. Open this app in your phone browser<br />2. Tap the Share button (iOS) or the menu (Android)<br />3. Select "Add to Home Screen"<br />4. Tap the shortcut anytime to see this action
            </div>
          </div>
        )}
        <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 20 }}>
          <button onClick={save} disabled={saving} className="neu-btn neu-btn-primary" style={{ padding: "22px", opacity: saving ? 0.6 : 1, fontSize: 22 }}>
            {saving ? "Saving..." : isEdit ? "Update Reminder" : "Save Reminder"}
          </button>
          <button onClick={onClose} className="neu-btn" style={{ padding: "20px", fontSize: 21 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── POST-COMPLETION CASCADING MODALS ─────────────────────────────────────────
function PostCompleteJournalModal({ action, onClose, onFinish }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!content.trim()) { onClose(); return }
    setSaving(true)
    await axios.post("/api/profile/journal", { action_id: action.id, content: content.trim() }).catch(() => { })
    if (onFinish) onFinish()
  }

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Journal In</div>
        <div style={{ fontSize: 18, color: t.subtext, marginBottom: 28, lineHeight: 1.6 }}>How and with what, this Action helped you with, how did you feel before and how do you feel now.</div>
        <textarea className="neu-input" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Reflect on your progress..." style={{ width: "100%", padding: "20px", resize: "vertical", marginBottom: 30, fontSize: 19 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "18px", fontSize: 20 }}>{saving ? "Saving..." : "Save Entry"}</button>
          <button className="neu-btn" onClick={onFinish || onClose} style={{ padding: "18px", fontSize: 20 }}>Skip</button>
        </div>
      </div>
    </div>
  )
}

function PostCompleteReviewModal({ action, onClose, onFinish }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [rating, setRating] = useState(0)
  const [hovStar, setHovStar] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!content.trim() && rating === 0) { onClose(); return }
    setSaving(true)
    await axios.post(`/api/actions/${action.id}/review`, { content: content.trim(), rating: rating > 0 ? rating : null }).catch(() => { })
    if (onFinish) onFinish()
  }

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 520, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Write a Review</div>
        <div style={{ fontSize: 18, color: t.subtext, marginBottom: 28, lineHeight: 1.6 }}>With what this Action helped you with? Your review may help others too.</div>
        <textarea className="neu-input" value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="This action really helped me..." style={{ width: "100%", padding: "20px", resize: "vertical", marginBottom: 24, fontSize: 19 }} />
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 30 }}>
          {[1, 2, 3, 4, 5].map(s => {
            const selected = s <= (hovStar || rating);
            return (
              <span key={s} onMouseEnter={() => setHovStar(s)} onMouseLeave={() => setHovStar(0)} onClick={() => setRating(s)}
                style={{ fontSize: 36, cursor: "pointer", color: selected ? t.accent : 'transparent', WebkitTextStroke: selected ? 'none' : `1px ${t.shadowDark}`, transform: selected ? 'scale(1.15) translateY(-2px)' : 'scale(1)', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>★</span>
            )
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "18px", fontSize: 20 }}>{saving ? "Saving..." : "Submit Review"}</button>
          <button className="neu-btn" onClick={onFinish || onClose} style={{ padding: "18px", fontSize: 20 }}>Skip</button>
        </div>
      </div>
    </div>
  )
}

function ReviewsModal({ action, onClose }) {
  const { t } = useApp()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/actions/${action.id}/reviews`).then(res => {
      setReviews(res.data.reviews || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [action.id])

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 540, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14, textAlign: "center" }}>Community Reviews</div>
        <div style={{ fontSize: 18, color: t.subtext, fontStyle: "italic", textAlign: "center", marginBottom: 30 }}>{action.text}</div>

        <div style={{ overflowY: "auto", paddingRight: 10, flex: 1, display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 }}>
          {loading && <Spinner />}
          {!loading && reviews.length === 0 && <div style={{ textAlign: "center", color: t.subtext, fontSize: 18 }}>No reviews yet. Be the first!</div>}
          {!loading && reviews.map((r, i) => (
            <div key={i} className="neu-inset" style={{ padding: "20px 24px", borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>{r.user || "User"}</span>
                <span style={{ fontSize: 20, color: t.accent, WebkitTextStroke: `1px ${t.shadowDark}` }}>
                  {Array.from({ length: 5 }).map((_, idx) => idx < r.rating ? "★" : "☆").join("")}
                </span>
              </div>
              <div style={{ fontSize: 18, color: t.text, lineHeight: 1.6 }}>"{r.text}"</div>
            </div>
          ))}
        </div>
        <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "20px", fontSize: 20 }}>Close Reviews</button>
      </div>
    </div>
  )
}

function CustomActionModal({ onClose, onSuccess }) {
  const { t } = useApp()
  const [text, setText] = useState("")
  const [benefit, setBenefit] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await axios.post("/api/actions/custom", { text, benefit })
      onSuccess({ id: res.data.action_id, text, benefit, category: "Customized" })
    } catch { } finally { setSaving(false) }
  }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 520, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Create Custom Action</div>
        <label className="input-label">Action Name</label>
        <input className="neu-input" value={text} onChange={e => setText(e.target.value)} placeholder="Your own Action" style={{ width: "100%", padding: "18px 22px", fontSize: 19, marginBottom: 18 }} />
        <label className="input-label">Why it helps</label>
        <textarea className="neu-input" value={benefit} onChange={e => setBenefit(e.target.value)} rows={4} placeholder="How or why this will help you?" style={{ width: "100%", padding: "18px 22px", fontSize: 19, marginBottom: 30, resize: "vertical" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving || !text.trim()} style={{ padding: "18px", fontSize: 20 }}>{saving ? "Saving..." : "Save & Set Reminder"}</button>
          <button className="neu-btn" onClick={onClose} style={{ padding: "18px", fontSize: 20 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── DAY DETAILS MODAL ─────────────────────────────────────────────────────────
function DayDetailsModal({ date, reason, difficulty, onClose }) {
  const { t } = useApp()
  const diffLabel = difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Not Hard" : difficulty === "hard" ? "Hard" : "Completed"

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 460, width: "100%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 10 }}>{reason ? "Missed Action" : "Action Completed"}</div>
        <div style={{ fontSize: 20, color: t.subtext, marginBottom: 30 }}>{new Date(date).toLocaleDateString()}</div>
        {reason ? (
          <div className="neu-inset" style={{ padding: 28, fontSize: 22, color: t.text, fontStyle: "italic", lineHeight: 1.6, marginBottom: 32, borderRadius: 20 }}>"{reason}"</div>
        ) : (
          <div className="neu-inset" style={{ padding: 28, fontSize: 26, fontWeight: 700, color: t.accent, marginBottom: 32, borderRadius: 20 }}>Difficulty: {diffLabel}</div>
        )}
        <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Close</button>
      </div>
    </div>
  )
}

// ─── ACTION REPORT MODAL ──────────────────────────────────────────────────────
function ReportModal({ actionText, history, reasons, onClose }) {
  const { t } = useApp()
  const diffY = { "easy": 20, "medium": 50, "hard": 80 }
  const svgWidth = 400
  const svgHeight = 100
  const paddingX = 40

  let polylinePoints = ""
  if (history && history.length > 0) {
    polylinePoints = history.map((h, i) => {
      const x = history.length === 1 ? svgWidth / 2 : paddingX + (i * (svgWidth - 2 * paddingX) / (history.length - 1))
      const y = diffY[h.difficulty] || 50
      return `${x},${y}`
    }).join(" ")
  }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 580, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14, textAlign: "center" }}>Action Report</div>
        <div style={{ fontSize: 18, color: t.subtext, fontStyle: "italic", textAlign: "center", marginBottom: 34 }}>{actionText}</div>

        <div style={{ overflowY: "auto", paddingRight: 10, flex: 1, display: "flex", flexDirection: "column", gap: 32, marginBottom: 24 }}>
          <div className="neu-inset" style={{ padding: 24, borderRadius: 20, textAlign: "center" }}>
            <div style={{ fontSize: 17, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>Total Missed Days</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: t.accent }}>{reasons.length}</div>
          </div>
          {history && history.length > 0 && (
            <div className="neu-inset" style={{ padding: "24px 10px", borderRadius: 20 }}>
              <div style={{ fontSize: 17, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 20, textAlign: "center" }}>Difficulty Over Time</div>
              <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: "visible" }}>
                <line x1={paddingX} y1={20} x2={svgWidth - paddingX} y2={20} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />
                <line x1={paddingX} y1={50} x2={svgWidth - paddingX} y2={50} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />
                <line x1={paddingX} y1={80} x2={svgWidth - paddingX} y2={80} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />
                <text x="0" y="24" fontSize="13" fill={t.subtext} fontWeight="700">Easy</text>
                <text x="0" y="54" fontSize="13" fill={t.subtext} fontWeight="700">Avg</text>
                <text x="0" y="84" fontSize="13" fill={t.subtext} fontWeight="700">Hard</text>
                {history.length > 1 && <polyline fill="none" stroke={t.accent} strokeWidth="3" points={polylinePoints} strokeLinejoin="round" />}
                {history.map((h, i) => {
                  const x = history.length === 1 ? svgWidth / 2 : paddingX + (i * (svgWidth - 2 * paddingX) / (history.length - 1))
                  const y = diffY[h.difficulty] || 50
                  return <circle key={i} cx={x} cy={y} r="6" fill={t.bg} stroke={t.text} strokeWidth="3" />
                })}
              </svg>
            </div>
          )}
          {reasons.length > 0 && (
            <div>
              <div style={{ fontSize: 17, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 18, textAlign: "center" }}>Reasons Given</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reasons.map((r, i) => (
                  <div key={i} className="neu-inset" style={{ padding: 22, fontSize: 19, color: t.text, fontStyle: "italic", lineHeight: 1.6, borderRadius: 16 }}>"{r}"</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "20px", fontSize: 20 }}>Close Report</button>
      </div>
    </div>
  )
}

// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
function JournalInModal({ action, onClose, onSaved }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!content.trim()) { onClose(); return }
    setSaving(true)
    await axios.post("/api/profile/journal", { action_id: action ? action.id : null, content: content.trim() }).catch(() => { })
    if (onSaved) onSaved()
    onClose()
  }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 520, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Journal Entry</div>
        <div style={{ fontSize: 18, color: t.text, fontStyle: "italic", paddingLeft: 16, borderLeft: `4px solid ${t.accent}`, marginBottom: 36 }}>
          {action ? `"${action.text}"` : "General Thoughts"}
        </div>
        <textarea className="neu-input" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="How do you feel?" style={{ width: "100%", padding: "20px", resize: "vertical", marginBottom: 30, fontSize: 19 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "18px", fontSize: 20 }}>{saving ? "Saving..." : "Save Entry"}</button>
          <button className="neu-btn" onClick={onClose} style={{ padding: "18px", fontSize: 20 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── DIFFICULTY POPUP ─────────────────────────────────────────────────────────
function DifficultyPopup({ actionId, onClose, onLogged }) {
  const { t } = useApp()
  const [chosen, setChosen] = useState(null)

  async function pick(difficulty) {
    setChosen(difficulty)
    await axios.post(`/api/profile/actions/${actionId}/complete`, { source: "notification", difficulty }).catch(() => { })
    if (onLogged) onLogged()
    setTimeout(onClose, 1400)
  }

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "50px 44px", maxWidth: 440, width: "100%", textAlign: "center", border: `3px solid ${t.accent}` }}>
        {chosen ? (
          <>
            <div className="neu-inset" style={{ width: 70, height: 70, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 12l6 6 10-10" stroke={t.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: t.text }}>Logged Successfully</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14 }}>How hard was it?</div>
            <div style={{ fontSize: 18, color: t.subtext, marginBottom: 36, lineHeight: 1.7 }}>Your feedback builds your action report.</div>
            {[["Easy", "easy"], ["Not Hard", "medium"], ["Hard", "hard"]].map(([label, val]) => (
              <button key={val} onClick={() => pick(val)} className="neu-btn" style={{ display: "block", width: "100%", padding: "20px", marginBottom: 18, fontSize: 21 }}>{label}</button>
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
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ maxWidth: 880, width: "100%", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 28px" }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: t.subtext, flex: 1, marginRight: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
          <button onClick={onClose} className="neu-btn" style={{ width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>×</button>
        </div>
        <iframe src={embedUrl} title={title} allowFullScreen frameBorder="0" style={{ width: "100%", aspectRatio: "16/9", display: "block" }} />
      </div>
    </div>
  )
}

// ─── CATEGORY TAG ─────────────────────────────────────────────────────────────
function CatTag({ category }) {
  const { goToCategory } = useApp()
  return (
    <span className="neu-inset" onClick={() => goToCategory(category)} style={{ padding: "10px 20px", borderRadius: 22, fontSize: 16, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}>
      {(category || "").replace("_", " ")}
    </span>
  )
}

// ─── SEARCH PAGE COMPONENTS ───────────────────────────────────────────────────
function SearchPage() {
  const { t, user, logout, searchQuery, setSearchQuery, activeCat, setActiveCat, setPage } = useApp()
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [pendingCustomAction, setPendingCustomAction] = useState(null)

  useEffect(() => {
    axios.get("/api/categories").then(r => setCategories(r.data.categories || [])).catch(() => { })
  }, [])

  useEffect(() => {
    if (activeCat || searchQuery) doSearch()
  }, [activeCat])

  async function doSearch() {
    if (!searchQuery.trim() && !activeCat) return
    setLoading(true)
    setErrorMsg("")
    try {
      const params = { q: searchQuery, limit: 12 }
      if (activeCat) params.category = activeCat
      const res = await axios.get("/api/search", { params })
      if (res.data.error) setErrorMsg(res.data.error)
      setResults(res.data.results || [])
      setSearched(true)
    } catch {
      setErrorMsg("Error reaching search engine.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 38 }}>
            <span style={{ color: t.text, fontSize: 32, fontWeight: 800 }}>MindActions</span>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 26px", fontSize: 18 }}>{user?.name?.split(" ")[0] || "Profile"}</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, maxWidth: 700, margin: "0 auto 28px" }}>
            <input className="neu-inset search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
              placeholder="Describe how you feel or what you want to improve"
              style={{ flex: 1, padding: "20px 24px", fontSize: 19, color: t.text, border: "none", outline: "none", borderRadius: 16 }} />
            <button className="neu-btn neu-btn-primary" onClick={doSearch} style={{ padding: "20px 36px", fontSize: 19 }}>Search</button>
            <button className="neu-btn" onClick={() => setShowCustomModal(true)} style={{ width: 66, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>

          {errorMsg && <div className="neu-card" style={{ padding: "16px 20px", color: "#c94c4c", fontWeight: 700, textAlign: "center", marginBottom: 20 }}>{errorMsg}</div>}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", paddingBottom: 24 }}>
            {categories.map(c => (
              <button key={c.name} onClick={() => { setSearchQuery(""); setActiveCat(activeCat === c.name ? null : c.name) }}
                className={activeCat === c.name ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "14px 22px", fontSize: 16 }}>
                {c.name.replace("_", " ")} <span style={{ marginLeft: 8, opacity: 0.7 }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 18px 90px" }}>
        {loading && <BreathingLoader />}
        {!loading && results.map(a => <ActionCard key={a.id} action={a} />)}
      </div>

      {showCustomModal && <CustomActionModal onClose={() => setShowCustomModal(false)} onSuccess={(newAct) => { setShowCustomModal(false); setPendingCustomAction(newAct); }} />}
      {pendingCustomAction && <ReminderModal action={pendingCustomAction} onClose={() => setPendingCustomAction(null)} onPickConfirmed={() => setPendingCustomAction(null)} />}
    </div>
  )
}

function ActionCard({ action }) {
  const { t, setActiveVideo, setShareModal } = useApp()
  const [showBenefit, setShowBenefit] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [picked, setPicked] = useState(false)
  const [pickCount, setPickCount] = useState(action.times_picked || 0)

  async function handlePickConfirmed() {
    try {
      await axios.post(`/api/profile/actions/${action.id}/pick`)
      setPicked(true)
      setShowReminder(false)
      setShareModal({ action, context: "commitment" })
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "38px 40px", marginBottom: 32, borderRadius: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <CatTag category={action.category} />
        </div>
        <p style={{ fontSize: 26, fontWeight: 700, color: t.text, lineHeight: 1.6, marginBottom: 20 }}>{action.text}</p>

        {action.category !== 'Customized' && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 18, color: t.subtext, fontWeight: 600 }}>
              {pickCount} picked {action.avg_rating > 0 ? ` - ${action.avg_rating}/5 rating` : ""}
            </span>
          </div>
        )}

        {showBenefit && action.benefit && (
          <div className="neu-card" style={{ padding: "24px 28px", marginBottom: 26 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Why this helps</p>
            <p style={{ fontSize: 20, color: t.text, lineHeight: 1.7 }}>{action.benefit}</p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {action.benefit && (
              <button className={showBenefit ? "neu-inset" : "neu-btn"} onClick={() => setShowBenefit(v => !v)} style={{ padding: "16px 24px", fontSize: 17 }}>
                {showBenefit ? "Hide Reason" : "Show Why"}
              </button>
            )}
            {action.embed_url && (
              <button className="neu-btn" onClick={() => setActiveVideo({ url: action.embed_url, title: action.video_title })} style={{ padding: "16px 24px", fontSize: 17, color: "#c94c4c" }}>
                Watch Video
              </button>
            )}
            {action.category !== 'Customized' && (
              <button className="neu-btn" onClick={() => setShowReviews(true)} style={{ padding: "16px 24px", fontSize: 17 }}>
                Reviews
              </button>
            )}
          </div>
          <button className={picked ? "neu-inset" : "neu-btn neu-btn-primary"} onClick={() => { if (!picked) setShowReminder(true) }} style={{ padding: "16px 30px", fontSize: 17 }}>
            {picked ? "Added to profile" : "Let's do this"}
          </button>
        </div>
      </div>
      {showReminder && <ReminderModal action={action} onClose={() => setShowReminder(false)} onPickConfirmed={handlePickConfirmed} />}
      {showReviews && <ReviewsModal action={action} onClose={() => setShowReviews(false)} />}
    </>
  )
}

// ─── REMINDER LIST CARD ───────────────────────────────
function ReminderListCard({ rem, onEditTrigger }) {
  const { t } = useApp()
  const [showReminder, setShowReminder] = useState(false)

  let nextString = ""
  if (rem.reminder_type === "widget") {
    nextString = "Next reminder: click on widget"
  } else if (rem.reminder_type === "time") {
    const now = new Date()
    const target = new Date()
    let h = parseInt(rem.target_hour || "08")
    if (rem.target_ampm === "PM" && h !== 12) h += 12
    if (rem.target_ampm === "AM" && h === 12) h = 0
    target.setHours(h, parseInt(rem.target_minute || "00"), 0, 0)
    if (target <= now) target.setDate(target.getDate() + 1)

    let nextH = target.getHours()
    const nextAmPm = nextH >= 12 ? 'PM' : 'AM'
    nextH = nextH % 12 || 12
    const nextM = target.getMinutes().toString().padStart(2, '0')
    nextString = `Next reminder: ${String(nextH).padStart(2, '0')}:${nextM} ${nextAmPm}`
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "30px 32px", marginBottom: 26, borderRadius: 22 }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 24, lineHeight: 1.5 }}>{rem.text}</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {rem.reminder_type === "time" ? (
              <>
                <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Time</span>
                  <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>{rem.target_hour}:{rem.target_minute} {rem.target_ampm}</span>
                </button>
                {rem.frequency_type && (
                  <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Repeats</span>
                    <span style={{ fontSize: 20, color: t.accent, fontWeight: 800 }}>{rem.frequency_value} {rem.frequency_type}(s)</span>
                  </button>
                )}
              </>
            ) : (
              <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Type</span>
                <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>By Widget</span>
              </button>
            )}
          </div>

          {nextString && (
            <div style={{ fontSize: 16, color: t.subtext, fontWeight: 700, fontStyle: "italic", paddingBottom: 8 }}>
              {nextString}
            </div>
          )}

        </div>
      </div>

      {showReminder && <ReminderModal action={{ id: rem.action_id, text: rem.text }} isEdit={true} onClose={() => setShowReminder(false)} onPickConfirmed={onEditTrigger} />}
    </>
  )
}

// ─── PROFILE COMPONENTS ───────────────────────────────────────────────────────
function ProfilePage() {
  const { t, user, logout, setPage, setViewJournalIn } = useApp()
  const [actions, setActions] = useState([])
  const [reminders, setReminders] = useState([])
  const [streaks, setStreaks] = useState({})
  const [profileTab, setProfileTab] = useState("Actions")
  const [view, setView] = useState(7)
  const [loading, setLoading] = useState(true)

  const [checkin, setCheckin] = useState(null)
  const [viewDayDetail, setViewDayDetail] = useState(null)
  const [viewReport, setViewReport] = useState(null)
  const [missedStreakModal, setMissedStreakModal] = useState(null)
  const [completionFlow, setCompletionFlow] = useState(null)

  function fetchProfileData() {
    axios.get("/api/profile/actions").then(async res => {
      const fetchedActions = res.data.actions || []
      setActions(fetchedActions)
      const s = {}
      let maxMissed = 0

      for (const a of fetchedActions) {
        try {
          const sr = await axios.get(`/api/profile/streak/${a.id}`)
          s[a.id] = sr.data
          if (a.is_active && sr.data.days_7) {
            const recent = sr.data.days_7.slice(-4).reverse()
            let m = 0; for (const d of recent) { if (!d.completed) m++; else break; }
            if (m > maxMissed) maxMissed = m;
          }
        } catch { }
      }
      setStreaks(s)
      setLoading(false)

      const hour = new Date().getHours()
      if (hour >= 20) {
        const todayStr = new Date().toISOString().split("T")[0]
        for (const a of fetchedActions) {
          if (a.is_active && !s[a.id]?.days_7?.[s[a.id].days_7.length - 1]?.completed) {
            const key = `checkin_shown_${a.id}_${todayStr}`
            if (!localStorage.getItem(key)) { localStorage.setItem(key, "1"); setCheckin(a); break }
          }
        }
      }

      const todayStr = new Date().toISOString().split("T")[0]
      const missKey = `missed_alert_${todayStr}`
      if (maxMissed >= 3 && !localStorage.getItem(missKey)) {
        localStorage.setItem(missKey, "1")
        setMissedStreakModal(maxMissed)
      }
    }).catch(() => setLoading(false))

    axios.get("/api/profile/reminders").then(res => setReminders(res.data.reminders || [])).catch(() => { })
  }

  useEffect(() => {
    fetchProfileData()
    window.addEventListener("refresh-profile", fetchProfileData)
    return () => window.removeEventListener("refresh-profile", fetchProfileData)
  }, [])

  const activeActions = actions.filter(a => a.is_active)
  const completedActions = actions.filter(a => !a.is_active)

  function StreakDots({ action }) {
    const data = streaks[action.id]
    if (!data) return null
    const days = view === 7 ? data.days_7 : view === 30 ? data.days_30 : view === 90 ? data.days_90 : (data.days_365 || [])
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {days?.map((d, i) => {
            const hasData = d.completed || d.missed_reason;
            return (
              <div key={i} title={d.date} onClick={() => hasData && setViewDayDetail({ date: d.date, reason: d.missed_reason, difficulty: d.difficulty })}
                className={d.completed ? "neu-btn active-tab" : "neu-inset"}
                style={{ width: 30, height: 30, borderRadius: "50%", padding: 0, background: d.completed ? "var(--streak-on)" : "var(--streak-off)", cursor: hasData ? "pointer" : "default" }} />
            )
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <p style={{ fontSize: 18, color: t.accent, fontWeight: 700, margin: 0 }}>{data.streak > 0 ? `${data.streak}-day streak` : "No active streak"}</p>
            <p style={{ fontSize: 18, color: t.accent, fontWeight: 700, margin: 0 }}>• {data.global_active || 1} {(data.global_active || 1) === 1 ? 'person is' : 'persons are'} currently doing this</p>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <button className="neu-btn" onClick={() => setViewJournalIn(action)} style={{ padding: "12px 20px", fontSize: 16 }}>Journal In</button>
            {(data.all_missed_reasons?.length > 0 || data.difficulty_history?.length > 0) && (
              <button className="neu-btn" onClick={() => setViewReport({ text: action.text, count: data.all_missed_reasons?.length || 0, history: data.difficulty_history, reasons: data.all_missed_reasons })} style={{ padding: "12px 20px", fontSize: 16 }}>Report</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 34px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
            <button className="neu-btn" onClick={() => setPage("search")} style={{ padding: "14px 24px", fontSize: 18 }}>Back to Search</button>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="neu-btn" onClick={() => setPage("journal")} style={{ padding: "14px 24px", fontSize: 18 }}>Journal</button>
              <button className="neu-btn" onClick={logout} style={{ padding: "14px 24px", fontSize: 18 }}>Log out</button>
            </div>
          </div>

          <div className="neu-inset" style={{ display: "flex", padding: 10, borderRadius: 20, maxWidth: 740, margin: "0 auto" }}>
            {["Actions", "Reminders", "Streak", "Completed"].map(tab => (
              <button key={tab} onClick={() => setProfileTab(tab)} className={profileTab === tab ? "neu-btn active-tab" : "neu-btn-flat"} style={{ flex: 1, padding: "20px 0", borderRadius: 16, fontWeight: 700, fontSize: 24 }}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 90px" }}>
        {loading && <BreathingLoader />}

        {!loading && profileTab === "Actions" && activeActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>You have no pending actions.</div>}
        {!loading && profileTab === "Actions" && activeActions.map(a => (
          <ProfileActionCard key={a.id} a={a} isCompletedTab={false} onCompleteTrigger={(act) => setCompletionFlow({ action: act, step: 'difficulty' })} />
        ))}

        {!loading && profileTab === "Completed" && completedActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No completed actions yet.</div>}
        {!loading && profileTab === "Completed" && completedActions.map(a => (
          <ProfileActionCard key={a.id} a={a} isCompletedTab={true} onCompleteTrigger={() => fetchProfileData()} onReviewFlowTrigger={(act) => setCompletionFlow({ action: act, step: 'review' })} />
        ))}

        {!loading && profileTab === "Reminders" && reminders.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No active reminders set.</div>}
        {!loading && profileTab === "Reminders" && reminders.map(r => (
          <ReminderListCard key={r.action_id} rem={r} onEditTrigger={fetchProfileData} />
        ))}

        {!loading && profileTab === "Streak" && (
          <>
            <ElasticSlider options={[7, 30, 90, 365]} value={view} onChange={setView} />
            {activeActions.map(a => (
              <div key={a.id} className="neu-inset" style={{ padding: "28px", marginBottom: 26, borderRadius: 24, display: "flex", flexDirection: "column", minHeight: 180 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 18 }}>{a.text}</p>
                <StreakDots action={a} />
              </div>
            ))}
          </>
        )}
      </div>

      {completionFlow?.step === 'difficulty' && <DifficultyPopup actionId={completionFlow.action.id} onClose={() => setCompletionFlow(null)} onLogged={() => setCompletionFlow({ ...completionFlow, step: 'share' })} />}
      {completionFlow?.step === 'share' && <ShareModal action={completionFlow.action} context="completed" onClose={() => setCompletionFlow(null)} onFinish={() => setCompletionFlow({ ...completionFlow, step: 'journal' })} />}
      {completionFlow?.step === 'journal' && <PostCompleteJournalModal action={completionFlow.action} onClose={() => { setCompletionFlow(null); fetchProfileData(); }} onFinish={() => setCompletionFlow({ ...completionFlow, step: 'review' })} />}
      {completionFlow?.step === 'review' && <PostCompleteReviewModal action={completionFlow.action} onClose={() => { setCompletionFlow(null); fetchProfileData(); }} onFinish={() => { setCompletionFlow(null); fetchProfileData(); }} />}

      {missedStreakModal && <MissedStreakModal count={missedStreakModal} onClose={() => setMissedStreakModal(null)} />}
      {checkin && <EveningCheckin action={checkin} onClose={() => setCheckin(null)} />}
      {viewDayDetail && <DayDetailsModal date={viewDayDetail.date} reason={viewDayDetail.reason} difficulty={viewDayDetail.difficulty} onClose={() => setViewDayDetail(null)} />}
      {viewReport && <ReportModal actionText={viewReport.text} history={viewReport.history} reasons={viewReport.reasons} onClose={() => setViewReport(null)} />}
    </div>
  )
}

function ProfileActionCard({ a, isCompletedTab, onCompleteTrigger, onReviewFlowTrigger }) {
  const { t, setActiveVideo } = useApp()
  const [showReminder, setShowReminder] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  async function markRestart() {
    await axios.post(`/api/profile/actions/${a.id}/restart`).catch(() => { })
    if (onCompleteTrigger) onCompleteTrigger(a)
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "38px 40px", marginBottom: 32, borderRadius: 28, opacity: isCompletedTab ? 0.65 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <CatTag category={a.category} />
          <span style={{ fontSize: 17, color: t.subtext, fontWeight: 600 }}>Added {new Date(a.picked_at).toLocaleDateString()}</span>
        </div>

        <p style={{ fontSize: 24, fontWeight: 700, color: t.text, lineHeight: 1.6, marginBottom: 32 }}>{a.text}</p>

        {isCompletedTab && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 17, color: t.subtext, marginRight: 14 }}>Rate this action:</span>
            {[1, 2, 3, 4, 5].map(s => {
              const selected = s <= a.avg_rating;
              return (
                <span key={s} onClick={() => onReviewFlowTrigger(a)} style={{ fontSize: 36, cursor: "pointer", color: selected ? t.accent : 'transparent', WebkitTextStroke: selected ? 'none' : `1px ${t.shadowDark}`, transform: selected ? 'scale(1.15) translateY(-2px)' : 'scale(1)', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>★</span>
              )
            })}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18 }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <button className="neu-btn" onClick={() => setShowReminder(true)} style={{ padding: "18px 26px", fontSize: 19 }}>Change Reminder</button>
            {a.embed_url && <button className="neu-btn" onClick={() => setActiveVideo({ url: a.embed_url, title: a.video_title })} style={{ padding: "18px 26px", fontSize: 19, color: "#c94c4c" }}>Watch Video</button>}
            {isCompletedTab && a.category !== 'Customized' && <button className="neu-btn" onClick={() => onReviewFlowTrigger(a)} style={{ padding: "18px 26px", fontSize: 19 }}>Review</button>}
          </div>

          <button className="neu-btn neu-btn-primary" onClick={() => isCompletedTab ? markRestart() : onCompleteTrigger(a)} style={{ padding: "18px 34px", fontSize: 19 }}>
            {isCompletedTab ? "Do it again" : "Action Complete"}
          </button>
        </div>
      </div>
      {showReminder && <ReminderModal action={a} isEdit={true} onClose={() => setShowReminder(false)} />}
      {showReviews && <ReviewsModal action={a} onClose={() => setShowReviews(false)} />}
    </>
  )
}

function JournalPage() {
  const { t, setPage, setGenericJournalModal } = useApp()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState("")

  function fetchJournal() {
    axios.get("/api/profile/journal").then(res => { setLogs(res.data.journal || []); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchJournal(); window.addEventListener("refresh-journal", fetchJournal)
    return () => window.removeEventListener("refresh-journal", fetchJournal)
  }, [])

  function startEdit(log) { setEditingId(`${log.type}-${log.id}`); setEditContent(log.content) }
  async function saveEdit(log) { await axios.put(`/api/profile/journal/${log.id}`, { type: log.type, content: editContent }); setEditingId(null); fetchJournal() }
  async function deleteLog(log) { if (confirm("Are you sure you want to delete this entry?")) { await axios.delete(`/api/profile/journal/${log.id}?type=${log.type}`); fetchJournal() } }

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 34px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
            <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 24px", fontSize: 18 }}>Back to Profile</button>
            <span style={{ color: t.text, fontSize: 32, fontWeight: 800 }}>MindActions</span>
            <button className="neu-btn neu-btn-primary" onClick={() => setGenericJournalModal(true)} style={{ width: 50, height: 50, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>+</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 20px 90px" }}>
        {loading && <BreathingLoader />}
        {!loading && logs.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>Your journal is empty.</div>}
        {!loading && logs.map(log => {
          const d = new Date(log.created_at); const dateStr = d.toLocaleDateString(); const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const isEditing = editingId === `${log.type}-${log.id}`
          return (
            <div key={`${log.type}-${log.id}`} className="neu-inset" style={{ padding: "34px 36px", marginBottom: 28, borderRadius: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <span style={{ fontSize: 15, color: t.subtext, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{log.type === 'missed' ? "Friction Log" : "Journal"}</span>
                <span style={{ fontSize: 16, color: t.subtext, fontWeight: 600 }}>{dateStr} at {timeStr}</span>
              </div>
              <p style={{ fontSize: 20, color: t.text, fontStyle: "italic", borderLeft: `4px solid ${t.accent}`, paddingLeft: 16, marginBottom: 24, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.action_text}</p>
              {isEditing ? (
                <div style={{ marginTop: 16 }}>
                  <textarea className="neu-input" value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} style={{ width: "100%", padding: "16px", resize: "vertical", fontSize: 18, marginBottom: 16 }} />
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="neu-btn neu-btn-primary" onClick={() => saveEdit(log)} style={{ padding: "12px 20px", fontSize: 16 }}>Save</button>
                    <button className="neu-btn" onClick={() => setEditingId(null)} style={{ padding: "12px 20px", fontSize: 16 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 22, color: t.text, lineHeight: 1.6 }}>{log.content}</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 24 }}>
                    <button className="neu-btn" onClick={() => startEdit(log)} style={{ padding: '10px 20px', fontSize: 16 }}>Edit</button>
                    <button className="neu-btn" onClick={() => deleteLog(log)} style={{ padding: '10px 20px', fontSize: 16, color: '#c94c4c' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ThemePicker() {
  const { themeName, setThemeName, t } = useApp()
  return (
    <div className="neu-card" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 500, borderRadius: 28, padding: 8, display: "flex", gap: 10, transform: "scale(0.8)", transformOrigin: "bottom right" }}>
      {["light", "dark", "calm"].map(id => (
        <button key={id} onClick={() => setThemeName(id)} className={themeName === id ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "14px 24px", borderRadius: 22, fontSize: 18 }}>
          {id}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [themeName, setThemeNameState] = useState(() => localStorage.getItem("theme") || "calm")
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")) } catch { return null } })
  const [token, setToken] = useState(() => localStorage.getItem("token") || null)
  const [page, setPage] = useState(null)

  const [activeNotification, setActiveNotification] = useState(null)
  const [pendingDifficulty, setPendingDifficulty] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeCat, setActiveCat] = useState(null)

  const [viewJournalIn, setViewJournalIn] = useState(null)
  const [genericJournalModal, setGenericJournalModal] = useState(false)
  const [shareModal, setShareModal] = useState(null)

  const t = THEMES[themeName] || THEMES.calm

  function setThemeName(name) {
    setThemeNameState(name)
    localStorage.setItem("theme", name)
    if (token) axios.patch("/api/auth/theme", { theme: name }).catch(() => { })
  }

  function scheduleNotification(action, delayMs, repeatMs = null) {
    if (!window.activeTimers) window.activeTimers = {}
    if (window.activeTimers[action.id]) clearTimeout(window.activeTimers[action.id])

    window.activeTimers[action.id] = setTimeout(() => {
      setActiveNotification(action)
      if (Notification.permission === "granted" && document.hidden) {
        const bodyText = action.streak > 0 ? `${action.text}\n🔥 Current Streak: ${action.streak} days` : action.text;
        const n = new Notification("MindActions", { body: bodyText, icon: "/icon-192.png" })
        n.onclick = () => { window.focus(); n.close() }
      }
      if (repeatMs) scheduleNotification(action, repeatMs, repeatMs)
    }, delayMs)
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => registration.unregister()))
    const setShadows = () => {
      const hour = new Date().getHours(); const xOff = Math.max(-8, Math.min(8, (hour - 12) * 1.5)); const yOff = Math.max(4, 12 - Math.abs(xOff))
      document.documentElement.style.setProperty('--sh-x', `${xOff}px`); document.documentElement.style.setProperty('--sh-y', `${yOff}px`)
    }
    setShadows(); const shadowInterval = setInterval(setShadows, 60000)

    if (token) {
      setupAxios(token)
      axios.get("/api/profile/reminders").then(res => {
        const rems = res.data.reminders || []
        rems.forEach(rem => {
          if (rem.reminder_type === "time") {
            const now = new Date(); const target = new Date()
            let h = parseInt(rem.target_hour || "08"); if (rem.target_ampm === "PM" && h !== 12) h += 12; if (rem.target_ampm === "AM" && h === 12) h = 0
            target.setHours(h, parseInt(rem.target_minute || "00"), 0, 0)
            let repeatMs = null
            if (rem.frequency_type) {
              const num = rem.frequency_value || 1; repeatMs = rem.frequency_type === "minute" ? num * 60000 : rem.frequency_type === "hour" ? num * 3600000 : num * 86400000
            }
            if (target <= now) { if (repeatMs) { while (target <= now) target.setTime(target.getTime() + repeatMs) } else { target.setDate(target.getDate() + 1) } }
            scheduleNotification({ id: rem.action_id, text: rem.text, streak: rem.streak || 0 }, target - now, repeatMs)
          }
        })
      }).catch(() => { })
    }
    if (window.location.pathname.startsWith("/auth/callback")) { setPage("callback"); return }
    setPage(user && token ? "search" : "login")
    return () => clearInterval(shadowInterval)
  }, [token])

  const ctx = { t, themeName, setThemeName, user, setUser, token, setToken, logout: () => { localStorage.clear(); setPage("login") }, scheduleNotification, setPendingDifficulty, setPage, searchQuery, setSearchQuery, activeCat, setActiveCat, goToCategory: (c) => { setSearchQuery(""); setActiveCat(c); setPage("search") }, setViewJournalIn, setGenericJournalModal, setActiveVideo, setShareModal }

  function render() {
    if (!page) return null
    if (page === "callback") return <AuthCallback onNavigate={setPage} />
    if (!user || !token) return <LoginPage onNavigate={setPage} />
    if (page === "profile") return <ProfilePage />
    if (page === "journal") return <JournalPage />
    return <SearchPage />
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{ '--bg': t.bg, '--shadow-d': t.shadowDark, '--shadow-l': t.shadowLight, '--accent': t.accent, '--accent-text': t.accentText, '--text': t.text, '--subtext': t.subtext, '--placeholder': t.placeholder, '--streak-on': t.streakOn, '--streak-off': t.streakOff, '--bg-rgb': t.bgRGB, '--selection-bg': t.selectionBg, minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700;800&family=Autumn+Brush&display=swap');
          :root { --sh-x: 6px; --sh-y: 6px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes breathe { 0%, 100% { opacity: 0.5; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
          ::-webkit-scrollbar { width: 12px; }
          ::-webkit-scrollbar-track { background: var(--bg); box-shadow: inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l); border-radius: 10px; margin: 10px 0; }
          ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 10px; border: 3px solid var(--bg); }
          ::-webkit-scrollbar-thumb:hover { background: var(--text); }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Autumn Brush', 'Caveat', cursive; background: var(--bg); margin: 0; line-height: 1.8; letter-spacing: 0.5px; }
          input, select, button, textarea { font-family: 'Autumn Brush', 'Caveat', cursive; }
          ::selection { background: var(--selection-bg); color: var(--accent-text); }
          .search-input::placeholder, .neu-input::placeholder { color: var(--placeholder); }
          .skeleton-breathe { animation: breathe 4s ease-in-out infinite; }
          .glass-modal { position: fixed; inset: 0; background: radial-gradient(circle, rgba(var(--bg-rgb), 0.5) 0%, rgba(var(--bg-rgb), 0.85) 100%); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 20px; }
          .neu-card { background: var(--bg); box-shadow: 12px 12px 24px var(--shadow-d), -12px -12px 24px var(--shadow-l); border-radius: 20px; border: none; }
          .neu-inset { background: var(--bg); box-shadow: inset 6px 6px 12px var(--shadow-d), inset -6px -6px 12px var(--shadow-l); border: none; }
          .neu-input { background: var(--bg); box-shadow: inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l); border: none; color: var(--text); border-radius: 12px; outline: none; }
          .neu-input:focus { box-shadow: inset 6px 6px 14px var(--shadow-d), inset -6px -6px 14px var(--shadow-l); }
          .neu-btn { background: var(--bg); box-shadow: 6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l); border: none; color: var(--text); border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          .neu-btn:active { transform: scale(0.96); box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); }
          .neu-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .neu-btn-flat { background: transparent; border: none; color: var(--subtext); cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          .active-tab { box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); color: var(--accent); }
          .neu-btn-primary { color: var(--accent); }
          .input-label { font-size: 18px; font-weight: 700; color: var(--subtext); display: block; margin-bottom: 12px; margin-top: 20px; }
        `}</style>
        {render()}
        <ThemePicker />
        {activeVideo && <VideoModal embedUrl={activeVideo.url} title={activeVideo.title} onClose={() => setActiveVideo(null)} />}
        {activeNotification && (
          <ActiveNotificationModal action={activeNotification} onDone={a => { setActiveNotification(null); setPendingDifficulty({ ...a, onLogged: () => { window.dispatchEvent(new Event("refresh-profile")) } }); }} onSnooze={a => { setActiveNotification(null); scheduleNotification(a, 15 * 60 * 1000, null) }} />
        )}
        {pendingDifficulty && <DifficultyPopup actionId={pendingDifficulty.id} onClose={() => setPendingDifficulty(null)} onLogged={pendingDifficulty.onLogged} />}
        {viewJournalIn && <JournalInModal action={viewJournalIn} onClose={() => setViewJournalIn(null)} onSaved={() => window.dispatchEvent(new Event("refresh-journal"))} />}
        {genericJournalModal && <JournalInModal action={null} onClose={() => setGenericJournalModal(false)} onSaved={() => window.dispatchEvent(new Event("refresh-journal"))} />}
        {shareModal && <ShareModal action={shareModal.action} context={shareModal.context} onClose={() => setShareModal(null)} />}
      </div>
    </AppCtx.Provider>
  )
}