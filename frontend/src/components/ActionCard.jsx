// ActionCard.jsx
// One card in the results list, showing a single action.
// Has expandable "Show Why" section and "Watch Video" button.
// Also handles pick, complete, and star rating interactions.

import { useState } from "react"
import axios from "axios"

const CATEGORY_COLORS = {
    movement: { bg: "#e8f5e9", text: "#2e7d32" },
    nutrition: { bg: "#fff8e1", text: "#f57f17" },
    mindfulness: { bg: "#e8eaf6", text: "#3949ab" },
    sleep: { bg: "#e3f2fd", text: "#1565c0" },
    social: { bg: "#fce4ec", text: "#c62828" },
    environment: { bg: "#e0f7fa", text: "#00695c" },
    focus: { bg: "#f3e5f5", text: "#6a1b9a" },
    habit_building: { bg: "#fbe9e7", text: "#bf360c" },
}

export default function ActionCard({ action, onVideoOpen }) {
    const [showBenefit, setShowBenefit] = useState(false)
    const [picked, setPicked] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [userRating, setUserRating] = useState(0)
    const [hoveredStar, setHoveredStar] = useState(0)
    const [ratingSubmitted, setRatingSubmitted] = useState(false)
    const [timesPicked, setTimesPicked] = useState(action.times_picked)

    const catStyle = CATEGORY_COLORS[action.category] || { bg: "#f5f5f5", text: "#555" }

    async function handlePick() {
        if (picked) return
        try {
            const res = await axios.post(`/api/actions/${action.id}/pick`)
            setTimesPicked(res.data.times_picked)
            setPicked(true)
        } catch (e) {
            console.error("Pick failed", e)
        }
    }

    async function handleComplete() {
        if (completed) return
        try {
            await axios.post(`/api/actions/${action.id}/complete`)
            setCompleted(true)
        } catch (e) {
            console.error("Complete failed", e)
        }
    }

    async function handleRate(stars) {
        if (ratingSubmitted) return
        setUserRating(stars)
        try {
            await axios.post(`/api/actions/${action.id}/rate`, { rating: stars })
            setRatingSubmitted(true)
        } catch (e) {
            console.error("Rate failed", e)
        }
    }

    const difficultyDots = Array.from({ length: 5 }, (_, i) => (
        <span
            key={i}
            style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < action.difficulty ? "#764ba2" : "#ddd",
                display: "inline-block",
                marginRight: 3,
            }}
        />
    ))

    return (
        <div style={styles.card}>
            {/* Top row: category badge + difficulty */}
            <div style={styles.topRow}>
                <span style={{ ...styles.badge, background: catStyle.bg, color: catStyle.text }}>
                    {action.category.replace("_", " ")}
                </span>
                <div style={styles.difficulty}>
                    <span style={styles.diffLabel}>difficulty</span>
                    {difficultyDots}
                </div>
            </div>

            {/* Action text — the main content */}
            <p style={styles.actionText}>{action.text}</p>

            {/* Expandable benefit section */}
            {showBenefit && (
                <div style={styles.benefitBox}>
                    <p style={styles.benefitLabel}>Why this helps:</p>
                    <p style={styles.benefitText}>{action.benefit}</p>
                </div>
            )}

            {/* Stats row */}
            <div style={styles.statsRow}>
                <span style={styles.stat}>
                    👆 {timesPicked} picked
                </span>
                {action.avg_rating > 0 && (
                    <span style={styles.stat}>
                        ⭐ {action.avg_rating}/5
                    </span>
                )}
            </div>

            {/* Star rating */}
            <div style={styles.starRow}>
                <span style={styles.rateLabel}>
                    {ratingSubmitted ? "Thanks for rating!" : "Rate this action:"}
                </span>
                {[1, 2, 3, 4, 5].map(star => (
                    <span
                        key={star}
                        style={{
                            fontSize: 22,
                            cursor: ratingSubmitted ? "default" : "pointer",
                            color: star <= (hoveredStar || userRating) ? "#f59e0b" : "#ddd",
                            transition: "color 0.1s",
                        }}
                        onMouseEnter={() => !ratingSubmitted && setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => handleRate(star)}
                    >
                        ★
                    </span>
                ))}
            </div>

            {/* Action buttons */}
            <div style={styles.buttonRow}>
                <button
                    style={styles.btnWhy}
                    onClick={() => setShowBenefit(v => !v)}
                >
                    {showBenefit ? "Hide Why" : "Show Why"}
                </button>

                <button
                    style={styles.btnVideo}
                    onClick={() => onVideoOpen(action.embed_url, action.video_title)}
                >
                    ▶ Watch Video
                </button>

                <button
                    style={{ ...styles.btnPick, ...(picked ? styles.btnDone : {}) }}
                    onClick={handlePick}
                >
                    {picked ? "✓ Added" : "I'll Try This"}
                </button>

                <button
                    style={{ ...styles.btnComplete, ...(completed ? styles.btnDone : {}) }}
                    onClick={handleComplete}
                >
                    {completed ? "✓ Done!" : "Mark Complete"}
                </button>
            </div>
        </div>
    )
}

const styles = {
    card: {
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        marginBottom: 16,
        transition: "box-shadow 0.2s",
    },
    topRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    badge: {
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
    },
    difficulty: {
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    diffLabel: {
        fontSize: 11,
        color: "#999",
        marginRight: 4,
    },
    actionText: {
        fontSize: 17,
        fontWeight: 600,
        color: "#1a202c",
        lineHeight: 1.5,
        marginBottom: 12,
    },
    benefitBox: {
        background: "#f0f4f8",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 12,
    },
    benefitLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: "#764ba2",
        textTransform: "uppercase",
        marginBottom: 4,
    },
    benefitText: {
        fontSize: 14,
        color: "#444",
        lineHeight: 1.5,
    },
    statsRow: {
        display: "flex",
        gap: 16,
        marginBottom: 10,
    },
    stat: {
        fontSize: 13,
        color: "#888",
    },
    starRow: {
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginBottom: 14,
    },
    rateLabel: {
        fontSize: 12,
        color: "#999",
        marginRight: 6,
    },
    buttonRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
    },
    btnWhy: {
        padding: "8px 16px",
        borderRadius: 8,
        background: "#f0f4f8",
        color: "#444",
        fontSize: 13,
        fontWeight: 600,
    },
    btnVideo: {
        padding: "8px 16px",
        borderRadius: 8,
        background: "#ff0000",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
    },
    btnPick: {
        padding: "8px 16px",
        borderRadius: 8,
        background: "#667eea",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
    },
    btnComplete: {
        padding: "8px 16px",
        borderRadius: 8,
        background: "#48bb78",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
    },
    btnDone: {
        opacity: 0.6,
        cursor: "default",
    },
}