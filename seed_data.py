import datetime
import json
import random
import os
import psycopg2
from dotenv import load_dotenv

# 🟢 FIXED: Automatically locate and load the environment variables from your .env file
load_dotenv()
# Pull the string from your existing .env file
DATABASE_URL = os.getenv("DATABASE_URL") 

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


def seed_historical_data():
    user_id = 3
    conn = get_db_connection()
    cur = conn.cursor()
    
    print(f"Checking existing actions for user_id {user_id}...")
    
    # 1. Grab whatever active actions this user has to avoid foreign key violations
    # If using a user_actions join table, query that, otherwise fallback to actions table
    try:
        cur.execute("SELECT id, text FROM actions WHERE user_id = %s LIMIT 3", (user_id,))
        user_actions = cur.fetchall()
    except Exception:
        conn.rollback()
        cur.execute("""
            SELECT a.id, a.text FROM actions a 
            JOIN user_actions ua ON ua.action_id = a.id 
            WHERE ua.user_id = %s LIMIT 3
        """, (user_id,))
        user_actions = cur.fetchall()

    if not user_actions:
        print("❌ No actions found for user 3. Please create at least one action on the profile first!")
        cur.close()
        conn.close()
        return

    action_ids = [row[0] for row in user_actions]
    action_names = {row[0]: row[1] for row in user_actions}
    print(f"Found active actions to build metrics around: {list(action_names.values())}")

    # Clear old testing clutter for clean chart calculations
    print("Clearing existing logs for user 3 to ensure mathematical alignment...")
    cur.execute("DELETE FROM mood_logs WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM journal_logs WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM missed_logs WHERE user_id = %s", (user_id,))
    cur.execute("DELETE FROM ai_reports WHERE user_id = %s", (user_id,))
    
    # Pool of realistic textual strings for the AI processors to digest
    friction_pool = [
        "Slammed at the office with back-to-back meetings.",
        "Woke up with a massive headache and zero physical energy.",
        "Just felt totally overwhelmed by my life to-do list today.",
        "Stayed up way too late watching videos and overslept.",
        "Anxiety was running high, couldn't find the motivation to start.",
        "Got stuck commuting home late in terrible traffic."
    ]
    
    journal_pool = [
        "Felt a bit resistant initially, but pushing through made a massive difference.",
        "Managed to clear my thoughts completely. Highly needed break.",
        "Felt a distinct release of muscle tension and emotional burnout right after.",
        "Grateful I prioritized this today even though my energy levels started low.",
        "Allowed me to decompress from work frustration. Kept me grounded."
    ]
    
    distortion_combos = [
        ["All-or-Nothing Thinking", "Catastrophizing"],
        ["Emotional Reasoning"],
        ["Mind Reading", "Should Statements"],
        ["Overgeneralization", "Labeling"],
        ["All-or-Nothing Thinking"]
    ]

    # Generate data running backward for exactly 30 days
    today = datetime.date.today()
    
    print("Generating 30-day behavioral trajectory matrix...")
    for i in range(30, -1, -1):
        log_date = today - datetime.timedelta(days=i)
        
        # Mix up timestamps slightly so chart data doesn't look flatly uniform
        base_time = datetime.datetime.combine(log_date, datetime.time(hour=random.randint(14, 21), minute=random.randint(0, 59)))
        
        # Determine day success profile (75% consistency rate simulates a healthy user track)
        is_successful_day = random.random() < 0.75
        
        # 2. SEED MOOD LOGS (Directly matching behavior metrics)
        if is_successful_day:
            mood = "Great" if random.random() < 0.6 else "Steady"
        else:
            mood = "Down" if random.random() < 0.7 else "Steady"
            
        cur.execute(
            "INSERT INTO mood_logs (user_id, mood_state, created_at) VALUES (%s, %s, %s)",
            (user_id, mood, base_time)
        )
        
        # 3. SEED HABIT COMPLETIONS & FRICTION LOGS
        for aid in action_ids:
            if is_successful_day:
                # Log an Action-related Journal Entry
                j_time = base_time + datetime.timedelta(minutes=random.randint(10, 30))
                content = f"Logged for {action_names[aid]}: {random.choice(journal_pool)}"
                
                # Pre-bake strict CBT analysis objects so distortion trackers fill up instantly
                fake_cbt = {
                    "validation": f"It is incredible that you pushed through for {action_names[aid]} despite your stress.",
                    "distortions": random.choice(distortion_combos) if mood == "Steady" else [],
                    "trend_insight": "You are showing consistent resilience when your workload spikes.",
                    "guiding_question": "What is one tiny boundary you can set tomorrow to keep this space protected?"
                }
                
                cur.execute("""
                    INSERT INTO journal_logs (user_id, action_id, content, created_at, ai_analysis)
                    VALUES (%s, %s, %s, %s, %s)
                """, (user_id, aid, content, j_time, json.dumps(fake_cbt)))
            else:
                # Log a Missed/Friction day log
                m_time = base_time + datetime.timedelta(minutes=random.randint(5, 15))
                reason = random.choice(friction_pool)
                cur.execute("""
                    INSERT INTO missed_logs (user_id, action_id, response, created_at)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, aid, reason, m_time))

        # 4. SEED GENERAL JOURNAL ENTRIES (Every 3 days)
        if i % 3 == 0:
            g_time = base_time - datetime.timedelta(hours=random.randint(4, 8))
            cur.execute("""
                INSERT INTO journal_logs (user_id, action_id, content, custom_title, created_at)
                VALUES (%s, NULL, 'General check-in: Spent some open reflection time just trying to manage my head space outside routines.', 'General Thoughts', %s)
            """, (user_id, g_time))

    # 5. SEED PRE-BAKED COMPREHENSIVE AI COACH HISTORICAL REPORTS
    print("Injecting permanent deep-dive AI Coach summary logs...")
    for report_weeks_ago in [3, 2, 1]:
        report_date = today - datetime.timedelta(days=report_weeks_ago * 7)
        report_time = datetime.datetime.combine(report_date, datetime.time(22, 0, 0))
        
        fake_coach_data = {
            "acknowledgment": f"Welcome back to your review track. Looking back across your records from {report_date.strftime('%B %Y')}, you have navigated high demands.",
            "action_insights": f"Your data highlights clear synergy: Executing your tracked actions holds your mood line safely at 'Steady' or 'Great' over 80% of the time, whereas missing them directly drops your metric into 'Down'.",
            "structural_suggestions": "Your friction logs reveal that fatigue from work projects is your largest execution bottleneck. Consider dropping your target times down to a minimal threshold on late work days.",
            "encouragement": "Consistency is not about perfection; it is about keeping the thread alive. You are putting in real work.",
            "friction_categories": [
                {"category": "Work Fatigue", "percentage": 55},
                {"category": "Time Mismanagement", "percentage": 25},
                {"category": "Anxiety/Low Drive", "percentage": 20}
            ]
        }
        
        cur.execute("""
            INSERT INTO ai_reports (user_id, report_data, created_at)
            VALUES (%s, %s, %s)
        """, (user_id, json.dumps(fake_coach_data), report_time))

    conn.commit()
    cur.close()
    conn.close()
    print("🏁 Success! One month of aligned behavioral history has been fully seeded for user_id 3.")

if __name__ == "__main__":
    seed_historical_data()