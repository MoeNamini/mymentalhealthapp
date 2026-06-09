// App.jsx — Phase 2 Polished
import { useState, useEffect, createContext, useContext, useRef } from "react"
import axios from "axios"
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// ─── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  calm: {
    bg: "#627D85", shadowDark: "#23454fff", shadowLight: "#a9c4cdff", text: "#4dc4b2ff", subtext: "#10a0bdff", accent: "#D0D4D0",
    accentText: "#1a1b1d", tag: "#4dc4b2ff", streakOn: "#075f79ff", streakOff: "#c5cfca", placeholder: "rgba(162, 195, 232, 0.4)", bgRGB: "98, 125, 133", selectionBg: "rgba(208, 212, 208, 0.35)"
  },
  light: {
    bg: "#e0e5ec", shadowDark: "#c4c1bc", shadowLight: "#ffffff", text: "#403d39", subtext: "#7a7771", accent: "#728c82",
    accentText: "#ffffff", tag: "#d8d5cf", streakOn: "#728c82", streakOff: "#d1cec8", placeholder: "rgba(64, 61, 57, 0.45)", bgRGB: "224, 229, 236", selectionBg: "rgba(114, 140, 130, 0.3)"
  },
  dark: {
    bg: "#2b2d30", shadowDark: "#1a1c1e", shadowLight: "#3c3e42", text: "#dcdedf", subtext: "#8b8f94", accent: "#c49a78",
    accentText: "#1a1b1d", tag: "#222426", streakOn: "#c49a78", streakOff: "#202224", placeholder: "rgba(220, 222, 223, 0.4)", bgRGB: "43, 45, 48", selectionBg: "rgba(196, 154, 120, 0.3)"
  },
}


// (Keep whatever other imports you already have here, like useApp, etc.)


// ─── REUSABLE INFO TOOLTIP ──────────────────────────────────────────────────
function InfoTooltip({ text, theme }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", marginLeft: 10, display: "inline-flex", alignItems: "center" }}>
      <div
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        style={{ width: 20, height: 20, borderRadius: "50%", border: `1.5px solid ${theme.subtext}`, color: theme.subtext, fontSize: 12, display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer", fontWeight: "bold", fontStyle: "italic" }}
      >
        i
      </div>
      {show && (
        <div className="neu-card" style={{ position: "absolute", top: 28, left: -100, width: 220, padding: 12, fontSize: 14, zIndex: 50, borderRadius: 12, textAlign: "center", color: theme.text, fontWeight: 500, border: `1px solid ${theme.accent}` }}>
          {text}
        </div>
      )}
    </span>
  );
}




// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. THEME PICKER ─────────────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
export function GlobalThemePicker() {
  const { t, theme, themeName, setTheme, setThemeName } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  // Fallback string validation to prevent a blank box appearance
  const activeTheme = theme || themeName || 'dark';
  const displayText = activeTheme.charAt(0).toUpperCase() + activeTheme.slice(1);

  if (!activeTheme) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '46px',
      /* Dynamically locks it to the exact left padding boundary of your 1200px layout container */
      left: 'max(24px, calc(50vw - 576px))',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start'
    }}>

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="neu-btn"
        style={{
          padding: "14px 24px",
          fontSize: "18px",
          borderRadius: "16px",
          color: t.text,
          minWidth: "110px",
          fontWeight: 700,
          textAlign: "center",
          cursor: "pointer"
        }}
      >
        {displayText}
      </button>

      {/* Vertical Rectangle Dropdown List */}
      {isOpen && (
        <div
          className="neu-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: "12px",
            marginTop: "12px",
            padding: "18px 14px",
            borderRadius: "24px",
            width: "126px",
            alignItems: "stretch"
          }}
        >
          {['light', 'dark', 'calm'].map((th) => {
            const isActive = activeTheme === th;
            return (
              <button
                key={th}
                onClick={(e) => {
                  e.preventDefault();
                  // 🟢 FIX STUCK THEME: Triggers both context naming possibilities safely
                  if (typeof setTheme === 'function') setTheme(th);
                  if (typeof setThemeName === 'function') setThemeName(th);
                  setIsOpen(false);
                }}
                className={isActive ? "neu-inset active-tab" : "neu-btn"}
                style={{
                  padding: "12px 14px",
                  fontSize: "16px",
                  borderRadius: "14px",
                  color: isActive ? t.accent : t.text,
                  fontWeight: 700,
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: isActive
                    ? "inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l)"
                    : "6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l)",
                  border: "none",
                  transform: "none"
                }}
              >
                {th.charAt(0).toUpperCase() + th.slice(1)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 2. PUBLIC LANDING PAGE (FOR GOOGLE ADSENSE) ─────────────────────────────
// ─── PUBLIC LANDING PAGE ─────────────────────────────────────────────────────
function PublicLandingPage({ onNavigate }) {
  const { t } = useApp(); // Gets the current theme colors

  return (
    <div style={{ padding: "60px 20px", textAlign: "center", maxWidth: "800px", margin: "0 auto", color: t.text }}>
      <h1 style={{ fontSize: "48px", fontWeight: "800", marginBottom: "20px" }}>Build Better Habits with MindActions</h1>
      <p style={{ fontSize: "20px", lineHeight: "1.6", marginBottom: "40px", color: t.subtext }}>
        Track your mood, journal your thoughts, and unlock personalized AI insights to improve your mental well-being every single day.
      </p>

      {/*  FIXED: Now uses your app's custom onNavigate function! */}
      <button
        onClick={() => onNavigate("login")}
        className="neu-btn neu-btn-primary"
        style={{ padding: "16px 32px", fontSize: "20px", cursor: "pointer" }}
      >
        Get Started for Free
      </button>

      <div style={{ marginTop: "60px", textAlign: "left" }}>
        <h2>Why MindActions?</h2>
        <p style={{ color: t.subtext }}>MindActions uses evidence-based behavioral tracking and AI-driven analysis to correlate your daily actions with your mood state. Join us to start your journey today.</p>
      </div>
    </div>
  );
}



// ─── 5. MAIN APP COMPONENT (THE ROUTER) ──────────────────────────────────────

// ─── 6. YOUR EXISTING COMPONENTS GO DOWN HERE ────────────────────────────────
// function DashboardComponent() { ... }
// function MoodTracker() { ... }
// etc...

const AppCtx = createContext(null)
const useApp = () => useContext(AppCtx)


function setupAxios(token) {
  if (token) axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
  else delete axios.defaults.headers.common["Authorization"]
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Spinner() {
  const { t } = useApp()
  return <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto", border: `5px solid ${t.shadowDark}`, borderTop: `5px solid ${t.accent}`, animation: "spin 0.75s linear infinite" }} />
}

function BreathingLoader() {
  return (
    <div className="action-grid" style={{ padding: "20px 0" }}>
      <div className="neu-inset skeleton-breathe" style={{ height: 260, borderRadius: 28, width: "100%" }} />
      <div className="neu-inset skeleton-breathe" style={{ height: 260, borderRadius: 28, width: "100%" }} />
    </div>
  )
}

function ZenDial({ value, min, max, onChange, label }) {
  const { t } = useApp()
  const [isEditing, setIsEditing] = useState(false)
  const [tempVal, setTempVal] = useState(String(value).padStart(2, "0"))

  useEffect(() => {
    if (!isEditing) setTempVal(String(value).padStart(2, "0"))
  }, [value, isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    let num = parseInt(tempVal, 10)
    if (isNaN(num)) num = min
    else if (num < min) num = min
    else if (num > max) num = max
    onChange(num)
  }

  return (
    <div className="neu-inset" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", borderRadius: "20px", width: 110 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.subtext, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <button className="neu-btn-flat" onClick={() => onChange(value >= max ? min : value + 1)} style={{ padding: "10px", width: "100%", fontSize: 24 }}>▲</button>

      <input
        type="text"
        value={isEditing ? tempVal : String(value).padStart(2, "0")}
        onFocus={() => setIsEditing(true)}
        onBlur={handleBlur}
        onChange={(e) => setTempVal(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
        style={{ width: "100%", fontSize: 44, fontWeight: 800, color: t.text, margin: "12px 0", background: "transparent", border: "none", textAlign: "center", outline: "none", fontFamily: "inherit" }}
      />

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

function CatTag({ category }) {
  const { goToCategory } = useApp()
  return (
    <span className="neu-inset" onClick={() => goToCategory(category)} style={{ padding: "10px 20px", borderRadius: 22, fontSize: 16, fontWeight: 700, textTransform: "capitalize", cursor: "pointer" }}>
      {(category || "").replace("_", " ")}
    </span>
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
      onNavigate("profile")
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong.")
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="neu-card" style={{ padding: "50px 46px", width: "100%", maxWidth: 460, borderRadius: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: t.text }}>MindActions</div>
          <div style={{ fontSize: 20, color: t.subtext, marginTop: 6 }}>
            {mode === "login" ? "Welcome back" : mode === "forgot" ? "Reset Password" : "Create your free account"}
          </div>
        </div>
        {error && <div className="neu-inset" style={{ padding: "14px 18px", marginBottom: 20, color: t.text, fontSize: 18 }}>{error}</div>}

        {mode === "forgot" ? (
          <>
            <div style={{ fontSize: 16, color: t.subtext, marginBottom: 18, textAlign: "center" }}>Enter your email to receive a reset link.</div>
            <label className="input-label">Email</label>
            <input className="neu-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
            <button className="neu-btn neu-btn-primary" onClick={() => { setError("Reset link sent to your email!"); setEmail(""); }} style={{ width: "100%", padding: "20px", fontSize: 20, marginBottom: 28, marginTop: 16 }}>Send Reset Link</button>
            <div style={{ textAlign: "center", fontSize: 18, color: t.subtext }}>
              <span onClick={() => { setMode("login"); setError("") }} style={{ color: t.accent, fontWeight: 700, cursor: "pointer" }}>Back to Log in</span>
            </div>
          </>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <label className="input-label">Full name</label>
                <input className="neu-input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
              </>
            )}
            <label className="input-label">Email</label>
            <input className="neu-input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <label className="input-label">Password</label>
              {mode === "login" && <span onClick={() => { setMode("forgot"); setError(""); }} style={{ color: t.subtext, fontSize: 14, cursor: "pointer", textDecoration: "underline", marginBottom: 12 }}>Forgot password?</span>}
            </div>

            <input className="neu-input" type="password" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }} />
            <button className="neu-btn neu-btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "20px", fontSize: 20, marginBottom: 28, marginTop: 36 }}>
              {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
            </button>
            LoginPage
            <div style={{ textAlign: "center", marginTop: 28, fontSize: 18, color: t.subtext }}>
              {mode === "login" ? "No account?" : "Already have an account?"}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }} style={{ color: t.accent, fontWeight: 700, cursor: "pointer", marginLeft: 8 }}>{mode === "login" ? "Sign up" : "Log in"}</span>
            </div>
            {/* ─── TRADITIONAL NEUMORPHIC OOR DIVIDER ─── */}
            <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.15 }} />
              <span style={{ fontSize: 14, color: t.subtext, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>or</span>
              <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.15 }} />
            </div>

            {/* ─── THIRD-PARTY OAUTH BUTTON PROVIDERS ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => window.location.href = "/api/auth/google"} className="neu-btn" style={{ width: "100%", padding: "14px", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                🌐 Continue with Google
              </button>

              <button onClick={() => window.location.href = "/api/auth/twitter"} className="neu-btn" style={{ width: "100%", padding: "14px", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                𝕏 Continue with X (Twitter)
              </button>

              <button onClick={() => window.location.href = "/api/auth/linkedin"} className="neu-btn" style={{ width: "100%", padding: "14px", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                👔 Continue with LinkedIn
              </button>
            </div>
          </>
        )}
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
      onNavigate("profile")
    }).catch(() => onNavigate("login"))
  }, [])
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: useApp().t.subtext, fontSize: 20 }}>Signing you in...</p></div>
}

// ─── SHARE & NOTIFICATION MODALS ──────────────────────────────────────────────
function ShareModal({ action, context, onClose, onFinish }) {
  const { t } = useApp()
  let title = "Share"; let sub = ""
  if (context === "commitment") { title = "Make a Commitment"; sub = "Make a commitment by sharing this with your friends." }
  else if (context === "completed") { title = "Action Completed"; sub = "Share your success and inspire others!" }

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
        <button className="neu-btn neu-btn-primary" onClick={() => { onClose && onClose(); if (onFinish) onFinish() }} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Continue</button>
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

// ─── REMINDER MODAL ───────────────────────────────────────────────────────────
function ReminderModal({ action, onClose, isEdit = false, onSaved }) {
  const { t, scheduleNotification } = useApp()
  const [tab, setTab] = useState("time")
  const [hour, setHour] = useState("08")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState("AM")

  const [repeat, setRepeat] = useState(false)
  const [repeatNum, setRepeatNum] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState("hour")

  const [endIn, setEndIn] = useState(false)
  const [endInDays, setEndInDays] = useState(7)

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  const [videoTime, setVideoTime] = useState("00:00"); // 🟢 NEW

  const [isGcal, setIsGcal] = useState(action.is_gcal || false);

  const [locCondition, setLocCondition] = useState("arrive"); // "arrive" or "leave"
  const [locCoords, setLocCoords] = useState(null); // { lat, lng }
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  });

  // 🎛️ Add these right under your existing useState hooks
  const [isAudio, setIsAudio] = useState(action.is_audio || false);
  const [isVideo, setIsVideo] = useState(action.is_video || false);
  const [isSpotify, setIsSpotify] = useState(!!action.spotify_uri);
  const [selectedSpotify, setSelectedSpotify] = useState(action.spotify_uri ? { uri: action.spotify_uri, name: action.spotify_name, type: action.spotify_type } : null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // 🟢 BULLETPROOF TIME CONVERTER
  const timeParts = videoTime.split(':').map(str => str.trim());
  const startSeconds = timeParts.length === 2 ? (parseInt(timeParts[0] || 0) * 60) + parseInt(timeParts[1] || 0) : 0;
  useEffect(() => {
    axios.get(`/api/profile/reminder/${action.id}`)
      .then(res => {
        if (res.data.exists) {
          setTab(res.data.reminder_type || "time");
          setHour(res.data.target_hour || "08");
          setMinute(res.data.target_minute || "00");
          setAmpm(res.data.target_ampm || "AM");
          if (res.data.frequency_type) { setRepeat(true); setRepeatUnit(res.data.frequency_type); setRepeatNum(res.data.frequency_value || 1) }
          if (res.data.end_in_days) { setEndIn(true); setEndInDays(res.data.end_in_days); }

          setIsVideo(res.data.is_video);

          // 🟢 NEW: Convert seconds (e.g. 215) back to "03:35"
          if (res.data.video_start_time) {
            const m = Math.floor(res.data.video_start_time / 60).toString().padStart(2, '0');
            const s = (res.data.video_start_time % 60).toString().padStart(2, '0');
            setVideoTime(`${m}:${s}`);
          }

          // 🟢 NEW: Set all the Action Triggers when the modal loads!
          setIsAudio(res.data.is_audio);
          setIsVideo(res.data.is_video);
          setIsSpotify(!!res.data.spotify_uri);
          if (res.data.spotify_uri) {
            setSelectedSpotify({
              uri: res.data.spotify_uri,
              name: res.data.spotify_name,
              type: res.data.spotify_type
            });
          }
        }
      }).catch(() => { }).finally(() => setLoadingInitial(false))
  }, [action.id]);

  // 🎵 Add this so the Spotify search input functions correctly
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const delayDebounce = setTimeout(() => {
      axios.get(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => setSearchResults(res.data.tracks || []))
        .catch(() => { })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  async function save() {
    setSaving(true)
    try {
      // 1. Send EVERYTHING in one single payload to your existing endpoint
      await axios.post("/api/profile/reminder", {
        action_id: action.id,
        reminder_type: tab,
        target_hour: tab === "time" ? String(hour).padStart(2, '0') : null,
        target_minute: tab === "time" ? String(minute).padStart(2, '0') : null,
        target_ampm: tab === "time" ? ampm : null,
        frequency_type: repeat && tab === "time" ? repeatUnit : null,
        frequency_value: repeat && tab === "time" ? repeatNum : null,
        end_in_days: endIn ? endInDays : null,
        loc_condition: tab === "location" ? locCondition : null,
        loc_lat: tab === "location" && locCoords ? locCoords.lat : null,
        loc_lng: tab === "location" && locCoords ? locCoords.lng : null,

        // Add the Triggers directly to the main payload!
        is_audio: isAudio,
        is_video: isVideo,
        is_gcal: isGcal, // 🟢 Added to payload
        // Also add `text: action.text` to the payload so the backend knows what to name the Calendar event!
        text: action.text,
        video_start_time: startSeconds, // 🟢 NEW
        spotify_uri: isSpotify && selectedSpotify ? selectedSpotify.uri : null,
        spotify_name: isSpotify && selectedSpotify ? selectedSpotify.name : null,
        spotify_type: isSpotify && selectedSpotify ? selectedSpotify.type : null
      });

      // 2. Quietly trigger the Gemini Audio generation in the background
      if (isAudio) axios.post(`/api/actions/${action.action_id || action.id}/generate-audio`).catch(() => { });

      // 3. Close the modal and refresh
      if (typeof onSaved === 'function') onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save reminder.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInitial) return <div className="glass-modal"><div className="neu-card" style={{ padding: 50 }}><Spinner /></div></div>

  if (savedSuccess) return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "60px 50px", maxWidth: 580, width: "100%", textAlign: "center" }}>
        <div className="neu-inset" style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px" }}>
          <svg width="34" height="34" viewBox="0 0 26 26"><path d="M4 13l7 7 11-11" stroke={t.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14 }}>Reminder {isEdit ? "updated" : "saved"}</div>
        <div style={{ fontSize: 21, color: t.subtext, marginBottom: 40, lineHeight: 1.8 }}>
          {tab === "time" ? (repeat ? `You will be reminded at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}, repeating every ${repeatNum} ${repeatUnit}(s)` : `You will be reminded at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`) : "Add this app to your home screen to use the widget shortcut"}
        </div>
        <button onClick={() => { if (onSaved) onSaved(); onClose(); }} className="neu-btn neu-btn-primary" style={{ width: "100%", padding: "20px", fontSize: 21 }}>Done</button>
      </div>
    </div>
  )

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "54px 48px", maxWidth: 620, width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, fontWeight: 700, color: t.text, marginBottom: 14 }}>{isEdit ? "Change Reminder" : "Set a Reminder"}</div>
        <div style={{ fontSize: 20, color: t.subtext, marginBottom: 36, lineHeight: 1.6, paddingLeft: 18, borderLeft: `4px solid ${t.accent}` }}>{action.text}</div>

        {/* TAB SELECTOR */}
        <div className="neu-inset" style={{ display: "flex", padding: 8, gap: 8, marginBottom: 44, borderRadius: 18 }}>
          {["time", "widget", "location"].map(tb => (
            <button key={tb} onClick={() => setTab(tb)} className={tab === tb ? "neu-btn active-tab" : "neu-btn-flat"} style={{ flex: 1, padding: "18px 0", borderRadius: 14, textTransform: "capitalize", fontSize: 20 }}>{tb === "time" ? "Time" : tb}</button>
          ))}
        </div>

        {/* TIME TAB */}
        {tab === "time" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 40 }}>
              <ZenDial value={parseInt(hour)} min={1} max={12} onChange={v => setHour(v)} label="Hour" />
              <span style={{ fontSize: 44, fontWeight: 800, color: t.text, paddingBottom: 16 }}>:</span>
              <ZenDial value={parseInt(minute)} min={0} max={59} onChange={v => setMinute(v)} label="Minute" />
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginLeft: 12 }}>
                <button onClick={() => setAmpm("AM")} className={ampm === "AM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>AM</button>
                <button onClick={() => setAmpm("PM")} className={ampm === "PM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>PM</button>
              </div>
            </div>
            <div style={{ height: 2, background: t.shadowDark, opacity: 0.2, marginBottom: 36 }} />

            {/* REPEAT TOGGLE */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: repeat ? 28 : 28 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: t.text }}>Repeat Reminder</span>
              <div onClick={() => setRepeat(v => !v)} className={repeat ? "neu-inset" : "neu-card"} style={{ width: 66, height: 38, borderRadius: 19, cursor: "pointer", position: "relative" }}>
                <div style={{ position: "absolute", top: 4, left: repeat ? 32 : 4, width: 30, height: 30, borderRadius: "50%", background: repeat ? t.accent : t.subtext, transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} />
              </div>
            </div>
            {repeat && (
              <div style={{ marginBottom: 36 }}>
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

            {/* END IN TOGGLE */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: endIn ? 28 : 0 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: t.text }}>End In (Auto-Complete)</span>
              <div onClick={() => setEndIn(v => !v)} className={endIn ? "neu-inset" : "neu-card"} style={{ width: 66, height: 38, borderRadius: 19, cursor: "pointer", position: "relative" }}>
                <div style={{ position: "absolute", top: 4, left: endIn ? 32 : 4, width: 30, height: 30, borderRadius: "50%", background: endIn ? t.accent : t.subtext, transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} />
              </div>
            </div>
            {endIn && (
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>Expire After</div>
                <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
                  <input type="number" min="1" max="365" value={endInDays} onChange={e => setEndInDays(Math.max(1, parseInt(e.target.value) || 1))} className="neu-input" style={{ width: 120, padding: "20px 0", fontSize: 34, fontWeight: 800, textAlign: "center" }} />
                  <div className="neu-inset" style={{ flex: 1, padding: "0 24px", display: "flex", alignItems: "center", fontSize: 22, color: t.subtext, fontWeight: 700 }}>
                    Day(s)
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WIDGET TAB */}
        {tab === "widget" && (
          <div className="neu-inset" style={{ padding: "30px 32px", borderRadius: 24 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 18 }}>Add to Home Screen</div>
            <div style={{ fontSize: 19, color: t.subtext, lineHeight: 1.8 }}>
              1. Open this app in your phone browser<br />2. Tap the Share button (iOS) or the menu (Android)<br />3. Select "Add to Home Screen"<br />4. Tap the shortcut anytime to see this action
            </div>
          </div>
        )}

        {/* LOCATION TAB */}
        {tab === "location" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Arrive vs Leave Toggle */}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setLocCondition("arrive")} className={locCondition === "arrive" ? "neu-btn active-tab" : "neu-btn"} style={{ flex: 1, padding: "14px", fontSize: 18 }}>When I Arrive</button>
              <button onClick={() => setLocCondition("leave")} className={locCondition === "leave" ? "neu-btn active-tab" : "neu-btn"} style={{ flex: 1, padding: "14px", fontSize: 18 }}>When I Leave</button>
            </div>

            {/* Google Map Picker */}
            <div className="neu-inset" style={{ height: 300, width: "100%", borderRadius: 16, overflow: "hidden" }}>
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={locCoords || { lat: 37.3891, lng: -5.9845 }} // Defaulting to Seville based on your location!
                  zoom={12}
                  onClick={(e) => setLocCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                >
                  {locCoords && <Marker position={locCoords} />}
                </GoogleMap>
              ) : (
                <div style={{ padding: 20, textAlign: "center", color: t.subtext }}>Loading Map...</div>
              )}
            </div>

            {locCoords && <div style={{ fontSize: 14, color: t.subtext, textAlign: "center" }}>Location Selected!</div>}
          </div>
        )}

        {/* ─── ACTION TRIGGERS (ONLY THIS BLOCK) ─── */}
        <div style={{ marginTop: 32, marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.subtext, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Action Triggers
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 18, color: t.text }}>Google Calendar</span>
              <InfoTooltip text="Pushes this reminder to your actual Google Calendar" theme={t} />
            </div>
            <button onClick={() => setIsGcal(!isGcal)} className={isGcal ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>
              {isGcal ? "Synced" : "Off"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 18, color: t.text }}>Audio</span>
                <InfoTooltip text="Reads the Action and its Why out loud" theme={t} />
              </div>
              <button onClick={() => setIsAudio(!isAudio)} className={isAudio ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>
                {isAudio ? "Enabled" : "Disabled"}
              </button>
            </div>

            {/* 🟢 CLEAN, ENGRAVED VIDEO TOGGLE */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 18, color: t.text }}>Video</span>
                  <InfoTooltip text="Play the Youtube video of the Action" theme={t} />
                </div>
                <button onClick={() => setIsVideo(!isVideo)} className={isVideo ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>
                  {isVideo ? "Enabled" : "Disabled"}
                </button>
              </div>

              {/* Engraved Start Time Box (Only shows if Enabled) */}
              {isVideo && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 12 }}>
                  <span style={{ fontSize: 16, color: t.subtext, fontStyle: "italic" }}>Start Time (MM:SS)</span>
                  <input
                    type="text"
                    value={videoTime}
                    onChange={e => setVideoTime(e.target.value)}
                    placeholder="00:00"
                    className="neu-inset" /* 🟢 Uses your engraved theme class */
                    style={{ width: 80, padding: "8px", fontSize: 16, textAlign: "center", color: t.text, border: "none", outline: "none", background: "transparent" }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 18, color: t.text }}>Spotify</span>
                <InfoTooltip text="Play the song, playlist, or podcast from your Spotify" theme={t} />
              </div>
              <button onClick={() => setIsSpotify(!isSpotify)} className={isSpotify ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>
                {isSpotify ? "On" : "Off"}
              </button>
            </div>
          </div>

          {/* Spotify Search Dropdown */}
          {isSpotify && (
            <div className="neu-inset" style={{ padding: 20, borderRadius: 16, marginTop: 24 }}>
              <label className="input-label" style={{ marginTop: 0, fontSize: 16 }}>Search Spotify Tracks & Playlists</label>
              <input className="neu-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type track, playlist, or artist..." style={{ width: "100%", padding: "12px 16px", fontSize: 16, marginBottom: 12 }} />
              {selectedSpotify && <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, marginBottom: 8 }}>Linked: {selectedSpotify.name}</div>}
              {searchResults.length > 0 && (
                <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {searchResults.map(item => (
                    <div key={item.uri} onClick={() => setSelectedSpotify({ uri: item.uri, name: item.name, type: item.type })} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 15, color: t.text, background: selectedSpotify?.uri === item.uri ? t.selectionBg : "transparent" }}>
                      {item.name} <span style={{ opacity: 0.6, fontSize: 13 }}>by {item.artist}</span>
                    </div>
                  ))}
                </div>
              )}
              {searching && <div style={{ fontSize: 14, color: t.subtext, fontStyle: "italic" }}>Searching...</div>}
            </div>
          )}
        </div>
        {/* ───────────────────────────────────────── */}

        {/* BOTTOM SAVE/CANCEL BUTTONS */}
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
function PostCompleteJournalModal({ action, onFinish }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!content.trim()) { onFinish(); return }
    setSaving(true)
    await axios.post("/api/profile/journal", { action_id: action.id, content: content.trim() }).catch(() => { })
    onFinish()
  }

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 760, width: "100%" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Journal In</div>
        <div style={{ fontSize: 18, color: t.subtext, marginBottom: 28, lineHeight: 1.6 }}>How and with what, this Action helped you with, how did you feel before and how do you feel now.</div>
        <textarea className="neu-input notebook-paper" value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="Reflect on your progress..." style={{ width: "100%", padding: "20px", resize: "vertical", marginBottom: 30, fontSize: 19 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "18px", fontSize: 20 }}>{saving ? "Saving..." : "Save Entry"}</button>
          <button className="neu-btn" onClick={onFinish} style={{ padding: "18px", fontSize: 20 }}>Skip</button>
        </div>
      </div>
    </div>
  )
}

function PostCompleteReviewModal({ action, onFinish }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [rating, setRating] = useState(0)
  const [hovStar, setHovStar] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!content.trim() && rating === 0) { onFinish(); return }
    setSaving(true)
    await axios.post(`/api/actions/${action.id}/review`, { content: content.trim(), rating: rating > 0 ? rating : null }).catch(() => { })
    onFinish()
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
          <button className="neu-btn" onClick={onFinish} style={{ padding: "18px", fontSize: 20 }}>Skip</button>
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

// ─── CUSTOM ACTION MODAL ──────────────────────────────────────────────────────
// ─── CUSTOM ACTION MODAL ──────────────────────────────────────────────────────
function CustomActionModal({ onClose, onSuccess }) {
  const { t } = useApp();
  const [actionName, setActionName] = useState("");
  const [whyItHelps, setWhyItHelps] = useState("");

  // 🎛️ Toggle States
  const [isAudio, setIsAudio] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isSpotify, setIsSpotify] = useState(false);

  // 🎵 Spotify Integration States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSpotify, setSelectedSpotify] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearching(true);

    const delayDebounce = setTimeout(() => {
      axios.get(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => setSearchResults(res.data.tracks || []))
        .catch(() => { })
        .finally(() => setSearching(false));
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  async function handleSave() {
    if (!actionName.trim()) return;
    setSaving(true);

    const payload = {
      text: actionName.trim(),
      benefit: whyItHelps.trim(),
      is_audio: isAudio,
      is_video: isVideo,
      spotify_uri: isSpotify ? selectedSpotify?.uri : null,
      spotify_name: isSpotify ? selectedSpotify?.name : null,
      spotify_type: isSpotify ? selectedSpotify?.type : null
    };

    try {
      const res = await axios.post("/api/actions/custom", payload);
      // 🟢 NEW: Tell the backend to generate audio if enabled
      if (isAudio) axios.post(`/api/actions/${res.data.action_id}/generate-audio`).catch(() => { });
      onSuccess({
        id: res.data.action_id,
        text: actionName.trim(),
        benefit: whyItHelps.trim(),
        category: "Customized"
      });
    } catch (err) {
      alert("Failed to save custom action.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, fontStyle: "italic", fontFamily: "'Autumn Brush', 'Caveat', cursive", color: t.text, marginBottom: 32 }}>
          Create Custom Action
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="input-label">Action Name</label>
          <input className="neu-input" value={actionName} onChange={e => setActionName(e.target.value)} placeholder="Your own Action" style={{ width: "100%", padding: "18px 20px", fontSize: 18 }} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="input-label">Why it helps</label>
          <textarea className="neu-input" value={whyItHelps} onChange={e => setWhyItHelps(e.target.value)} placeholder="How or why this will help you?" rows={4} style={{ width: "100%", padding: "18px 20px", fontSize: 18, resize: "none" }} />
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: t.subtext, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Actions</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 18, color: t.text }}>Audio</span>
              <InfoTooltip text="Reads the Action and its Why out loud" theme={t} />
            </div>
            <button onClick={() => setIsAudio(!isAudio)} className={isAudio ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>{isAudio ? "Enabled" : "Disabled"}</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 18, color: t.text }}>Video</span>
              <InfoTooltip text="Play the Youtube video of the Action" theme={t} />
            </div>
            <button onClick={() => setIsVideo(!isVideo)} className={isVideo ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>{isVideo ? "Enabled" : "Disabled"}</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: 18, color: t.text }}>Spotify</span>
              <InfoTooltip text="Play the song, playlist, or podcast from your Spotify" theme={t} />
            </div>
            <button onClick={() => setIsSpotify(!isSpotify)} className={isSpotify ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>{isSpotify ? "On" : "Off"}</button>
          </div>
        </div>

        {isSpotify && (
          <div className="neu-inset" style={{ padding: 20, borderRadius: 16, marginBottom: 28 }}>
            <label className="input-label" style={{ marginTop: 0, fontSize: 16 }}>Search Spotify Tracks & Playlists</label>
            <input className="neu-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type track, playlist, or artist..." style={{ width: "100%", padding: "12px 16px", fontSize: 16, marginBottom: 12 }} />
            {selectedSpotify && <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, marginBottom: 8 }}>Linked: {selectedSpotify.name} ({selectedSpotify.type})</div>}
            {searchResults.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {searchResults.map(item => (
                  <div key={item.uri} onClick={() => setSelectedSpotify({ uri: item.uri, name: item.name, type: item.type })} style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 15, color: t.text, background: selectedSpotify?.uri === item.uri ? t.selectionBg : "transparent" }}>
                    {item.name} <span style={{ opacity: 0.6, fontSize: 13 }}>by {item.artist}</span>
                  </div>
                ))}
              </div>
            )}
            {searching && <div style={{ fontSize: 14, color: t.subtext, fontStyle: "italic" }}>Searching...</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving || !actionName.trim()} style={{ padding: "16px", fontSize: 18, fontWeight: 700 }}>{saving ? "Saving..." : "Save & Set Reminder"}</button>
          <button className="neu-btn" onClick={onClose} style={{ padding: "16px", fontSize: 18, fontWeight: 700 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}



// ─── ACTION REPORT MODAL ──────────────────────────────────────────────────────
function ReportModal({ actionText, history, reasons, journals, onClose }) {
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
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 680, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 14, textAlign: "center" }}>Action Report</div>
        <div style={{ fontSize: 18, color: t.subtext, fontStyle: "italic", textAlign: "center", marginBottom: 34 }}>{actionText}</div>

        <div style={{ overflowY: "auto", paddingRight: 10, flex: 1, display: "flex", flexDirection: "column", gap: 32, marginBottom: 24 }}>

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

          {journals && journals.length > 0 && (
            <div>
              <div style={{ fontSize: 17, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 18, textAlign: "center" }}>Journal Entries</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {journals.map((j, i) => (
                  <div key={i} className="neu-inset" style={{ padding: "20px 24px", borderRadius: 16 }}>
                    <div style={{ fontSize: 14, color: t.subtext, fontWeight: 700, marginBottom: 8 }}>{new Date(j.date).toLocaleDateString()}</div>
                    <div className="notebook-paper" style={{ padding: "0 !important", color: t.text }}>{j.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reasons && reasons.length > 0 && (
            <div>
              <div style={{ fontSize: 17, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 1, marginBottom: 18, textAlign: "center" }}>Friction Logs (Why I Missed)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {reasons.map((r, i) => (
                  <div key={i} className="neu-inset" style={{ padding: "20px 24px", borderRadius: 16 }}>
                    <div style={{ fontSize: 14, color: t.subtext, fontWeight: 700, marginBottom: 8 }}>{new Date(r.date).toLocaleDateString()}</div>
                    <div style={{ fontSize: 19, color: t.text, fontStyle: "italic", lineHeight: 1.6 }}>"{r.reason}"</div>
                  </div>
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
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
function JournalInModal({ action, onClose, onSaved }) {
  const { t } = useApp()
  const [content, setContent] = useState("")
  const [customTitle, setCustomTitle] = useState("General Thoughts")
  const [pastCategories, setPastCategories] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  // 🎙️ Voice States
  const [showVoice, setShowVoice] = useState(false);
  const [aiReply, setAiReply] = useState("");

  // 🎧 Spotify Cinematic States
  const [sessionState, setSessionState] = useState("writing"); // "writing", "fading", "decompressing"

  useEffect(() => {
    if (!action) {
      axios.get("/api/profile/journal").then(res => {
        const logs = res.data.journal || [];
        const uniqueTitles = [...new Set(logs.map(l => l.action_text))];
        setPastCategories(uniqueTitles.filter(c => c !== 'General Thoughts'));
      }).catch(() => { });
    }
  }, [action])

  async function handleSave() {
    if (!content.trim()) { onClose(); return }
    setSaving(true)

    try {
      const res = await axios.post("/api/profile/journal", {
        action_id: action ? action.id : null,
        content: content.trim(),
        custom_title: action ? null : customTitle.trim()
      });

      if (res.data.vibe_shift) {
        setSessionState("fading");
        setTimeout(() => setSessionState("decompressing"), 600);
      } else {
        if (onSaved) onSaved()
        onClose()
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  async function handleTalkClick() {
    try {
      const res = await axios.get("/api/profile/me");
      const currentTier = res.data.tier || "free";
      if (currentTier === "paid" || currentTier === "pro") {
        setShowVoice(true);
      } else {
        alert("🎙️ Voice Journaling is a Premium feature. Please upgrade your membership in Account Settings to unlock voice inputs!");
      }
    } catch (err) {
      alert("Unable to verify subscription status. Please try again.");
    }
  }

  return (
    <div className="glass-modal" onClick={sessionState === "writing" ? onClose : undefined}>
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 760, width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* 🎧 THE DECOMPRESSION CARD (Pops up inside the modal) */}
        {sessionState === "decompressing" && (
          <div style={{ textAlign: "center", animation: "slideUpFade 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards", padding: "40px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎧</div>
            <h2 style={{ color: t.text, fontSize: 28, marginBottom: 16 }}>Deep breaths.</h2>
            <p style={{ color: t.subtext, fontSize: 18, lineHeight: 1.6, maxWidth: 500, margin: "0 auto", marginBottom: 32 }}>
              That sounded like a tough session. I've queued up an ambient lofi setup on your Spotify to help you decompress.
              <br /><br />
              Step away from the screen for a minute. You've got this.
            </p>
            <button
              className="neu-inset active-tab"
              onClick={() => { if (onSaved) onSaved(); onClose(); }}
              style={{ padding: "12px 28px", fontSize: 16, fontWeight: 700, color: t.accent }}
            >
              Close Journal
            </button>
          </div>
        )}

        {/* 📝 ORIGINAL UI (Fades out when Spotify is triggered) */}
        <div style={{
          transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: sessionState === "writing" ? 1 : 0,
          visibility: sessionState === "writing" ? "visible" : "hidden",
          height: sessionState === "writing" ? "auto" : "0px",
          overflow: "hidden"
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.text, marginBottom: 14 }}>Journal Entry</div>

          <div style={{ position: "relative", marginBottom: 36, paddingLeft: 16, borderLeft: `4px solid ${t.accent}` }}>
            {action ? (
              <div style={{ fontSize: 18, color: t.text, fontStyle: "italic" }}>"{action.text}"</div>
            ) : (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  className="neu-input"
                  value={customTitle}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Enter or select category..."
                  style={{ fontSize: 18, color: t.text, fontStyle: "italic", padding: "8px 36px 8px 12px", width: "100%", background: "transparent", boxShadow: "none", borderBottom: `1px dashed ${t.accent}`, borderRadius: 0, paddingRight: "30px" }}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: t.subtext, pointerEvents: "none", opacity: 0.7 }}>▼</span>
                {showDropdown && pastCategories.length > 0 && (
                  <div className="neu-card" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, padding: "8px 0", marginTop: 4, maxHeight: 200, overflowY: "auto", borderRadius: 16 }}>
                    {pastCategories.map(c => (
                      <div key={c} onClick={() => { setCustomTitle(c); setShowDropdown(false); }} style={{ padding: "10px 20px", fontSize: 17, color: t.text, cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = t.selectionBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ position: "relative", marginBottom: 30 }}>
            <textarea
              className="neu-input notebook-paper"
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder={action ? "How do you feel about this Action and your streak?" : "Frustrated/Blocked, Overwhelmed, Discouraged, Burned Out..."}
              style={{ width: "100%", resize: "vertical", paddingRight: 90, paddingTop: 20 }}
            />
            <button onClick={handleTalkClick} className="neu-btn" style={{ position: "absolute", top: 16, right: 16, padding: "8px 18px", fontSize: 15, borderRadius: "12px", zIndex: 5, fontWeight: 800 }}>
              Talk
            </button>
            {aiReply && (
              <div className="neu-inset" style={{ padding: "20px", marginTop: 16, borderRadius: 16, borderLeft: `4px solid ${t.accent}` }}>
                <div style={{ fontSize: 14, textTransform: "uppercase", fontWeight: 800, color: t.subtext, marginBottom: 8, letterSpacing: 1 }}>AI Coach Responds:</div>
                <div style={{ fontSize: 18, color: t.text, lineHeight: 1.6 }}>{aiReply}</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "18px", fontSize: 20 }}>
              {saving ? "Saving..." : "Save Entry"}
            </button>
            <button className="neu-btn" onClick={onClose} style={{ padding: "18px", fontSize: 20 }}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      {showVoice && (
        <VoiceRecorderModal
          onClose={() => setShowVoice(false)}
          onProcessed={(transcript, reply) => {
            setContent(prev => prev ? prev + "\n\n" + transcript : transcript);
            setAiReply(reply);
          }}
        />
      )}

      <style>{`
        @keyframes slideUpFade {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0px) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── DIFFICULTY POPUP ─────────────────────────────────────────────────────────
function DifficultyPopup({ actionId, onLogged }) {
  const { t } = useApp()
  const [chosen, setChosen] = useState(null)

  async function pick(difficulty) {
    setChosen(difficulty)
    // Instantly logs completion with chosen difficulty so circle lights up properly
    await axios.post(`/api/profile/actions/${actionId}/complete`, { source: "manual", difficulty }).catch(() => { })

    // Shows the visual success tick for 1.2 seconds, then continues the cascade
    setTimeout(() => {
      if (onLogged) onLogged()
    }, 1200)
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

// ─── SEARCH PAGE ──────────────────────────────────────────────────────────────
// ─── SEARCH PAGE ──────────────────────────────────────────────────────────────
function SearchPage() {
  const { t, user, logout, searchQuery, setSearchQuery, activeCat, setActiveCat, setPage, setShareModal } = useApp()
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [pendingCustomAction, setPendingCustomAction] = useState(null)

  // 🟢 NEW: AI Search State
  const [aiToggle, setAiToggle] = useState(false)

  useEffect(() => {
    axios.get("/api/categories").then(r => setCategories(r.data.categories || [])).catch(() => { })
  }, [])

  // Auto-search when category changes
  useEffect(() => {
    if (activeCat || searchQuery) executeSearch()
  }, [activeCat])

  // 🟢 NEW: Master Search Execution Engine (Handles Ads & AI Routing)
  // 🟢 NEW: Master Search Execution Engine
  async function executeSearch() {
    if (!searchQuery.trim() && !activeCat) return;

    if (aiToggle && searchQuery.trim()) {

      // 1. Check if we are testing locally to bypass the Ad requirement!
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

      if (user?.tier === "pro" || user?.tier === "paid" || isLocal) {
        runBackendSearch(true); // Run instantly!
      } else {
        // 2. Free Users on Live Production must watch an ad
        setLoading(true);
        setErrorMsg("");
        if (window.adsbygoogle) {
          try {
            window.adsbygoogle.push({
              rewarded: {
                adDismissed: () => runBackendSearch(true),
                adError: () => {
                  setErrorMsg("Please disable your adblocker to unlock AI Search.");
                  setLoading(false);
                }
              }
            });
          } catch (e) {
            setErrorMsg("Failed to load video ad.");
            setLoading(false);
          }
        } else {
          setErrorMsg("Please disable your ad-blocker to use the free AI Search feature.");
          setLoading(false);
        }
      }
    } else {
      // 3. Standard Search (No AI, No Ad)
      runBackendSearch(false);
    }
  }

  // 🟢 NEW: Actually calls the backend endpoints
  async function runBackendSearch(useAI) {
    setLoading(true)
    setErrorMsg("")
    setResults([])
    try {
      const endpoint = useAI ? "/api/search/ai" : "/api/search"
      const params = { q: searchQuery, limit: 12 }
      if (activeCat) params.category = activeCat

      const res = await axios.get(endpoint, { params })
      if (res.data.error) setErrorMsg(res.data.error)
      setResults(res.data.results || [])
    } catch {
      setErrorMsg("Error reaching search engine.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="layout-container" style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 24px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 38 }}>
            <span style={{
              color: t.text,
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: "1px",
              margin: "0 auto"
            }}>
              MindActions</span>
            <div style={{ display: "flex", gap: 16 }}>
              <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 26px", fontSize: 18 }}>{user?.name?.split(" ")[0] || "Profile"}</button>
            </div>
          </div>

          {/* 🟢 UPDATED: Search Bar with embedded AI Toggle */}
          <div style={{ display: "flex", gap: 12, maxWidth: 800, margin: "0 auto 28px", alignItems: "stretch" }}>

            <div className="neu-inset" style={{ display: "flex", flex: 1, borderRadius: 16, padding: "6px" }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && executeSearch()}
                placeholder="Describe how you feel or what you want to improve"
                style={{ flex: 1, padding: "16px 20px", fontSize: 19, color: t.text, border: "none", outline: "none", background: "transparent" }}
              />

              <button
                onClick={() => setAiToggle(!aiToggle)}
                className={aiToggle ? "neu-inset active-tab" : "neu-btn-flat"}
                style={{ padding: "0 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 16, transition: "all 0.3s" }}
              >
                AI {aiToggle ? "ON" : "OFF"}
              </button>
            </div>

            <button className="neu-btn neu-btn-primary" onClick={executeSearch} style={{ padding: "0 32px", fontSize: 19 }}>Search</button>
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

      <div style={{ padding: "20px 24px 90px" }}>
        {loading && <BreathingLoader />}
        {!loading && (
          <div className="action-grid">
            {results.map(a => <ActionCard key={a.id} action={a} />)}
          </div>
        )}
      </div>

      {showCustomModal && <CustomActionModal onClose={() => setShowCustomModal(false)} onSuccess={(newAct) => { setShowCustomModal(false); setPendingCustomAction(newAct); }} />}
      {pendingCustomAction && <ReminderModal action={pendingCustomAction} onClose={() => setPendingCustomAction(null)} onSaved={() => {
        setPendingCustomAction(null)
        setShareModal({ action: pendingCustomAction, context: "commitment" })
      }} />}
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

  async function handlePick() {
    try {
      await axios.post(`/api/profile/actions/${action.id}/pick`)
      setPickCount(v => v + 1)
      setPicked(true)
      setShowReminder(true)
    } catch (e) { console.error(e) }
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "38px 40px", marginBottom: 32, borderRadius: 28, display: 'flex', flexDirection: 'column' }}>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: "auto" }}>
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
          <button className={picked ? "neu-inset" : "neu-btn neu-btn-primary"} onClick={() => { if (!picked) handlePick() }} style={{ padding: "16px 30px", fontSize: 17 }}>
            {picked ? "Added to profile" : "Let's do this"}
          </button>
        </div>
      </div>
      {showReminder && <ReminderModal action={action} onClose={() => setShowReminder(false)} onSaved={() => {
        setShowReminder(false)
        setShareModal({ action, context: "commitment" })
      }} />}
      {showReviews && <ReviewsModal action={action} onClose={() => setShowReviews(false)} />}
    </>
  )
}

// ─── PHASE 2: MOOD COMPONENTS ────────────────────────────────────────────────
// ─── PHASE 2: MOOD COMPONENTS ────────────────────────────────────────────────
function MoodChart({ moods }) {
  const { t } = useApp()
  if (!moods || moods.length === 0) return <div style={{ color: t.subtext, fontStyle: "italic", textAlign: "center", marginBottom: 32 }}>No mood data logged yet.</div>

  // Widened SVG canvas to natively match the ultra-wide layout of Action Cards
  const svgWidth = 1000; const svgHeight = 140; const padX = 60;
  const moodY = { "Great": 30, "Steady": 70, "Down": 110 }
  const moodColors = { "Great": "var(--mood-great)", "Steady": "var(--mood-steady)", "Down": "var(--mood-down)" }

  const points = moods.map((m, i) => {
    const x = moods.length === 1 ? svgWidth / 2 : padX + (i * (svgWidth - 2 * padX) / (moods.length - 1))
    return { x, y: moodY[m.mood] || 70, color: moodColors[m.mood] }
  })

  return (
    <div style={{ width: "100%", marginBottom: 32 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ overflow: "visible", display: "block" }}>
        <line x1={padX} y1={30} x2={svgWidth - padX} y2={30} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />
        <line x1={padX} y1={70} x2={svgWidth - padX} y2={70} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />
        <line x1={padX} y1={110} x2={svgWidth - padX} y2={110} stroke={t.subtext} strokeOpacity="0.2" strokeDasharray="4" />

        <text x="0" y="35" fontSize="15" fill={t.subtext} fontWeight="700">Great</text>
        <text x="0" y="75" fontSize="15" fill={t.subtext} fontWeight="700">Steady</text>
        <text x="0" y="115" fontSize="15" fill={t.subtext} fontWeight="700">Down</text>

        {points.length > 1 && <polyline fill="none" stroke={t.accent} strokeWidth="3" strokeOpacity="0.6" points={points.map(p => `${p.x},${p.y}`).join(" ")} strokeLinejoin="round" />}
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="7" fill={p.color} stroke={t.bg} strokeWidth="2.5" />)}
      </svg>
    </div>
  )
}

function MoodWidget({ onMoodLogged }) {
  const { t } = useApp()
  const [justLogged, setJustLogged] = useState(null)

  async function logMood(state) {
    setJustLogged(state)
    await axios.post("/api/profile/mood", { mood_state: state }).catch(() => { })
    if (onMoodLogged) onMoodLogged()
    setTimeout(() => setJustLogged(null), 1500)
  }

  return (
    <div className="neu-inset" style={{ padding: "24px 28px", borderRadius: 24, marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>How are you feeling?</div>
      <div style={{ display: "flex", gap: 16, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { label: "Down/Stressed", val: "Down", color: "var(--mood-down)" },
          { label: "Steady/Chilling", val: "Steady", color: "var(--mood-steady)" },
          { label: "On Track/Great", val: "Great", color: "var(--mood-great)" }
        ].map(m => (
          <button key={m.val} onClick={() => logMood(m.val)} className="neu-btn" style={{ flex: 1, minWidth: 140, padding: "16px 0", borderRadius: 20, position: "relative", overflow: "hidden" }}>
            {justLogged === m.val ? (
              <span style={{ fontSize: 22, color: m.color }}>✔️ Logged</span>
            ) : (
              <span style={{ fontSize: 18, color: m.color }}>{m.label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── PHASE 3: TROPHY ROOM ─────────────────────────────────────────────────────
function TrophyRoomModal({ actions, streaks, onClose }) {
  const { t } = useApp()

  // Dynamic Achievement Calculations
  const hasStarted = actions.some(a => a.times_completed > 0)
  const hasLevel2 = actions.some(a => (a.times_completed || 0) >= 10)
  const hasLevel5 = actions.some(a => (a.times_completed || 0) >= 50)

  let maxStreak = 0
  Object.values(streaks).forEach(s => { if (s.streak > maxStreak) maxStreak = s.streak })

  const achievements = [
    { title: "First Step", desc: "Completed your first action.", unlocked: hasStarted, icon: "🌱" },
    { title: "Gaining Momentum", desc: "Reached a 7-day streak.", unlocked: maxStreak >= 7, icon: "🔥" },
    { title: "Consistency", desc: "Reached a 30-day streak.", unlocked: maxStreak >= 30, icon: "⚡" },
    { title: "Habit Former", desc: "Reached Level 2 on any action.", unlocked: hasLevel2, icon: "⭐" },
    { title: "Mastery", desc: "Reached Level 5 on any action.", unlocked: hasLevel5, icon: "👑" },
  ]

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 640, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: t.text }}>Trophy Room</div>
          <div style={{ fontSize: 18, color: t.subtext, marginTop: 8 }}>Your journey and milestones</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 32 }}>
          {achievements.map((ach, i) => (
            <div key={i} className={ach.unlocked ? "neu-inset" : "neu-card"} style={{ padding: "24px 20px", borderRadius: 20, display: "flex", alignItems: "center", gap: 16, opacity: ach.unlocked ? 1 : 0.4 }}>
              <div className="neu-btn" style={{ width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, padding: 0, cursor: "default", boxShadow: ach.unlocked ? `inset 4px 4px 8px ${t.shadowDark}, inset -4px -4px 8px ${t.shadowLight}` : undefined }}>
                {ach.unlocked ? ach.icon : "🔒"}
              </div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{ach.title}</div>
                <div style={{ fontSize: 14, color: t.subtext, lineHeight: 1.4 }}>{ach.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Close Trophy Room</button>
      </div>
    </div>
  )
}

// ─── PROFILE COMPONENTS ───────────────────────────────────────────────────────
// ─── PROFILE COMPONENTS ───────────────────────────────────────────────────────
// ─── PROFILE COMPONENTS ───────────────────────────────────────────────────────
// ─── PROFILE COMPONENTS ───────────────────────────────────────────────────────
function ProfilePage() {
  const { t, user, logout, setPage, setViewJournalIn, setCompletionFlow } = useApp()
  const [actions, setActions] = useState([])
  const [reminders, setReminders] = useState([])
  const [streaks, setStreaks] = useState({})
  const [profileTab, setProfileTab] = useState("Actions")
  const [view, setView] = useState(7)
  const [loading, setLoading] = useState(true)
  const [viewReport, setViewReport] = useState(null)
  const [moods, setMoods] = useState([])
  const [showTrophies, setShowTrophies] = useState(false)
  const [showInsights, setShowInsights] = useState(false)

  // 🟢 NEW: Holds live account data matching your Neon cloud table schema
  const [liveProfile, setLiveProfile] = useState({
    username: user?.name || "User",
    email: "",
    tier: "free"
  })

  function fetchProfileData() {
    // 🟢 NEW: Hit our updated endpoint to query the real dynamic tier row on the fly
    axios.get("/api/profile/me")
      .then(res => {
        setLiveProfile(res.data)
      })
      .catch(err => console.error("Could not sync live account tier data:", err))

    axios.get("/api/profile/actions").then(async res => {
      const fetchedActions = res.data.actions || []
      setActions(fetchedActions)

      const s = {}
      // 🟢 THE FIX: Run all streak requests simultaneously instead of waiting in line!
      await Promise.all(fetchedActions.map(async (a) => {
        try {
          const sr = await axios.get(`/api/profile/streak/${a.id}`)
          s[a.id] = sr.data
        } catch { }
      }))

      setStreaks(s)
      setLoading(false)
    }).catch(() => setLoading(false))

    axios.get("/api/profile/reminders").then(res => setReminders(res.data.reminders || [])).catch(() => { })

    axios.get("/api/profile/mood").then(res => {
      setMoods(res.data.moods || [])
      if (res.data.moods?.length > 0) window.lastMood = res.data.moods[res.data.moods.length - 1].mood
    }).catch(() => { })

    axios.get("/api/profile/settings").then(res => {
      const closing = res.data.closing_time || "20:00"
      const [cH, cM] = closing.split(":").map(Number)
      const now = new Date()
      if (now.getHours() > cH || (now.getHours() === cH && now.getMinutes() >= cM)) {
        const todayStr = now.toISOString().split("T")[0]
        if (!localStorage.getItem(`closing_prompt_${todayStr}`)) {
          localStorage.setItem(`closing_prompt_${todayStr}`, "1")
          if (window.confirm("Closing the Day: Are you in a mood to Journal-In your day?")) {
            setGenericJournalModal(true)
          }
        }
      }
    }).catch(() => { })
  }

  useEffect(() => {
    fetchProfileData()
    window.addEventListener("refresh-profile", fetchProfileData)
    return () => window.removeEventListener("refresh-profile", fetchProfileData)
  }, [])

  const activeActions = actions.filter(a => a.is_active)
  const completedActions = actions.filter(a => !a.is_active)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - view)
  const filteredMoods = moods.filter(m => new Date(m.date) >= cutoffDate)

  function StreakDots({ action }) {
    const data = streaks[action.id]
    if (!data) return null
    const days = view === 7 ? data.days_7 : view === 30 ? data.days_30 : view === 90 ? data.days_90 : (data.days_365 || [])
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          {days?.map((d, i) => {
            return (
              <div key={i} title={d.date}
                className="neu-inset"
                style={{
                  width: 34, height: 34, borderRadius: "50%", padding: 0,
                  background: d.completed ? `radial-gradient(circle, var(--streak-on) 15%, transparent 75%)` : "transparent",
                  boxShadow: d.completed ? `inset 2px 2px 6px var(--shadow-d), inset -2px -2px 6px var(--shadow-l)` : `inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l)`,
                  border: "none"
                }} />
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
            <button className="neu-btn" onClick={async () => {
              try {
                const res = await axios.get(`/api/profile/actions/${action.id}/report`);
                setViewReport({ text: action.text, history: res.data.history, reasons: res.data.reasons, journals: res.data.journals });
              } catch (e) { console.error("Report fetch failed", e); }
            }} style={{ padding: "12px 20px", fontSize: 16 }}>Report</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="layout-container" style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 34px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
            <button
              className="neu-btn"
              onClick={() => setPage("search")}
              style={{
                padding: "14px 24px",
                fontSize: 18,
                marginLeft: "126px",
                marginTop: "0px"
              }}
            >
              Search
            </button>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="neu-btn" onClick={() => setShowInsights(true)} style={{ padding: "14px 24px", fontSize: 18 }}>Insights</button>
              <button className="neu-btn" onClick={() => setShowTrophies(true)} style={{ padding: "14px 24px", fontSize: 18 }}>Trophies</button>
              <button className="neu-btn" onClick={() => setPage("journal")} style={{ padding: "14px 24px", fontSize: 18 }}>Journal</button>
              <button className="neu-btn" onClick={logout} style={{ padding: "14px 24px", fontSize: 18 }}>Log out</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 44 }}>
            <div
              className="neu-btn"
              onClick={() => setPage("edit-profile")}
              style={{ width: 96, height: 96, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: t.accent, marginBottom: 20, cursor: "pointer" }}
            >
              {liveProfile.username?.[0]?.toUpperCase() || "U"}
            </div>
            {/* 🟢 READS DIRECTLY FROM LIVE STATE */}
            <p style={{ color: t.text, fontWeight: 800, fontSize: 32, marginBottom: 8 }}>{liveProfile.username}</p>

            {/* 🟢 NEW VISUAL PREMIUM ACCOUNT BADGE DISPLAY */}
            <div
              className="neu-inset"
              style={{
                padding: "6px 16px",
                borderRadius: "12px",
                fontSize: 14,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: liveProfile.tier !== "free" ? t.accent : t.subtext,
                display: "inline-block"
              }}
            >
              {liveProfile.tier} Member
            </div>
          </div>

          <div className="neu-inset" style={{ display: "flex", padding: 10, borderRadius: 20, maxWidth: 740, margin: "0 auto" }}>
            {["Actions", "Reminders", "Streak-Mood", "Completed"].map(tab => (
              <button key={tab} onClick={() => setProfileTab(tab)} className={profileTab === tab ? "neu-btn active-tab" : "neu-btn-flat"} style={{ flex: 1, padding: "20px 0", borderRadius: 16, fontWeight: 700, fontSize: 24 }}>{tab.replace("-", " & ")}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px 90px" }}>
        {loading && <BreathingLoader />}

        {!loading && profileTab === "Actions" && activeActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>You have no pending actions.</div>}
        {!loading && profileTab === "Actions" && (
          <div className="action-grid">
            {activeActions.map(a => <ProfileActionCard key={a.id} a={a} isCompletedTab={false} streakData={streaks[a.id]} onViewReport={setViewReport} onCompleteTrigger={(act) => setCompletionFlow({ action: act, step: 'difficulty', intent: 'finish' })} />)}
          </div>
        )}

        {!loading && profileTab === "Completed" && completedActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No completed actions yet.</div>}
        {!loading && profileTab === "Completed" && (
          <div className="action-grid">
            {completedActions.map(a => <ProfileActionCard key={a.id} a={a} isCompletedTab={true} streakData={streaks[a.id]} onViewReport={setViewReport} onCompleteTrigger={() => fetchProfileData()} onReviewFlowTrigger={(act) => setCompletionFlow({ action: act, step: 'review' })} />)}
          </div>
        )}

        {!loading && profileTab === "Reminders" && activeActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No active actions.</div>}
        {!loading && profileTab === "Reminders" && (
          <div className="action-grid">
            {activeActions.map(a => {
              const rem = reminders.find(r => r.action_id === a.id)
              return <ReminderListCard key={a.id} action={a} rem={rem} onEditTrigger={() => fetchProfileData()} />
            })}
          </div>
        )}

        {!loading && profileTab === "Streak-Mood" && (
          <>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <MoodWidget onMoodLogged={fetchProfileData} />
              <ElasticSlider options={[7, 30, 90, 365]} value={view} onChange={setView} />
            </div>

            <div className="action-grid">
              <div style={{ width: "100%", padding: "0 16px" }}>
                <MoodChart moods={filteredMoods} />
              </div>

              {activeActions.map(a => (
                <div key={a.id} className="neu-inset" style={{ padding: "38px 40px", marginBottom: 32, borderRadius: 28, display: "flex", flexDirection: "column", minHeight: 180 }}>
                  <p style={{ fontSize: 26, fontWeight: 700, color: t.text, marginBottom: 24 }}>{a.text}</p>
                  <StreakDots action={a} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {viewReport && <ReportModal actionText={viewReport.text} history={viewReport.history} reasons={viewReport.reasons} journals={viewReport.journals} onClose={() => setViewReport(null)} />}

      {showTrophies && <TrophyRoomModal actions={actions} streaks={streaks} onClose={() => setShowTrophies(false)} />}

      {showInsights && (
        <InsightsModal
          actions={actions}
          moods={moods}
          user={user}
          onClose={() => setShowInsights(false)}
          onTriggerUpgrade={() => {
            setShowInsights(false);
            setPage("edit-profile");
          }}
        />
      )}
    </div>
  )
}

// ─── PROFILE ACTION CARD ─────────────────────────────────────────────────────
// ─── PROFILE ACTION CARD ─────────────────────────────────────────────────────
// ─── PROFILE ACTION CARD ─────────────────────────────────────────────────────
// ─── PROFILE ACTION CARD ─────────────────────────────────────────────────────
function ProfileActionCard({ a, isCompletedTab, onCompleteTrigger, onReviewFlowTrigger, streakData, onViewReport }) {
  const { t, setActiveVideo, cancelNotification } = useApp()
  const [showBenefit, setShowBenefit] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showReviews, setShowReviews] = useState(false)

  const level = Math.floor((a.times_completed || 0) / 10) + 1

  async function markRestart() {
    await axios.post(`/api/profile/actions/${a.id}/restart`).catch(() => { })
    if (onCompleteTrigger) onCompleteTrigger(a)
  }

  // 🟢 NEW: Manual Trigger Handlers for the Buttons!
  function playAudio(e) {
    e.stopPropagation();
    new Audio(`/api/audio/${a.id}`).play().catch(err => console.error("Audio failed:", err));
  }

  function playVideo(e) {
    e.stopPropagation();
    if (a.embed_url) {
      const startTime = parseInt(a.video_start_time) || 0;
      // 🟢 The &start= parameter forces YouTube to jump to that second
      const finalUrl = `${a.embed_url}?autoplay=1&start=${startTime}`;
      console.log("Playing Video:", finalUrl); // Just in case we need to verify!
      setActiveVideo({ url: finalUrl, title: a.video_title });
    }
  }

  function playSpotify(e) {
    e.stopPropagation();
    axios.post("/api/spotify/play-reminder", { uri: a.spotify_uri }).catch(err => console.error("Spotify failed:", err));
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "38px 40px", marginBottom: 32, borderRadius: 28, opacity: isCompletedTab ? 0.65 : 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="neu-inset" style={{ padding: "6px 14px", borderRadius: 12, fontSize: 13, fontWeight: 800, color: t.text, textTransform: "uppercase", letterSpacing: 1 }}>
              {a.category || "Customized"}
            </span>

            <span className="neu-inset" style={{ padding: "6px 14px", borderRadius: 12, fontSize: 13, fontWeight: 800, color: t.accent }}>
              Lv. {a.level || level}
            </span>

            {/* 🟢 ACTION ICONS TURNED INTO CLICKABLE BUTTONS */}
            <div style={{ display: "flex", gap: 10, fontSize: 18, marginLeft: 6 }}>
              {a.is_audio && (
                <button onClick={playAudio} title="Play Audio" className="neu-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", padding: 0 }}>🔊</button>
              )}
              {a.is_video && (
                <button onClick={playVideo} title="Watch Video" className="neu-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", padding: 0 }}>▶️</button>
              )}
              {a.spotify_uri && (
                <button onClick={playSpotify} title="Play Spotify" className="neu-btn" style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", padding: 0 }}>🎵</button>
              )}
              {a.is_gcal && <span title="Synced to Calendar" style={{ cursor: "default" }}>📅</span>}
            </div>
          </div>

          <span style={{ fontSize: 17, color: t.subtext, fontWeight: 600 }}>Added {new Date(a.picked_at).toLocaleDateString()}</span>
        </div>

        <p style={{ fontSize: 24, fontWeight: 700, color: t.text, lineHeight: 1.6, marginBottom: 32 }}>{a.text}</p>

        {showBenefit && a.benefit && (
          <div className="neu-card" style={{ padding: "24px 28px", marginBottom: 26 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>Why this helps</p>
            <p style={{ fontSize: 20, color: t.text, lineHeight: 1.7 }}>{a.benefit}</p>
          </div>
        )}

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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18, marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <button className={showBenefit ? "neu-inset" : "neu-btn"} onClick={() => setShowBenefit(v => !v)} style={{ padding: "16px 24px", fontSize: 17 }}>
              {showBenefit ? "Hide Reason" : "Show Why"}
            </button>
            {!isCompletedTab && (
              <button className="neu-btn" onClick={() => setShowReminder(true)} style={{ padding: "18px 26px", fontSize: 19 }}>Change Reminder</button>
            )}
            {a.embed_url && <button className="neu-btn" onClick={(e) => playVideo(e)} style={{ padding: "18px 26px", fontSize: 19, color: "#c94c4c" }}>
              Watch Video
            </button>}
            <button className="neu-btn" onClick={async () => {
              try {
                const res = await axios.get(`/api/profile/actions/${a.id}/report`);
                onViewReport({ text: a.text, history: res.data.history, reasons: res.data.reasons, journals: res.data.journals });
              } catch (e) { console.error("Report fetch failed", e); }
            }} style={{ padding: "18px 26px", fontSize: 19 }}>Report</button>

            {isCompletedTab && a.category !== 'Customized' && <button className="neu-btn" onClick={() => onReviewFlowTrigger(a)} style={{ padding: "18px 26px", fontSize: 19 }}>Review</button>}
          </div>

          <button
            className="neu-btn neu-btn-primary"
            onClick={async () => {
              if (isCompletedTab) {
                markRestart()
              } else {
                cancelNotification(a.id)
                await axios.post(`/api/profile/actions/${a.id}/finish`).catch(() => { })
                window.dispatchEvent(new Event("refresh-profile"))
                if (onCompleteTrigger) onCompleteTrigger(a)
              }
            }}
            style={{ padding: "18px 34px", fontSize: 19 }}
          >
            {isCompletedTab ? "Do it again" : "Action Complete"}
          </button>
        </div>
      </div>
      {showReminder && <ReminderModal action={a} isEdit={true} onClose={() => setShowReminder(false)} onSaved={() => window.dispatchEvent(new Event("refresh-profile"))} />}
      {showReviews && <ReviewsModal action={a} onClose={() => setShowReviews(false)} />}
    </>
  )
}

function ReminderListCard({ action, rem, onEditTrigger }) {
  const { t } = useApp()
  const [showReminder, setShowReminder] = useState(false)

  let nextString = "No reminder set"
  let typeBlock = null

  if (rem) {
    if (rem.reminder_type === "widget") {
      nextString = "Next reminder: click on widget"
      typeBlock = (
        <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 28px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Type</span>
          <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>By Widget</span>
        </button>
      )

    } else if (rem.reminder_type === "location") {
      nextString = `Trigger: When I ${rem.loc_condition || 'arrive'} at location`
      typeBlock = (
        <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Location</span>
          <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}> Map Pin</span>
        </button>
      )

    } else if (rem.reminder_type === "time") {
      const now = new Date(); const target = new Date()
      let h = parseInt(rem.target_hour || "08")
      if (rem.target_ampm === "PM" && h !== 12) h += 12; if (rem.target_ampm === "AM" && h === 12) h = 0
      target.setHours(h, parseInt(rem.target_minute || "00"), 0, 0)
      if (target <= now) target.setDate(target.getDate() + 1)

      let nextH = target.getHours(); const nextAmPm = nextH >= 12 ? 'PM' : 'AM'
      nextH = nextH % 12 || 12; const nextM = target.getMinutes().toString().padStart(2, '0')
      nextString = `Next reminder: ${String(nextH).padStart(2, '0')}:${nextM} ${nextAmPm}`

      typeBlock = (
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
      )
    }

  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "30px 32px", marginBottom: 26, borderRadius: 22, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 24, lineHeight: 1.5 }}>{action.text}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
          <div style={{ display: "flex", gap: 16 }}>
            {typeBlock || (
              <button onClick={() => setShowReminder(true)} className="neu-btn neu-btn-primary" style={{ padding: "16px 28px", fontSize: 18 }}>
                + Add Reminder
              </button>
            )}
          </div>
          <div style={{ fontSize: 16, color: t.subtext, fontWeight: 700, fontStyle: "italic", paddingBottom: 8 }}>
            {nextString}
          </div>
        </div>
      </div>
      {showReminder && <ReminderModal action={action} isEdit={!!rem} onClose={() => setShowReminder(false)} onSaved={() => { onEditTrigger(); setShowReminder(false); }} />}
    </>
  )
}

function JournalPage() {
  const { t, setPage, setGenericJournalModal } = useApp()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState("")
  const [filterCat, setFilterCat] = useState("All")

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

  const categories = ["All", ...new Set(logs.map(l => l.action_text))]
  const filteredLogs = filterCat === "All" ? logs : logs.filter(l => l.action_text === filterCat)

  return (
    <div className="layout-container" style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 34px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
            <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 24px", fontSize: 18, marginLeft: "126px" }}>Back to Profile</button>
            <span style={{ color: t.text, fontSize: 32, fontWeight: 800 }}>MindActions</span>
            <button className="neu-btn neu-btn-primary" onClick={() => setGenericJournalModal(true)} style={{ width: 50, height: 50, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>+</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 24px 90px" }}>

        {!loading && logs.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, maxWidth: 400 }}>
            <span style={{ fontSize: 18, color: t.subtext, fontWeight: 700 }}>Filter by Action:</span>
            <select className="neu-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "12px 18px", fontSize: 16, cursor: "pointer", flex: 1, marginLeft: 16 }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {loading && <BreathingLoader />}
        {!loading && logs.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>Your journal is empty.</div>}

        <div className="action-grid">
          {!loading && filteredLogs.map(log => {
            const d = new Date(log.created_at); const dateStr = d.toLocaleDateString(); const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const isEditing = editingId === `${log.type}-${log.id}`
            return (
              <div key={`${log.type}-${log.id}`} className="neu-inset" style={{ padding: "34px 36px", marginBottom: 28, borderRadius: 24, display: 'flex', flexDirection: 'column' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: "auto", paddingTop: 24 }}>
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
    </div>
  )
}



// ─── CLOSING TIME MODAL ───────────────────────────────────────────────────────
function ClosingTimeModal({ initialTime, onClose, onSave }) {
  const { t } = useApp()
  const [hour, setHour] = useState("08")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState("PM")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialTime) {
      let [h, m] = initialTime.split(":").map(Number)
      const ap = h >= 12 ? "PM" : "AM"
      h = h % 12 || 12
      setHour(String(h).padStart(2, '0'))
      setMinute(String(m).padStart(2, '0'))
      setAmpm(ap)
    }
  }, [initialTime])

  async function save() {
    setSaving(true)
    let hh = parseInt(hour)
    if (ampm === "PM" && hh !== 12) hh += 12
    if (ampm === "AM" && hh === 12) hh = 0
    const formatted = `${String(hh).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    try {
      await axios.put("/api/profile/closing_time", { closing_time: formatted })
      onSave(formatted)
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "54px 48px", maxWidth: 620, width: "100%", maxHeight: "92vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, fontWeight: 700, color: t.text, marginBottom: 14 }}>Change Closing Time</div>
        <div style={{ fontSize: 20, color: t.subtext, marginBottom: 36, lineHeight: 1.6, paddingLeft: 18, borderLeft: `4px solid ${t.accent}` }}>Set the time for your daily check-in prompt.</div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginBottom: 40 }}>
          <ZenDial value={parseInt(hour)} min={1} max={12} onChange={v => setHour(String(v).padStart(2, '0'))} label="Hour" />
          <span style={{ fontSize: 44, fontWeight: 800, color: t.text, paddingBottom: 16 }}>:</span>
          <ZenDial value={parseInt(minute)} min={0} max={59} onChange={v => setMinute(String(v).padStart(2, '0'))} label="Minute" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginLeft: 12 }}>
            <button onClick={() => setAmpm("AM")} className={ampm === "AM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>AM</button>
            <button onClick={() => setAmpm("PM")} className={ampm === "PM" ? "neu-btn active-tab" : "neu-btn"} style={{ padding: "16px 26px", fontSize: 20 }}>PM</button>
          </div>
        </div>

        <div style={{ marginTop: 46, display: "flex", flexDirection: "column", gap: 20 }}>
          <button onClick={save} disabled={saving} className="neu-btn neu-btn-primary" style={{ padding: "22px", opacity: saving ? 0.6 : 1, fontSize: 22 }}>
            {saving ? "Saving..." : "Save Time"}
          </button>
          <button onClick={onClose} className="neu-btn" style={{ padding: "20px", fontSize: 21 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}


// ─── PHASE 3: HYBRID INSIGHTS & AI COACH ──────────────────────────────────────
// ─── PHASE 3: HYBRID INSIGHTS & AI COACH ──────────────────────────────────────
function InsightsModal({ actions = [], moods = [], user, onClose, onTriggerUpgrade }) {
  const { t } = useApp()
  const [loading, setLoading] = useState(true)
  const [habitMood, setHabitMood] = useState([])
  const [frictions, setFrictions] = useState([])
  const [wrapUp, setWrapUp] = useState([])

  // AI States
  const [aiLoading, setAiLoading] = useState(false)
  const [aiData, setAiData] = useState(null)
  const [aiError, setAiError] = useState("")

  useEffect(() => {
    let isMounted = true;
    axios.get("/api/profile/journal").then(res => {
      if (!isMounted) return;
      const journals = res.data?.journal || []

      const matrix = []
      try {
        actions.forEach(a => {
          const actionJournals = journals.filter(j => j.action_text === a.text && j.type === 'journal')
          if (actionJournals.length > 0) {
            let great = 0, steady = 0, down = 0
            actionJournals.forEach(j => {
              const jDate = new Date(j.created_at).toDateString()
              const dayMoods = moods.filter(m => new Date(m.date).toDateString() === jDate)
              if (dayMoods.length > 0) {
                const lastMood = dayMoods[dayMoods.length - 1].mood
                if (lastMood === 'Great') great++
                if (lastMood === 'Steady') steady++
                if (lastMood === 'Down') down++
              }
            })
            const total = great + steady + down
            if (total > 0) {
              let topMood = 'Steady'; let percent = 0
              if (great >= steady && great >= down) { topMood = 'Great'; percent = Math.round((great / total) * 100) }
              else if (down >= steady && down > great) { topMood = 'Down'; percent = Math.round((down / total) * 100) }
              else { topMood = 'Steady'; percent = Math.round((steady / total) * 100) }
              matrix.push({ action: a.text, topMood, percent })
            }
          }
        })
        setHabitMood(matrix)
      } catch (e) { console.error(e) }

      const frictionAlerts = []
      try {
        const missedLogs = journals.filter(j => j.type === 'missed')
        actions.forEach(a => {
          const actionMisses = missedLogs.filter(m => m.action_text === a.text)
          if (actionMisses.length >= 2) {
            const reason = actionMisses[0]?.content || "unknown reasons"
            frictionAlerts.push({ action: a.text, count: actionMisses.length, reason })
          }
        })
        setFrictions(frictionAlerts)
      } catch (e) { console.error(e) }

      const bullets = []
      try {
        const allText = journals.slice(0, 20).map(j => (j.content || "").toLowerCase()).join(" ")
        let theme = "staying consistent with your routines"
        if (allText.includes("stress") || allText.includes("work") || allText.includes("tired") || allText.includes("overwhelmed")) theme = "managing life and work pressure"
        if (allText.includes("happy") || allText.includes("family") || allText.includes("good") || allText.includes("friends")) theme = "nurturing positive social connections"
        bullets.push(`You've been primarily focused on ${theme} recently.`)

        const topAction = [...actions].sort((a, b) => (b.times_completed || 0) - (a.times_completed || 0))[0]
        if (topAction && topAction.times_completed > 0) {
          bullets.push(`"${topAction.text}" is your strongest anchor right now, keeping your momentum alive.`)
        }

        if (matrix.length > 0) {
          bullets.push(`Your mood noticeably shifts to '${matrix[0].topMood}' on days you prioritize your habits.`)
        } else {
          bullets.push(`Keep logging your moods and journal entries so we can generate deeper correlations!`)
        }
        setWrapUp(bullets)
      } catch (e) { setWrapUp(["Keep logging data to generate insights!"]) }

      setLoading(false)
    }).catch(() => { if (isMounted) setLoading(false) })

    return () => { isMounted = false }
  }, [actions, moods])

  // --- AI GENERATION & AD TRIGGER LOGIC ---
  async function handleGenerateClick() {
    // 1. Pro and Paid users bypass ads entirely
    if (user?.tier === "pro" || user?.tier === "paid") {
      executeBackendAI();
      return;
    }

    // 2. Free Users must watch an ad first!
    setAiLoading(true);
    setAiError("");

    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({
          rewarded: {
            adDismissed: () => {
              // Now we generate the report!
              executeBackendAI();
            },
            adError: () => {
              setAiLoading(false);
              setAiError("Please disable your adblocker to unlock the AI report.");
            }
          }
        });
      } else {
        setAiLoading(false);
        setAiError("Ad network is currently unavailable.");
      }
    } catch (e) {
      setAiLoading(false);
      setAiError("Failed to load video ad.");
    }
  }

  // --- PHYSICAL CALL TO PYTHON BACKEND ---
  async function executeBackendAI() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await axios.get("/api/profile/ai-coach")
      if (res.data.success && res.data.data) {
        setAiData(res.data.data)
      } else {
        setAiError(res.data.error || "Failed to generate AI report.")
      }
    } catch (e) {
      setAiError("AI service is currently unavailable.")
    } finally {
      setAiLoading(false)
    }
  }

  const moodColors = { "Great": "var(--mood-great)", "Steady": "var(--mood-steady)", "Down": "var(--mood-down)" }

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: t.text }}>Insights & Analytics</div>
          <div style={{ fontSize: 18, color: t.subtext, marginTop: 8 }}>Your personalized behavioral wrap-up</div>
        </div>

        {loading ? <Spinner /> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32, marginBottom: 32 }}>

            {/* The Summary Box (Toggles between Basic and AI) */}
            {aiData ? (
              <div className="neu-inset" style={{ padding: "28px 32px", borderRadius: 24, border: `2px solid ${t.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 1 }}>AI Coach Report</div>
                </div>

                <div style={{ fontSize: 20, color: t.text, lineHeight: 1.6, fontStyle: "italic", marginBottom: 24 }}>"{aiData.acknowledgment}"</div>

                <div style={{ fontSize: 15, fontWeight: 800, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Habit Correlation</div>
                <div style={{ fontSize: 18, color: t.text, lineHeight: 1.6, marginBottom: 24 }}>{aiData.action_insights}</div>

                <div style={{ fontSize: 15, fontWeight: 800, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Suggested Adjustments</div>
                <div style={{ fontSize: 18, color: t.text, lineHeight: 1.6, marginBottom: 24 }}>{aiData.structural_suggestions}</div>

                <div style={{ padding: "16px", background: "rgba(255,255,255,0.05)", borderRadius: 16, textAlign: "center", fontSize: 20, color: t.text, fontWeight: 700 }}>
                  {aiData.encouragement}
                </div>
              </div>
            ) : (
              <div className="neu-inset" style={{ padding: "28px 32px", borderRadius: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: t.text, textTransform: "uppercase", letterSpacing: 1 }}>Basic Summary</div>

                  {/* THIS IS THE UPDATED BUTTON */}
                  <button onClick={handleGenerateClick} disabled={aiLoading} className="neu-btn neu-btn-primary" style={{ padding: "10px 18px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    {aiLoading ? "Thinking..." : (user?.tier === "free" || !user?.tier) ? "Watch Ad to Unlock AI" : "Generate AI Report"}
                  </button>
                </div>

                {aiError && <div style={{ color: "#c94c4c", fontSize: 15, marginBottom: 16, fontWeight: 700 }}>{aiError}</div>}

                <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {wrapUp.map((point, i) => (
                    <li key={i} style={{ fontSize: 19, color: t.text, lineHeight: 1.6 }}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Habit-Mood Matrix */}
            <div className="neu-inset" style={{ padding: "28px 32px", borderRadius: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>Habit-Mood Matrix</div>
              {habitMood.length === 0 ? (
                <div style={{ color: t.subtext, fontStyle: "italic" }}>Not enough data yet. Complete more actions!</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {habitMood.map((hm, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 19, color: t.text, fontWeight: 700 }}>{hm.action}</span>
                      <span style={{ fontSize: 18, color: moodColors[hm.topMood] || t.text, fontWeight: 800 }}>
                        {hm.percent}% {hm.topMood}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Friction Prediction */}
            {frictions.length > 0 && (
              <div className="neu-inset" style={{ padding: "28px 32px", borderRadius: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#c94c4c", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Friction Predictions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {frictions.map((f, i) => (
                    <div key={i} style={{ fontSize: 18, color: t.text, lineHeight: 1.6 }}>
                      You missed <strong>"{f.action}"</strong> recently because <em>"{f.reason}"</em>. <br />
                      <span style={{ color: t.subtext, fontSize: 16, display: "inline-block", marginTop: 8 }}>Suggestion: Consider editing your reminder time.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Close Insights</button>
      </div>
    </div>
  )
}



// ─── UPGRADE SUBSCRIPTION MODAL ───────────────────────────────────────────────
function UpgradeModal({ currentTier, onClose, onUpgrade }) {
  const { t } = useApp()
  const [saving, setSaving] = useState(false)

  async function handleUpgrade(selectedTier) {
    if (currentTier === selectedTier) return
    setSaving(true)
    try {
      await axios.post("/api/profile/upgrade", { tier: selectedTier })
      onUpgrade(selectedTier)
      onClose()
    } catch (e) {
      console.error("Upgrade failed", e)
    } finally {
      setSaving(false)
    }
  }

  const tiers = [
    { id: "free", name: "Free Tier", price: "$0", desc: "For getting started.", features: ["3 Active Actions", "Basic Reminders", "7-Day Mood History"] },
    { id: "paid", name: "Paid Tier", price: "$4.99/mo", desc: "For serious habit building.", features: ["Unlimited Actions", "Friction Predictions", "30-Day Mood History", "Custom Actions"] },
    { id: "pro", name: "Pro Tier", price: "$9.99/mo", desc: "The ultimate wellness coach.", features: ["Everything in Paid", "True AI Coach Insights", "Unlimited Mood History", "Priority Support"] }
  ]

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "50px 40px", maxWidth: 900, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: t.text }}>Upgrade Your MindActions</div>
          <div style={{ fontSize: 18, color: t.subtext, marginTop: 8 }}>Unlock advanced analytics, AI coaching, and unlimited actions.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 44 }}>
          {tiers.map(tier => {
            const isCurrent = currentTier === tier.id
            return (
              <div key={tier.id} className={isCurrent ? "neu-inset" : "neu-card"} style={{ padding: "30px 24px", borderRadius: 24, display: "flex", flexDirection: "column", position: "relative", border: isCurrent ? `2px solid ${t.accent}` : "none" }}>
                {isCurrent && <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: t.accent, color: t.bg, padding: "4px 16px", borderRadius: 12, fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>Current Plan</div>}

                <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginBottom: 8 }}>{tier.name}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: t.accent, marginBottom: 12 }}>{tier.price}</div>
                <div style={{ fontSize: 16, color: t.subtext, marginBottom: 24, minHeight: 44 }}>{tier.desc}</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32, flex: 1 }}>
                  {tier.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 16, color: t.text, lineHeight: 1.4 }}>
                      <span style={{ color: t.accent, fontWeight: 800 }}>✓</span> {f}
                    </div>
                  ))}
                </div>

                <button
                  className={isCurrent ? "neu-btn-flat" : "neu-btn neu-btn-primary"}
                  onClick={() => handleUpgrade(tier.id)}
                  disabled={saving || isCurrent}
                  style={{ padding: "16px", fontSize: 18, width: "100%", marginTop: "auto", opacity: (saving || isCurrent) ? 0.6 : 1 }}
                >
                  {isCurrent ? "Active Plan" : saving ? "Processing..." : `Select ${tier.name}`}
                </button>
              </div>
            )
          })}
        </div>

        <button className="neu-btn" onClick={onClose} style={{ width: "100%", padding: "18px", fontSize: 20 }}>Maybe Later</button>
      </div>
    </div>
  )
}



// --------------------

function EditProfilePage() {
  const { t, user, setUser, setPage, logout } = useApp()

  const [username, setUsername] = useState(user?.name || "")
  const [isEditingName, setIsEditingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [aboutText, setAboutText] = useState(user?.about_me || "")
  const [showAboutModal, setShowAboutModal] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const [closingTime, setClosingTime] = useState("20:00")
  const [moodHistory, setMoodHistory] = useState([])
  const [showClosingTimeModal, setShowClosingTimeModal] = useState(false)

  const [showInsights, setShowInsights] = useState(false)

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const [liveTier, setLiveTier] = useState("free");

  // 🟢 PASTE THIS RIGHT HERE
  async function handleLinkSpotify() {
    try {
      const res = await axios.get("/api/auth/spotify/url");
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend for Spotify integration.");
    }
  }

  // Converts backend "20:00" to front-end "08:00 PM"
  function format12Hour(timeStr) {
    if (!timeStr) return "08:00 PM";
    let [h, m] = timeStr.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ap}`;
  }

  useEffect(() => {
    axios.get("/api/profile/settings").then(res => setClosingTime(res.data.closing_time || "20:00")).catch(() => { })
    axios.get("/api/profile/mood").then(res => setMoodHistory(res.data.moods || [])).catch(() => { })

  }, [])


  useEffect(() => {
    axios.get("/api/profile/me")
      .then(res => {
        if (res.data && res.data.tier) {
          setLiveTier(res.data.tier);
        }
      })
      .catch(err => console.error("Could not sync live account tier data:", err));
  }, []);



  async function saveUsername() {
    if (!username.trim()) return
    await axios.put("/api/profile/username", { username: username.trim() })
    setUser({ ...user, name: username.trim() })
    setIsEditingName(false)
  }

  async function savePassword() {
    setErrorMsg("")
    if (newPassword !== confirmPassword) { setErrorMsg("New passwords do not match."); return }
    try {
      await axios.put("/api/profile/password", { current_password: currentPassword, new_password: newPassword })
      setShowPasswordModal(false)
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
      alert("Password updated successfully!")
    } catch (e) { setErrorMsg(e.response?.data?.detail || "Password change failed.") }
  }

  async function saveAboutMe() {
    await axios.put("/api/profile/about", { about_me: aboutText.trim() })
    setUser({ ...user, about_me: aboutText.trim() })
    setShowAboutModal(false)
  }

  async function executeDeleteAccount() {
    await axios.delete("/api/profile/account", { data: { reason: deleteReason.trim() } })
    logout()
  }



  return (
    <div className="layout-container" style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 24px" }}>

        {/* ─── 🟢 HEADER: FIXED ALIGNMENT ─── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
          {/* Left Side: Theme & Back Button strictly next to each other */}
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <GlobalThemePicker />
            <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 24px", fontSize: 18, marginLeft: "128px" }}>
              Back to Profile
            </button>
          </div>

          {/* Right Side: Account Settings title (Insights removed) */}
          <span style={{ color: t.text, fontSize: 32, fontWeight: 800 }}>
            Account Settings
          </span>
        </div>

        <div className="action-grid">

          {/* ─── 🟢 IDENTITY BOX: EQUAL SPACING & DELETE ACCOUNT MOVED ─── */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32, display: "flex", flexDirection: "column", gap: 24 }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>Identity</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.subtext, fontStyle: "italic" }}>Joined: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}</div>
            </div>

            <div style={{ color: t.subtext, fontSize: 18 }}>
              Email: <span style={{ color: t.text, fontWeight: 600 }}>{user?.email}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              {isEditingName ? (
                <div style={{ display: "flex", gap: 12, flex: 1 }}>
                  <input className="neu-input" value={username} onChange={e => setUsername(e.target.value)} style={{ flex: 1, padding: "10px 16px", fontSize: 18 }} />
                  <button className="neu-btn" onClick={saveUsername} style={{ padding: "10px 20px", fontSize: 16 }}>Save</button>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 22, color: t.text, fontWeight: 600 }}>{user?.name}</span>
                  <button className="neu-btn" onClick={() => setIsEditingName(true)} style={{ padding: "10px 20px", fontSize: 16 }}>Edit Name</button>
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, color: t.subtext }}>Password parameters secure</span>
              <button className="neu-btn" onClick={() => setShowPasswordModal(true)} style={{ padding: "10px 20px", fontSize: 16 }}>Change Password</button>
            </div>

            {/* Delete Account button moved here, perfectly matching the row style */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, color: t.subtext }}>Permanently remove data</span>
              <button className="neu-btn" onClick={() => setShowDeleteModal(true)} style={{ padding: "10px 20px", fontSize: 16, color: "#c94c4c" }}>Delete Account</button>
            </div>

            <div style={{ height: 1, background: t.shadowDark, opacity: 0.1 }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                {/* Changed t.subtext to t.text so it renders in the whiteish color */}
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text, textTransform: "uppercase", letterSpacing: 1 }}>Closing the Day</div>
                <div style={{ fontSize: 14, color: t.subtext, marginTop: 4 }}>Daily check-ins trigger at this time</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 22, color: t.text, fontWeight: 600 }}>{format12Hour(closingTime)}</span>
                <button className="neu-btn" onClick={() => setShowClosingTimeModal(true)} style={{ padding: "10px 20px", fontSize: 16 }}>Change Time</button>
              </div>
            </div>
          </div>



          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Subscription Membership</div>
              {/* 🟢 FIXED: Now dynamically renders your real, live database tier! */}
              <span style={{ fontSize: 24, fontWeight: 800, color: t.text, textTransform: "capitalize" }}>{liveTier} Account</span>
            </div>
            {/* 🟢 FIXED: Button visibility now safely targets the live state condition too */}
            {(liveTier === "free" || !liveTier) && (
              <button className="neu-btn neu-btn-primary" onClick={() => setShowUpgradeModal(true)} style={{ padding: "14px 28px", fontSize: 18 }}>
                Change Tier
              </button>
            )}
          </div>
        </div>

        {/* MOOD TRENDS CARD */}
        <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24 }}>Mood Trends</div>
          <div><MoodChart moods={moodHistory} /></div>
        </div>

        {/* ABOUT ME CARD WITH NOTEBOOK LINES */}
        <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>About Me</div>
            {user?.about_me && <button className="neu-btn" onClick={() => setShowAboutModal(true)} style={{ padding: "8px 16px", fontSize: 15 }}>Edit Text</button>}
          </div>

          {!user?.about_me ? (
            <div className="notebook-paper" onClick={() => setShowAboutModal(true)} style={{ cursor: "pointer", fontSize: 19, color: t.placeholder, fontStyle: "italic", padding: "12px 16px" }}>
              "Write about yourself, how you feel, the pressures you're under from work or life, your habits, preferences, anything that might give us a better understanding of you."
            </div>
          ) : (
            <div className="notebook-paper" style={{ fontSize: 21, color: t.text, whiteSpace: "pre-wrap", padding: "12px 16px" }}>
              {user?.about_me}
            </div>
          )}
        </div>


      </div>

      {showPasswordModal && (
        <div className="glass-modal">
          <div className="neu-card" style={{ padding: 40, maxWidth: 440, width: "100%" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: t.text, marginBottom: 18 }}>Change Password</div>
            {errorMsg && <p style={{ color: "#c94c4c", fontSize: 16, marginBottom: 14 }}>{errorMsg}</p>}
            <label className="input-label">Current Password</label>
            <input type="password" className="neu-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: 14, marginBottom: 14 }} />
            <label className="input-label">New Password</label>
            <input type="password" className="neu-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: "100%", padding: 14, marginBottom: 14 }} />
            <label className="input-label">Re-enter New Password</label>
            <input type="password" className="neu-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: 14, marginBottom: 28 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button className="neu-btn neu-btn-primary" onClick={savePassword} style={{ padding: 14, fontSize: 18 }}>Update Password</button>
              <button className="neu-btn" onClick={() => { setShowPasswordModal(false); setErrorMsg(""); }} style={{ padding: 14, fontSize: 18 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="glass-modal">
          <div className="neu-card" style={{ padding: 40, maxWidth: 760, width: "100%" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: t.text, marginBottom: 14 }}>About Me</div>
            <textarea className="neu-input notebook-paper" value={aboutText} onChange={e => setAboutText(e.target.value)} rows={8} placeholder="What's on your mind?" style={{ width: "100%", marginBottom: 26, resize: "vertical" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button className="neu-btn neu-btn-primary" onClick={saveAboutMe} style={{ padding: 14, fontSize: 18 }}>Save Summary</button>
              <button className="neu-btn" onClick={() => setShowAboutModal(false)} style={{ padding: 14, fontSize: 18 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LINKED APPS / INTEGRATIONS ─── */}
      {/* ─── LINKED APPS ─── */}
      <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Linked Apps</div>

        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* SPOTIFY ROW */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: `1px solid ${t.shadowDark}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="neu-card" style={{ width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎵</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Spotify</div>
                <div style={{ fontSize: 14, color: t.subtext }}>Automate music with your custom actions</div>
              </div>
            </div>

            {(liveTier === "free" || !liveTier) ? (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>🔒 Premium Feature</span>
                <div style={{ fontSize: 14, color: t.accent, fontWeight: 600, cursor: "pointer", marginTop: 4 }} onClick={() => setShowUpgradeModal(true)}>Upgrade to unlock</div>
              </div>
            ) : (
              <button className="neu-btn" onClick={handleLinkSpotify} style={{ padding: "10px 20px", fontSize: 16, color: "#1DB954", fontWeight: 800 }}>
                Link Account
              </button>
            )}
          </div>

          {/* GOOGLE CALENDAR ROW */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="neu-card" style={{ width: 50, height: 50, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📅</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Google Calendar</div>
                <div style={{ fontSize: 14, color: t.subtext }}>Sync reminders and fuel AI schedule analysis</div>
              </div>
            </div>

            {(liveTier === "free" || !liveTier) ? (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>🔒 Premium Feature</span>
                <div style={{ fontSize: 14, color: t.accent, fontWeight: 600, cursor: "pointer", marginTop: 4 }} onClick={() => setShowUpgradeModal(true)}>Upgrade to unlock</div>
              </div>
            ) : (
              <button className="neu-btn" onClick={async () => {
                try {
                  const res = await axios.get("/api/gcal/link");
                  window.location.href = res.data.url;
                } catch (e) {
                  alert(e.response?.data?.detail || "Failed to generate Google Link. Check your .env file!");
                }
              }} style={{ padding: "10px 20px", fontSize: 16, color: "#4285F4", fontWeight: 800 }}>
                Link Calendar
              </button>
            )}
          </div>

        </div>
      </div>{(liveTier === "free" || !liveTier) ? (
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>🔒 Premium Feature</span>
          <div style={{ fontSize: 14, color: t.accent, fontWeight: 600, cursor: "pointer", marginTop: 4 }} onClick={() => setShowUpgradeModal(true)}>Upgrade to unlock</div>
        </div>
      ) : (
        <button className="neu-btn" onClick={async () => {
          try {
            const res = await axios.get("/api/gcal/link");
            window.location.href = res.data.url;
          } catch (e) {
            alert(e.response?.data?.detail || "Failed to generate Google Link. Check your .env file!");
          }
        }}>

        </button>
      )}

      {showDeleteModal && (
        <div className="glass-modal">
          <div className="neu-card" style={{ padding: 40, maxWidth: 480, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#c94c4c", marginBottom: 12 }}>Are you sure?</div>
            <div style={{ fontSize: 18, color: t.subtext, marginBottom: 24, lineHeight: 1.6 }}>Can you be kind enough to tell us why or how we can get better?</div>
            <textarea className="neu-input" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} rows={3} placeholder="Tell us how we can improve..." style={{ width: "100%", padding: 16, fontSize: 17, marginBottom: 32, resize: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button className="neu-btn" onClick={executeDeleteAccount} style={{ padding: 16, fontSize: 18, backgroundColor: "#c94c4c", color: "#fff" }}>Permanently Delete Account</button>
              <button className="neu-btn" onClick={() => setShowDeleteModal(false)} style={{ padding: 14, fontSize: 18 }}>Cancel</button>
            </div>
          </div>
        </div>
      )
      }

      {
        showUpgradeModal && (
          <UpgradeModal
            currentTier={user?.tier || "free"}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={(newTier) => setUser({ ...user, tier: newTier })}
          />
        )
      }

    </div >
  )
}


export default function App() {
  const [themeName, setThemeNameState] = useState(() => localStorage.getItem("theme") || "calm")
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")) } catch { return null } })
  const [token, setToken] = useState(() => localStorage.getItem("token") || null)
  const [page, setPage] = useState(null)

  const [activeNotification, setActiveNotification] = useState(null)
  const [completionFlow, setCompletionFlow] = useState(null)
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

      // 🟢 NEW: Play audio when notification is opened!
      if (action.is_audio) {
        const audioId = action.action_id || action.id;
        new Audio(`/api/audio/${audioId}`).play().catch(e => console.error("Audio block:", e));
      }

      // 🟢 NEW: Open Video Modal on Notification Click
      if (action.is_video && action.embed_url) {
        const finalUrl = `${action.embed_url}?start=${action.video_start_time || 0}&autoplay=1`;
        setActiveVideo({ url: finalUrl, title: action.video_title });
      }

      if (action.spotify_uri) {
        axios.post("/api/spotify/play-reminder", { uri: action.spotify_uri })
          .catch(err => console.error("Spotify reminder play failed:", err));
      }
      if (repeatMs) scheduleNotification(action, repeatMs, repeatMs)
    }, delayMs)
  }

  function cancelNotification(actionId) {
    if (window.activeTimers && window.activeTimers[actionId]) {
      clearTimeout(window.activeTimers[actionId])
      delete window.activeTimers[actionId]
    }
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))
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
            scheduleNotification({ id: rem.action_id, text: rem.text, streak: rem.streak || 0, spotify_uri: rem.spotify_uri }, target - now, repeatMs)
          }
        })
      }).catch(() => { })
    }
    if (window.location.pathname.startsWith("/auth/callback")) { setPage("callback"); return }
    setPage(user && token ? "profile" : "login")
    return () => clearInterval(shadowInterval)
  }, [token])

  const ctx = { t, themeName, setThemeName, user, setUser, token, setToken, logout: () => { localStorage.clear(); setToken(null); setUser(null); setupAxios(null); setPage("login"); }, scheduleNotification, cancelNotification, setCompletionFlow, setPage, searchQuery, setSearchQuery, activeCat, setActiveCat, goToCategory: (c) => { setSearchQuery(""); setActiveCat(c); setPage("search") }, setViewJournalIn, setGenericJournalModal, setActiveVideo, setShareModal }

  function render() {
    if (page === "landing" || page === null) return <PublicLandingPage onNavigate={setPage} />
    if (page === "callback") return <AuthCallback onNavigate={setPage} />
    if (!user || !token) return <LoginPage onNavigate={setPage} />
    if (page === "profile") return <ProfilePage />
    if (page === "journal") return <JournalPage />
    if (page === "edit-profile") return <EditProfilePage />
    return <SearchPage />
  }

  return (
    <AppCtx.Provider value={ctx}>

      <div className={`app-wrapper theme-${themeName}`} style={{ '--bg': t.bg, '--shadow-d': t.shadowDark, '--shadow-l': t.shadowLight, '--accent': t.accent, '--accent-text': t.accentText, '--text': t.text, '--subtext': t.subtext, '--placeholder': t.placeholder, '--streak-on': t.streakOn, '--streak-off': t.streakOff, '--bg-rgb': t.bgRGB, '--selection-bg': t.selectionBg, minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700;800&family=Autumn+Brush&display=swap');
          :root { --sh-x: 6px; --sh-y: 6px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes breathe { 0%, 100% { opacity: 0.5; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-track { background: var(--bg); box-shadow: inset 3px 3px 6px var(--shadow-d); }
          ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 8px; border: 2px solid var(--bg); }
          ::-webkit-scrollbar-thumb:hover { background: var(--text); }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Autumn Brush', 'Caveat', cursive; background: var(--bg); margin: 0; line-height: 1.8; letter-spacing: 0.5px; }
          input, select, button, textarea { font-family: 'Autumn Brush', 'Caveat', cursive; }
          ::selection { background: var(--selection-bg); color: var(--accent-text); }
          .search-input::placeholder, .neu-input::placeholder { color: var(--placeholder); }
          .skeleton-breathe { animation: breathe 4s ease-in-out infinite; }
          .glass-modal { position: fixed; inset: 0; background: radial-gradient(circle, rgba(var(--bg-rgb), 0.5) 0%, rgba(var(--bg-rgb), 0.9) 100%); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); display: flex; align-items: center; justify-content: center; z-index: 5000; padding: 20px; }
          .glass-modal .neu-card { background: rgba(var(--bg-rgb), 0.35); box-shadow: 0 24px 48px rgba(0,0,0,0.15), inset 2px 2px 6px rgba(255,255,255,0.1); border: 1px solid rgba(255, 255, 255, 0.15); }
          .neu-card { background: rgba(var(--bg-rgb), 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: 12px 12px 24px var(--shadow-d), -12px -12px 24px var(--shadow-l); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); }
          .neu-inset { background: rgba(var(--bg-rgb), 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: inset 6px 6px 12px var(--shadow-d), inset -6px -6px 12px var(--shadow-l); border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.03); }
          .neu-input { background: rgba(var(--bg-rgb), 0.9); box-shadow: inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l); border: none; color: var(--text); border-radius: 16px; outline: none; }
          .neu-input:focus { box-shadow: inset 6px 6px 14px var(--shadow-d), inset -6px -6px 14px var(--shadow-l); }
          .neu-btn { background: rgba(var(--bg-rgb), 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l); border: 1px solid rgba(255, 255, 255, 0.05); color: var(--text); border-radius: 24px; font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          .neu-btn:active { transform: scale(0.96); box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); }
          .neu-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
          .neu-btn-flat { background: transparent; border: none; color: var(--subtext); cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
          .active-tab { box-shadow: inset 4px 4px 10px var(--shadow-d), inset -4px -4px 10px var(--shadow-l); color: var(--accent); }
          .neu-btn-primary { color: var(--accent); }
          .notebook-paper { background-color: transparent !important; background-image: repeating-linear-gradient(transparent, transparent 31px, var(--shadow-d) 31px, var(--shadow-d) 32px) !important; line-height: 32px !important; padding: 8px 16px !important; font-size: 21px !important; }
          .theme-light .neu-card, .theme-light .neu-inset, .theme-light .neu-btn { background: rgba(var(--bg-rgb), 0.35); border: 1px solid rgba(255, 255, 255, 0.5); }
          .theme-light .neu-btn:active { background: rgba(var(--bg-rgb), 0.2); }
          .input-label { font-size: 18px; font-weight: 700; color: var(--subtext); display: block; margin-bottom: 12px; margin-top: 20px; }
          .layout-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 16px; transition: max-width 0.3s ease; }
          .action-grid { display: flex; flex-direction: column; gap: 32px; width: 100%; }
          @keyframes voice-wave {
            0%, 100% { transform: scaleY(0.5); opacity: 0.7; }
            50% { transform: scaleY(1.5); opacity: 1; }
          }
          .wave-bar {
            width: 8px;
            height: 24px;
            background: var(--accent);
            border-radius: 4px;
            animation: voice-wave 1s infinite ease-in-out;
          }
          .wave-bar:nth-child(1) { animation-delay: 0.0s; }
          .wave-bar:nth-child(2) { animation-delay: 0.2s; }
          .wave-bar:nth-child(3) { animation-delay: 0.4s; }
          .wave-bar:nth-child(4) { animation-delay: 0.2s; }
          .wave-bar:nth-child(5) { animation-delay: 0.0s; }
        `}</style>
        {render()}
        <GlobalThemePicker />
        {activeVideo && <VideoModal embedUrl={activeVideo.url} title={activeVideo.title} onClose={() => setActiveVideo(null)} />}

        {/* Daily Done-Log It Notification: ONLY triggers difficulty intent ('log_only') */}
        {activeNotification && (
          <ActiveNotificationModal action={activeNotification} onDone={a => { setActiveNotification(null); setCompletionFlow({ action: a, step: 'difficulty', intent: 'log_only' }); }} onSnooze={a => { setActiveNotification(null); scheduleNotification(a, 15 * 60 * 1000, null) }} />
        )}

        {/* ─── GLOBAL CASCADE ENGINE ─── */}
        {completionFlow?.step === 'difficulty' && <DifficultyPopup actionId={completionFlow.action.id} onLogged={() => {
          if (completionFlow.intent === 'log_only') {
            setCompletionFlow(null) // End cascade if it's just a daily log
          } else {
            setCompletionFlow({ ...completionFlow, step: 'share' }) // Continue cascade for Action Complete
          }
        }} />}
        {completionFlow?.step === 'share' && <ShareModal action={completionFlow.action} context="completed" onClose={() => setCompletionFlow({ ...completionFlow, step: 'journal' })} onFinish={() => setCompletionFlow({ ...completionFlow, step: 'journal' })} />}
        {completionFlow?.step === 'journal' && <PostCompleteJournalModal action={completionFlow.action} onFinish={() => setCompletionFlow({ ...completionFlow, step: 'review' })} />}
        {completionFlow?.step === 'review' && <PostCompleteReviewModal action={completionFlow.action} onFinish={() => setCompletionFlow(null)} />}

        {viewJournalIn && <JournalInModal action={viewJournalIn} onClose={() => setViewJournalIn(null)} onSaved={() => window.dispatchEvent(new Event("refresh-journal"))} />}
        {genericJournalModal && <JournalInModal action={null} onClose={() => setGenericJournalModal(false)} onSaved={() => window.dispatchEvent(new Event("refresh-journal"))} />}
        {shareModal && <ShareModal action={shareModal.action} context={shareModal.context} onClose={() => setShareModal(null)} onFinish={() => setShareModal(null)} />}
      </div>
    </AppCtx.Provider>
  )
}

// ─── VOICE RECORDER MODAL ────────────────────────────────────────────────────
function VoiceRecorderModal({ onClose, onProcessed }) {
  const { t } = useApp();
  const [processing, setProcessing] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    startRecording();
    return () => {
      if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = processAudio;
      mediaRecorder.current.start();
    } catch (e) {
      alert("Microphone access denied. Please allow microphone permissions in your browser.");
      onClose();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setProcessing(true);
    }
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64data = reader.result.split(',')[1];
      try {
        const res = await axios.post('/api/profile/voice-journal', {
          audio_b64: base64data,
          mime_type: 'audio/webm'
        });

        if (res.data.success) {
          onProcessed(res.data.transcription, res.data.ai_reply);
        } else {
          alert(res.data.error); // Warns free users they need to upgrade
        }
      } catch (e) {
        alert("Error connecting to Voice AI.");
      }
      onClose();
    };
  };

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "40px", textAlign: "center", maxWidth: 360, width: "100%" }}>

        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 30 }}>
          {processing ? "Analyzing Audio..." : "Listening..."}
        </div>

        {/* Animated Audio Waves */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, height: 60, alignItems: 'center', marginBottom: 40 }}>
          {processing ? (
            <Spinner />
          ) : (
            <>
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
            </>
          )}
        </div>

        {!processing && (
          <button onClick={stopRecording} className="neu-btn neu-btn-primary" style={{ padding: "16px 32px", fontSize: 20, width: "100%" }}>
            Done
          </button>
        )}

        {!processing && (
          <button onClick={onClose} className="neu-btn-flat" style={{ marginTop: 20, width: "100%", color: t.subtext }}>Cancel</button>
        )}
      </div>
    </div>
  );
}