// SearchBar.jsx
// The search input at the top of the page.
// Shows a list of category filter buttons below the input.

export default function SearchBar({ query, setQuery, onSearch, categories, activeCategory, setActiveCategory }) {

    function handleKeyDown(e) {
        if (e.key === "Enter") onSearch()
    }

    function handleCategoryClick(cat) {
        // Clicking the same category again clears the filter
        setActiveCategory(activeCategory === cat ? null : cat)
    }

    return (
        <div style={styles.wrapper}>
            <h1 style={styles.title}>🌱 Find Your Next Action</h1>
            <p style={styles.subtitle}>
                Describe how you feel or what you want to improve — the search understands meaning, not just keywords.
            </p>

            <div style={styles.inputRow}>
                <input
                    style={styles.input}
                    type="text"
                    placeholder='e.g. "I feel anxious" or "I want to sleep better"'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button style={styles.button} onClick={onSearch}>
                    Search
                </button>
            </div>

            {categories.length > 0 && (
                <div style={styles.categoryRow}>
                    {categories.map(cat => (
                        <button
                            key={cat.name}
                            style={{
                                ...styles.catBtn,
                                ...(activeCategory === cat.name ? styles.catBtnActive : {})
                            }}
                            onClick={() => handleCategoryClick(cat.name)}
                        >
                            {cat.name} <span style={styles.catCount}>{cat.count}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

const styles = {
    wrapper: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "40px 24px 32px",
        textAlign: "center",
    },
    title: {
        color: "#fff",
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 8,
    },
    subtitle: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 15,
        marginBottom: 24,
    },
    inputRow: {
        display: "flex",
        maxWidth: 640,
        margin: "0 auto 20px",
        gap: 8,
    },
    input: {
        flex: 1,
        padding: "14px 18px",
        borderRadius: 12,
        border: "none",
        fontSize: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    },
    button: {
        padding: "14px 28px",
        borderRadius: 12,
        background: "#fff",
        color: "#764ba2",
        fontWeight: 700,
        fontSize: 15,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        transition: "opacity 0.2s",
    },
    categoryRow: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        maxWidth: 700,
        margin: "0 auto",
    },
    catBtn: {
        padding: "6px 14px",
        borderRadius: 20,
        background: "rgba(255,255,255,0.2)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        transition: "background 0.2s",
    },
    catBtnActive: {
        background: "#fff",
        color: "#764ba2",
    },
    catCount: {
        opacity: 0.7,
        marginLeft: 4,
        fontSize: 11,
    },
}