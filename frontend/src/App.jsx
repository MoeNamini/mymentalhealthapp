// App.jsx — Phase 2 Polished
import { useState, useEffect, createContext, useContext, useRef } from "react"
import axios from "axios"
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';


// 🟢 Improved Localhost / Dev Detection
const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'https://api.mindactions.app'; // (Or https://mindactions-api.onrender.com)

// ─── THEMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  calm: {
    bg: "#ADD8E6", shadowDark: "#558c9eff", shadowLight: "#caeaf4ff", text: "#1c3843ff", subtext: "#005c9a97", accent: "#898989ff",
    accentText: "#686868ff", tag: "#417dffff", streakOn: "#1a717eff", streakOff: "#c5cfca", placeholder: "rgba(186, 139, 217, 1)", bgRGB: "116, 90, 77", selectionBg: "rgba(208, 212, 208, 0.35)"
  },
  light: {
    bg: "#e0e5ec", shadowDark: "#c4c1bc", shadowLight: "#ffffff", text: "#403d39", subtext: "#7a7771", accent: "#728c82",
    accentText: "#ffffff", tag: "#d8d5cf", streakOn: "#728c82", streakOff: "#d1cec8", placeholder: "rgba(64, 61, 57, 0.45)", bgRGB: "224, 229, 236", selectionBg: "rgba(114, 140, 130, 0.3)"
  },
  dark: {
    bg: "#0e0e0eff",
    shadowDark: "#000000ff", // 🟢 Gently darker than bg (Creates natural depth)
    shadowLight: "#2b2b2bff", // 🟢 Gently lighter than bg (Creates natural highlights)
    text: "#dcdedf",
    subtext: "#8b8f94",
    accent: "#cd8b55",
    accentText: "#1a1b1d",
    tag: "#222426",
    streakOn: "#c49a78",
    streakOff: "#3F3F44", // Matched to shadowDark to blend in
    placeholder: "rgba(220, 222, 223, 0.45)", // Lightened so it's readable on dark gray
    bgRGB: "20, 20, 20",
    selectionBg: "rgba(205, 139, 85, 0.3)"
  },
}



// 🟢 Opaque InfoTooltip with Auto-Close on Outside Click
function InfoTooltip({ text, theme }) {
  const [show, setShow] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!show) return;

    const handleClickOutside = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  return (
    <span ref={tooltipRef} style={{ position: "relative", marginLeft: 8, display: "inline-flex", alignItems: "center" }}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShow((prev) => !prev);
        }}
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: `1.5px solid ${theme.subtext}`,
          color: theme.subtext,
          fontSize: 11,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          fontWeight: "bold",
          fontStyle: "italic",
          userSelect: "none"
        }}
      >
        i
      </div>
      {show && (
        <div
          style={{
            position: "absolute",
            top: 26,
            left: 0,
            width: 250,
            padding: "12px 16px",
            fontSize: 13,
            lineHeight: "1.5",
            zIndex: 9999,
            borderRadius: 14,
            textAlign: "left",
            color: theme.text,
            fontWeight: 500,
            background: "var(--bg)", /* 🟢 100% Solid background to block bleed-through */
            boxShadow: "0 12px 28px rgba(0,0,0,0.85), 0 0 0 1px var(--accent)", /* Crisp outline & contrast shadow */
            backdropFilter: "none",
            WebkitBackdropFilter: "none"
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}


// 🟢 Monetag Direct Link Runner with Anti-Bypass Timer Guard
const playRewardedAd = ({ onWatched, onError, onClosed }) => {
  // ⚠️ Paste your exact Monetag Direct Link URL here
  const directLink = "https://omg10.com/4/11644322";

  const openTime = Date.now();
  const adWindow = window.open(directLink, "_blank");

  // 1. Blocked by AdBlocker or Pop-up Blocker
  if (!adWindow || adWindow.closed || typeof adWindow.closed === "undefined") {
    alert("Ad window was blocked. Please allow pop-ups or disable your ad-blocker to unlock features.");
    onError?.("Blocked by AdBlocker");
    return;
  }

  // 2. Track when the user returns to your app tab
  const handleTabReturn = () => {
    window.removeEventListener("focus", handleTabReturn);

    // Calculate seconds spent away on the ad page
    const secondsSpent = (Date.now() - openTime) / 1000;

    if (secondsSpent >= 10) {
      // Spent 10+ seconds on ad -> Grant reward
      onWatched?.();
    } else {
      // Closed or returned too fast -> Refuse reward
      alert("You returned too quickly! Please view the ad page for at least 10 seconds to unlock your AI report.");
      onClosed?.();
    }
  };

  // Attach listener for when user switches back to your app
  window.addEventListener("focus", handleTabReturn);
};

// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. THEME PICKER ─────────────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
// ─── 1. GLOBAL THEME PICKER ──────────────────────────────────────────────────
export function GlobalThemePicker() {
  // 🟢 FIXED: Grab customThemeObj from context so we know if a theme exists!
  const { t, theme, themeName, setTheme, setThemeName, user, setShowThemeGenerator, customThemeObj } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const activeTheme = theme || themeName || 'dark';
  const displayText = activeTheme === 'custom' ? 'Customized' : activeTheme.charAt(0).toUpperCase() + activeTheme.slice(1);

  if (!activeTheme) return null;

  // 🟢 ACTION 1: Apply the saved theme instantly without opening the modal
  function applyCustomTheme(e) {
    e.preventDefault();
    setIsOpen(false);
    if (typeof setTheme === 'function') setTheme('custom');
    if (typeof setThemeName === 'function') setThemeName('custom');
  }

  // 🟢 ACTION 2: Open the modal to generate a brand new theme
  function openGenerator(e) {
    e.preventDefault();
    setIsOpen(false);
    setShowThemeGenerator(true);
  }

  return (
    <div style={{
      position: 'absolute',
      top: '46px',
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
          padding: "14px 24px", fontSize: "18px", borderRadius: "16px",
          color: t.text, minWidth: "110px", fontWeight: 700, textAlign: "center", cursor: "pointer"
        }}
      >
        {displayText}
      </button>

      {/* Vertical Rectangle Dropdown List */}
      {isOpen && (
        <div
          className="neu-card"
          style={{
            display: 'flex', flexDirection: 'column', gap: "12px", marginTop: "12px",
            padding: "18px 14px", borderRadius: "24px", width: "160px", alignItems: "stretch"
          }}
        >
          {/* Default Themes */}
          {['light', 'dark', 'calm'].map((th) => {
            const isActive = activeTheme === th;
            return (
              <button
                key={th}
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof setTheme === 'function') setTheme(th);
                  if (typeof setThemeName === 'function') setThemeName(th);
                  setIsOpen(false);
                }}
                className={isActive ? "neu-inset active-tab" : "neu-btn"}
                style={{
                  padding: "12px 14px", fontSize: "16px", borderRadius: "14px",
                  color: isActive ? t.accent : t.text, fontWeight: 700, textAlign: "center", cursor: "pointer",
                  boxShadow: isActive ? "inset 4px 4px 8px var(--shadow-d), inset -4px -4px 8px var(--shadow-l)" : "6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l)",
                  border: "none", transform: "none"
                }}
              >
                {th.charAt(0).toUpperCase() + th.slice(1)}
              </button>
            );
          })}

          <div style={{ height: 1, backgroundColor: `${t.shadowDark}40`, margin: "4px 0" }} />

          {/* 🟢 CONDITIONAL RENDER: Check if they already have a custom theme! */}
          {customThemeObj ? (
            <>
              {/* Applies existing theme instantly */}
              <button
                onClick={applyCustomTheme}
                className={activeTheme === 'custom' ? "neu-inset active-tab" : "neu-btn"}
                style={{
                  padding: "12px 14px", fontSize: "16px", borderRadius: "14px",
                  color: activeTheme === 'custom' ? t.accent : t.text, fontWeight: 800, textAlign: "center", cursor: "pointer"
                }}
              >
                Customized
              </button>

              {/* Opens Modal to Overwrite */}
              <button
                onClick={openGenerator}
                className="neu-btn"
                style={{
                  padding: "8px 10px", fontSize: "13px", borderRadius: "10px",
                  color: t.subtext, fontWeight: 700, textAlign: "center", cursor: "pointer", border: `1px dashed ${t.subtext}80`
                }}
              >
                New AI Theme
              </button>
            </>
          ) : (
            /* If no theme exists, just show the Create button */
            <button
              onClick={openGenerator}
              className="neu-btn"
              style={{
                padding: "12px 14px", fontSize: "16px", borderRadius: "14px",
                color: t.text, fontWeight: 800, textAlign: "center", cursor: "pointer", border: `1.5px dashed ${t.accent}`
              }}
            >
              Create AI Theme
            </button>
          )}

        </div>
      )}
    </div>
  );
}

// 🟢 GLOBAL PADDLE PRICE MAPPING (Accessible by all components in App.jsx)
const PADDLE_PRICE_IDS = {
  paid_monthly: "pri_01kxdctz94jp0951mjzpmqkazk",
  paid_annual: "pri_01kxdcze96ywenh928kstw6cs8",
  pro_monthly: "pri_01kxddar7w3wabd8h7mcg4kzt5",
  pro_annual: "pri_01kxddbqbfqrgm5gbb0hyye1bx",
};

// Fallback safety to prevent scope errors
if (typeof window !== "undefined") {
  window.PADDLE_PRICE_IDS = PADDLE_PRICE_IDS;
}



// ─── 2. PUBLIC LANDING PAGE (FOR GOOGLE ADSENSE) ─────────────────────────────
// ─── PUBLIC LANDING PAGE ─────────────────────────────────────────────────────
function PublicLandingPage({ onNavigate }) {
  const { t } = useApp();

  const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://mindactions-api.onrender.com';

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      {/* 🟢 Pulsing Glow Keyframes */}
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 12px ${t.accent}60, 0 0 24px ${t.accent}25, inset 0 0 8px ${t.accent}20;
            border-color: ${t.accent};
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 24px ${t.accent}, 0 0 48px ${t.accent}80, inset 0 0 16px ${t.accent}60;
            border-color: #ffffff;
            transform: scale(1.015);
          }
          100% {
            box-shadow: 0 0 12px ${t.accent}60, 0 0 24px ${t.accent}25, inset 0 0 8px ${t.accent}20;
            border-color: ${t.accent};
            transform: scale(1);
          }
        }
        .glowing-cta {
          animation: pulseGlow 2.8s infinite ease-in-out;
        }
        .glowing-cta:hover {
          animation-play-state: paused;
          box-shadow: 0 0 30px ${t.accent}, 0 0 60px ${t.accent}90, inset 0 0 20px ${t.accent};
        }
      `}</style>

      <div
        className="neu-inset"
        style={{
          padding: "54px 44px",
          width: "100%",
          maxWidth: 480,
          borderRadius: 28,
          textAlign: "center"
        }}
      >
        <div style={{ fontSize: 46, fontWeight: 900, color: t.text, letterSpacing: "-0.5px", marginBottom: 10 }}>
          MindActions
        </div>
        <div style={{ fontSize: 18, color: t.subtext, lineHeight: 1.5, marginBottom: 38, maxWidth: 390, margin: "0 auto 38px" }}>
          Build actionable daily routines, track emotional shifts, and master behavioral consistency.
        </div>

        {/* 🟢 UPDATED CTA TEXT WITH ANIMATED GLOW */}
        <button
          onClick={() => onNavigate("guest-search")}
          className="neu-btn glowing-cta"
          style={{
            width: "100%",
            padding: "20px 24px",
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            color: t.accent,
            border: `2px solid ${t.accent}`,
            marginBottom: 28,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          EXPLORE ACTIONS OR CREATE ONE FIRST
        </button>

        <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 14 }}>
          <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.25 }} />
          <span style={{ fontSize: 12, color: t.subtext, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            or access account
          </span>
          <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.25 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button
            onClick={() => window.location.href = `${backendUrl}/auth/google`}
            className="neu-btn"
            style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700 }}
          >
            Continue with Google
          </button>

          <button
            onClick={() => onNavigate("signup")}
            className="neu-btn"
            style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: 700 }}
          >
            Sign up with Email
          </button>

          <p style={{ fontSize: 12, color: t.subtext, textAlign: "center", lineHeight: 1.5, marginTop: 14, marginBottom: 12, padding: "0 8px" }}>
            By continuing with Google or signing up, you agree to our{" "}
            <a
              href="https://mindactions.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: t.accent, fontWeight: 700, textDecoration: "underline" }}
            >
              Terms of Use
            </a>{" "}
            and acknowledge our{" "}
            <a
              href="https://mindactions.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: t.accent, fontWeight: 700, textDecoration: "underline" }}
            >
              Privacy Policy
            </a>.
          </p>

          <div style={{ fontSize: 15, color: t.subtext }}>
            Already have an account?{" "}
            <span
              onClick={() => onNavigate("login")}
              style={{ color: t.accent, fontWeight: 800, cursor: "pointer", textDecoration: "underline", marginLeft: 4 }}
            >
              Log in
            </span>
          </div>

          {/* 🟢 TUTORIAL & INFORMATIONAL FOOTER LINK */}
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 15, color: t.subtext }}>
            For more information and tutorials visit{" "}
            <a
              href="https://mindactions.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: t.accent, fontWeight: 700, textDecoration: "none" }}
            >
              mindactions.app
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── INSIGHTS PAGE ──────────────────────────────────────────────────────────
function InsightsPage() {
  // 🟢 1. Destructure `user` from your app context
  const { t, setPage, moods, actions, streaks, user } = useApp();
  const [moodDays, setMoodDays] = useState(30);
  const [actionFilter, setActionFilter] = useState("All");

  // 🟢 NEW: Tab State Tracker (Defaults to AI Analysis History)
  const [insightsTab, setInsightsTab] = useState("AI Analysis History");

  const [aiReports, setAiReports] = useState([]);
  const [cbtTraps, setCbtTraps] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const fetchReports = (currentOffset = 0) => {
    setLoadingReports(true);
    axios.get(`/api/profile/ai-reports?offset=${currentOffset}&limit=5`)
      .then(res => {
        if (currentOffset === 0) setAiReports(res.data.reports);
        else setAiReports(prev => [...prev, ...res.data.reports]);
      })
      .finally(() => setLoadingReports(false));
  };

  const fetchCbtTraps = () => {
    axios.get("/api/profile/cbt-distortions")
      .then(res => { if (res.data.success) setCbtTraps(res.data.distortions); });
  };

  useEffect(() => {
    fetchReports(0);
    fetchCbtTraps();
  }, []);

  const generateAIReport = async (adWatched = false) => {
    // 🟢 Lock immediately to block rapid double-clicks
    if (isGeneratingRef.current) return;
    // 🛡️ 2. PRIVACY GUARD: Block execution FIRST if consent is revoked
    if (!user?.accepted_ai_processing) {
      alert("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
      return;
    }

    isGeneratingRef.current = true;
    setIsGenerating(true);

    // 🟢 Strict Boolean Check: Prevents React Click Events from triggering ad_watched=true!
    const isAdWatched = adWatched === true;

    try {
      const endpoint = isAdWatched ? "/api/profile/ai-coach?ad_watched=true" : "/api/profile/ai-coach";
      const res = await axios.get(endpoint);

      if (res.data.success) {
        setOffset(0);
        fetchReports(0);
        fetchCbtTraps();
        setInsightsTab("AI Analysis History");
      } else if (res.data.limit_reached) {
        // 🟢 Limit hit: Trigger the Rewarded Video Ad player!
        playRewardedAd({
          onWatched: () => {
            // Once ad finishes, rerun with boolean true
            generateAIReport(true);
          },
          onError: (errStr) => {
            alert(errStr || "Failed to load video ad.");
          },
          onClosed: () => {
            alert("Watch the complete video ad to unlock your AI report.");
          }
        });
      } else {
        alert(res.data.error || "Failed to generate report.");
      }
    } catch (e) {
      // 🟢 3. Extract exact 403 detail string from Python backend
      const detailMsg = e.response?.data?.detail;
      alert(detailMsg || "AI service is currently unavailable.");
    } finally {
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  // -- MOOD PIE CHART MATH --
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - moodDays);
  const filteredMoods = moods.filter(m => new Date(m.date) >= cutoff);
  const moodCounts = { great: 0, chill: 0, down: 0 };
  filteredMoods.forEach(m => {
    if (m.mood === "Great") moodCounts.great++;
    else if (m.mood === "Steady") moodCounts.chill++;
    else moodCounts.down++;
  });
  const totalMoods = filteredMoods.length || 1;

  // -- ACTION PIE CHART MATH --
  let totalDone = 0; let totalMissed = 0;
  if (actionFilter === "All") {
    actions.forEach(a => {
      const sData = streaks[a.id];
      if (sData && sData.days_30) {
        sData.days_30.forEach(d => d.completed ? totalDone++ : totalMissed++);
      }
    });
  } else {
    const sData = streaks[actionFilter];
    if (sData && sData.days_30) {
      sData.days_30.forEach(d => d.completed ? totalDone++ : totalMissed++);
    }
  }
  const totalActions = (totalDone + totalMissed) || 1;

  // -- HABIT-MOOD SYNERGY MATRIX MATH --
  const computeActionMoodSynergy = (actionId) => {
    const sData = streaks[actionId];
    if (!sData || !sData.days_30 || sData.days_30.length === 0) return null;

    const moodWeights = { "Great": 5, "Steady": 3, "Down": 1 };
    let doneSum = 0; let doneCount = 0;
    let missedSum = 0; let missedCount = 0;

    sData.days_30.forEach(day => {
      const targetDateStr = new Date(day.date).toDateString();
      const match = moods.find(m => new Date(m.date).toDateString() === targetDateStr);

      if (match && moodWeights[match.mood]) {
        const score = moodWeights[match.mood];
        if (day.completed) {
          doneSum += score; doneCount++;
        } else {
          missedSum += score; missedCount++;
        }
      }
    });

    return {
      doneAvg: doneCount > 0 ? (doneSum / doneCount).toFixed(1) : null,
      missedAvg: missedCount > 0 ? (missedSum / missedCount).toFixed(1) : null
    };
  };

  // -- CSS PIE GENERATOR --
  const buildConic = (data) => {
    if (data.every(d => d.val === 0)) return t.selectionBg;
    let currentAngle = 0;
    return `conic-gradient(${data.map(d => {
      const pct = (d.val / d.total) * 100;
      const str = `${d.color} ${currentAngle}% ${currentAngle + pct}%`;
      currentAngle += pct;
      return str;
    }).join(", ")})`;
  };

  const getDonutColors = () => [t.accent, t.text, "#c94c4c", t.subtext, t.shadowDark];
  const basicSummary = `Over the last ${moodDays} days, you logged your mood ${filteredMoods.length} times. ${moodCounts.great > moodCounts.down ? "Overall, you've been leaning positive! " : "It looks like a challenging stretch. "} You've maintained an action completion rate of ${Math.round((totalDone / totalActions) * 100)}%.`;
  const maxTrapCount = cbtTraps.length > 0 ? Math.max(...cbtTraps.map(tr => tr.count)) : 1;

  return (
    <div className="layout-container" style={{ minHeight: "100vh", padding: "46px 24px 90px", position: "relative" }}>

      {/* HEADER ROW */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
        <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 24px", fontSize: 18, marginLeft: "126px" }}>
          Back to Profile
        </button>
        <div style={{ fontSize: 32, fontWeight: 800, color: t.text, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          Deep Insights
        </div>
        <button className="neu-btn neu-btn-primary" onClick={generateAIReport} disabled={isGenerating} style={{ padding: "14px 24px", fontSize: 18 }}>
          {isGenerating ? "Analyzing Data..." : "✨ Generate AI Analysis"}
        </button>
      </div>

      {/* TOP PIE CHARTS */}
      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: 32 }}>
        <div className="neu-card" style={{ flex: "1 1 300px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", borderRadius: "24px" }}>
          <select className="neu-input" value={moodDays} onChange={e => setMoodDays(Number(e.target.value))} style={{ marginBottom: 24, padding: "8px 16px", fontSize: 16 }}>
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: buildConic([{ val: moodCounts.great, total: totalMoods, color: t.accent }, { val: moodCounts.chill, total: totalMoods, color: t.text }, { val: moodCounts.down, total: totalMoods, color: "#c94c4c" }]), boxShadow: `6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l)` }} />
          <div style={{ display: "flex", gap: 16, marginTop: 24, fontWeight: 700, fontSize: 14 }}>
            <span style={{ color: t.accent }}>Great: {Math.round((moodCounts.great / totalMoods) * 100)}%</span>
            <span style={{ color: t.text }}>Chill: {Math.round((moodCounts.chill / totalMoods) * 100)}%</span>
            <span style={{ color: "#c94c4c" }}>Down: {Math.round((moodCounts.down / totalMoods) * 100)}%</span>
          </div>
        </div>

        <div className="neu-card" style={{ flex: "1 1 300px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", borderRadius: "24px" }}>
          <select className="neu-input" value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ marginBottom: 24, padding: "8px 16px", fontSize: 16, maxWidth: 200 }}>
            <option value="All">All Actions (30 Days)</option>
            {actions.map(a => <option key={a.id} value={a.id}>{a.text}</option>)}
          </select>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: buildConic([{ val: totalDone, total: totalActions, color: t.accent }, { val: totalMissed, total: totalActions, color: t.subtext }]), boxShadow: `6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l)` }} />
          <div style={{ display: "flex", gap: 16, marginTop: 24, fontWeight: 700, fontSize: 14 }}>
            <span style={{ color: t.accent }}>Done: {Math.round((totalDone / totalActions) * 100)}%</span>
            <span style={{ color: t.subtext }}>Missed: {Math.round((totalMissed / totalActions) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* NON-AI SUMMARY BOX */}
      <div className="neu-inset" style={{ padding: "24px", borderRadius: "20px", marginBottom: 44, fontSize: 18, color: t.text, lineHeight: 1.6, borderLeft: `4px solid ${t.accent}` }}>
        <span style={{ fontWeight: 800, display: "block", marginBottom: 8 }}>Data Correlation Summary</span>
        {basicSummary}
      </div>

      {/* ─── 🟢 NEW: NEUMORPHIC TAB SWITCH TOGGLE ─── */}
      <div className="neu-inset" style={{ display: "flex", padding: 10, borderRadius: 20, maxWidth: 840, margin: "0 auto 44px" }}>
        {["AI Analysis History", "CBT Cognitive Trap Tracker", "Habit Execution vs Mood Impact"].map(tab => (
          <button
            key={tab}
            onClick={() => setInsightsTab(tab)}
            className={insightsTab === tab ? "neu-btn active-tab" : "neu-btn-flat"}
            style={{ flex: 1, padding: "16px 0", borderRadius: 16, fontWeight: 700, fontSize: 16 }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT 1: AI ANALYSIS HISTORY ─── */}
      {insightsTab === "AI Analysis History" && (
        <div style={{ animation: "slideUpFade 0.4s ease forwards" }}>
          {aiReports.length === 0 && !loadingReports && (
            <div style={{ color: t.subtext, fontStyle: "italic", textAlign: "center" }}>No AI reports generated yet. Click Generate above to get started!</div>
          )}

          {aiReports.map((report, idx) => {
            const fCats = report.data.friction_categories || [];
            const fTotal = fCats.reduce((acc, c) => acc + c.percentage, 0) || 100;

            return (
              <div key={idx} className="neu-card" style={{ padding: "32px", borderRadius: "24px", marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: t.subtext, fontWeight: 700, marginBottom: 16 }}>{new Date(report.date).toLocaleDateString()}</div>
                <div style={{ fontSize: 18, color: t.text, fontStyle: "italic", borderLeft: `3px solid ${t.subtext}`, paddingLeft: 12, marginBottom: 20 }}>"{report.data.acknowledgment}"</div>

                {fCats.length > 0 && (
                  <div className="neu-inset" style={{ padding: "24px", borderRadius: "16px", marginBottom: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 32 }}>
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 16 }}>Friction Bottlenecks</span>
                      {fCats.map((cat, i) => {
                        const color = getDonutColors()[i % getDonutColors().length];
                        return (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 16, fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
                              <span style={{ color: t.text }}>{cat.category}</span>
                            </div>
                            <span style={{ color }}>{cat.percentage}%</span>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      width: 140, height: 140, borderRadius: "50%",
                      background: buildConic(fCats.map((c, i) => ({ val: c.percentage, total: fTotal, color: getDonutColors()[i % getDonutColors().length] }))),
                      maskImage: "radial-gradient(circle, transparent 40%, black 41%)",
                      WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 41%)",
                      boxShadow: `6px 6px 12px var(--shadow-d), -6px -6px 12px var(--shadow-l)`
                    }} />
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: t.accent, textTransform: "uppercase" }}>Action Insights</span>
                  <div style={{ marginTop: 4, color: t.text, lineHeight: 1.5 }}>{report.data.action_insights}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#c94c4c", textTransform: "uppercase" }}>Structural Suggestions</span>
                  <div style={{ marginTop: 4, color: t.text, lineHeight: 1.5 }}>{report.data.structural_suggestions}</div>
                </div>

                <div className="neu-inset" style={{ padding: "16px", marginTop: 24, borderRadius: "12px", color: t.text, fontWeight: 700 }}>
                  {report.data.encouragement}
                </div>
              </div>
            );
          })}

          {aiReports.length >= 5 && (
            <button
              className="neu-btn"
              onClick={() => { const next = offset + 5; setOffset(next); fetchReports(next); }}
              style={{ width: "100%", padding: "16px", fontSize: 18, fontWeight: 700, marginTop: 16 }}
              disabled={loadingReports}
            >
              {loadingReports ? "Loading..." : "Load Older Reports"}
            </button>
          )}
          {/* 🟢 PASTE BEFORE THE CARD'S CLOSING DIV */}
          <div style={{ textAlign: "center", color: t.subtext, padding: 12, fontSize: 13, opacity: 0.7 }}>
            Analysis generated by AI. AI can make mistakes.
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT 2: CBT COGNITIVE TRAP TRACKER ─── */}
      {insightsTab === "CBT Cognitive Trap Tracker" && (
        <div className="neu-card" style={{ padding: "32px", borderRadius: "24px", animation: "slideUpFade 0.4s ease forwards" }}>
          {cbtTraps.length === 0 ? (
            <div style={{ color: t.subtext, fontStyle: "italic", textAlign: "center" }}>No cognitive traps flagged in journal entries yet. Complete a post-save reflection to begin mapping trends!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {cbtTraps.map((trap, i) => {
                const barWidth = (trap.count / maxTrapCount) * 100;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                      <span style={{ color: t.text }}>{trap.distortion}</span>
                      <span style={{ color: t.accent }}>{trap.count} instance{trap.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="neu-inset" style={{ width: "100%", height: 16, borderRadius: 8, overflow: "hidden", padding: 2, display: "flex", alignItems: "center" }}>
                      <div style={{ width: `${barWidth}%`, height: "100%", background: `linear-gradient(90deg, ${t.subtext} 0%, ${t.accent} 100%)`, borderRadius: 6, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT 3: HABIT EXECUTION VS MOOD IMPACT ─── */}
      {insightsTab === "Habit Execution vs Mood Impact" && (
        <div className="neu-card" style={{ padding: "32px", borderRadius: "24px", animation: "slideUpFade 0.4s ease forwards" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 20 }}>Comparing average mood when habits are executed vs when skipped:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {actions.map(action => {
              const synergy = computeActionMoodSynergy(action.id);
              if (!synergy || (!synergy.doneAvg && !synergy.missedAvg)) return null;
              return (
                <div key={action.id} style={{ borderBottom: `1px solid ${t.shadowDark}30`, paddingBottom: 16 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: t.text, marginBottom: 12 }}>{action.text}</div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {synergy.doneAvg && (
                      <div className="neu-inset" style={{ flex: 1, padding: "10px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15, color: t.subtext }}>When Done</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>{synergy.doneAvg} / 5.0</span>
                      </div>
                    )}
                    {synergy.missedAvg && (
                      <div className="neu-inset" style={{ flex: 1, padding: "10px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15, color: t.subtext }}>When Missed</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#c94c4c" }}>{synergy.missedAvg} / 5.0</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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


// ─── REAL-TIME NEUMORPHIC PASSWORD STRENGTH INDICATOR ───────────────────────
function PasswordStrengthIndicator({ password }) {
  const { t } = useApp();

  const criteria = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "Number (0-9)", valid: /[0-9]/.test(password) },
    { label: "Special symbol (!@#$)", valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const score = criteria.filter((c) => c.valid).length;
  const percentage = (score / criteria.length) * 100;

  const barColor =
    score <= 1
      ? "#c94c4c"
      : score <= 3
        ? "#e5a96a"
        : t.accent;

  if (!password) return null;

  return (
    <div style={{ marginTop: 12, marginBottom: 18, animation: "slideUpFade 0.3s ease" }}>
      {/* Embossed Neumorphic Meter Bar */}
      <div
        className="neu-inset"
        style={{
          height: 10,
          borderRadius: 10,
          padding: 2,
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: barColor,
            borderRadius: 8,
            transition: "width 0.4s ease, background-color 0.4s ease",
          }}
        />
      </div>

      {/* Criteria Badges */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 12px",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      >
        {criteria.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: item.valid ? t.text : t.subtext,
              opacity: item.valid ? 1 : 0.6,
              fontWeight: item.valid ? 700 : 400,
              transition: "all 0.3s ease",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: "50%",
                fontSize: 10,
                fontWeight: 900,
                backgroundColor: item.valid ? t.accent : t.shadowDark,
                color: item.valid ? t.bg : t.subtext,
              }}
            >
              {item.valid ? "✓" : "•"}
            </span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper validator for submit buttons
export function isPasswordStrong(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
}



function OnboardingPersonalizationModal({ isOpen, onComplete, theme }) {
  const [consents, setConsents] = useState({
    accepted_ai_processing: false,
    accepted_coach_disclaimer: false,
    accepted_analytics_data: false,
    accepted_ad_sharing: false,
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;
  const t = theme;

  const handleToggle = (key) => setConsents(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    setSaving(true);
    await onComplete(consents);
    setSaving(false);
  };

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "40px 36px", maxWidth: 580, width: "100%", maxHeight: "90vh", overflowY: "auto", borderRadius: 24 }}>

        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 8, textAlign: "center" }}>
          Personalize Your Experience
        </div>
        <div style={{ fontSize: 14, color: t.subtext, textAlign: "center", marginBottom: 28, lineHeight: 1.5 }}>
          Customize your optional data and intelligence features. These are disabled by default and can be updated anytime in Settings.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 28 }}>

          {/* 1. AI Data Processing */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>AI Data Processing</div>
              <div style={{ fontSize: 12, color: t.subtext, marginTop: 4, lineHeight: 1.5 }}>
                Allows processing of journals, mood logs, Actions, and prompts via Google Gemini AI for AI Coach, Deep Analysis, Real-time prompts, AI Search, Action Voice Narrations, and Theme Generation. Your data is PII-scrubbed and never sold or used to train public AI models.
              </div>
            </div>
            <input
              type="checkbox"
              checked={consents.accepted_ai_processing}
              onChange={() => handleToggle("accepted_ai_processing")}
              style={{ width: 18, height: 18, marginTop: 4, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
            />
          </div>

          {/* 2. AI Coach Disclaimer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>AI Coach Companion</div>
              <div style={{ fontSize: 12, color: t.subtext, marginTop: 4, lineHeight: 1.5 }}>
                Enables conversational mindfulness chat. Automated educational LLM; not a medical healthcare provider.
              </div>
            </div>
            <input
              type="checkbox"
              checked={consents.accepted_coach_disclaimer}
              onChange={() => handleToggle("accepted_coach_disclaimer")}
              style={{ width: 18, height: 18, marginTop: 4, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
            />
          </div>

          {/* 3. Analytical Data Collection */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>Website Traffic Analytics</div>
              <div style={{ fontSize: 12, color: t.subtext, marginTop: 4, lineHeight: 1.5 }}>
                Applies solely to the public website via Cloudflare Web Analytics (no cookies, zero in-app tracking).
              </div>
            </div>
            <input
              type="checkbox"
              checked={consents.accepted_analytics_data}
              onChange={() => handleToggle("accepted_analytics_data")}
              style={{ width: 18, height: 18, marginTop: 4, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
            />
          </div>

          {/* 4. Rewarded Ad Interaction Counters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: t.text }}>Rewarded Ad Interaction Counters</div>
              <div style={{ fontSize: 12, color: t.subtext, marginTop: 4, lineHeight: 1.5 }}>
                Allows non-personal interaction counters for video ads to unlock custom themes on free tiers.
              </div>
            </div>
            <input
              type="checkbox"
              checked={consents.accepted_ad_sharing}
              onChange={() => handleToggle("accepted_ad_sharing")}
              style={{ width: 18, height: 18, marginTop: 4, accentColor: t.accent, cursor: "pointer", flexShrink: 0 }}
            />
          </div>

        </div>

        {/* 🟢 Privacy Policy Comprehensive Link */}
        <p style={{ fontSize: 12, color: t.subtext, textAlign: "center", lineHeight: 1.5, marginBottom: 24 }}>
          For a more detailed and comprehensive version see our{" "}
          <a
            href="https://mindactions.app/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: t.accent, fontWeight: 700, textDecoration: "underline" }}
          >
            Privacy Policy
          </a>.
        </p>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="neu-btn neu-btn-primary"
          style={{ width: "100%", padding: "18px", fontSize: 18, fontWeight: 800 }}
        >
          {saving ? "Saving Setup..." : "Save Preferences & Enter Dashboard"}
        </button>

      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onNavigate, initialMode = "login" }) {
  const { t, setUser, setToken } = useApp()
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://mindactions-api.onrender.com"

  // 🟢 Synchronize mode whenever navigation specifies "signup" or "login"
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode)
    }
  }, [initialMode])

  // --- 1. SIGNUP & LOGIN EXECUTION ---
  async function submit() {
    setError("")
    if (!email || !password) { setError("Please fill in all fields"); return }

    if (mode === "signup") {
      if (!name.trim()) { setError("Please enter your name"); return }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }
      if (!isPasswordStrong(password)) {
        setError("Please satisfy all password strength requirements above.")
        return
      }

      setLoading(true)
      try {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          password,
          accepted_terms: true,
          accepted_privacy: true,
          accepted_ai_processing: false,
          accepted_coach_disclaimer: false,
          accepted_analytics_data: false,
          accepted_ad_sharing: false
        }

        await axios.post(`${backendUrl}/auth/signup`, payload)
        localStorage.setItem("pending_verify_email", email.trim())
        setError("Account created! Redirecting to email verification...")
        setTimeout(() => {
          onNavigate("verify")
        }, 1500)
      } catch (e) {
        setError(e.response?.data?.detail || "Failed to create account.")
      } finally {
        setLoading(false)
      }
      return
    }

    // --- LOGIN FLOW ---
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/auth/login`, { email, password })
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("user", JSON.stringify(res.data.user))
      setupAxios(res.data.token)
      setToken(res.data.token)
      setUser(res.data.user)
      onNavigate("profile")
    } catch (e) {
      const errorDetail = e.response?.data?.detail || "Something went wrong."
      if (typeof errorDetail === "string" && errorDetail.includes("not verified")) {
        localStorage.setItem("pending_verify_email", email.trim())
        setError(
          <span>
            {errorDetail}{" "}
            <strong
              onClick={() => onNavigate("verify")}
              style={{ textDecoration: "underline", cursor: "pointer", color: t.accent }}
            >
              Click here to verify now.
            </strong>
          </span>
        )
      } else {
        setError(errorDetail)
      }
    } finally {
      setLoading(false)
    }
  }

  // --- 2. PASSWORD RESET TRIGGER ---
  async function requestPasswordReset() {
    setError("")
    if (!email) {
      setError("Please enter your email address")
      return
    }
    setLoading(true)

    try {
      await axios.post(`${backendUrl}/auth/forgot-password`, { email })
      setEmail("")
      setError("If that email exists, a reset link has been dispatched!")
    } catch (e) {
      setError(e.response?.data?.detail || "Could not connect to server. Try again.")
    } finally {
      setLoading(false)
    }
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
            <label className="input-label">Email</label>
            <input
              className="neu-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }}
            />
            <button
              className="neu-btn neu-btn-primary"
              onClick={requestPasswordReset}
              disabled={loading}
              style={{ width: "100%", padding: "20px", fontSize: 20, marginBottom: 28, marginTop: 16 }}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div style={{ textAlign: "center", fontSize: 18, color: t.subtext }}>
              <span onClick={() => { setMode("login"); setError("") }} style={{ color: t.accent, fontWeight: 700, cursor: "pointer" }}>Back to Log in</span>
            </div>
          </>
        ) : (
          <>
            {/* 🟢 1. NAME FIELD (Signup Only) */}
            {mode === "signup" && (
              <>
                <label className="input-label">Name</label>
                <input
                  className="neu-input"
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }}
                />
              </>
            )}

            {/* 🟢 2. EMAIL FIELD */}
            <label className="input-label">Email</label>
            <input
              className="neu-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }}
            />

            {/* 🟢 3. PASSWORD FIELD */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <label className="input-label">Password</label>
              {mode === "login" && (
                <span onClick={() => { setMode("forgot"); setError(""); }} style={{ color: t.subtext, fontSize: 14, cursor: "pointer", textDecoration: "underline", marginBottom: 12 }}>
                  Forgot password?
                </span>
              )}
            </div>

            <input
              className="neu-input"
              type="password"
              placeholder={mode === "signup" ? "Strong password required" : "Minimum 8 characters"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: mode === "signup" ? 6 : 18 }}
            />

            {/* 🟢 4. LIVE STRENGTH INDICATOR & REPEAT PASSWORD (Signup Only) */}
            {mode === "signup" && (
              <>
                <PasswordStrengthIndicator password={password} />
                <label className="input-label" style={{ marginTop: 12 }}>Repeat Password</label>
                <input
                  className="neu-input"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submit()}
                  style={{ width: "100%", padding: "18px 22px", fontSize: 18, marginBottom: 18 }}
                />
              </>
            )}

            {/* 🟢 5. SUBMIT BUTTON */}
            <button className="neu-btn neu-btn-primary" onClick={submit} disabled={loading} style={{ width: "100%", padding: "20px", fontSize: 20, marginBottom: 12, marginTop: 24 }}>
              {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
            </button>

            {/* 🟢 6. CLICKWRAP LEGAL DISCLOSURE */}
            {mode === "signup" && (
              <p style={{ fontSize: 13, color: t.subtext, textAlign: "center", lineHeight: 1.5, margin: "12px 0 20px" }}>
                By continuing with Google or creating an account, you agree to our{" "}
                <a href="https://mindactions.app" target="_blank" rel="noopener noreferrer" style={{ color: t.accent, fontWeight: 700, textDecoration: "underline" }}>
                  Terms of Use
                </a>{" "}
                and acknowledge our{" "}
                <a href="https://mindactions.app" target="_blank" rel="noopener noreferrer" style={{ color: t.accent, fontWeight: 700, textDecoration: "underline" }}>
                  Privacy Policy
                </a>.
              </p>
            )}

            {/* 🟢 7. TOGGLE LOGIN/SIGNUP */}
            <div style={{ textAlign: "center", marginTop: 18, fontSize: 18, color: t.subtext }}>
              {mode === "login" ? "No account?" : "Already have an account?"}
              <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError("") }} style={{ color: t.accent, fontWeight: 700, cursor: "pointer", marginLeft: 8 }}>
                {mode === "login" ? "Sign up" : "Log in"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.15 }} />
              <span style={{ fontSize: 14, color: t.subtext, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>or</span>
              <div style={{ flex: 1, height: 1, background: t.shadowDark, opacity: 0.15 }} />
            </div>

            {/* ─── THIRD-PARTY OAUTH BUTTON PROVIDERS ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => window.location.href = `${backendUrl}/auth/google`} className="neu-btn" style={{ width: "100%", padding: "14px", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                Continue with Google
              </button>

              <div style={{ textAlign: "center", marginTop: 18, fontSize: 15, color: t.subtext }}>
                For more information and tutorials visit{" "}
                <a
                  href="https://mindactions.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: t.accent, fontWeight: 700, textDecoration: "none" }}
                >
                  mindactions.app
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AuthCallback({ onNavigate }) {
  const { setToken, setUser, t } = useContext(AppCtx);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [statusText, setStatusText] = useState("Securing your wellness session...");

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://mindactions-api.onrender.com";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      setJwtToken(tokenFromUrl);
      localStorage.setItem("token", tokenFromUrl);
      axios.defaults.headers.common["Authorization"] = `Bearer ${tokenFromUrl}`;

      axios.get("/api/profile/me", {
        headers: { Authorization: `Bearer ${tokenFromUrl}` }
      })
        .then((res) => {
          const userData = {
            id: res.data.id,
            name: res.data.username,
            email: res.data.email,
            tier: res.data.tier,
            custom_theme: res.data.custom_theme,
            journal_ai_count: res.data.journal_ai_count,
            accepted_coach_disclaimer: res.data.accepted_coach_disclaimer,
            accepted_analytics_data: res.data.accepted_analytics_data,
            accepted_ad_sharing: res.data.accepted_ad_sharing,
            accepted_ai_processing: res.data.accepted_ai_processing,
            terms_accepted_at: res.data.terms_accepted_at,
            created_at: res.data.created_at
          };

          // 🟢 If new user, show the single personalization modal with hyperlinks
          if (!res.data.terms_accepted_at) {
            setPendingUserData(userData);
            setShowOnboardModal(true);
            window.history.replaceState({}, document.title, "/");
          } else {
            localStorage.setItem("user", JSON.stringify(userData));
            window.history.replaceState({}, document.title, "/");
            if (setToken) setToken(tokenFromUrl);
            if (setUser) setUser(userData);
            onNavigate("profile");
          }
        })
        .catch((err) => {
          console.error("Callback authentication failed:", err);
          localStorage.removeItem("token");
          window.history.replaceState({}, document.title, "/");
          onNavigate("login");
        });
    } else {
      window.history.replaceState({}, document.title, "/");
      onNavigate("login");
    }
  }, []);

  const handleOnboardCompleted = async (chosenConsents) => {
    try {
      setStatusText("Saving your preferences...");

      const payload = {
        accepted_terms: true,
        accepted_privacy: true,
        ...chosenConsents
      };

      await axios.post(`${backendUrl}/auth/accept-legal`, payload);

      const finalUserData = {
        ...pendingUserData,
        ...chosenConsents,
        terms_accepted_at: new Date().toISOString()
      };

      localStorage.setItem("user", JSON.stringify(finalUserData));
      if (setToken) setToken(jwtToken);
      if (setUser) setUser(finalUserData);
      setShowOnboardModal(false);
      onNavigate("profile");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to record legal consent.");
    }
  };

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "40px", textAlign: "center" }}>
        <div className="skeleton-breathe" style={{ fontSize: "24px", fontWeight: "bold", color: t.text }}>
          {statusText}
        </div>
      </div>

      {/* 🟢 Render the 1-Step Onboarding Modal over the screen */}
      <OnboardingPersonalizationModal
        isOpen={showOnboardModal}
        onComplete={handleOnboardCompleted}
        theme={t}
      />
    </div>
  );
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
  const { t, scheduleNotification, user, token, setPage } = useApp()
  const isGuest = !user || !token

  const [tab, setTab] = useState("time")

  // 🟢 INDEPENDENT METHOD MASTER TOGGLES
  const [isTimeEnabled, setIsTimeEnabled] = useState(true)
  const [isLocationEnabled, setIsLocationEnabled] = useState(false)

  // Time parameters
  const [hour, setHour] = useState("08")
  const [minute, setMinute] = useState("00")
  const [ampm, setAmpm] = useState("AM")

  const [repeat, setRepeat] = useState(true)
  const [repeatNum, setRepeatNum] = useState(1)
  const [repeatUnit, setRepeatUnit] = useState("day")

  const [endIn, setEndIn] = useState(false)
  const [endInDays, setEndInDays] = useState(30)

  // Custom Video parameters
  const [videoTime, setVideoTime] = useState("00:00")
  const [videoUrl, setVideoUrl] = useState(action.video_url || action.embed_url || "")
  const isCustomAction = action.category === "Customized" || action.is_custom || String(action.action_id || action.id).startsWith("custom_") || !!action.video_url

  // Location parameters
  const [locCondition, setLocCondition] = useState("arrive")
  const [locCoords, setLocCoords] = useState(null)
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY
  })

  // Action Triggers
  const [isGcal, setIsGcal] = useState(action.is_gcal || false)
  const [isAudio, setIsAudio] = useState(action.is_audio || false)
  const [isVideo, setIsVideo] = useState(action.is_video || false)
  const [isSpotify, setIsSpotify] = useState(!!action.spotify_uri)
  const [selectedSpotify, setSelectedSpotify] = useState(action.spotify_uri ? { uri: action.spotify_uri, name: action.spotify_name, type: action.spotify_type } : null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [widgetName, setWidgetName] = useState("")

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  const timeParts = videoTime.split(':').map(str => str.trim())
  const startSeconds = timeParts.length === 2 ? (parseInt(timeParts[0] || 0) * 60) + parseInt(timeParts[1] || 0) : 0

  // 🟢 REUSABLE NEUMORPHIC PILL TOGGLE
  const renderNeuToggle = (enabled, onToggle) => (
    <div
      onClick={onToggle}
      className={enabled ? "neu-inset" : "neu-card"}
      style={{ width: 66, height: 38, borderRadius: 19, cursor: "pointer", position: "relative", flexShrink: 0 }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: enabled ? 32 : 4,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: enabled ? t.accent : t.subtext,
          transition: "left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        }}
      />
    </div>
  )

  useEffect(() => {
    if (isGuest || !action?.id || String(action.id).startsWith("custom_")) {
      setLoadingInitial(false)
      return
    }

    axios.get(`/api/profile/reminder/${action.id}`)
      .then(res => {
        // 🟢 Only override default states if a saved reminder actually exists in the DB
        if (res.data.exists && res.data.reminder_type) {
          const rType = res.data.reminder_type

          setIsTimeEnabled(rType === "time" || rType === "both" || !!res.data.target_hour)
          setIsLocationEnabled(rType === "location" || rType === "both" || !!res.data.loc_lat)

          if (rType === "location") setTab("location")
          else if (rType === "widget") setTab("widget")
          else setTab("time")

          setHour(res.data.target_hour || "08")
          setMinute(res.data.target_minute || "00")
          setAmpm(res.data.target_ampm || "AM")
          setIsGcal(res.data.is_gcal || false)

          if (res.data.frequency_type) {
            setRepeat(true)
            setRepeatUnit(res.data.frequency_type)
            setRepeatNum(res.data.frequency_value || 1)
          } else {
            // Only turn OFF if this was an existing saved reminder without repeating
            setRepeat(false)
          }

          if (res.data.end_in_days) {
            setEndIn(true)
            setEndInDays(res.data.end_in_days)
          }

          if (res.data.loc_lat && res.data.loc_lng) {
            setLocCoords({ lat: parseFloat(res.data.loc_lat), lng: parseFloat(res.data.loc_lng) })
          }
          if (res.data.loc_condition) {
            setLocCondition(res.data.loc_condition)
          }

          setIsVideo(res.data.is_video)
          if (res.data.video_start_time) {
            const m = Math.floor(res.data.video_start_time / 60).toString().padStart(2, '0')
            const s = (res.data.video_start_time % 60).toString().padStart(2, '0')
            setVideoTime(`${m}:${s}`)
          }
          if (res.data.video_url) setVideoUrl(res.data.video_url)

          setIsAudio(res.data.is_audio)
          setIsSpotify(!!res.data.spotify_uri)
          if (res.data.spotify_uri) {
            setSelectedSpotify({
              uri: res.data.spotify_uri,
              name: res.data.spotify_name,
              type: res.data.spotify_type
            })
          }
          if (res.data.widget_name) setWidgetName(res.data.widget_name)
        }
      })
      .catch(() => { })
      .finally(() => setLoadingInitial(false))
  }, [action.id])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearching(true)
    const delayDebounce = setTimeout(() => {
      axios.get(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => setSearchResults(res.data.tracks || []))
        .catch(() => { })
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [searchQuery])

  async function save() {
    // Validation: ensure at least one reminder method is enabled
    if (!isTimeEnabled && !isLocationEnabled) {
      alert("Please enable at least one reminder method (Time or Location).")
      return
    }

    const resolvedReminderType = (isTimeEnabled && isLocationEnabled)
      ? "both"
      : isLocationEnabled
        ? "location"
        : "time"

    // 🟢 GUEST INTERCEPTION: Cache full configuration locally
    if (isGuest) {
      const pendingSetup = {
        action_id: action.action_id || action.id,
        text: action.text,
        benefit: action.benefit || "",
        category: action.category || "General",
        is_custom: isCustomAction,
        video_url: isVideo && videoUrl.trim() ? videoUrl.trim() : null,
        reminder: {
          reminder_type: resolvedReminderType,
          target_hour: isTimeEnabled ? String(hour).padStart(2, '0') : null,
          target_minute: isTimeEnabled ? String(minute).padStart(2, '0') : null,
          target_ampm: isTimeEnabled ? ampm : null,
          frequency_type: isTimeEnabled && repeat ? repeatUnit : null,
          frequency_value: isTimeEnabled && repeat ? repeatNum : null,
          end_in_days: isTimeEnabled && endIn ? endInDays : null,
          loc_condition: isLocationEnabled ? locCondition : null,
          loc_lat: isLocationEnabled && locCoords ? locCoords.lat : null,
          loc_lng: isLocationEnabled && locCoords ? locCoords.lng : null,
          text: action.text
        }
      }

      localStorage.setItem("pending_action_setup", JSON.stringify(pendingSetup))
      onClose()
      setPage("signup")
      return
    }

    setSaving(true)
    try {
      await axios.post("/api/profile/reminder", {
        action_id: action.id,
        reminder_type: resolvedReminderType,
        target_hour: isTimeEnabled ? String(hour).padStart(2, '0') : null,
        target_minute: isTimeEnabled ? String(minute).padStart(2, '0') : null,
        target_ampm: isTimeEnabled ? ampm : null,
        frequency_type: isTimeEnabled && repeat ? repeatUnit : null,
        frequency_value: isTimeEnabled && repeat ? repeatNum : null,
        end_in_days: isTimeEnabled && endIn ? endInDays : null,
        loc_condition: isLocationEnabled ? locCondition : null,
        loc_lat: isLocationEnabled && locCoords ? locCoords.lat : null,
        loc_lng: isLocationEnabled && locCoords ? locCoords.lng : null,
        is_audio: isAudio,
        is_video: isVideo,
        is_gcal: isGcal,
        text: action.text,
        video_url: isVideo && videoUrl.trim() ? videoUrl.trim() : null,
        video_start_time: startSeconds,
        spotify_uri: isSpotify && selectedSpotify ? selectedSpotify.uri : null,
        spotify_name: isSpotify && selectedSpotify ? selectedSpotify.name : null,
        spotify_type: isSpotify && selectedSpotify ? selectedSpotify.type : null
      })

      if (isAudio) axios.post(`/api/actions/${action.action_id || action.id}/generate-audio`).catch(() => { })

      if (typeof onSaved === 'function') onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      alert("Failed to save reminder.")
    } finally {
      setSaving(false)
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
          {isTimeEnabled && `Clock set for ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}. `}
          {isLocationEnabled && "Location geofence active."}
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
        <div className="neu-inset" style={{ display: "flex", padding: 8, gap: 8, marginBottom: 36, borderRadius: 18 }}>
          <button
            onClick={() => setTab("time")}
            className={tab === "time" ? "neu-btn active-tab" : "neu-btn-flat"}
            style={{ flex: 1, padding: "16px 0", borderRadius: 14, fontSize: 18, fontWeight: 700 }}
          >
            Time
          </button>

          <button
            onClick={() => setTab("location")}
            className={tab === "location" ? "neu-btn active-tab" : "neu-btn-flat"}
            style={{ flex: 1, padding: "16px 0", borderRadius: 14, fontSize: 18, fontWeight: 700 }}
          >
            Location
          </button>

          <button
            onClick={() => setTab("widget")}
            className={tab === "widget" ? "neu-btn active-tab" : "neu-btn-flat"}
            style={{ flex: 1, padding: "16px 0", borderRadius: 14, fontSize: 18, fontWeight: 700 }}
          >
            Widget
          </button>
        </div>

        {/* ─── 1. TIME TAB (WITH MASTER TOGGLE) ─── */}
        {tab === "time" && (
          <div>
            {/* Master Time Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>Time Reminder</div>
                <div style={{ fontSize: 14, color: t.subtext }}>Trigger alert at scheduled hour</div>
              </div>
              {renderNeuToggle(isTimeEnabled, () => setIsTimeEnabled(!isTimeEnabled))}
            </div>

            {isTimeEnabled ? (
              <div style={{ animation: "slideUpFade 0.3s ease" }}>
                {/* Clock Dials */}
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

                {/* Repeat Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: t.text }}>Repeat Reminder</span>
                  {renderNeuToggle(repeat, () => setRepeat(!repeat))}
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

                {/* End In Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: endIn ? 28 : 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: t.text }}>End In (Auto-Complete)</span>
                  {renderNeuToggle(endIn, () => setEndIn(!endIn))}
                </div>

                {endIn && (
                  <div style={{ marginTop: 20 }}>
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
            ) : (
              <div className="neu-inset" style={{ padding: "30px", borderRadius: 18, textAlign: "center", color: t.subtext, fontStyle: "italic" }}>
                Time alert is inactive. Toggle on above to schedule an hour.
              </div>
            )}
          </div>
        )}

        {/* ─── 2. LOCATION TAB (WITH MASTER TOGGLE) ─── */}
        {tab === "location" && (
          isGuest ? (
            <div className="neu-inset" style={{ padding: "30px", borderRadius: 16, textAlign: "center", color: t.subtext }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: t.text }}>Account Required</div>
              <div>Location-based alerts require creating an account and accepting location privacy permissions.</div>
            </div>
          ) : (
            <div>
              {/* Master Location Toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>Location Reminder</div>
                  <div style={{ fontSize: 14, color: t.subtext }}>Alert when arriving or departing a place</div>
                </div>
                {renderNeuToggle(isLocationEnabled, () => setIsLocationEnabled(!isLocationEnabled))}
              </div>

              {isLocationEnabled ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "slideUpFade 0.3s ease" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => setLocCondition("arrive")} className={locCondition === "arrive" ? "neu-btn active-tab" : "neu-btn"} style={{ flex: 1, padding: "14px", fontSize: 18 }}>When I Arrive</button>
                    <button onClick={() => setLocCondition("leave")} className={locCondition === "leave" ? "neu-btn active-tab" : "neu-btn"} style={{ flex: 1, padding: "14px", fontSize: 18 }}>When I Leave</button>
                  </div>

                  <div className="neu-inset" style={{ height: 300, width: "100%", borderRadius: 16, overflow: "hidden" }}>
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={locCoords || { lat: 37.3891, lng: -5.9845 }}
                        zoom={12}
                        onClick={(e) => setLocCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
                      >
                        {locCoords && <Marker position={locCoords} />}
                      </GoogleMap>
                    ) : (
                      <div style={{ padding: 20, textAlign: "center", color: t.subtext }}>Loading Map...</div>
                    )}
                  </div>
                  {locCoords && <div style={{ fontSize: 14, color: t.subtext, textAlign: "center", fontWeight: 700 }}>Location Selected!</div>}
                </div>
              ) : (
                <div className="neu-inset" style={{ padding: "30px", borderRadius: 18, textAlign: "center", color: t.subtext, fontStyle: "italic" }}>
                  Location alert is inactive. Toggle on above to choose a geofence.
                </div>
              )}
            </div>
          )
        )}

        {/* ─── 3. WIDGET TAB ─── */}
        {tab === "widget" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 30px" }}>
            <div style={{ fontSize: 16, color: t.subtext, marginBottom: 20, fontStyle: "italic", fontWeight: 600 }}>
              To assign or customize widgets, use the Android app
            </div>
            <div className="neu-inset" style={{ padding: "40px 32px", borderRadius: 24, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                Assigned Widget
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: t.accent }}>
                {widgetName ? widgetName : "Not Assigned"}
              </div>
            </div>
          </div>
        )}

        {/* ─── 4. ACTION TRIGGERS (AUDIO / VIDEO / SPOTIFY / GCAL) ─── */}
        {isGuest ? (
          <div className="neu-inset" style={{ padding: "20px", borderRadius: 16, marginTop: 24, textAlign: "center", color: t.subtext, fontSize: 14 }}>
            Media integrations (Spotify, YouTube Video, Audio Narration, Google Calendar) unlock after creating your account.
          </div>
        ) : (
          <div style={{ marginTop: 36, marginBottom: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.subtext, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
              Action Triggers
            </div>

            {/* Google Calendar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 18, color: t.text }}>Google Calendar</span>
                <InfoTooltip text="Pushes this reminder to your actual Google Calendar" theme={t} />
              </div>
              <button
                onClick={() => setIsGcal(!isGcal)}
                className={isGcal ? "neu-inset active-tab" : "neu-btn"}
                style={{ width: "105px", padding: "8px 0", borderRadius: "12px", fontSize: 15, textAlign: "center" }}
              >
                {isGcal ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {/* Audio */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 18, color: t.text }}>Audio</span>
                  <InfoTooltip text="Reads the Action and its Why out loud" theme={t} />
                </div>
                <button
                  onClick={() => setIsAudio(!isAudio)}
                  className={isAudio ? "neu-inset active-tab" : "neu-btn"}
                  style={{ width: "105px", padding: "8px 0", borderRadius: "12px", fontSize: 15, textAlign: "center" }}
                >
                  {isAudio ? "Enabled" : "Disabled"}
                </button>
              </div>

              {/* Video */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 18, color: t.text }}>Video</span>
                    <InfoTooltip text="Play the Youtube video of the Action" theme={t} />
                  </div>
                  <button
                    onClick={() => setIsVideo(!isVideo)}
                    className={isVideo ? "neu-inset active-tab" : "neu-btn"}
                    style={{ width: "105px", padding: "8px 0", borderRadius: "12px", fontSize: 15, textAlign: "center" }}
                  >
                    {isVideo ? "Enabled" : "Disabled"}
                  </button>
                </div>

                {isVideo && (
                  <div className="neu-inset" style={{ padding: "16px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {isCustomAction && (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: t.subtext, marginBottom: 6 }}>Custom YouTube Link</div>
                        <input
                          type="text"
                          value={videoUrl}
                          onChange={e => setVideoUrl(e.target.value)}
                          placeholder="Paste YouTube URL (e.g. https://youtu.be/...)"
                          className="neu-input"
                          style={{ width: "100%", padding: "10px 14px", fontSize: 15 }}
                        />
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 15, color: t.subtext, fontStyle: "italic" }}>Start Time (MM:SS)</span>
                      <input
                        type="text"
                        value={videoTime}
                        onChange={e => setVideoTime(e.target.value)}
                        placeholder="00:00"
                        className="neu-input"
                        style={{ width: 80, padding: "8px", fontSize: 15, textAlign: "center" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Spotify */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 18, color: t.text }}>Spotify</span>
                  <InfoTooltip text="Play the song, playlist, or podcast from your Spotify" theme={t} />
                </div>
                <button
                  onClick={() => setIsSpotify(!isSpotify)}
                  className={isSpotify ? "neu-inset active-tab" : "neu-btn"}
                  style={{ width: "105px", padding: "8px 0", borderRadius: "12px", fontSize: 15, textAlign: "center" }}
                >
                  {isSpotify ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            {/* Spotify Catalog Search */}
            {isSpotify && (
              <div className="neu-inset" style={{ padding: 20, borderRadius: 16, marginTop: 24 }}>
                <label className="input-label" style={{ marginTop: 0, fontSize: 16 }}>Search Spotify Tracks & Playlists</label>
                <input
                  className="neu-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type track, playlist, or artist..."
                  style={{ width: "100%", padding: "12px 16px", fontSize: 16, marginBottom: 12 }}
                />
                {selectedSpotify && <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, marginBottom: 8 }}>Linked: {selectedSpotify.name}</div>}
                {searchResults.length > 0 && (
                  <div style={{ maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {searchResults.map(item => (
                      <div
                        key={item.uri}
                        onClick={() => setSelectedSpotify({ uri: item.uri, name: item.name, type: item.type })}
                        style={{ padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 15, color: t.text, background: selectedSpotify?.uri === item.uri ? t.selectionBg : "transparent" }}
                      >
                        {item.name} <span style={{ opacity: 0.6, fontSize: 13 }}>by {item.artist}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searching && <div style={{ fontSize: 14, color: t.subtext, fontStyle: "italic" }}>Searching...</div>}
              </div>
            )}
          </div>
        )}

        {/* Bottom Action Buttons */}
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
// ─── CUSTOM ACTION MODAL ──────────────────────────────────────────────────────
// ─── CUSTOM ACTION MODAL ──────────────────────────────────────────────────────
function CustomActionModal({ onClose, onSuccess }) {
  const { t, user, token } = useApp();
  const isGuest = !user || !token;
  const [actionName, setActionName] = useState("");
  const [whyItHelps, setWhyItHelps] = useState("");

  // 🎛️ Toggle States
  const [isAudio, setIsAudio] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isSpotify, setIsSpotify] = useState(false);

  // 🟢 Premium Custom Video States
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTime, setVideoTime] = useState("00:00");
  const isPremium = ["paid", "pro"].includes(user?.tier?.toLowerCase());

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

    // 🟢 GUEST CHECK: Bypass backend call and pass draft directly to ReminderModal
    if (!user || !token) {
      onSuccess({
        id: "custom_" + Date.now(),
        text: actionName.trim(),
        benefit: whyItHelps.trim(),
        category: "Customized",
        is_custom: true
      });
      return;
    }

    setSaving(true);
    const timeParts = videoTime.split(':').map(str => str.trim());
    const startSeconds = timeParts.length === 2 ? (parseInt(timeParts[0] || 0) * 60) + parseInt(timeParts[1] || 0) : 0;

    const payload = {
      text: actionName.trim(),
      benefit: whyItHelps.trim(),
      is_audio: isAudio,
      is_video: isVideo,
      spotify_uri: isSpotify ? selectedSpotify?.uri : null,
      spotify_name: isSpotify ? selectedSpotify?.name : null,
      spotify_type: isSpotify ? selectedSpotify?.type : null,
      video_url: isVideo && videoUrl.trim() ? videoUrl.trim() : null,
      video_start_time: isVideo && videoUrl.trim() ? startSeconds : 0
    };

    try {
      const res = await axios.post("/api/profile/actions/custom", payload);
      if (res.data.error) {
        alert(res.data.error);
        setSaving(false);
        return;
      }

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
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, fontStyle: "italic", fontFamily: "'Autumn Brush', 'Caveat', cursive", color: t.text, marginBottom: 32 }}>
          Create Custom Action
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="input-label">Action</label>
          <input className="neu-input" value={actionName} onChange={e => setActionName(e.target.value)} placeholder="Your own Action" style={{ width: "100%", padding: "18px 20px", fontSize: 18 }} />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label className="input-label">Why it helps</label>
          <textarea className="neu-input" value={whyItHelps} onChange={e => setWhyItHelps(e.target.value)} placeholder="How or why this will help you?" rows={4} style={{ width: "100%", padding: "18px 20px", fontSize: 18, resize: "none" }} />
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: t.subtext, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Actions</div>

        {isGuest ? (
          /* 🟢 GUEST NOTICE: Replaces clickable triggers in guest mode */
          <div className="neu-inset" style={{ padding: "20px", borderRadius: 16, marginBottom: 28, textAlign: "center", color: t.subtext, fontSize: 14 }}>
            Media integrations (Spotify, YouTube Video, Audio Narration, Google Calendar) unlock after creating your account.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {/* AUDIO ROW */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 18, color: t.text }}>Audio</span>
                  <InfoTooltip text="Reads the Action and its Why out loud" theme={t} />
                </div>
                <button onClick={() => setIsAudio(!isAudio)} className={isAudio ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>{isAudio ? "Enabled" : "Disabled"}</button>
              </div>

              {/* VIDEO ROW WITH DROPDOWN */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 18, color: t.text }}>Video</span>
                    <InfoTooltip text="Play the Youtube video of the Action" theme={t} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button
                      className="neu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPremium) {
                          setShowVideoPopup(!showVideoPopup);
                          if (!showVideoPopup) setIsVideo(true);
                        } else {
                          alert("Custom action videos are a Premium feature! Upgrade your tier to unlock this.");
                        }
                      }}
                      style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", fontSize: 26, fontWeight: 900, color: isPremium ? t.accent : t.subtext, padding: 0, lineHeight: 0, paddingBottom: 4 }}
                      title={isPremium ? "Add YouTube URL" : "Premium Feature"}
                    >
                      +
                    </button>
                    <button onClick={() => setIsVideo(!isVideo)} className={isVideo ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "8px 20px", borderRadius: "12px", fontSize: 15 }}>
                      {isVideo ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                {showVideoPopup && isPremium && (
                  <div className="neu-inset" style={{ padding: "16px", borderRadius: "16px", marginTop: 4, animation: "slideUpFade 0.3s ease" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.subtext, marginBottom: 8, textTransform: "uppercase" }}>Custom YouTube Link</div>
                    <input className="neu-input" placeholder="Paste YouTube URL..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ width: "100%", padding: "10px 16px", fontSize: 15, marginBottom: 12 }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 15, color: t.text, fontWeight: 700 }}>Start Time (MM:SS):</span>
                      <input type="text" className="neu-input" placeholder="00:00" value={videoTime} onChange={e => setVideoTime(e.target.value)} style={{ width: 80, padding: "8px", textAlign: "center", fontSize: 15 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* SPOTIFY ROW */}
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
          </>
        )}

        {/* 🟢 FIXED: These buttons are now safely locked inside the modal card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: "auto" }}>
          <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving || !actionName.trim()} style={{ padding: "16px", fontSize: 18, fontWeight: 700 }}>{saving ? "Saving..." : "Save & Set Reminder"}</button>
          <button className="neu-btn" onClick={onClose} style={{ padding: "16px", fontSize: 18, fontWeight: 700 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}


// ─── ACTION REPORT MODAL ──────────────────────────────────────────────────────
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
      <div className="neu-card" style={{ padding: "46px 40px", maxWidth: 680, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* 🟢 NEW: Minimal top-right close button */}
        <button onClick={onClose} style={{ position: "absolute", top: 24, right: 24, background: "none", border: "none", color: t.subtext, fontSize: 24, cursor: "pointer", fontWeight: "bold" }}>✕</button>

        <div style={{ fontSize: 30, fontWeight: 700, color: t.text, marginBottom: 34, textAlign: "center" }}>Action Report</div>
        {/* 🟢 FIXED: The redundant action text subtitle was deleted from right here! */}

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
                {journals.map((j, i) => {
                  // 🟢 FIXED: Removes the redundant 'Logged for...' text from the journal logs!
                  const cleanText = j.content.replace(/^Logged for .*?: /i, '');
                  return (
                    <div key={i} className="neu-inset" style={{ padding: "20px 24px", borderRadius: 16 }}>
                      <div style={{ fontSize: 14, color: t.subtext, fontWeight: 700, marginBottom: 8 }}>{new Date(j.date).toLocaleDateString()}</div>
                      <div className="notebook-paper" style={{ padding: "0 !important", color: t.text }}>{cleanText}</div>
                    </div>
                  )
                })}
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

        {/* 🟢 FIXED: The bulky Close button is deleted from down here */}
      </div>
    </div>
  )
}


// ─── SAVED AI ANALYSIS MODAL ──────────────────────────────────────────────────
function SavedAnalysisModal({ data, onClose }) {
  const { t } = useApp();

  if (!data) return null;

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "40px", maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>

        <div style={{ fontSize: 24, fontWeight: 800, color: t.text, marginBottom: 24, textAlign: "center" }}>
          Past Session Analysis
        </div>

        <div className="neu-inset" style={{ padding: "24px", borderRadius: "16px", marginBottom: 24 }}>
          {/* Validation */}
          <div style={{ fontSize: 18, color: t.text, fontStyle: "italic", borderLeft: `3px solid ${t.subtext}`, paddingLeft: 12, marginBottom: 20 }}>
            "{data.validation}"
          </div>

          {/* Distortions */}
          {data.distortions?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 1 }}>COGNITIVE PATTERNS</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {data.distortions.map((d, i) => (
                  <span key={i} style={{ background: `${t.shadowDark}50`, color: t.text, padding: "4px 10px", borderRadius: "8px", fontSize: 13, fontWeight: 600 }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Trends */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>REFLECTION & INSIGHTS</span>
            <div style={{ fontSize: 16, color: t.text, lineHeight: 1.5, marginTop: 4 }}>{data.trend_insight}</div>
          </div>

          {/* Guiding Question */}
          <div className="neu-card" style={{ padding: "16px", border: `2px solid ${t.accent}` }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 1 }}>Guiding Question</span>
            <div style={{ fontSize: 18, color: t.text, lineHeight: 1.5, marginTop: 8, fontWeight: 600 }}>{data.guiding_question}</div>
          </div>
        </div>

        <button className="neu-btn" onClick={onClose} style={{ width: "100%", padding: "16px", fontSize: 18, fontWeight: 700 }}>
          Close
        </button>

        {/* 🟢 AI DISCLAIMER (React/JSX syntax) */}
        <div style={{ textAlign: "center", color: t.subtext, padding: 12, fontSize: 12, opacity: 0.7 }}>
          Analysis generated by AI. AI can make mistakes.
        </div>

      </div>
    </div>
  );
}


// ─── LOGOUT CONFIRMATION MODAL ──────────────────────────────────────────────
function LogoutConfirmModal({ onConfirm, onCancel }) {
  const { t } = useApp();
  return (
    <div className="glass-modal" onClick={onCancel}>
      <div className="neu-card" style={{ padding: "40px", textAlign: "center", maxWidth: 360, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 16 }}>
          Log Out?
        </div>
        <div style={{ fontSize: 16, color: t.subtext, marginBottom: 32 }}>
          Are you sure you want to log out of your mental health journal space?
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={onCancel} className="neu-btn-flat" style={{ flex: 1, padding: "14px" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="neu-btn neu-btn-primary" style={{ flex: 1, padding: "14px", backgroundColor: "#d9534f", color: "#fff" }}>
            Yes, Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE ACCOUNT CONFIRMATION MODAL ────────────────────────────────────────
function DeleteAccountConfirmModal({ onConfirm, onCancel }) {
  const { t } = useApp();
  return (
    <div className="glass-modal" onClick={onCancel}>
      <div className="neu-card" style={{ padding: "40px", textAlign: "center", maxWidth: 380, width: "100%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#d9534f", marginBottom: 16 }}>
          Delete Account Permanently?
        </div>
        <div style={{ fontSize: 15, color: t.subtext, marginBottom: 32, lineHeight: "1.5" }}>
          This action <strong>cannot be undone</strong>. You will permanently lose all your journal history, streak stats, mood calendars, and custom action plans.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={onCancel} className="neu-btn-flat" style={{ flex: 1, padding: "14px" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="neu-btn" style={{ flex: 1, padding: "14px", backgroundColor: "#d9534f", color: "#fff", fontWeight: "bold" }}>
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL ─────────────────────────────────────────────────────────
// ─── JOURNAL IN MODAL (WITH REAL-TIME AI CBT ASSISTANT) ─────────────────────
// ─── JOURNAL IN MODAL (WITH REAL-TIME & POST-SAVE AI) ─────────────────────
function JournalInModal({ action, onClose, onSaved }) {
  const { t, user } = useApp()
  const [content, setContent] = useState("")
  const [customTitle, setCustomTitle] = useState("General Thoughts")
  const [pastCategories, setPastCategories] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  // 🎙️ Voice & Spotify States
  const [showVoice, setShowVoice] = useState(false);
  const [sessionState, setSessionState] = useState("writing");

  // 🧠 AI States
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(false);
  const [realTimeQuestion, setRealTimeQuestion] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recentQuestionsRef = useRef([]);

  // 🟢 NEW: Holds the deep analysis data after saving
  const [postSaveData, setPostSaveData] = useState(null);

  const renderToggleSwitch = (enabled, onToggle, lockedLabel) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: "none",
        padding: 3,
        background: enabled ? t.accent : t.shadowDark,
        boxShadow: `inset 3px 3px 6px ${t.shadowDark}, inset -3px -3px 6px ${t.shadowLight}`,
        display: "flex",
        alignItems: "center",
        justifyContent: enabled ? "flex-end" : "flex-start",
        cursor: "pointer",
        transition: "all 0.25s ease",
        flexShrink: 0,
      }}
      aria-label={lockedLabel}
    >
      <span style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: t.bg,
        boxShadow: `2px 2px 5px ${t.shadowDark}, -2px -2px 5px ${t.shadowLight}`,
        transition: "all 0.25s ease"
      }} />
    </button>
  );

  useEffect(() => {
    if (!action) {
      axios.get("/api/profile/journal").then(res => {
        const logs = res.data.journal || [];
        const uniqueTitles = [...new Set(logs.map(l => l.action_text))];
        setPastCategories(uniqueTitles.filter(c => c !== 'General Thoughts'));
      }).catch(() => { });
    }
  }, [action])

  // 🟢 REAL-TIME DEBOUNCER (With Anti-Repetition Guard)
  useEffect(() => {
    if (!aiAssistEnabled || user?.tier !== 'pro') return;
    if (content.trim().length < 40) {
      setRealTimeQuestion("");
      return;
    }

    setIsAnalyzing(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const payload = {
          content: content.trim(),
          recent_questions: recentQuestionsRef.current.slice(-2)
        };

        const res = await axios.post("/api/profile/journal/ai-question", payload);

        if (res.data.success && res.data.question) {
          const newQ = res.data.question;
          setRealTimeQuestion(newQ);

          // 🟢 Keep only the last 2 questions in the session history buffer
          recentQuestionsRef.current = [...recentQuestionsRef.current.slice(-1), newQ];
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 1500);

    return () => clearTimeout(delayDebounceFn);
  }, [content, aiAssistEnabled, user?.tier]);

  // 🟢 SAVING LOGIC (Triggers Post-Save Deep Analysis with Cap Enforcement)
  async function handleSave() {
    if (!content.trim()) { onClose(); return }
    setSaving(true)

    try {
      // 1. Save entry to database
      const res = await axios.post("/api/profile/journal", {
        action_id: action ? action.id : null,
        content: content.trim(),
        custom_title: action ? null : customTitle.trim()
      });

      // 2. If AI Analysis toggle is enabled, attempt post-save analysis
      // 2. If AI Analysis toggle is enabled, attempt post-save analysis
      if (aiAnalysisEnabled) {
        if (!user?.accepted_ai_processing) {
          alert("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
          setSaving(false);
          return;
        }

        try {
          const analysisRes = await axios.post("/api/profile/journal/ai-analysis", { content: content.trim() });

          if (analysisRes.data.success) {
            setPostSaveData(analysisRes.data.analysis);

            // 🟢 UPDATE REACT USER STATE & LOCALSTORAGE INSTANTLY
            if (analysisRes.data.journal_ai_count !== undefined) {
              setUser(prev => {
                const updated = { ...prev, journal_ai_count: analysisRes.data.journal_ai_count };
                localStorage.setItem("user", JSON.stringify(updated));
                return updated;
              });
            }

            setSessionState("analysis"); // Show report view
            setSaving(false);
            if (onSaved) onSaved();
            return;
          } else if (analysisRes.data.limit_reached) {
            alert(analysisRes.data.error || "You've reached your monthly limit of 15 Deep Journal Analyses.");
          } else {
            alert(analysisRes.data.error || "Failed to generate analysis.");
          }
        } catch (e) {
          console.error("Analysis failed", e);
          const detailMsg = e.response?.data?.detail;
          alert(detailMsg || "AI Analysis service is currently unavailable.");
        }
      }

      // 3. Fallback / Standard save completion
      if (res.data.vibe_shift) {
        setSessionState("fading");
        setTimeout(() => setSessionState("decompressing"), 600);
      } else {
        if (onSaved) onSaved();
        onClose();
      }
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  async function handleTalkClick() {
    if (!user?.accepted_ai_processing) {
      alert("AI Data Processing consent is revoked. Please enable it under Account Settings -> Data & Consent.");
      return;
    }

    if (user?.tier === "paid" || user?.tier === "pro") {
      setShowVoice(true);
    } else {
      alert("🎙️ Voice Journaling is a Premium feature. Please upgrade your membership to unlock voice inputs!");
    }
  }

  return (
    <div className="glass-modal" onClick={sessionState === "writing" ? onClose : undefined}>
      <div className="neu-card" style={{ padding: "48px 44px", maxWidth: 700, width: "100%", position: "relative" }} onClick={e => e.stopPropagation()}>

        {/* 🎧 THE DECOMPRESSION CARD */}
        {sessionState === "decompressing" && (
          <div style={{ textAlign: "center", animation: "slideUpFade 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards", padding: "40px 0", width: "100%" }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎧</div>
            <h2 style={{ color: t.text, fontSize: 28, marginBottom: 16 }}>Deep breaths.</h2>
            <p style={{ color: t.subtext, fontSize: 18, lineHeight: 1.6, maxWidth: 500, margin: "0 auto", marginBottom: 32 }}>
              That sounded like a tough session. I've queued up an ambient lofi setup on your Spotify to help you decompress.
            </p>
            <button className="neu-inset active-tab" onClick={onClose} style={{ padding: "12px 28px", fontSize: 16, fontWeight: 700, color: t.accent }}>Close Journal</button>
          </div>
        )}

        {/* 🧠 POST-SAVE DEEP ANALYSIS OVERLAY */}
        {sessionState === "analysis" && postSaveData && (
          <div style={{ animation: "slideUpFade 0.5s ease forwards" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: t.text, marginBottom: 24, textAlign: "center" }}>Session Analysis</div>

            <div className="neu-inset" style={{ padding: "24px", borderRadius: "16px", marginBottom: 24 }}>
              <div style={{ fontSize: 18, color: t.text, fontStyle: "italic", borderLeft: `3px solid ${t.subtext}`, paddingLeft: 12, marginBottom: 20 }}>
                "{postSaveData.validation}"
              </div>

              {postSaveData.distortions?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 1 }}>COGNITIVE PATTERNS</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {postSaveData.distortions.map((d, i) => (
                      <span key={i} style={{ background: `${t.shadowDark}50`, color: t.text, padding: "4px 10px", borderRadius: "8px", fontSize: 13, fontWeight: 600 }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: t.subtext, textTransform: "uppercase", letterSpacing: 1 }}>REFLECTION & INSIGHTSd</span>
                <div style={{ fontSize: 16, color: t.text, lineHeight: 1.5, marginTop: 4 }}>{postSaveData.trend_insight}</div>
              </div>

              <div className="neu-card" style={{ padding: "16px", border: `2px solid ${t.accent}` }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: t.accent, textTransform: "uppercase", letterSpacing: 1 }}>Carry This With You</span>
                <div style={{ fontSize: 18, color: t.text, lineHeight: 1.5, marginTop: 8, fontWeight: 600 }}>{postSaveData.guiding_question}</div>
              </div>
            </div>

            <button className="neu-btn neu-btn-primary" onClick={onClose} style={{ width: "100%", padding: "18px", fontSize: 20 }}>
              Close Session
            </button>
          </div>
        )}

        {/* 📝 THE WRITING VIEW */}
        <div style={{
          transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: sessionState === "writing" ? 1 : 0,
          visibility: sessionState === "writing" ? "visible" : "hidden",
          position: sessionState === "writing" ? "relative" : "absolute",
          top: sessionState === "writing" ? "auto" : 0,
        }}>
          {/* 🟢 NEW HEADER: Includes the AI Assist Toggle */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: t.text }}>Journal Entry</div>

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: 20, marginLeft: "auto", flexWrap: "nowrap" }}>

              {/* AI ASSIST TOGGLE */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                <span style={{ fontSize: 14, color: t.subtext, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                  AI Assist {user?.tier !== 'pro' && '🔒'}
                </span>
                {renderToggleSwitch(
                  aiAssistEnabled,
                  () => {
                    if (!user?.accepted_ai_processing) {
                      alert("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
                      return;
                    }
                    if (user?.tier !== "pro") { alert("AI Assist is a Pro feature."); return; }
                    setAiAssistEnabled(!aiAssistEnabled);
                  },
                  "AI Assist toggle"
                )}
              </div>

              {/* AI ANALYSIS TOGGLE + SUBTLE PAID COUNTER */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
                  <span style={{ fontSize: 14, color: t.subtext, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                    Ai Analysis {(user?.tier !== 'pro' && user?.tier !== 'paid') && '🔒'}
                  </span>
                  {renderToggleSwitch(
                    aiAnalysisEnabled,
                    () => {
                      if (!user?.accepted_ai_processing) {
                        alert("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
                        return;
                      }
                      if (user?.tier === "pro" || user?.tier === "paid") {
                        setAiAnalysisEnabled(!aiAnalysisEnabled);
                      } else {
                        alert("AI Deep Journal Analysis is a Paid / Pro feature. Upgrade your account to unlock this feature!");
                      }
                    },
                    "Ai Analysis toggle"
                  )}
                </div>

                {/* 🟢 DISCREET COUNTER FOR PAID USERS */}
                {user?.tier === "paid" && (
                  <span style={{
                    fontSize: 11,
                    color: t.subtext,
                    opacity: 0.65,
                    marginTop: 4,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                    paddingRight: 2
                  }}>
                    {Math.max(0, 15 - (user?.journal_ai_count || 0))} / 15 left this month
                  </span>
                )}
              </div>

            </div>
          </div>

          <div style={{ position: "relative", marginBottom: 24, paddingLeft: 16, borderLeft: `4px solid ${t.accent}` }}>
            {action ? (
              <div style={{ fontSize: 18, color: t.text, fontStyle: "italic" }}>"{action.text}"</div>
            ) : (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  className="neu-input" value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                  onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Enter or select category..."
                  style={{ fontSize: 18, color: t.text, fontStyle: "italic", padding: "8px 36px 8px 12px", width: "100%", background: "transparent", boxShadow: "none", borderBottom: `1px dashed ${t.accent}`, borderRadius: 0 }}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: t.subtext, pointerEvents: "none", opacity: 0.7 }}>▼</span>
                {showDropdown && pastCategories.length > 0 && (
                  <div className="neu-card" style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, padding: "8px 0", marginTop: 4, maxHeight: 200, overflowY: "auto", borderRadius: 16 }}>
                    {pastCategories.map(c => (
                      <div key={c} onClick={() => { setCustomTitle(c); setShowDropdown(false); }} style={{ padding: "10px 20px", fontSize: 17, color: t.text, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = t.selectionBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🟢 NEW REAL-TIME BOX: Sits directly above the text area */}
          {aiAssistEnabled && (
            <div className="neu-inset" style={{
              width: "100%", height: "80px", marginBottom: 16, borderRadius: "16px", padding: "12px 16px",
              display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${t.shadowDark}30`,
              overflow: "hidden"
            }}>
              {isAnalyzing ? (
                <span style={{ fontSize: 15, color: t.subtext, fontStyle: "italic" }}>Thinking...</span>
              ) : realTimeQuestion ? (
                <span style={{ fontSize: 16, color: t.Text, fontWeight: 600, textAlign: "center", animation: "slideUpFade 0.3s ease" }}>
                  {realTimeQuestion}
                </span>
              ) : (
                <span style={{ fontSize: 15, color: t.subtext, fontStyle: "italic" }}>Keep writing. I'll offer a thought when you pause.</span>
              )}
            </div>
          )}

          <div style={{ position: "relative", marginBottom: 30 }}>
            <textarea
              className="neu-input notebook-paper" value={content} onChange={e => setContent(e.target.value)}
              rows={8} placeholder="What are you feeling right now? Let it out..."
              style={{ width: "100%", resize: "vertical", paddingRight: 90, paddingTop: 20 }}
            />
            <button onClick={handleTalkClick} className="neu-btn" style={{ position: "absolute", top: 16, right: 16, padding: "8px 18px", fontSize: 15, borderRadius: "12px", zIndex: 5, fontWeight: 800 }}>Talk</button>
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <button className="neu-btn neu-btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "18px", fontSize: 20 }}>
              {saving ? "Saving..." : "Save Entry"}
            </button>
            <button className="neu-btn" onClick={onClose} style={{ padding: "18px", fontSize: 20 }}>Cancel</button>
          </div>
        </div>

      </div>

      {showVoice && <VoiceRecorderModal onClose={() => setShowVoice(false)} onProcessed={(transcript) => setContent(prev => prev ? prev + "\n\n" + transcript : transcript)} />}

      <style>{`
        @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0px); } }
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
  const { t, user, token, logout, searchQuery, setSearchQuery, activeCat, setActiveCat, setPage, setShareModal } = useApp()
  const [results, setResults] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [pendingCustomAction, setPendingCustomAction] = useState(null)

  // 🟢 NEW: AI Search State
  const [aiToggle, setAiToggle] = useState(false)

  useEffect(() => {
    axios.get("/api/categories")
      .then(r => {
        // 🟢 HARD FILTER: Never display 'Customized' in public category filters
        const publicCats = (r.data.categories || []).filter(c => c.name !== "Customized");
        setCategories(publicCats);
      })
      .catch(() => { });
  }, [])

  // Auto-search when category changes
  useEffect(() => {
    if (activeCat || searchQuery) executeSearch()
  }, [activeCat])

  // 🟢 NEW: Master Search Execution Engine (Handles Ads & AI Routing)
  // 🟢 Corrected Search Execution Engine
  async function executeSearch() {
    if (!searchQuery.trim() && !activeCat) return;

    if (aiToggle) {
      // 🟢 GUEST CHECK: Block AI search without an account
      if (!user || !token) {
        setErrorMsg("AI-powered search requires creating an account and granting AI consent.");
        return;
      }

      if (!user?.accepted_ai_processing) {
        setErrorMsg("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
        return;
      }

      if (user?.tier === "pro" || user?.tier === "paid" || isLocal) {
        runBackendSearch(true);
      } else {
        setLoading(true);
        setErrorMsg("");

        playRewardedAd({
          onWatched: () => runBackendSearch(true),
          onError: (errStr) => {
            setErrorMsg(errStr || "Failed to load video ad.");
            setLoading(false);
          },
          onClosed: () => {
            setErrorMsg("Please finish the video ad to use AI Search.");
            setLoading(false);
          }
        });
      }
      // 🔴 REMOVED: Duplicate runBackendSearch(true) that was bypassing ads/tiers
    } else {
      runBackendSearch(false);
    }
  }

  async function runBackendSearch(useAI) {
    setLoading(true);
    setErrorMsg("");
    setResults([]);
    try {
      const endpoint = useAI ? "/api/search/ai" : "/api/search";
      const params = { q: searchQuery, limit: 12 };
      if (activeCat) params.category = activeCat;

      const res = await axios.get(endpoint, { params });
      if (res.data.error) setErrorMsg(res.data.error);
      setResults(res.data.results || []);
    } catch (err) {
      // 🟢 Catches 403 Forbidden consent errors from backend
      setErrorMsg(err.response?.data?.detail || "Error reaching search engine.");
      setResults([]);
    } finally {
      setLoading(false);
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
              <button
                className="neu-btn"
                onClick={() => setPage(user && token ? "profile" : "login")}
                style={{ padding: "14px 26px", fontSize: 18, color: (!user || !token) ? t.accent : t.text }}
              >
                {user && token ? (user?.name?.split(" ")[0] || "Profile") : "Log In"}
              </button>
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
                onClick={() => {
                  // 🟢 GUEST & CONSENT LOCK
                  if (!user || !token) {
                    setErrorMsg("AI-powered search requires creating an account.");
                    return;
                  }
                  if (!user?.accepted_ai_processing) {
                    setErrorMsg("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
                    return;
                  }
                  setErrorMsg("");
                  setAiToggle(!aiToggle);
                }}
                className={aiToggle ? "neu-inset active-tab" : "neu-btn-flat"}
                style={{
                  padding: "0 18px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 800,
                  fontSize: 16,
                  transition: "all 0.3s",
                  opacity: (!user || !token) ? 0.6 : 1,
                  cursor: "pointer"
                }}
                title={(!user || !token) ? "Create an account to unlock AI search" : undefined}
              >
                AI {aiToggle ? "ON" : "OFF"} {(!user || !token) && "🔒"}
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
  const { t, setActiveVideo, setShareModal, user, token } = useApp() // 🟢 Added user, token
  const [showBenefit, setShowBenefit] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [picked, setPicked] = useState(false)
  const [pickCount, setPickCount] = useState(action.times_picked || 0)

  async function handlePick() {
    // 🟢 GUEST CHECK: Open reminder flow directly without hitting backend
    if (!user || !token) {
      setPicked(true)
      setShowReminder(true)
      return
    }

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
    { title: "Consistency Lvl 1", desc: "Reached a 30-day streak.", unlocked: maxStreak >= 30, icon: "⚡" },
    { title: "Consistency Lvl 2", desc: "Reached a 60-day streak.", unlocked: maxStreak >= 60, icon: "⚡⚡" },
    { title: "Consistency Lvl 3", desc: "Reached a 90-day streak.", unlocked: maxStreak >= 90, icon: "⚡⚡⚡" },
    { title: "GOD Lvl", desc: "Reached a 180-day streak.", unlocked: maxStreak >= 180, icon: "🙇" },

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
function ProfilePage() {
  // 🟢 Grab everything instantly from the Global Cache
  const {
    t, user, setUser, logout, setPage, setViewJournalIn, setCompletionFlow,
    actions, reminders, streaks, moods, liveProfile, isProfileLoading, fetchProfileData
  } = useApp()

  const [profileTab, setProfileTab] = useState("Actions")
  const [view, setView] = useState(7)
  const [viewReport, setViewReport] = useState(null)
  const [showTrophies, setShowTrophies] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // 🟢 1. DECLARED STATE: Prevents the ReferenceError crash
  const [showOnboarding, setShowOnboarding] = useState(false)

  const activeActions = actions.filter(a => a.is_active)
  const completedActions = actions.filter(a => !a.is_active)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - view)
  const filteredMoods = moods.filter(m => new Date(m.date) >= cutoffDate)

  // 🟢 2. BULLETPROOF GUEST ACTION ATTACHER (Works for both standard and custom habits)
  const attachPendingAction = async () => {
    const pendingSetup = localStorage.getItem("pending_action_setup")
    if (!pendingSetup) return

    try {
      const parsed = JSON.parse(pendingSetup)
      let targetActionId = parsed.action_id

      // If it was a custom action created during guest mode, save it to the DB first
      if (parsed.is_custom || String(parsed.action_id).startsWith("custom_")) {
        const customRes = await axios.post("/api/profile/actions/custom", {
          text: parsed.text,
          benefit: parsed.benefit || "",
          is_audio: false,
          is_video: false
        })
        if (customRes.data?.action_id) {
          targetActionId = customRes.data.action_id
        }
      } else {
        await axios.post(`/api/profile/actions/${parsed.action_id}/pick`)
      }

      if (parsed.reminder && targetActionId) {
        await axios.post("/api/profile/reminder", {
          ...parsed.reminder,
          action_id: targetActionId
        })
      }

      localStorage.removeItem("pending_action_setup")
      fetchProfileData(true)
    } catch (e) {
      console.error("Auto-attach failed:", e)
    }
  }

  // 🟢 3. FIRST-TIME DASHBOARD ARRIVAL CHECK
  useEffect(() => {
    if (!user) return;
    const userOnboardKey = `onboarding_done_${user.id}`;

    // Check both the persistent DB property and the per-user localStorage key
    const hasOnboarded = user.onboarding_completed || localStorage.getItem(userOnboardKey);

    if (!hasOnboarded) {
      setShowOnboarding(true);
    } else {
      // Existing user: automatically attach any action selected during guest exploration
      attachPendingAction();
    }
  }, [user]);

  const handleOnboardingComplete = async (chosenConsents) => {
    try {
      await axios.put("/api/profile/consent", {
        ai_consent: chosenConsents.accepted_ai_processing,
        coach_consent: chosenConsents.accepted_coach_disclaimer,
        analytics_consent: chosenConsents.accepted_analytics_data,
        ad_sharing_consent: chosenConsents.accepted_ad_sharing
      });

      const userOnboardKey = user?.id ? `onboarding_done_${user.id}` : "onboarding_done";
      localStorage.setItem(userOnboardKey, "1");

      if (setUser) {
        setUser(prev => {
          const updated = {
            ...prev,
            onboarding_completed: true,
            accepted_ai_processing: chosenConsents.accepted_ai_processing,
            accepted_coach_disclaimer: chosenConsents.accepted_coach_disclaimer,
            accepted_analytics_data: chosenConsents.accepted_analytics_data,
            accepted_ad_sharing: chosenConsents.accepted_ad_sharing
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }

      setShowOnboarding(false);
      await attachPendingAction();
    } catch (e) {
      console.error("Onboarding failed:", e);
      setShowOnboarding(false);
    }
  };

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
              style={{ padding: "14px 24px", fontSize: 18, marginLeft: "126px" }}
            >
              Search
            </button>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="neu-btn" onClick={() => setPage("insights")} style={{ padding: "14px 24px", fontSize: 18 }}>Insights</button>
              <button className="neu-btn" onClick={() => setShowTrophies(true)} style={{ padding: "14px 24px", fontSize: 18 }}>Trophies</button>
              <button className="neu-btn" onClick={() => setPage("ai-chat")} style={{ padding: "14px 24px", fontSize: 18, color: t.accent }}>AI Coach</button>
              <button className="neu-btn" onClick={() => setPage("journal")} style={{ padding: "14px 24px", fontSize: 18 }}>Journal</button>
              <button className="neu-btn" onClick={() => setShowLogoutConfirm(true)} style={{ padding: "14px 24px", fontSize: 18 }}>Log out</button>
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

            <p style={{ color: t.text, fontWeight: 800, fontSize: 32, marginBottom: 8 }}>{liveProfile.username}</p>

            <div
              className="neu-inset"
              style={{
                padding: "6px 16px", borderRadius: "12px", fontSize: 14, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "1px",
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
        {isProfileLoading && activeActions.length === 0 && <BreathingLoader />}

        {!isProfileLoading && profileTab === "Actions" && activeActions.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "70px 0", width: "100%" }}>
            <div style={{ color: t.subtext, fontWeight: 600, fontSize: 22 }}>
              You have no pending actions.
            </div>
            <button
              className="neu-btn"
              onClick={() => setPage("search")} // Uses your global routing callback to switch views instantly
              style={{ padding: "16px 28px", fontSize: 18, color: t.accent, fontWeight: 700 }}
            >
              Add your first Action
            </button>
          </div>
        )}
        {profileTab === "Actions" && activeActions.length > 0 && (
          <div className="action-grid">
            {activeActions.map(a => <ProfileActionCard key={a.id} a={a} isCompletedTab={false} streakData={streaks[a.id]} onViewReport={setViewReport} onCompleteTrigger={(act) => setCompletionFlow({ action: act, step: 'difficulty', intent: 'finish' })} />)}
          </div>
        )}

        {!isProfileLoading && profileTab === "Completed" && completedActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No completed actions yet.</div>}
        {profileTab === "Completed" && completedActions.length > 0 && (
          <div className="action-grid">
            {/* 🟢 FIXED: Passed 'true' to fetchProfileData to force an update if they restart an action! */}
            {completedActions.map(a => <ProfileActionCard key={a.id} a={a} isCompletedTab={true} streakData={streaks[a.id]} onViewReport={setViewReport} onCompleteTrigger={() => fetchProfileData(true)} onReviewFlowTrigger={(act) => setCompletionFlow({ action: act, step: 'review' })} />)}
          </div>
        )}

        {!isProfileLoading && profileTab === "Reminders" && activeActions.length === 0 && <div style={{ textAlign: "center", padding: "70px 0", color: t.subtext, fontWeight: 600, fontSize: 22 }}>No active actions.</div>}
        {profileTab === "Reminders" && activeActions.length > 0 && (
          <div className="action-grid">
            {activeActions.map(a => {
              const rem = reminders.find(r => r.action_id === a.id)
              return <ReminderListCard key={a.id} action={a} rem={rem} onEditTrigger={() => fetchProfileData(true)} />
            })}
          </div>
        )}

        {profileTab === "Streak-Mood" && (
          <>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <MoodWidget onMoodLogged={() => fetchProfileData(true)} />
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
      {showInsights && <InsightsModal actions={actions} moods={moods} user={user} onClose={() => setShowInsights(false)} onTriggerUpgrade={() => { setShowInsights(false); setPage("edit-profile"); }} />}
      {/* 🟢 PASTE THIS LOGOUT OVERLAY BLOCK HERE: */}
      {showLogoutConfirm && (
        <div className="glass-modal" onClick={() => setShowLogoutConfirm(false)}>
          <div className="neu-card" style={{ padding: "40px", textAlign: "center", maxWidth: 360, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, fontWeight: 700, color: t.text, marginBottom: 16 }}>Log Out?</div>
            <div style={{ fontSize: 18, color: t.subtext, marginBottom: 32 }}>Are you sure you want to log out of your session?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button onClick={logout} className="neu-btn neu-btn-primary" style={{ padding: "14px", fontSize: 18 }}>Yes, Log Out</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="neu-btn" style={{ padding: "14px", fontSize: 18 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 Post-Login Onboarding & Personalization Wizard */}
      <OnboardingPersonalizationModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        theme={t}
      />

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

  //  NEW: Manual Trigger Handlers for the Buttons!
  //  FIXED: Handles both Base64 DB strings and securely fetches new generations
  // 🟢 FIXED Web App Audio Player
  async function playAudio(e) {
    e.stopPropagation();

    try {
      // 1. If it's already in the DB, glue the prefix on so the browser understands it!
      if (a.audio_data) {
        // Check if it already has the prefix. If not, add it.
        const hasPrefix = a.audio_data.startsWith("data:audio");
        const audioSrc = hasPrefix ? a.audio_data : `data:audio/wav;base64,${a.audio_data}`;

        new Audio(audioSrc).play().catch(err => console.error("DB Audio failed:", err));
        return;
      }

      // 2. If it's missing, fetch it from your Render backend (NO /api/ in the URL)
      const res = await axios.get(`https://mindactions-api.onrender.com/audio/${a.id}`, {
        responseType: 'blob'
      });

      // 3. Play the downloaded blob
      const localUrl = URL.createObjectURL(res.data);
      new Audio(localUrl).play();

    } catch (err) {
      console.error("Audio fetch failed:", err);
    }
  }

  // Add this right next to your playAudio function!
  const playVideo = (e) => {
    e.stopPropagation();

    // Get the video URL from your action object
    const videoUrl = a.embed_url || a.video_url;

    if (videoUrl) {
      // Opens the YouTube/Video link in a new tab
      window.open(videoUrl, '_blank');
    } else {
      console.error("No video URL found for this action.");
    }
  };

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


// Paste this helper function right above your ReminderListCard component
// Keep this helper function right above the component
function getRemainingDays(createdAt, endInDays) {
  if (!createdAt || !endInDays) return null;

  const startDate = new Date(createdAt);
  const endDate = new Date(startDate.getTime() + (endInDays * 24 * 60 * 60 * 1000));
  const today = new Date();

  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}

function ReminderListCard({ action, rem, onEditTrigger }) {
  const { t } = useApp()
  const [showReminder, setShowReminder] = useState(false)

  let nextString = "No reminder set"
  let box1Label = "Time"
  let box1Value = "08:00 AM"

  if (rem) {
    if (rem.reminder_type === "widget") {
      nextString = "Tap on your home screen"
      box1Label = "Widget"
      box1Value = rem.widget_name ? rem.widget_name : "Home Screen"
    } else if (rem.reminder_type === "location") {
      nextString = `When I ${rem.loc_condition || 'arrive'} at location`
      box1Label = "Location"
      box1Value = "Map Pin"
    } else if (rem.reminder_type === "time" || rem.reminder_type === "both") {
      const now = new Date(); const target = new Date()
      let h = parseInt(rem.target_hour || "08")
      if (rem.target_ampm === "PM" && h !== 12) h += 12; if (rem.target_ampm === "AM" && h === 12) h = 0
      target.setHours(h, parseInt(rem.target_minute || "00"), 0, 0)
      if (target <= now) target.setDate(target.getDate() + 1)

      let nextH = target.getHours(); const nextAmPm = nextH >= 12 ? 'PM' : 'AM'
      nextH = nextH % 12 || 12; const nextM = target.getMinutes().toString().padStart(2, '0')

      box1Label = "Time"
      box1Value = `${rem.target_hour || "08"}:${rem.target_minute || "00"} ${rem.target_ampm || "PM"}`
      nextString = `${String(nextH).padStart(2, '0')}:${nextM} ${nextAmPm}`
      if (rem.reminder_type === "both") {
        nextString += ` or when you arrive`
      }
      {/* BOX 1: Primary Method (Time or Location) */ }
      <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>{box1Label}</span>
        <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>{box1Value}</span>
      </button>

      {/* 🟢 EXTRA BOX: Shows Map Pin alongside Time if both are armed */ }
      {
        rem.reminder_type === "both" && (
          <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Location</span>
            <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>Map Pin</span>
          </button>
        )
      }
    }
  }

  return (
    <>
      <div className="neu-inset" style={{ padding: "30px 32px", marginBottom: 26, borderRadius: 22, display: 'flex', flexDirection: 'column' }}>

        <p style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 24, lineHeight: 1.5 }}>{action.text}</p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", flexWrap: "wrap", gap: 16 }}>

          {/* LEFT SIDE: Clickable Boxes */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {!rem ? (
              <button onClick={() => setShowReminder(true)} className="neu-btn neu-btn-primary" style={{ padding: "16px 28px", fontSize: 18 }}>
                + Add Reminder
              </button>
            ) : (
              <>
                {/* BOX 1: Time / Map / Widget */}
                <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>{box1Label}</span>
                  <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>{box1Value}</span>
                </button>

                {/* BOX 2: Frequency */}
                {rem.frequency_type && (
                  <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Repeats</span>
                    {/* Replaced hardcoded color with t.accent */}
                    <span style={{ fontSize: 20, color: t.accent, fontWeight: 800 }}>{rem.frequency_value} {rem.frequency_type}(s)</span>
                  </button>
                )}

                {/* BOX 3: End At Countdown */}
                {rem.end_in_days && (
                  <button onClick={() => setShowReminder(true)} className="neu-btn" style={{ padding: "16px 22px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, color: t.subtext, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>Ends In</span>
                    <span style={{ fontSize: 20, color: t.text, fontWeight: 800 }}>{getRemainingDays(rem.created_at, rem.end_in_days)} Days</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* RIGHT SIDE: Next Reminder Info in Italic Accent */}
          <div style={{ fontSize: 16, color: t.subtext, fontWeight: 700, fontStyle: "italic", paddingBottom: 8 }}>
            Next reminder: <span style={{ color: t.accent }}>{nextString}</span>
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

  // The state to track the active analysis report
  const [viewingAnalysis, setViewingAnalysis] = useState(null);

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
          <div className="action-grid" style={{ marginBottom: 28 }}>
            <div className="neu-inset" style={{ padding: "24px 36px", borderRadius: 24, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <span style={{ fontSize: 18, color: t.subtext, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Filter by Action:</span>
              <select className="neu-input" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "14px 20px", fontSize: 16, cursor: "pointer", flex: 1, minWidth: 200 }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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

                    {/* 🟢 NEW: AI Analysis Button positioned cleanly next to the Edit button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: "auto", paddingTop: 24 }}>

                      {log.ai_analysis && (
                        <button
                          className="neu-inset active-tab"
                          onClick={() => setViewingAnalysis(log.ai_analysis)}
                          style={{ padding: "10px 20px", fontSize: "16px", fontWeight: 800, color: t.accent, borderRadius: "12px", marginRight: "auto" }}
                        >
                          AI Analysis
                        </button>
                      )}

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

      {/* 🟢 NEW: Triggers the Saved Analysis Modal to pop up */}
      {viewingAnalysis && (
        <SavedAnalysisModal
          data={viewingAnalysis}
          onClose={() => setViewingAnalysis(null)}
        />
      )}
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
/// ─── PHASE 3: HYBRID INSIGHTS & AI COACH ──────────────────────────────────────
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

  // 🟢 1. UI Click Handler
  async function handleGenerateClick() {
    setAiError("");

    // Check user consent directly
    if (user?.accepted_ai_processing === false) {
      setAiError("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
      return;
    }

    executeBackendAI(false);
  }

  // 🟢 2. Physical Call to Python Backend
  async function executeBackendAI(adWatched = false) {
    setAiLoading(true);
    setAiError("");

    try {
      const endpoint = adWatched ? "/api/profile/ai-coach?ad_watched=true" : "/api/profile/ai-coach";
      const res = await axios.get(endpoint);

      if (res.data.success && res.data.data) {
        setAiData(res.data.data);
        setAiLoading(false);
      } else if (res.data.limit_reached) {
        playRewardedAd({
          onWatched: () => executeBackendAI(true),
          onError: (errStr) => {
            setAiLoading(false);
            setAiError(errStr || "Failed to load video ad.");
          },
          onClosed: () => {
            setAiLoading(false);
            setAiError("Finish watching the video to unlock your AI report.");
          }
        });
      } else {
        setAiError(res.data.error || "Failed to generate AI report.");
        setAiLoading(false);
      }
    } catch (err) {
      setAiLoading(false);

      // 🔍 DEBUG: Inspect the exact error object in your browser console
      console.log("Axios Caught Error Object:", err.response);

      // Extract detail string safely from 403 or other error responses
      const backendMessage = err.response?.data?.detail || err.response?.data?.error;

      if (backendMessage) {
        setAiError(backendMessage);
      } else {
        setAiError("AI Data Processing consent is revoked. Please grant consent under Account Settings -> Data & Consent.");
      }
    }
  }

  const moodColors = { "Great": "var(--mood-great)", "Steady": "var(--mood-steady)", "Down": "var(--mood-down)" };
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

                  <button onClick={handleGenerateClick} disabled={aiLoading} className="neu-btn neu-btn-primary" style={{ padding: "10px 18px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    {aiLoading ? "Thinking..." : (user?.tier === "free" || !user?.tier) ? "Watch Ad to Unlock AI" : "Generate AI Analysis"}
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
      // 🟢 FIXED: Removed /api prefix to match your actual Python backend routes
      await axios.post("https://mindactions-api.onrender.com/profile/upgrade", { tier: selectedTier })
      onUpgrade(selectedTier)
      onClose()
    } catch (e) {
      console.error("Upgrade failed", e)
    } finally {
      setSaving(false)
    }
  }

  // 🟢 FIXED: Accurate prices and features reflecting your actual backend logic
  const tiers = [
    {
      id: "free",
      name: "Free Tier",
      price: "$0",
      desc: "For getting started.",
      features: [
        "3 Ai Search - more with ads",
        "Ai Analysis with ads",
        "Custom theme with ads"
      ]
    },
    {
      id: "paid",
      name: "Paid Tier",
      price: "$2.99/mo",
      desc: "For serious habit building.",
      features: [
        "10 Ai Search",
        "Weekly Ai Analysis",
        "3 Custom theme",
        "5 Custom Widgets",
        "Media enabled notifications",
        "Spotify and Google Calendar",
        "Voice Journaling"
      ]
    },
    {
      id: "pro",
      name: "Pro Tier",
      price: "$9.99/mo",
      desc: "The ultimate wellness coach.",
      features: [
        "Ai Coach - conversational",
        "Unlimited Ai Analysis",
        "Unlimited Ai Search",
        "Unlimited Custom Widgets",
        "10 Custom theme",
        "Real-time Ai Assisted Journaling"
      ]
    }
  ]

  return (
    <div className="glass-modal" onClick={onClose}>
      <div className="neu-card" style={{ padding: "50px 40px", maxWidth: 900, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: t.text }}>Upgrade Your MindActions</div>
          <div style={{ fontSize: 18, color: t.subtext, marginTop: 8 }}>Unlock ad-free AI coaching, deep analytics, and unlimited actions.</div>
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
                  onClick={() => {
                    // 1. Paddle Price ID Map
                    const PADDLE_PRICES = {
                      paid_monthly: "pri_01kxdctz94jp0951mjzpmqkazk",
                      paid_annual: "pri_01kxdcze96ywenh928kstw6cs8",
                      pro_monthly: "pri_01kxddar7w3wabd8h7mcg4kzt5",
                      pro_annual: "pri_01kxddbqbfqrgm5gbb0hyye1bx"
                    };

                    // 2. Safe Initialize Paddle if not already done
                    const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "test_bd2a196df0bd1f6c456fd6162eb";
                    if (window.Paddle && !window.Paddle.Status?.isInitialized && paddleToken) {
                      window.Paddle.Environment.set('sandbox');
                      window.Paddle.Initialize({ token: paddleToken });
                    }

                    // 3. Determine Target Price ID
                    const cycle = (typeof isAnnual !== 'undefined' && isAnnual) ? "annual" : "monthly";
                    const tierId = (tier.id || tier.name || "").toLowerCase();
                    const priceKey = `${tierId}_${cycle}`;
                    const targetPriceId = PADDLE_PRICES[priceKey] || PADDLE_PRICES[`${tierId}_monthly`];

                    // 4. SMART USER ID FINDER (Checks Props -> localStorage User -> JWT Token Payload)
                    let currentUserId = typeof user !== "undefined" && user?.id ? user.id : null;

                    if (!currentUserId) {
                      try {
                        // Try reading raw user object
                        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
                        currentUserId = savedUser.id || savedUser.user_id;
                      } catch (e) { }
                    }

                    if (!currentUserId) {
                      try {
                        // Decode JWT token directly from localStorage
                        const rawToken = localStorage.getItem("token") || localStorage.getItem("jwt_token") || localStorage.getItem("access_token");
                        if (rawToken) {
                          const payloadBase64 = rawToken.split(".")[1];
                          const decodedPayload = JSON.parse(atob(payloadBase64));
                          currentUserId = decodedPayload.sub; // 'sub' is user_id in backend make_jwt!
                        }
                      } catch (e) {
                        console.error("Failed to parse JWT token", e);
                      }
                    }

                    // 5. Trigger Paddle Sandbox Checkout
                    if (window.Paddle && targetPriceId && currentUserId) {
                      window.Paddle.Checkout.open({
                        items: [{ priceId: targetPriceId, quantity: 1 }],
                        customData: { userId: currentUserId.toString() },
                        settings: { displayMode: "overlay", theme: "dark", locale: "en" }
                      });
                    } else if (!window.Paddle) {
                      alert("Paddle script is still loading. Please wait 2 seconds and try again.");
                    } else if (!currentUserId) {
                      alert("Unable to detect user session. Please log out, refresh, and log back in.");
                    } else {
                      alert(`Invalid price ID for key: ${priceKey}`);
                    }
                  }}
                  disabled={saving || isCurrent}
                  style={{
                    padding: "16px",
                    fontSize: 18,
                    width: "100%",
                    marginTop: "auto",
                    opacity: (saving || isCurrent) ? 0.6 : 1
                  }}
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

const saveClosingTime = async () => {
  try {
    // Sends the clean 24-hour time text safely straight to api.py!
    const res = await axios.put("/api/profile/closing_time", { closing_time: closingTime });
    if (res.data.success) {
      setShowClosingTimeModal(false);
      // Optional: alert user or toast "Time updated successfully!"
    }
  } catch (err) {
    console.error("Failed to update profile closing time configuration:", err);
  }
};

// -------------------- EditProfilePage --------------------
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

  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [liveTier, setLiveTier] = useState("free");

  const [isGcalLinked, setIsGcalLinked] = useState(false);
  const [isSpotifyLinked, setIsSpotifyLinked] = useState(false);

  async function handleLinkSpotify() {
    try {
      const res = await axios.get("/api/auth/spotify/url");
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to connect to backend for Spotify integration.");
    }
  }

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
        if (res.data && res.data.tier) setLiveTier(res.data.tier);
        if (res.data.gcal_linked !== undefined) setIsGcalLinked(res.data.gcal_linked);
        if (res.data.spotify_linked !== undefined) setIsSpotifyLinked(res.data.spotify_linked);
      })
      .catch(err => console.error("Could not sync live account data:", err));
  }, []);

  async function handleDisconnectGcal() {
    if (!window.confirm("Are you sure you want to disconnect Google Calendar? Reminders will no longer sync.")) return;
    try {
      await axios.post("/api/gcal/disconnect");
      setIsGcalLinked(false);
    } catch (e) { alert("Failed to disconnect Google Calendar."); }
  }

  async function handleDisconnectSpotify() {
    if (!window.confirm("Are you sure you want to disconnect Spotify? Your actions will no longer play music.")) return;
    try {
      await axios.post("/api/spotify/disconnect");
      setIsSpotifyLinked(false);
    } catch (e) { alert("Failed to disconnect Spotify."); }
  }

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

  async function handleExportData() {
    try {
      const res = await axios.get("/api/profile/export", { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'MindActions_Export.txt');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      alert("Data saved to Downloads folder!");
    } catch (e) {
      alert("Failed to compile export data.");
    }
  }

  async function handlePaddlePortal() {
    try {
      const res = await axios.get("/api/profile/subscription/portal");
      if (res.data.success && res.data.url) {
        window.open(res.data.url, "_blank");
      } else {
        alert(res.data.error || "No active Paddle profile found");
      }
    } catch (e) {
      alert("Failed to load billing portal.");
    }
  }

  async function handleConsentToggle(key, currentValue) {
    const newValue = !currentValue;
    setUser((prev) => ({ ...prev, [key]: newValue }));

    try {
      const payload = {
        coach_consent: key === "accepted_coach_disclaimer" ? newValue : undefined,
        analytics_consent: key === "accepted_analytics_data" ? newValue : undefined,
        ad_sharing_consent: key === "accepted_ad_sharing" ? newValue : undefined,
        ai_consent: key === "accepted_ai_processing" ? newValue : undefined,
      };
      await axios.put("/api/profile/consent", payload);
    } catch (err) {
      console.error("Failed to update consent:", err);
      setUser((prev) => ({ ...prev, [key]: currentValue }));
    }
  }

  return (
    <div className="layout-container" style={{ minHeight: "100vh" }}>
      <div style={{ padding: "46px 24px 24px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <GlobalThemePicker />
            <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "14px 24px", fontSize: 18, marginLeft: "128px" }}>
              Back to Profile
            </button>
          </div>
          <span style={{ color: t.text, fontSize: 32, fontWeight: 800 }}>Account Settings</span>
        </div>

        <div className="action-grid" style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>

          {/* IDENTITY BOX */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32, display: "flex", flexDirection: "column", gap: 24, width: "100%", boxSizing: "border-box" }}>
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
              <span style={{ fontSize: 22, color: t.text, fontWeight: 600 }}>Change Password</span>
              <button className="neu-btn" onClick={() => setShowPasswordModal(true)} style={{ padding: "10px 20px", fontSize: 16 }}>Change Password</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text, textTransform: "uppercase", letterSpacing: 1 }}>Closing the Day</div>
                <div style={{ fontSize: 14, color: t.subtext, marginTop: 4 }}>Daily check-ins trigger at this time</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 22, color: t.text, fontWeight: 600 }}>{format12Hour(closingTime)}</span>
                <button className="neu-btn" onClick={() => setShowClosingTimeModal(true)} style={{ padding: "10px 20px", fontSize: 16 }}>Change Time</button>
              </div>
            </div>
          </div>

          {/* SUBSCRIPTION MEMBERSHIP CARD */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", boxSizing: "border-box" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Subscription Membership
              </div>
              <span style={{ fontSize: 24, fontWeight: 800, color: t.text, textTransform: "capitalize" }}>
                {liveTier || "Free"} Account
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button className="neu-btn neu-btn-primary" onClick={() => setShowUpgradeModal(true)} style={{ padding: "14px 28px", fontSize: 18 }}>
                Change Tier
              </button>
            </div>
          </div>

          {/* MOOD TRENDS CARD */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 32, width: "100%", boxSizing: "border-box" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: t.subtext, textTransform: "uppercase", letterSpacing: 1, marginBottom: 24 }}>Mood Trends</div>
            <div><MoodChart moods={moodHistory} /></div>
          </div>

          {/* ABOUT ME CARD */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 24, width: "100%", boxSizing: "border-box" }}>
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

          {/* LINKED APPS */}
          <div className="neu-inset" style={{ padding: 34, borderRadius: 24, marginBottom: 24, width: "100%", boxSizing: "border-box" }}>
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
                ) : isSpotifyLinked ? (
                  <button className="neu-inset active-tab" onClick={handleDisconnectSpotify} style={{ padding: "10px 20px", fontSize: 16, color: "#c94c4c", fontWeight: 800 }}>
                    Linked! Disconnect
                  </button>
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
                ) : isGcalLinked ? (
                  <button className="neu-inset active-tab" onClick={handleDisconnectGcal} style={{ padding: "10px 20px", fontSize: 16, color: "#c94c4c", fontWeight: 800 }}>
                    Linked! Disconnect
                  </button>
                ) : (
                  <button className="neu-btn" onClick={async () => {
                    try {
                      const res = await axios.get("/api/gcal/link");
                      window.location.href = res.data.url;
                    } catch (e) { alert("Failed to generate Google Link."); }
                  }} style={{ padding: "10px 20px", fontSize: 16, color: "#4285F4", fontWeight: 800 }}>
                    Link Calendar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BOX 5: DATA & CONSENT */}
          <div className="neu-card" style={{ padding: "24px", marginBottom: "24px", borderRadius: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "var(--subtext)", marginBottom: "20px" }}>
              Data & Consent
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* 1. AI Data Processing Consent */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: "500" }}>AI Data Processing</span>
                  <InfoTooltip
                    text="Allows processing of journals, mood logs, Actions, and prompts via Google Gemini AI for AI Coach, Deep Analysis, Real-time prompts, AI Search, Action Voice Narrations, and Theme Generation. Your data is PII-scrubbed and never sold or used to train public AI models."
                    theme={t}
                  />
                </div>
                <div style={{ width: "180px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg)", boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.05)", flexShrink: 0
                  }}>
                    {user?.accepted_ai_processing ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                  </div>
                  <button
                    className="neu-btn"
                    onClick={() => handleConsentToggle("accepted_ai_processing", user?.accepted_ai_processing)}
                    style={{ width: "136px", height: "36px", fontSize: "13px", fontWeight: "bold", color: user?.accepted_ai_processing ? "#ef4444" : "#22c55e", padding: 0 }}
                  >
                    {user?.accepted_ai_processing ? "Revoke" : "Consent"}
                  </button>
                </div>
              </div>

              {/* 2. AI Coach Disclaimer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: "500" }}>AI Coach Disclaimer</span>
                  <InfoTooltip
                    text="Acknowledges that the AI Coach is an automated conversational mindfulness tool for self-reflection and NOT a licensed therapist, clinician, or medical diagnosis service."
                    theme={t}
                  />
                </div>
                <div style={{ width: "180px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg)", boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.05)", flexShrink: 0
                  }}>
                    {user?.accepted_coach_disclaimer ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                  </div>
                  <button
                    className="neu-btn"
                    onClick={() => handleConsentToggle("accepted_coach_disclaimer", user?.accepted_coach_disclaimer)}
                    style={{ width: "136px", height: "36px", fontSize: "13px", fontWeight: "bold", color: user?.accepted_coach_disclaimer ? "#ef4444" : "#22c55e", padding: 0 }}
                  >
                    {user?.accepted_coach_disclaimer ? "Revoke" : "Consent"}
                  </button>
                </div>
              </div>

              {/* 3. Analytical Data Collection */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: "500" }}>Analytical Data Collection</span>
                  <InfoTooltip
                    text="Applies strictly to the public website (mindactions.app) via Cloudflare Web Analytics (no cookies, no PII). We DO NOT collect analytical tracking data inside our WebApp (app.mindactions.app) or Android app."
                    theme={t}
                  />
                </div>
                <div style={{ width: "180px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg)", boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.05)", flexShrink: 0
                  }}>
                    {user?.accepted_analytics_data ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                  </div>
                  <button
                    className="neu-btn"
                    onClick={() => handleConsentToggle("accepted_analytics_data", user?.accepted_analytics_data)}
                    style={{ width: "136px", height: "36px", fontSize: "13px", fontWeight: "bold", color: user?.accepted_analytics_data ? "#ef4444" : "#22c55e", padding: 0 }}
                  >
                    {user?.accepted_analytics_data ? "Revoke" : "Consent"}
                  </button>
                </div>
              </div>

              {/* 4. Third-Party Data Sharing for Ads */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: "500" }}>Third-Party Data Sharing for Ads</span>
                  <InfoTooltip
                    text="Covers basic, non-personal ad interaction counters for rewarded video ads (Propeller Ads/AdMob). No personal account details, journals, or health logs are ever shared."
                    theme={t}
                  />
                </div>
                <div style={{ width: "180px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center",
                    background: "var(--bg)", boxShadow: "inset 2px 2px 5px rgba(0,0,0,0.6), inset -2px -2px 5px rgba(255,255,255,0.05)", flexShrink: 0
                  }}>
                    {user?.accepted_ad_sharing ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    )}
                  </div>
                  <button
                    className="neu-btn"
                    onClick={() => handleConsentToggle("accepted_ad_sharing", user?.accepted_ad_sharing)}
                    style={{ width: "136px", height: "36px", fontSize: "13px", fontWeight: "bold", color: user?.accepted_ad_sharing ? "#ef4444" : "#22c55e", padding: 0 }}
                  >
                    {user?.accepted_ad_sharing ? "Revoke" : "Consent"}
                  </button>
                </div>
              </div>

              {/* 5. Billing & Invoices Portal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "500" }}>Billing & Invoices Portal</span>
                <button
                  className="neu-btn"
                  onClick={handlePaddlePortal}
                  style={{ width: "180px", height: "36px", fontSize: "13px", fontWeight: "bold", color: "var(--accent)", padding: 0 }}
                >
                  Manage Billing
                </button>
              </div>

              {/* 6. Download Personal Archive */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "500" }}>Download personal archive</span>
                <button
                  className="neu-btn"
                  onClick={handleExportData}
                  style={{ width: "180px", height: "36px", fontSize: "13px", fontWeight: "bold", color: "var(--text)", padding: 0 }}
                >
                  Export Data
                </button>
              </div>

              {/* 7. Permanently Remove Data */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "15px", fontWeight: "500" }}>Permanently remove data</span>
                <button
                  className="neu-btn"
                  onClick={() => setShowDeleteModal(true)}
                  style={{ width: "180px", height: "36px", fontSize: "13px", fontWeight: "bold", color: "#ef4444", padding: 0 }}
                >
                  Delete Account
                </button>
              </div>

            </div>

            <p style={{ marginTop: "24px", fontSize: "11px", color: "var(--subtext)", textAlign: "center", lineHeight: "1.5" }}>
              <strong>Medical Disclaimer:</strong> This app functions as an automated educational tool for mental wellness and self-reflection. It is not a licensed clinician, cannot diagnose medical conditions, and is not a replacement for professional therapy or medical care.
            </p>

            <p style={{ marginTop: "12px", fontSize: "12px", color: "var(--subtext)", textAlign: "center" }}>
              To see all information about privacy and data collection, refer to{" "}
              <a
                href="https://www.mindactions.app/trust-safety"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", fontWeight: "bold", textDecoration: "underline" }}
              >
                Trust & Safety
              </a>.
            </p>
          </div>

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
      )}

      {showUpgradeModal && (
        <UpgradeModal
          currentTier={user?.tier || "free"}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={(newTier) => {
            const updatedUser = { ...user, tier: newTier };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
          }}
        />
      )}

      {showClosingTimeModal && (
        <ClosingTimeModal
          initialTime={closingTime}
          onClose={() => setShowClosingTimeModal(false)}
          onSave={(formattedTime) => {
            if (typeof setClosingTime === "function") {
              setClosingTime(formattedTime);
            }
          }}
        />
      )}
    </div>
  )
}

const savedToken = localStorage.getItem("token") || null;
if (savedToken) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
}

export default function App() {
  const [themeName, setThemeNameState] = useState(() => localStorage.getItem("theme") || "dark")
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("user")) } catch { return null } })
  const [token, setToken] = useState(savedToken)
  const [page, setPage] = useState(null)

  const [activeNotification, setActiveNotification] = useState(null)
  const [completionFlow, setCompletionFlow] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeCat, setActiveCat] = useState(null)

  const [viewJournalIn, setViewJournalIn] = useState(null)
  const [genericJournalModal, setGenericJournalModal] = useState(false)
  const [shareModal, setShareModal] = useState(null)

  // 🟢 NEW: Holds the custom theme object from the database
  const [customThemeObj, setCustomThemeObj] = useState(user?.custom_theme || null);
  const [showThemeGenerator, setShowThemeGenerator] = useState(false);

  // 🟢 FIXED: If the AI misses a color, it falls back to the Dark Theme instead of crashing!
  const t = themeName === 'custom' && customThemeObj
    ? { ...THEMES.dark, ...customThemeObj }
    : (THEMES[themeName] || THEMES.calm);


  // 🟢 NEW: GLOBAL PROFILE CACHE STATE
  const [actions, setActions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [moods, setMoods] = useState([]);
  const [liveProfile, setLiveProfile] = useState({ username: user?.name || "User", email: "", tier: "free" });
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Add these near your other useState hooks like showVoice, etc.
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);



  // 🟢 NEW: GLOBAL FETCH ENGINE (Only fetches if empty, or forced)
  const fetchProfileData = (force = false) => {
    if (!token) return;
    if (isProfileLoaded && !force) return;

    setIsProfileLoading(true);

    axios.get("/api/profile/me").then(res => setLiveProfile(res.data)).catch(() => { });

    axios.get("/api/profile/actions").then(async res => {
      const fetchedActions = res.data.actions || [];
      setActions(fetchedActions);
      const s = {};
      await Promise.all(fetchedActions.map(async (a) => {
        try { s[a.id] = (await axios.get(`/api/profile/streak/${a.id}`)).data; } catch { }
      }));
      setStreaks(s);
      setIsProfileLoaded(true);
      setIsProfileLoading(false);
    }).catch(() => setIsProfileLoading(false));

    axios.get("/api/profile/reminders").then(res => setReminders(res.data.reminders || [])).catch(() => { });

    axios.get("/api/profile/mood").then(res => {
      setMoods(res.data.moods || []);
      if (res.data.moods?.length > 0) window.lastMood = res.data.moods[res.data.moods.length - 1].mood;
    }).catch(() => { });

    axios.get("/api/profile/settings").then(res => {
      const closing = res.data.closing_time || "20:00";
      const [cH, cM] = closing.split(":").map(Number);
      const now = new Date();
      if (now.getHours() > cH || (now.getHours() === cH && now.getMinutes() >= cM)) {
        const todayStr = now.toISOString().split("T")[0];
        if (!localStorage.getItem(`closing_prompt_${todayStr}`)) {
          localStorage.setItem(`closing_prompt_${todayStr}`, "1");
          if (window.confirm("Closing the Day: Are you in a mood to Journal-In your day?")) {
            setGenericJournalModal(true);
          }
        }
      }
    }).catch(() => { });
  };

  // 🟢 NEW: CACHE TRIGGERS
  // 1. Initial Load: Only fetch when the user actually looks at the profile
  useEffect(() => {
    if (page === "profile" && !isProfileLoaded) fetchProfileData();
  }, [page, isProfileLoaded]);

  // 2. Global Listener: Quietly refreshes data in background if they log an action
  useEffect(() => {
    const handleRefresh = () => fetchProfileData(true);
    window.addEventListener("refresh-profile", handleRefresh);
    return () => window.removeEventListener("refresh-profile", handleRefresh);
  }, [token]);

  // 🟢 1. Safe Initialize Paddle once when the Web App loads
  useEffect(() => {
    const paddleToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "test_bd2a196df0bd1f6c456fd6162eb";
    if (window.Paddle && paddleToken) {
      try {
        window.Paddle.Environment.set('sandbox'); // Use 'sandbox' while testing
        window.Paddle.Initialize({
          token: paddleToken
        });
      } catch (e) {
        console.error("Paddle initialization error:", e);
      }
    }
  }, []);

  // 🟢 3. Catches checkout links coming from the Android App
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const priceId = params.get("price_id");
    const userId = params.get("user_id");

    if (action === "checkout" && priceId && userId && window.Paddle) {
      window.Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customData: { userId: userId },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en",
          successUrl: window.location.href
        }
      });
    }
  }, []);

  // 🟢 2. Trigger function called when a user clicks "Select Plan"
  const handlePaddleCheckout = (priceId) => {
    if (!window.Paddle || !user?.id) return;

    window.Paddle.Checkout.open({
      items: [{ priceId: priceId, quantity: 1 }],
      customData: {
        userId: user.id.toString() // Pass user ID so webhook knows who paid!
      },
      settings: {
        displayMode: "overlay",
        theme: "dark",
        locale: "en"
      }
    });
  };



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

      axios.get("/api/profile/me").then(res => {
        if (res.data.custom_theme) {
          setCustomThemeObj(res.data.custom_theme);
        }
        setUser(prev => {
          if (!prev) return prev;
          const updatedUser = {
            ...prev,
            tier: res.data.tier,
            custom_theme: res.data.custom_theme,
            journal_ai_count: res.data.journal_ai_count,
            accepted_coach_disclaimer: res.data.accepted_coach_disclaimer,
            accepted_analytics_data: res.data.accepted_analytics_data,
            accepted_ad_sharing: res.data.accepted_ad_sharing,
            accepted_ai_processing: res.data.accepted_ai_processing,
            created_at: res.data.created_at || prev?.created_at
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          return updatedUser;
        });
      }).catch(() => { });

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
    if (window.location.pathname.startsWith("/reset-password")) { setPage("reset-password"); return }

    // 🟢 KEEP ON LANDING IF NOT LOGGED IN
    setPage(user && token ? "profile" : "landing")
    return () => clearInterval(shadowInterval)
  }, [token])

  const ctx = {
    t, themeName, setThemeName, user, setUser, token, setToken, setShowThemeGenerator, customThemeObj,
    setCustomThemeObj, logout: () => {
      // 🟢 Remove only session credentials; do NOT wipe account preferences
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setupAxios(null);
      setPage("landing");
    },
    scheduleNotification, cancelNotification, setCompletionFlow, setPage, searchQuery, setSearchQuery, activeCat, setActiveCat,
    goToCategory: (c) => { setSearchQuery(""); setActiveCat(c); setPage("search") }, setViewJournalIn, setGenericJournalModal, setActiveVideo, setShareModal,
    actions, reminders, streaks, moods, liveProfile, isProfileLoading, fetchProfileData
  }



  function render() {
    if (page === "landing" || page === null) return <PublicLandingPage onNavigate={setPage} />
    if (page === "guest-search") return <SearchPage />
    if (page === "callback") return <AuthCallback onNavigate={setPage} />

    // 🟢 1. UNPROTECTED SECURITY ROUTES (Must be placed BEFORE !user || !token)
    if (page === "verify") {
      return (
        <VerifyEmail
          emailOnRegistration={localStorage.getItem("pending_verify_email") || ""}
          onSuccess={() => setPage("login")}
        />
      )
    }
    if (page === "forgot-password") {
      return (
        <RequestPasswordReset
          onBack={() => setPage("login")}
        />
      )
    }
    if (page === "reset-password") {
      return (
        <ResetPasswordConfirm
          onSuccess={() => setPage("login")}
        />
      )
    }

    // 🟢 2. AUTHENTICATION GATE
    if (!user || !token) {
      return (
        <LoginPage
          onNavigate={setPage}
          initialMode={page === "signup" ? "signup" : "login"}
        />
      )
    }

    // 🟢 3. PROTECTED APP ROUTES
    if (page === "profile") return <ProfilePage />
    if (page === "insights") return <InsightsPage />
    if (page === "journal") return <JournalPage />
    if (page === "edit-profile") return <EditProfilePage />
    if (page === "ai-chat") return <AiCoachPage />
    return <SearchPage />
  }

  return (
    <AppCtx.Provider value={ctx}>

      <div className={`app-wrapper theme-${themeName}`} style={{ '--bg': t.bg, '--shadow-d': t.shadowDark, '--shadow-l': t.shadowLight, '--accent': t.accent, '--accent-text': t.accentText, '--text': t.text, '--subtext': t.subtext, '--placeholder': t.placeholder, '--streak-on': t.streakOn, '--streak-off': t.streakOff, '--bg-rgb': t.bg, '--selection-bg': t.selectionBg, minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&family=Patrick+Hand&display=swap');

          :root { --sh-x: 6px; --sh-y: 6px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes breathe { 0%, 100% { opacity: 0.5; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-track { background: var(--bg); box-shadow: inset 3px 3px 6px var(--shadow-d); }
          ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 8px; border: 2px solid var(--bg); }
          ::-webkit-scrollbar-thumb:hover { background: var(--text); }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Patrick Hand', cursive; background: var(--bg); margin: 0; line-height: 1.8; letter-spacing: 0.5px; }
          input, select, button, textarea { font-family: 'Patrick Hand', cursive; }
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

        {showThemeGenerator && <ThemeGeneratorModal onClose={() => setShowThemeGenerator(false)} />}

      </div>
    </AppCtx.Provider>
  )
}

// 🟢 2. Trigger function called when a user clicks "Select Plan"
const handlePaddleCheckout = (priceId) => {
  if (!window.Paddle || !user?.id) return;

  window.Paddle.Checkout.open({
    items: [{ priceId: priceId, quantity: 1 }],
    customData: {
      userId: user.id.toString() // Pass user ID so webhook knows who paid!
    },
    settings: {
      displayMode: "overlay",
      theme: "dark",
      locale: "en"
    }
  });
};

// ─── AI IMAGE THEME GENERATOR MODAL ──────────────────────────────────────────
// ─── AI IMAGE THEME GENERATOR MODAL ──────────────────────────────────────────
function ThemeGeneratorModal({ onClose }) {
  const { t, user, setUser, setCustomThemeObj, setThemeName } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [mimeType, setMimeType] = useState(null);

  // 🟢 State to hold the verified live tier from the database
  const [verifiedTier, setVerifiedTier] = useState(user?.tier || "free");

  // 🟢 Fetch the absolute truth from the backend the moment the modal opens
  useEffect(() => {
    axios.get("/api/profile/me")
      .then(res => {
        if (res.data && res.data.tier) {
          setVerifiedTier(res.data.tier);
          setUser(prev => ({ ...prev, tier: res.data.tier }));
        }
      })
      .catch(e => console.error("Could not verify user tier"));
  }, []);

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    setMimeType(file.type);
    setPreviewUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Data(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  // 1. Triggers the flow: checks membership tier, plays 2 ads if free, then calls backend AI
  async function triggerThemeGeneration() {
    if (!base64Data) return;

    if (!user?.accepted_ai_processing) {
      setError("AI Data Processing consent is revoked. Please grant consent in Account Settings -> Data & Consent.");
      return;
    }

    executeBackendAI(false);
  }

  return (
    <div className="glass-modal">
      <div className="neu-card" style={{ padding: "40px", maxWidth: 500, width: "100%", textAlign: "center" }}>

        <div style={{ fontSize: 28, fontWeight: 800, color: t.text, marginBottom: 12 }}>AI Aesthetic Generator</div>
        <div style={{ fontSize: 16, color: t.subtext, marginBottom: 32, lineHeight: 1.6 }}>
          Upload an image, artwork, or photo. Our AI will analyze the aesthetics and generate a balanced Neumorphic theme for your app.
        </div>

        {error && <div style={{ color: "#c94c4c", fontWeight: 700, marginBottom: 20 }}>{error}</div>}

        <label style={{ display: "block", marginBottom: 32, cursor: "pointer" }}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 16, border: `3px solid ${t.accent}` }} />
          ) : (
            <div className="neu-inset" style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, border: `2px dashed ${t.subtext}` }}>
              <span style={{ fontSize: 18, color: t.subtext, fontWeight: 700 }}>Tap to select an image</span>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            className="neu-btn neu-btn-primary"
            onClick={triggerThemeGeneration}
            disabled={loading || !base64Data}
            style={{ padding: "18px", fontSize: 18, width: "100%" }}
          >
            {loading
              ? adStep > 0
                ? `Watching Ad ${adStep} of 2...`
                : "AI is designing your app..."
              : (verifiedTier === "free" || !verifiedTier)
                ? "Watch 2 Ads to Generate Theme"
                : "Generate Custom Theme"}
          </button>

          <button className="neu-btn" onClick={onClose} disabled={loading} style={{ padding: "16px", fontSize: 18, width: "100%" }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}


// ─── VOICE RECORDER MODAL ────────────────────────────────────────────────────
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
        // 🟢 FIX 1: Disconnect the API trigger BEFORE stopping the recorder during cleanup!
        mediaRecorder.current.onstop = null;
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 🟢 FIX 2: Wipe any corrupted data from previous React StrictMode mountings
      audioChunks.current = [];

      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);

      // Only trigger API processing on a normal, intentional stop
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
          // 🟢 Optional: If you want to absolutely block Gemini's known static hallucinations:
          let finalTex = res.data.transcription.trim();
          const hallucinations = ["the dog ate my homework", "is it possible to do a video call?", "empty", "empty."];
          if (hallucinations.includes(finalTex.toLowerCase())) {
            finalTex = ""; // Wipe the text if it's a known static hallucination
          }

          if (finalTex) {
            onProcessed(finalTex, res.data.ai_reply);
          }
        } else {
          alert(res.data.error);
        }
      } catch (e) {
        alert("Error connecting to Voice AI.");
      }
      onClose();
    };
  };

  return (
    <div className="glass-modal" onClick={e => e.stopPropagation()}>
      <div className="neu-card" style={{ padding: "40px", textAlign: "center", maxWidth: 360, width: "100%" }} onClick={e => e.stopPropagation()}>

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

// ─── AI WELL-BEING COACH PAGE (PRO ONLY) ────────────────────────────────────
// ─── AI WELL-BEING COACH PAGE (PRO ONLY) ────────────────────────────────────
function AiCoachPage() {
  const { t, setPage, user } = useApp();
  const [hasAccepted, setHasAccepted] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Sidebar & Search State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, content }
  const [isAnswering, setIsAnswering] = useState(false);

  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    axios.get("/api/profile/coach/disclaimer")
      .then(res => {
        setHasAccepted(res.data.accepted);
        if (res.data.accepted) fetchSessions();
        setCheckingAuth(false);
      })
      .catch(err => {
        alert("The AI Well-Being Coach is a Pro-exclusive feature.");
        setPage("profile");
      });
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnswering]);

  const fetchSessions = () => {
    axios.get("/api/profile/coach/sessions").then(res => setSessions(res.data.sessions));
  };

  const acceptDisclaimer = async () => {
    await axios.post("/api/profile/coach/disclaimer");
    setHasAccepted(true);
    fetchSessions();
  };

  const createNewChat = async () => {
    const res = await axios.post("/api/profile/coach/sessions");
    fetchSessions();
    setActiveSessionId(res.data.id);
    setMessages([]);
  };

  const loadSession = async (id) => {
    setActiveSessionId(id);
    const res = await axios.get(`/api/profile/coach/sessions/${id}`);
    setMessages(res.data.messages);
    setReplyTo(null);
  };

  // 🟢 NEW: Delete Session Handler
  const deleteSession = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this chat session?")) return;
    try {
      await axios.delete(`/api/profile/coach/sessions/${id}`);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      fetchSessions();
    } catch (e) {
      alert("Failed to delete session.");
    }
  };

  const sendMessage = async () => {
    if (!inputMsg.trim() || !activeSessionId) return;

    if (!user?.accepted_ai_processing) {
      alert("AI Data Processing consent is revoked. Please grant consent in Account Settings -> Data & Consent to use AI Coach.");
      return;
    }

    const newMsg = { id: Date.now(), role: "user", content: inputMsg, reply_content: replyTo?.content };
    setMessages(prev => [...prev, newMsg]);
    setIsAnswering(true);

    const payload = { content: inputMsg, reply_to_id: replyTo?.id };
    const savedInput = inputMsg; // Save it in case we need to roll back
    setInputMsg("");
    setReplyTo(null);

    try {
      const res = await axios.post(`/api/profile/coach/sessions/${activeSessionId}/message`, payload);

      // 🟢 FIXED: Check if the backend returned an error safely!
      if (res.data.error) {
        alert(res.data.error);
        // Rollback the user's message from the screen since it failed to send
        setMessages(prev => prev.filter(m => m.id !== newMsg.id));
        setInputMsg(savedInput); // Put their text back in the input box so they don't lose it
        return;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, role: res.data.role, content: res.data.content }]);
      if (sessions.length === 1 && sessions[0].title === "New Wellness Chat") fetchSessions();
    } catch (e) {
      alert("Failed to send message. Please check your connection.");
      setMessages(prev => prev.filter(m => m.id !== newMsg.id));
      setInputMsg(savedInput);
    } finally {
      setIsAnswering(false);
    }
  };

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (checkingAuth) return <div className="layout-container"><BreathingLoader /></div>;

  if (!hasAccepted) {
    return (
      <div className="glass-modal">
        <div className="neu-card" style={{ padding: "50px", maxWidth: 600, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🛡️</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: t.text, marginBottom: 20 }}>Important Disclaimer</div>
          <div className="neu-inset" style={{ padding: 24, borderRadius: 16, fontSize: 18, color: t.text, lineHeight: 1.7, textAlign: "left", marginBottom: 30, borderLeft: `4px solid #c94c4c` }}>
            This app functions as an automated educational tool for mental wellness and self-reflection. It is not a licensed clinician, cannot diagnose medical conditions, and is not a replacement for professional therapy or medical care.
            <br /><br />
            All conversations are secured with Database-Level End-to-End Encryption.
          </div>
          <button className="neu-btn neu-btn-primary" onClick={acceptDisclaimer} style={{ width: "100%", padding: "20px", fontSize: 20 }}>
            Understood
          </button>
          <button className="neu-btn-flat" onClick={() => setPage("profile")} style={{ width: "100%", padding: "20px", fontSize: 18, marginTop: 10 }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    // 🟢 FIXED: Adjusted layout container bounds to perfectly lock into the viewport
    <div className="layout-container" style={{ height: "100vh", padding: "24px", paddingTop: "24px", display: "flex", gap: 24, boxSizing: "border-box" }}>

      {/* LEFT SIDEBAR: CHAT HISTORY */}
      <div className="neu-card" style={{ width: 340, display: "flex", flexDirection: "column", padding: 20, borderRadius: 24, height: "100%", boxSizing: "border-box" }}>

        <button className="neu-btn" onClick={() => setPage("profile")} style={{ padding: "12px", marginBottom: 24, marginTop: 70, fontWeight: 700 }}>← Back to Profile</button>

        <button className="neu-btn neu-btn-primary" onClick={createNewChat} style={{ padding: "16px", fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontSize: 24, lineHeight: 0 }}>+</span> New Session
        </button>

        <input
          className="neu-input" placeholder="Search sessions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", marginBottom: 20 }}
        />

        {/* Scrollable list of sessions */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 8 }}>
          {filteredSessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s.id)} className={activeSessionId === s.id ? "neu-inset active-tab" : "neu-btn"} style={{ padding: "16px", borderRadius: 16, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 13, color: t.subtext, marginTop: 4 }}>{new Date(s.date).toLocaleDateString()}</div>
              </div>

              {/* Delete Session Button */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                className="neu-btn-flat"
                style={{ minWidth: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#c94c4c", borderRadius: "50%", padding: 0 }}
                title="Delete Chat"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* 🟢 AI DISCLAIMER: Placed exactly at the bottom of the sidebar! */}
        <div style={{
          marginTop: "auto",
          paddingTop: 16,
          textAlign: "center",
          color: t.subtext,
          fontSize: 12,
          opacity: 0.6,
          fontStyle: "italic"
        }}>
          AI Coach can make mistakes.
        </div>

      </div>

      {/* RIGHT CHAT WINDOW */}
      {/* 🟢 FIXED: minWidth: 0 prevents the flex-container from stretching out of bounds on long text! */}
      <div className="neu-inset" style={{ flex: 1, minWidth: 0, borderRadius: 24, display: "flex", flexDirection: "column", padding: 24, height: "100%", boxSizing: "border-box" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 20, borderBottom: `1px solid ${t.shadowDark}30`, marginBottom: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: t.text }}>AI Well-Being Coach</div>
            <div style={{ fontSize: 14, color: t.subtext, fontWeight: 700 }}>🔒 Encrypted Session</div>
          </div>
        </div>

        {/* MESSAGES AREA */}
        {/* 🟢 FIXED: minHeight: 0 ensures the scroll box doesn't push the input bar off the screen */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24, paddingRight: 12 }}>
          {!activeSessionId ? (
            <div style={{ margin: "auto", textAlign: "center", color: t.subtext, fontSize: 18 }}>Select a session or start a new chat.</div>
          ) : messages.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: t.subtext, fontSize: 18 }}>Say hello to your Well-Being Coach!</div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isCrisis = msg.role === "crisis_system";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", width: "100%" }}>

                  {/* REPLY THREAD CONTEXT UI */}
                  {msg.reply_content && (
                    <div style={{ maxWidth: "70%", padding: "8px 16px", marginBottom: -10, backgroundColor: t.selectionBg, color: t.text, fontSize: 14, borderRadius: "16px 16px 0 0", opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      Replying to: "{msg.reply_content}"
                    </div>
                  )}

                  {/* 🟢 FIXED: WHATSAPP-STYLE MESSAGE ROW */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, maxWidth: "85%", flexDirection: isUser ? "row-reverse" : "row" }}>

                    {/* The Bubble */}
                    <div
                      className={isUser ? "neu-card" : "neu-inset"}
                      style={{
                        padding: "16px 24px",
                        borderRadius: 24,
                        fontSize: 18,
                        color: isCrisis ? "#fff" : t.text,
                        backgroundColor: isCrisis ? "#c94c4c" : undefined,
                        border: isCrisis ? "none" : undefined,
                        lineHeight: 1.5
                      }}
                    >
                      {msg.content}
                    </div>

                    {/* 🟢 NEW: TELEGRAM/WHATSAPP STYLE REPLY ICON BUTTON (Only for Coach messages) */}
                    {!isUser && !isCrisis && (
                      <button
                        onClick={() => setReplyTo({ id: msg.id, content: msg.content })}
                        className="neu-btn"
                        style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, padding: 0, opacity: 0.8, flexShrink: 0 }}
                        title="Reply to this message"
                      >
                        ↩️
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}

          {isAnswering && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px" }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span className="wave-bar" style={{ height: 16 }}></span>
                <span className="wave-bar" style={{ height: 16 }}></span>
                <span className="wave-bar" style={{ height: 16 }}></span>
              </div>
              <span style={{ fontSize: 16, color: t.subtext, fontStyle: "italic", fontWeight: 700 }}>Coach is typing...</span>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* INPUT AREA */}
        {activeSessionId && (
          <div style={{ marginTop: 20, flexShrink: 0 }}>
            {replyTo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", backgroundColor: t.selectionBg, borderRadius: "16px 16px 0 0", color: t.text }}>
                <span style={{ fontSize: 14, fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Replying: "{replyTo.content}"</span>
                <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", color: t.subtext, cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <input
                className="neu-input"
                placeholder="Type your message..."
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                style={{ flex: 1, padding: "18px 24px", fontSize: 18, borderRadius: replyTo ? "0 0 16px 16px" : 24 }}
              />
              <button className="neu-btn neu-btn-primary" onClick={sendMessage} disabled={isAnswering || !inputMsg.trim()} style={{ padding: "0 32px", fontSize: 18, borderRadius: 24, fontWeight: 800 }}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



export function VerifyEmail({ emailOnRegistration, onSuccess }) {
  const { t } = useApp()
  const [email, setEmail] = useState(emailOnRegistration || localStorage.getItem("pending_verify_email") || '')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const backendUrl = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : "https://mindactions-api.onrender.com"

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await axios.post(`${backendUrl}/auth/verify-email`, {
        email: email.trim(),
        code: code.trim()
      })

      setMessage(res.data.message || 'Email verified successfully! Redirecting to login...')
      localStorage.removeItem("pending_verify_email")
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) { setError("Please enter your email."); return; }
    setResending(true)
    setError('')
    setMessage('')
    try {
      const res = await axios.post(`${backendUrl}/auth/resend-verification`, { email: email.trim() })
      setMessage(res.data.message || "A new PIN has been sent to your email.")
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resend code.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="neu-card" style={{ padding: "50px 46px", width: "100%", maxWidth: 460, borderRadius: 24, textAlign: "center" }}>

        <div style={{ fontSize: 44, fontWeight: 700, color: t.text, marginBottom: 8 }}>MindActions</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.text, marginBottom: 8 }}>Confirm Your Email</div>
        <div style={{ fontSize: 16, color: t.subtext, marginBottom: 28, lineHeight: 1.5 }}>
          Enter the 6-digit verification PIN sent to your inbox.
        </div>

        {error && <div className="neu-inset" style={{ padding: "14px 18px", marginBottom: 20, color: "#c94c4c", fontSize: 16, fontWeight: 700 }}>{error}</div>}
        {message && <div className="neu-inset" style={{ padding: "14px 18px", marginBottom: 20, color: "#22c55e", fontSize: 16, fontWeight: 700 }}>{message}</div>}

        <form onSubmit={handleVerify}>
          <label className="input-label" style={{ textAlign: "left" }}>Email Address</label>
          <input
            className="neu-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "16px 20px", fontSize: 17, marginBottom: 18 }}
          />

          <label className="input-label" style={{ textAlign: "left" }}>6-Digit Verification PIN</label>
          <input
            className="neu-input"
            type="text"
            maxLength="6"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            style={{ width: "100%", padding: "16px 20px", letterSpacing: "10px", textAlign: "center", fontSize: "28px", fontWeight: 800, color: t.accent, marginBottom: 24 }}
          />

          <button
            type="submit"
            className="neu-btn neu-btn-primary"
            disabled={loading || code.length !== 6}
            style={{ width: "100%", padding: "18px", fontSize: 19, fontWeight: 800, marginBottom: 16 }}
          >
            {loading ? "Verifying..." : "Verify & Activate Account"}
          </button>
        </form>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 15 }}>
          <span
            onClick={handleResend}
            style={{ color: t.accent, fontWeight: 700, cursor: resending ? "not-allowed" : "pointer" }}
          >
            {resending ? "Sending..." : "Resend PIN"}
          </span>
          <span
            onClick={onSuccess}
            style={{ color: t.subtext, fontWeight: 600, cursor: "pointer" }}
          >
            Back to Login
          </span>
        </div>

      </div>
    </div>
  )
}


export function ResetPasswordConfirm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // 🟢 NEW State
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setToken(params.get('token') || '');
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // 🟢 NEW: Prevent submission if passwords don't match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Your password has been successfully updated!');
        if (onSuccess) setTimeout(onSuccess, 2000);
      } else {
        setError(data.detail || 'Your password reset token is invalid or expired.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div style={localStyles.card}>
        <h2 style={localStyles.title}>Invalid Link</h2>
        <p style={localStyles.error}>This link is missing verification parameters.</p>
      </div>
    );
  }

  return (
    <div style={localStyles.card}>
      <h2 style={localStyles.title}>Reset Your Password</h2>
      <p style={localStyles.text}>Choose a strong new password.</p>

      <form onSubmit={handlePasswordReset}>
        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={localStyles.input}
        />
        {/* 🟢 NEW: Confirm Password Input */}
        <input
          type="password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={localStyles.input}
        />
        <button type="submit" disabled={loading} style={localStyles.button}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {message && <p style={localStyles.success}>{message}</p>}
      {error && <p style={localStyles.error}>{error}</p>}
    </div>
  );
}

export function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    console.log("👉 React button clicked! Sending email to:", email);
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Points to http://127.0.0.1:8000/auth/forgot-password locally
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'If that email exists, a reset link has been dispatched!');
      } else {
        setError(data.detail || 'Failed to request password reset.');
      }
    } catch (err) {
      setError('Connection failed. Is your FastAPI server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Forgot Password?</h2>
      <p style={styles.text}>Enter your email to receive a password reset link.</p>

      <form onSubmit={handleRequest}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

// Basic modular layout styling
const styles = {
  card: { maxWidth: '400px', margin: '40px auto', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', backgroundColor: '#fff', textAlign: 'center', fontFamily: 'sans-serif' },
  title: { fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' },
  text: { fontSize: '14px', color: '#6b7280', marginBottom: '24px' },
  input: { width: '100%', padding: '12px', margin: '8px 0', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' },
  success: { color: '#10b981', fontSize: '14px', marginTop: '16px', fontWeight: '500' },
  error: { color: '#ef4444', fontSize: '14px', marginTop: '16px', fontWeight: '500' }
};