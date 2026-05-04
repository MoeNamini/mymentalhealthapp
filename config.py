# config.py
# This file holds all the settings for the populator.
# Change these to control what YouTube videos get fetched.

SEARCH_QUERIES = [
    "how to build good habits daily",
    "how to quit bad habits for good",
    "staying calm under pressure techniques",
    "building self discipline and willpower",
    "morning routine for mental health",
    "overcoming procrastination strategies",
    "mindfulness habits for anxiety",
    "how to stop overthinking",
    "building healthy sleep habits",
    "how to stay motivated every day",
]

# How many videos to fetch per search query
# Start small (3) while testing, increase later
MAX_RESULTS_PER_QUERY = 3

# Minimum number of characters a transcript must have
# to be worth processing. Skips very short or empty videos.
MIN_TRANSCRIPT_LENGTH = 1000
