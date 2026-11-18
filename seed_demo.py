import os
import random
import json
import datetime
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv
from cryptography.fernet import Fernet, MultiFernet
import bcrypt 

# Load .env for ENCRYPTION_KEYS and DATABASE_URL
load_dotenv()

# =====================================================================
# 🔐 ENCRYPTION ENGINE
# =====================================================================
raw_keys_str = os.getenv("ENCRYPTION_KEYS")
if not raw_keys_str:
    raise ValueError("FATAL SECURITY ERROR: ENCRYPTION_KEYS missing from environment variables.")

key_list = [k.strip() for k in raw_keys_str.split(",") if k.strip()]
fernet_instances = [Fernet(k.encode('utf-8')) for k in key_list]
cipher_suite = MultiFernet(fernet_instances)

def encrypt_text(text: str) -> str:
    if not text: return ""
    return cipher_suite.encrypt(text.encode('utf-8')).decode('utf-8')

# =====================================================================
# 🔌 DATABASE CONNECTION
# =====================================================================
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://neondb_owner:YOUR_PASSWORD_HERE@YOUR_NEON_HOST/neondb?sslmode=require"

# =====================================================================
# 📝 DIVERSIFIED REAL-WORLD JOURNALS (10 Scenarios for AI Testing)
# =====================================================================
journals_scenarios = [
    {
        "title": "Finding stillness in the chaos",
        "body": "Did 10 minutes of breathing before opening the laptop. It helped mute the morning anxiety slightly, though my mind kept drifting to the 10:00 AM status meeting. Struggling to stay present when the day ahead feels so heavy.",
        "action_id": 1 # Morning Meditation
    },
    {
        "title": "The Sunday Scaries are getting worse",
        "body": "It's only 4 PM on Sunday and my chest already feels tight thinking about Monday. I feel like I spent the entire weekend just recovering from last week instead of actually living. I can't keep operating on survival mode like this.",
        "action_id": None # General Thoughts (NULL in DB)
    },
    {
        "title": "That 1-on-1 felt off",
        "body": "Had a sync with Sarah today. She seemed incredibly quiet and kept looking at her watch. I am completely certain she’s realized I'm struggling with the new roadmap and is already looking for my replacement. Why else would she be so checked out?",
        "action_id": None # CBT TRAP: Mind Reading (General Thoughts)
    },
    {
        "title": "Small wins amidst the grind",
        "body": "Writing down three things today: hot coffee, a kind Slack message from a junior developer I helped, and the fact that it didn't rain during my lunch break. It's hard to feel grateful when the workload is crushing, but these small anchors do help.",
        "action_id": 2 # Gratitude Journaling
    },
    {
        "title": "Missed my deadline today",
        "body": "I didn't manage to submit the quarterly analytics report on time today because of an unexpected blocker. If I can't even get a basic data pull completed on schedule, I am completely useless at this job. I either do this perfectly or I'm an absolute failure.",
        "action_id": None # CBT TRAP: All-or-Nothing Thinking (General Thoughts)
    },
    {
        "title": "Stepping away from the screen",
        "body": "Forced myself to close the laptop at 6 PM and walk around the neighborhood. My brain felt like mush when I started, but after 20 minutes of movement, the constant static in my head quieted down. Definitely sleeping better on days I do this.",
        "action_id": 3 # Evening Walk
    },
    {
        "title": "The physical toll of stress",
        "body": "My shoulders feel like rocks and my jaw is constantly clenched. I spent three hours in back-to-back meetings today where I didn't even need to speak. The inefficiency of corporate bureaucracy is exhausting, and it's starting to manifest physically.",
        "action_id": None # General Thoughts (NULL in DB)
    },
    {
        "title": "A minor mistake with major anxiety",
        "body": "I realized I attached the outdated version of the budget proposal to the VP's email. I am panicking. They are going to think I am completely incompetent, pull our department's funding, the project will be scrapped, and I'll get laid off. I won't be able to pay my mortgage next month.",
        "action_id": None # CBT TRAP: Catastrophizing (General Thoughts)
    },
    {
        "title": "A difficult meditation sit",
        "body": "Attempted to meditate but my mind was screaming. Kept thinking about the unread notifications count. Even though it felt frustrating, I stayed on the cushion for the full 10 minutes. I guess showing up is still a win, even if it feels messy.",
        "action_id": 1 # Morning Meditation
    },
    {
        "title": "Reevaluating my path",
        "body": "Turning 35 this year and wondering how I ended up in this endless loop of stress. I used to care so much about climbing the ladder, but now I just want peace. I need to design a life where my identity isn't 100% tied to my output.",
        "action_id": None # General Thoughts (NULL in DB)
    }
]

def seed_investor_data(user_id=6):
    try:
        print("Connecting to Neon Database...")
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Profile Data
        test_email = 'test@test.com'
        test_name = 'test account'
        test_about_me = (
            "An ambitious tech professional using MindAction daily to optimize cognitive flow, "
            "build robust morning mindfulness rituals, and manage work-related stress."
        )
        hashed_password = bcrypt.hashpw(b"test", bcrypt.gensalt()).decode('utf-8')
        
        # 1. WIPE OLD DATA (Cascades delete all logs/reminders automatically)
        print(f"Resetting data for User ID {user_id}...")
        cur.execute("DELETE FROM public.users WHERE id = %s OR email = %s;", (user_id, test_email))

        # 2. CREATE USER WITH BIO
        print("Inserting user profile...")
        cur.execute("""
            INSERT INTO public.users (id, name, email, password_hash, tier, auth_provider, theme, about_me)
            VALUES (%s, %s, %s, %s, 'pro', 'email', 'light', %s);
        """, (user_id, test_name, test_email, hashed_password, test_about_me))

        # 3. BASE ACTIONS
        sample_actions = [
            (1, 'Morning Meditation', 'Focus', 'mindfulness', 3),
            (2, 'Gratitude Journaling', 'Reflection', 'reflection', 1),
            (3, '30-Minute Evening Walk', 'Health', 'health', 2)
        ]
        for act_id, text, benefit, cat, diff in sample_actions:
            cur.execute("INSERT INTO public.actions (id, text, benefit, category, difficulty) VALUES (%s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING;", (act_id, text, benefit, cat, diff))
            cur.execute("INSERT INTO public.user_actions (user_id, action_id, is_active) VALUES (%s, %s, true) ON CONFLICT (user_id, action_id) DO NOTHING;", (user_id, act_id))

        # 4. 30 DAYS OF DATA
        print("Simulating 30 days of activity...")
        today = datetime.date.today()
        
        # We will keep track of how many journals we've inserted so we can loop through our 10 scenarios
        journal_index = 0
        
        for day_offset in range(30, -1, -1):
            target_date = today - datetime.timedelta(days=day_offset)
            
            # --- MOOD LOGS (Using YOUR 3 specific moods) ---
            for _ in range(random.randint(1, 2)):
                log_time = datetime.datetime.combine(target_date, datetime.time(random.randint(7, 21), random.randint(0, 59)))
                mood_state = random.choice(['Great', 'Steady', 'Down']) 
                cur.execute("INSERT INTO public.mood_logs (user_id, mood_state, created_at) VALUES (%s, %s, %s);", (user_id, mood_state, log_time))

            # --- COMPLETIONS ---
            for act_id in [1, 2, 3]:
                if random.random() < 0.75:
                    cur.execute("INSERT INTO public.completion_logs (user_id, action_id, completed_at, source, difficulty) VALUES (%s, %s, %s, 'Web App Layout', 'Medium');", (user_id, act_id, target_date))

            # --- ENCRYPTED JOURNALS (Distribute our 10 unique scenarios every 3 days) ---
            if day_offset % 3 == 0 and journal_index < len(journals_scenarios):
                scenario = journals_scenarios[journal_index]
                
                # Encrypt using your secure Fernet-suite engine
                encrypted_body = encrypt_text(scenario["body"])
                
                cur.execute("""
                    INSERT INTO public.journal_logs (user_id, action_id, content, custom_title, created_at) 
                    VALUES (%s, %s, %s, %s, %s);
                """, (
                    user_id, 
                    scenario["action_id"], # Will automatically insert NULL in DB if None
                    encrypted_body, 
                    scenario["title"], 
                    target_date
                ))
                
                journal_index += 1

        conn.commit()
        print(f"\n🎉 Success! Seeded {journal_index} unique real-world journals (including CBT Traps and General Thoughts).")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_investor_data()