# search_test.py
# Tests the search engine with different queries.
# Run with: uv run python search_test.py

import json
from search_engine import search_actions

# --- Test queries that cover different intents ---
test_queries = [
    "I feel anxious and can't calm down",
    "I want to sleep better at night",
    "I keep procrastinating on important tasks",
    "I want to build a morning routine",
    "I feel low energy and unmotivated",
]

for query in test_queries:
    print(f"\n{'=' * 60}")
    print(f"QUERY: {query}")
    print("=" * 60)

    results = search_actions(query, limit=3)

    if not results:
        print("  No results found.")
        continue

    for i, r in enumerate(results, 1):
        print(f"\n  Result #{i}")
        print(f"  Action    : {r['text']}")
        print(f"  Benefit   : {r['benefit']}")
        print(f"  Category  : {r['category']}")
        print(f"  Difficulty: {r['difficulty']}/5")
        print(f"  Relevance : {r['relevance']} | Final score: {r['final_score']}")
        print(f"  Picked    : {r['times_picked']} times | Rating: {r['avg_rating']}/5")
        print(f"  Watch URL : {r['video_url']}")
        print(f"  Embed URL : {r['embed_url']}")

print(f"\n{'=' * 60}")
print("✅ Search test complete")
print("=" * 60)
