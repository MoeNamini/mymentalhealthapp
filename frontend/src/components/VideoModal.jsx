// VideoModal.jsx
// A popup that shows the YouTube video embedded in the page.
// Appears when the user clicks "Watch Video".
// Clicking outside or pressing X closes it.

export default function VideoModal({ embedUrl, videoTitle, onClose }) {
    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <p style={styles.title}>{videoTitle}</p>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                <iframe
                    style={styles.iframe}
                    src={embedUrl}
                    title={videoTitle}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                    allowFullScreen
                />
                <a
                    href={embedUrl.replace("/embed/", "/watch?v=")}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.openLink}
                >
                    Open in YouTube ↗
                </a>
            </div>
        </div>
    )
}

const styles = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
    },
    modal: {
        background: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 760,
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 18px",
        borderBottom: "1px solid #eee",
    },
    title: {
        fontSize: 14,
        fontWeight: 600,
        color: "#444",
        flex: 1,
        marginRight: 12,
    },
    closeBtn: {
        background: "#f0f0f0",
        border: "none",
        borderRadius: 8,
        width: 32,
        height: 32,
        fontSize: 16,
        cursor: "pointer",
        color: "#666",
    },
    iframe: {
        width: "100%",
        aspectRatio: "16/9",
        display: "block",
    },
    openLink: {
        display: "block",
        textAlign: "center",
        padding: "10px",
        fontSize: 13,
        color: "#764ba2",
        textDecoration: "none",
        fontWeight: 600,
    },
}