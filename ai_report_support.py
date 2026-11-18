"""Helpers to integrate into the supplied report endpoint; not a deployed change."""

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo


REPORT_OUTPUT_RULES = """
REQUIRED RESPONSE FIELDS
Return exactly these five fields using the app's response schema:
- acknowledgment: a nonempty plain-text string containing the opening acknowledgment.
- friction_categories: an array of objects with category (string) and percentage
  (integer). Return [] when there are no confirmed missed occurrences.
- action_insights: a nonempty plain-text string containing the connected analysis.
- structural_suggestions: a nonempty plain-text string containing the proposed
  adjustments, or an explanation that the evidence does not justify an adjustment.
- encouragement: a nonempty plain-text string containing the personal closing.
Do not rename fields, use null for prose fields, or return prose as arrays or objects.
Missing data must be explained, not represented by an empty prose field.

MISSING OR UNAVAILABLE INPUTS
Any input source may be absent, null, empty, not connected, unavailable because
of the user's tier or consent, or temporarily inaccessible. Analyze the usable
sources that remain. Never fail the report, leave an output field blank, or
invent replacement evidence because one source is unavailable. Do not interpret
unavailable data as evidence that nothing happened, that the user has no
schedule, or that the user made no progress.

DATA COVERAGE
active_actions contains this user's completion count, enabled reminder settings,
and widget memberships. Reminder frequency_type and frequency_value are stored
values: do not invent a recurrence interpretation when the units are unclear.
Reminder times have no stored timezone in the supplied schema. Do not assume
they use the calendar timezone. Reminder settings are current, not a history of
past schedules; is_active alone does not establish that an expiry has not passed.
Location conditions indicate a saved trigger, not attendance or a known place
such as home. Widget membership is routine context, not a scheduled occurrence.
completion_history contains up to 100 recorded completions. A null difficulty
means that effort was not rated; it is not Medium and does not mean the Action
was missed. It is a record limit, not a complete period of tracking.
calendar_context describes the current Monday-to-Sunday week in the primary
calendar's timezone. Its end is exclusive. If its status is unavailable or
not_connected, do not infer that the user has no events. Future calendar events
are planning context, not evidence explaining past misses. A scheduled event
does not prove attendance or a conflict. Declined invitations and transparent
events must not automatically be counted as busy time.
"""


SAFE_REPORT_FALLBACKS = {
    "acknowledgment": (
        "Taking time to review your Actions and experiences is a meaningful part "
        "of learning what fits your life."
    ),
    "action_insights": (
        "This report could not establish a sufficiently supported pattern across "
        "the supplied records. No conclusion should be drawn from that absence."
    ),
    "structural_suggestions": (
        "No personalized adjustment is included because this report did not "
        "establish enough supported evidence for one."
    ),
    "encouragement": (
        "You do not need perfect tracking for your effort to matter. Each check-in "
        "can still add useful context about what fits your life."
    ),
}


REPORT_CONTEXT_SQL = """
WITH
active_actions AS (
    SELECT COALESCE(json_agg(json_build_object(
        'action_id', a.id,
        'action', a.text,
        'why', a.benefit,
        'completions', (
            SELECT COUNT(*) FROM completion_logs user_cl
            WHERE user_cl.user_id = ua.user_id AND user_cl.action_id = a.id
        ),
        'reminders', COALESCE((
            SELECT json_agg(json_build_object(
                'reminder_id', r.id,
                'reminder_type', r.reminder_type,
                'frequency_type', r.frequency_type,
                'frequency_value', r.frequency_value,
                'is_active', r.is_active,
                'target_hour', r.target_hour,
                'target_minute', r.target_minute,
                'target_ampm', r.target_ampm,
                'end_in_days', r.end_in_days,
                'created_at', r.created_at,
                'loc_condition', r.loc_condition,
                'has_location', (r.loc_lat IS NOT NULL AND r.loc_lng IS NOT NULL)
            ) ORDER BY r.created_at, r.id)
            FROM reminders r
            WHERE r.user_id = ua.user_id AND r.action_id = a.id
                AND r.is_active = TRUE
        ), '[]'::json),
        'widgets', COALESCE((
            SELECT json_agg(json_build_object(
                'widget_id', w.id,
                'name', w.name,
                'item_type', wi.item_type,
                'order_index', wi.order_index
            ) ORDER BY w.id, wi.order_index, wi.id)
            FROM widget_items wi
            JOIN widgets w ON w.id = wi.widget_id
            WHERE w.user_id = ua.user_id AND wi.action_id = a.id
        ), '[]'::json)
    ) ORDER BY a.id), '[]'::json) AS data
    FROM user_actions ua
    JOIN actions a ON ua.action_id = a.id
    WHERE ua.user_id = %(user_id)s AND ua.is_active = TRUE
),
completion_history AS (
    SELECT COALESCE(json_agg(json_build_object(
        'completion_id', sub.id,
        'action_id', sub.action_id,
        'action', sub.text,
        'difficulty', sub.difficulty,
        'date', sub.completed_at
    ) ORDER BY sub.completed_at DESC, sub.id DESC), '[]'::json) AS data
    FROM (
        SELECT cl.id, cl.action_id, a.text, cl.difficulty, cl.completed_at
        FROM completion_logs cl
        JOIN actions a ON cl.action_id = a.id
        WHERE cl.user_id = %(user_id)s
        ORDER BY cl.completed_at DESC, cl.id DESC
        LIMIT 100
    ) sub
),
moods_data AS (
    SELECT COALESCE(json_agg(json_build_object(
        'mood', sub.mood_state, 'date', sub.created_at
    ) ORDER BY sub.created_at DESC), '[]'::json) AS data
    FROM (
        SELECT mood_state, created_at
        FROM mood_logs
        WHERE user_id = %(user_id)s
        ORDER BY created_at DESC
        LIMIT 365
    ) sub
),
journals_and_misses AS (
    SELECT COALESCE(json_agg(json_build_object(
        'type', sub.type, 'action', sub.action_text,
        'content', sub.content, 'date', sub.created_at
    ) ORDER BY sub.created_at DESC), '[]'::json) AS data
    FROM (
        SELECT 'journal' AS type,
            COALESCE(a.text, j.custom_title, 'General Thoughts') AS action_text,
            j.content, j.created_at
        FROM journal_logs j
        LEFT JOIN actions a ON j.action_id = a.id
        WHERE j.user_id = %(user_id)s
        UNION ALL
        SELECT 'missed' AS type, a.text AS action_text,
            m.response AS content, m.created_at
        FROM missed_logs m
        JOIN actions a ON m.action_id = a.id
        WHERE m.user_id = %(user_id)s AND m.response != ''
        ORDER BY created_at DESC
        LIMIT 30
    ) sub
)
SELECT
    (SELECT data FROM active_actions),
    (SELECT data FROM completion_history),
    (SELECT data FROM moods_data),
    (SELECT data FROM journals_and_misses);
"""


def normalize_action_context(rows, scrub_pii, target_name):
    """Scrub user-controlled action/widget labels before sending model context."""
    result = []
    for row in rows or []:
        item = dict(row)
        item["action"] = scrub_pii(item.get("action", ""), user_name=target_name)
        item["why"] = scrub_pii(item.get("why", ""), user_name=target_name)
        item["widgets"] = [
            {
                **widget,
                "name": scrub_pii(widget.get("name", ""), user_name=target_name),
            }
            for widget in item.get("widgets", [])
        ]
        result.append(item)
    return result


def normalize_completions(rows):
    """Preserve unrated completions and full timestamp precision."""
    return [
        {
            "completion_id": row.get("completion_id"),
            "action_id": row.get("action_id"),
            "action": row.get("action", ""),
            "difficulty": row.get("difficulty"),
            "date": str(row["date"]) if row.get("date") is not None else None,
        }
        for row in (rows or [])
    ]


def current_week_bounds(now, timezone_name):
    """Monday local midnight to next Monday local midnight, including DST."""
    if now.tzinfo is None or now.utcoffset() is None:
        raise ValueError("Calendar reference time must include a timezone")
    zone = ZoneInfo(timezone_name)
    local_date = now.astimezone(zone).date()
    monday = local_date - timedelta(days=local_date.weekday())
    start = datetime.combine(monday, time.min, tzinfo=zone)
    end = datetime.combine(monday + timedelta(days=7), time.min, tzinfo=zone)
    return start, end


async def fetch_current_week_calendar(client, token, *, now=None):
    """Read a week with the same Calendar events permission already in use.

    The caller handles HTTP/timezone errors so unavailable data is not confused
    with a successfully fetched empty calendar. No events are modified.
    """
    if not token:
        return {"status": "not_connected", "events": []}
    now = now or datetime.now(timezone.utc)
    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {"Authorization": f"Bearer {token}"}

    # events.list returns the calendar timezone, avoiding additional OAuth scopes.
    probe = await client.get(
        url, headers=headers, params={"maxResults": 1, "fields": "timeZone"}
    )
    probe.raise_for_status()
    timezone_name = probe.json().get("timeZone")
    if not isinstance(timezone_name, str) or not timezone_name.strip():
        raise ValueError("Google Calendar returned no usable timezone")
    start, end = current_week_bounds(now, timezone_name)

    params = {
        "timeMin": start.isoformat(),
        "timeMax": end.isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "showDeleted": "false",
        "maxResults": 2500,
        "timeZone": timezone_name,
    }
    events = []
    seen_page_tokens = set()
    while True:
        response = await client.get(url, headers=headers, params=dict(params))
        response.raise_for_status()
        page = response.json()
        for event in page.get("items", []):
            if event.get("status") == "cancelled":
                continue
            event_start = event.get("start", {})
            event_end = event.get("end", {})
            own_response = next(
                (
                    person.get("responseStatus")
                    for person in event.get("attendees", [])
                    if person.get("self")
                ),
                None,
            )
            events.append(
                {
                    "title": event.get("summary", "Busy"),
                    "start": event_start.get("dateTime", event_start.get("date")),
                    "end": event_end.get("dateTime", event_end.get("date")),
                    "all_day": "date" in event_start,
                    "status": event.get("status"),
                    "transparency": event.get("transparency", "opaque"),
                    "response_status": own_response,
                }
            )
        next_token = page.get("nextPageToken")
        if not next_token:
            break
        if next_token in seen_page_tokens:
            raise ValueError("Google Calendar repeated a pagination token")
        seen_page_tokens.add(next_token)
        params["pageToken"] = next_token

    return {
        "status": "available",
        "timezone": timezone_name,
        "week_starts_on": "Monday",
        "window_start": start.isoformat(),
        "window_end_exclusive": end.isoformat(),
        "retrieved_at": now.isoformat(),
        "events": events,
    }


def validate_report_prose(report):
    """Do not save or render missing prose as an apparently complete report."""
    if not isinstance(report, dict):
        raise ValueError("AI report must be a JSON object")
    expected = (
        "acknowledgment",
        "action_insights",
        "structural_suggestions",
        "encouragement",
    )
    invalid = [
        key
        for key in expected
        if not isinstance(report.get(key), str) or not report[key].strip()
    ]
    if invalid:
        # Field names only: never put journal/report content into this exception.
        raise ValueError("AI report missing nonempty text fields: " + ", ".join(invalid))
    if not isinstance(report.get("friction_categories"), list):
        raise ValueError("AI report friction_categories must be an array")
    return report


def complete_missing_report_fields(report):
    """Fill only absent/blank model fields with evidence-safe local copy.

    This is graceful degradation for a structured-output omission. It does not
    retry the model, infer user facts, or replace a populated model response.
    Wrong non-string prose types still fail validation instead of being hidden.
    """
    if not isinstance(report, dict):
        raise ValueError("AI report must be a JSON object")

    completed = dict(report)
    fallback_fields = []
    for key, fallback in SAFE_REPORT_FALLBACKS.items():
        value = completed.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            completed[key] = fallback
            fallback_fields.append(key)
        elif not isinstance(value, str):
            raise ValueError(f"AI report field {key} must be text")

    if "friction_categories" not in completed or completed["friction_categories"] is None:
        completed["friction_categories"] = []
        fallback_fields.append("friction_categories")
    elif not isinstance(completed["friction_categories"], list):
        raise ValueError("AI report friction_categories must be an array")

    return completed, fallback_fields


def report_shape(report):
    """Content-free debugging; use response.text in a private debugger for raw text."""
    if not isinstance(report, dict):
        return {"top_level_type": type(report).__name__}
    return {
        key: {
            "type": type(value).__name__,
            "length": len(value) if isinstance(value, (str, list, dict)) else None,
        }
        for key, value in report.items()
    }
