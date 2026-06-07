import os
import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def get_fresh_embedding(text):
    api_key = os.getenv("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={api_key}"
    
    headers = {'Content-Type': 'application/json'}
    data = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": 768
    }
    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()['embedding']['values']
    except Exception as e:
        print(f"❌ Failed to embed text: '{text[:20]}...' Error: {e}")
        return None

def migrate():
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("Fetching all active actions from database...")
    cur.execute("SELECT id, text, benefit FROM actions WHERE is_active = TRUE;")
    actions = cur.fetchall()
    
    print(f"Found {len(actions)} actions to update. Starting migration...")
    
    updated_count = 0
    for action_id, text, benefit in actions:
        # Combine text and benefit to create a rich semantic context
        combined_text = f"{text} - Benefit: {benefit}"
        
        print(f"🔄 Processing Action #{action_id}: '{text[:30]}...'")
        new_vector = get_fresh_embedding(combined_text)
        
        if new_vector:
            cur.execute(
                "UPDATE actions SET embedding = %s::vector WHERE id = %s;",
                (str(new_vector), action_id)
            )
            updated_count += 1
            
            # Commit every 5 actions so you don't lose progress if it disconnects
            if updated_count % 5 == 0:
                conn.commit()
                print(f"✅ Saved {updated_count} actions to database...")
                
    conn.commit()
    cur.close()
    conn.close()
    print(f"🎉 SUCCESS! Migrated {updated_count}/{len(actions)} actions to gemini-embedding-001 vectors!")

if __name__ == "__main__":
    migrate()