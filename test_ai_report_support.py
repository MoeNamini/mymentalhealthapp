import unittest
from datetime import datetime, timezone

from ai_report_support import (
    current_week_bounds,
    fetch_current_week_calendar,
    normalize_action_context,
    normalize_completions,
    report_shape,
    validate_report_prose,
)
from report_schema import AICoachSchema


def valid_report():
    return {
        "acknowledgment": "A specific acknowledgment.",
        "action_insights": "The records do not yet establish a difficulty trend.",
        "structural_suggestions": "No adjustment is justified from these records.",
        "encouragement": "A personal closing.",
        "friction_categories": [],
    }


class FakeResponse:
    def __init__(self, body, error=None):
        self.body = body
        self.error = error

    def raise_for_status(self):
        if self.error:
            raise self.error

    def json(self):
        return self.body


class FakeClient:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    async def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return next(self.responses)


class ReportTests(unittest.TestCase):
    def test_original_string_schema_accepts_empty_but_runtime_check_rejects_it(self):
        payload = valid_report()
        payload["action_insights"] = ""
        payload["encouragement"] = " "
        AICoachSchema(**payload)  # Same field types as the actual app schema.
        with self.assertRaisesRegex(ValueError, "action_insights, encouragement"):
            validate_report_prose(payload)

    def test_runtime_check_rejects_missing_null_and_array_prose(self):
        for malformed in (None, [], {}, 12):
            with self.subTest(value=malformed):
                payload = valid_report()
                payload["action_insights"] = malformed
                with self.assertRaises(ValueError):
                    validate_report_prose(payload)
        payload = valid_report()
        del payload["encouragement"]
        with self.assertRaisesRegex(ValueError, "encouragement"):
            validate_report_prose(payload)

    def test_honest_insufficient_data_report_is_valid(self):
        payload = valid_report()
        self.assertIs(validate_report_prose(payload), payload)

    def test_diagnostics_do_not_include_private_report_text(self):
        payload = valid_report()
        payload["action_insights"] = "SENSITIVE JOURNAL EXCERPT"
        shape = report_shape(payload)
        self.assertNotIn("SENSITIVE", str(shape))
        self.assertEqual(shape["action_insights"]["type"], "str")
        self.assertEqual(shape["action_insights"]["length"], 25)

    def test_unrated_completion_and_full_timestamp_are_preserved(self):
        timestamp = "2026-09-21T18:35:21+02:00"
        rows = [{"completion_id": 7, "action_id": 4, "action": "Walk", "date": timestamp}]
        result = normalize_completions(rows)
        self.assertIsNone(result[0]["difficulty"])
        self.assertEqual(result[0]["date"], timestamp)
        self.assertEqual(result[0]["completion_id"], 7)

    def test_action_widget_labels_are_scrubbed_without_mutating_source(self):
        rows = [{"action": "Call Moe", "why": "Connect with Moe", "widgets": [{"name": "Moe lunch"}]}]
        def scrub(text, *, user_name):
            return text.replace(user_name, "[USER_NAME]")
        result = normalize_action_context(rows, scrub, "Moe")
        self.assertEqual(result[0]["widgets"][0]["name"], "[USER_NAME] lunch")
        self.assertEqual(result[0]["action"], "Call [USER_NAME]")
        self.assertEqual(rows[0]["widgets"][0]["name"], "Moe lunch")


class WeekTests(unittest.TestCase):
    def test_week_uses_calendar_date_not_utc_date(self):
        # Sunday UTC is already Monday in Berlin.
        now = datetime(2026, 9, 20, 23, 30, tzinfo=timezone.utc)
        start, end = current_week_bounds(now, "Europe/Berlin")
        self.assertEqual(start.isoformat(), "2026-09-21T00:00:00+02:00")
        self.assertEqual(end.isoformat(), "2026-09-28T00:00:00+02:00")

    def test_dst_week_lengths_and_midnight_boundaries(self):
        for month, day, hours in ((3, 25, 167), (10, 21, 169)):
            with self.subTest(month=month):
                start, end = current_week_bounds(
                    datetime(2026, month, day, tzinfo=timezone.utc), "Europe/Berlin"
                )
                duration = end.astimezone(timezone.utc) - start.astimezone(timezone.utc)
                self.assertEqual(duration.total_seconds() / 3600, hours)
                self.assertEqual((start.weekday(), end.weekday()), (0, 0))
                self.assertEqual((start.hour, end.hour), (0, 0))

    def test_naive_reference_time_is_rejected(self):
        with self.assertRaises(ValueError):
            current_week_bounds(datetime(2026, 9, 21), "Europe/Berlin")


class CalendarTests(unittest.IsolatedAsyncioTestCase):
    async def test_no_token_does_not_make_requests(self):
        client = FakeClient([])
        result = await fetch_current_week_calendar(client, None)
        self.assertEqual(result["status"], "not_connected")
        self.assertEqual(client.calls, [])

    async def test_pagination_all_day_and_cancelled_events(self):
        client = FakeClient([
            FakeResponse({"timeZone": "Europe/Berlin"}),
            FakeResponse({"items": [
                {"summary": "Meeting", "status": "confirmed",
                 "start": {"dateTime": "2026-09-21T18:00:00+02:00"},
                 "end": {"dateTime": "2026-09-21T19:00:00+02:00"},
                 "attendees": [{"self": True, "responseStatus": "declined", "email": "private@example.org"}]},
                {"status": "cancelled", "summary": "Removed"},
            ], "nextPageToken": "page-2"}),
            FakeResponse({"items": [
                {"summary": "Day event", "start": {"date": "2026-09-23"},
                 "end": {"date": "2026-09-24"}, "transparency": "transparent"},
            ]}),
        ])
        result = await fetch_current_week_calendar(
            client, "fake-token", now=datetime(2026, 9, 21, tzinfo=timezone.utc)
        )
        self.assertEqual(result["status"], "available")
        self.assertEqual(len(result["events"]), 2)
        self.assertTrue(result["events"][1]["all_day"])
        self.assertEqual(result["events"][0]["response_status"], "declined")
        self.assertNotIn("private@example.org", str(result))
        self.assertEqual(client.calls[2][1]["params"]["pageToken"], "page-2")
        self.assertEqual(client.calls[1][1]["params"]["timeMax"], "2026-09-28T00:00:00+02:00")

    async def test_http_failure_is_not_returned_as_empty_available_calendar(self):
        client = FakeClient([FakeResponse({}, RuntimeError("403"))])
        with self.assertRaisesRegex(RuntimeError, "403"):
            await fetch_current_week_calendar(client, "fake-token")

    async def test_missing_timezone_is_not_silently_assumed(self):
        client = FakeClient([FakeResponse({})])
        with self.assertRaisesRegex(ValueError, "timezone"):
            await fetch_current_week_calendar(client, "fake-token")

    async def test_repeated_page_token_does_not_loop(self):
        client = FakeClient([
            FakeResponse({"timeZone": "Europe/Berlin"}),
            FakeResponse({"items": [], "nextPageToken": "same"}),
            FakeResponse({"items": [], "nextPageToken": "same"}),
        ])
        with self.assertRaisesRegex(ValueError, "pagination"):
            await fetch_current_week_calendar(client, "fake-token")


if __name__ == "__main__":
    unittest.main()
