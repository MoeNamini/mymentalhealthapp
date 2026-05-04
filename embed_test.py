import ollama
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

# Test 1: generate an embedding
response = ollama.embeddings(model="nomic-embed-text", prompt="go for a walk outside")
vector = response["embedding"]
print(f"Embedding generated: {len(vector)} dimensions")  # should print 768

# Test 2: insert it into the database and search for it
conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
)
cur = conn.cursor()

# Insert a test action with its embedding
cur.execute(
    """
INSERT INTO actions (text, benefit, category, embedding)
VALUES (%s, %s, %s, %s)
ON CONFLICT DO NOTHING
RETURNING id;
""",
    (
        "Go for a walk outside",
        "Clears your mind and reduces stress",
        "movement",
        str(vector),
    ),
)
conn.commit()

# Now search for it semantically
query = "exercise to calm down"
query_vec = ollama.embeddings(model="nomic-embed-text", prompt=query)["embedding"]

cur.execute(
    """
SELECT text, benefit, 1 - (embedding <=> %s::vector) AS similarity
FROM actions
ORDER BY embedding <=> %s::vector
LIMIT 3;
""",
    (str(query_vec), str(query_vec)),
)

results = cur.fetchall()
print("\nSemantic search results for:", query)
for row in results:
    print(f"  [{row[2]:.3f}] {row[0]} — {row[1]}")

cur.close()
conn.close()
