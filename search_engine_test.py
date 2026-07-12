# test_search.py
import os
import json
import logging
from dotenv import load_dotenv
from search_engine import search_actions

# Setup logging to see structural issues or API drops clearly
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_automated_search_test():
    load_dotenv()
    
    # 1. Quick environment sanity check
    if not os.getenv("DATABASE_URL") and not os.getenv("DB_NAME"):
        logger.error("❌ Test Failed: Database environment variables are missing!")
        return
    if not os.getenv("GEMINI_API_KEY"):
        logger.warning("⚠️ Warning: GEMINI_API_KEY is missing. Test will execute text-fallback logic.")

    # 2. Define a target wellness query
    test_query = "anxiety and stress relief"
    logger.info(f"🚀 Initializing automated search test for query: '{test_query}'...")

    try:
        # Execute the main hybrid search function
        results = search_actions(query_text=test_query, limit=3)
        
        # 3. Evaluate results
        print("\n" + "="*50)
        print(f"📊 SEARCH RESULTS (Found: {len(results)} items)")
        print("="*50)
        
        if not results:
            print("⚠️ No matching mental health actions found in the candidate pool.")
        else:
            for idx, item in enumerate(results, 1):
                print(f"\n[{idx}] Score: {item['final_score']} | Relevance: {item['relevance']}")
                print(f"    Action: {item['text']}")
                print(f"    Benefit: {item['benefit']}")
                print(f"    Category: {item['category']} | Difficulty: {item['difficulty']}")
        print("="*50 + "\n")
        
        logger.info("🟢 Phase 5 Test execution completed successfully!")

    except Exception as e:
        logger.error(f"❌ Search test execution crashed: {e}", exc_info=True)

if __name__ == "__main__":
    run_automated_search_test()