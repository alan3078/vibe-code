import os
import tempfile
import unittest


TEST_ROOT = tempfile.mkdtemp(prefix="vibe-golden-app-test-")
os.environ["APPLICATION_DATABASE"] = os.path.join(TEST_ROOT, "application.sqlite")

from fastapi import HTTPException

from main import RequestInput, RequestStatus, create_request, list_requests, update_request


class RequestTrackerTests(unittest.TestCase):
    def test_create_list_and_update_round_trip(self) -> None:
        self.assertEqual(list_requests(), [])

        created = create_request(RequestInput(title="Approve access", description="Review the request"))
        self.assertEqual(created["status"], "Open")
        self.assertEqual(list_requests()[0]["id"], created["id"])

        updated = update_request(created["id"], RequestStatus(status="Done"))
        self.assertEqual(updated["status"], "Done")

    def test_whitespace_title_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            create_request(RequestInput(title="   "))
        self.assertEqual(raised.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
