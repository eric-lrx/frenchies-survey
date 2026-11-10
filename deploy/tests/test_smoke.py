"""Offline tests for deploy/smoke_test.py: no network, a fake opener answers."""
import io
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import smoke_test  # noqa: E402

COMMIT = "0123456789abcdef0123456789abcdef01234567"


class FakeOpener:
    def __init__(self, routes):
        self.routes, self.calls = routes, []

    def open(self, req, timeout=None):
        path = req.full_url.split("example.test", 1)[1]
        self.calls.append((req.get_method(), path))
        body = self.routes.get(path)
        if body is None:
            raise smoke_test.urllib.error.URLError("404 " + path)
        return io.BytesIO(body if isinstance(body, bytes) else json.dumps(body).encode())


def healthy(commit=COMMIT):
    return {
        "/api/health": {"data": {"status": "ok"}},
        "/api/ready": {"data": {"status": "ready"}},
        "/": b'<!doctype html><div id="root"></div>',
        "/api/version": {"data": {"commit": commit}},
        "/api/auth/login": {"data": {"email": "x", "role": "RESPONDENT"}},
        "/api/auth/me": {"data": {"email": "x", "role": "RESPONDENT"}},
        "/api/auth/logout": b"",
    }


BASE = "https://example.test"


class SmokeTest(unittest.TestCase):
    def run_check(self, routes, env):
        opener = FakeOpener(routes)
        with mock.patch.dict(os.environ, env, clear=True), mock.patch("builtins.print"):
            smoke_test.check(BASE, opener=opener, sleep=lambda _s: None)
        return opener

    def test_passes_and_skips_sign_in_without_credentials(self):
        opener = self.run_check(healthy(), {"EXPECTED_COMMIT": COMMIT})
        self.assertNotIn(("POST", "/api/auth/login"), opener.calls)

    def test_fails_when_the_running_commit_is_not_the_expected_one(self):
        with self.assertRaisesRegex(RuntimeError, "/api/version"):
            self.run_check(healthy(commit="f" * 40), {"EXPECTED_COMMIT": COMMIT})

    def test_fails_when_the_database_is_not_ready(self):
        routes = healthy()
        routes["/api/ready"] = {"error": {"code": "NOT_READY"}}
        with self.assertRaisesRegex(RuntimeError, "/api/ready"):
            self.run_check(routes, {})

    def test_signs_in_and_always_signs_out(self):
        opener = self.run_check(healthy(), {"SMOKE_EMAIL": "a@b.test", "SMOKE_PASSWORD": "pw"})
        self.assertIn(("POST", "/api/auth/logout"), opener.calls)

    def test_refuses_half_of_the_credentials(self):
        with self.assertRaisesRegex(RuntimeError, "both"):
            self.run_check(healthy(), {"SMOKE_EMAIL": "a@b.test"})


if __name__ == "__main__":
    unittest.main()
