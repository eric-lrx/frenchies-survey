"""Read-only checks of the live service after a deploy (Lab 5, #28).

Usage: python3 deploy/smoke_test.py SERVICE_URL
Adapted from the Lab 5 Starter Kit. Standard library only. Each check is retried
5 times, 3 seconds apart, for Cloud Run cold starts. Exits non-zero on failure.

  1. GET /api/health   -> {"data": {"status": "ok"}}
  2. GET /api/ready    -> {"data": {"status": "ready"}}   (the database answers)
  3. GET /             -> the HTML of the web app
  4. GET /api/version  -> the commit; equal to EXPECTED_COMMIT when it is set
  5. Optional sign-in, only when SMOKE_EMAIL and SMOKE_PASSWORD are both set:
     login, /api/auth/me, logout (cookie session). Credentials are never printed.
Offline tests: deploy/tests/test_smoke.py
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def make_opener():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def request(opener, base, path, data=None):
    headers = {"Content-Type": "application/json"} if data is not None else {}
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(base + path, data=body, headers=headers, method="POST" if data is not None else "GET")
    with opener.open(req, timeout=30) as response:
        return response.read()


def data_of(body):
    return json.loads(body).get("data", {})


def check(base, opener=None, sleep=time.sleep):
    opener = opener or make_opener()
    expected_commit = os.getenv("EXPECTED_COMMIT", "")
    checks = (
        ("/api/health", lambda b: data_of(b).get("status") == "ok"),
        ("/api/ready", lambda b: data_of(b).get("status") == "ready"),
        ("/", lambda b: b'id="root"' in b),
        ("/api/version", lambda b: data_of(b).get("commit") == expected_commit if expected_commit else bool(data_of(b).get("commit"))),
    )
    for path, predicate in checks:
        for attempt in range(5):
            try:
                if not predicate(request(opener, base, path)):
                    raise ValueError("unexpected response")
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError("Smoke check failed: " + path) from None
                sleep(3)
        print("PASS " + path)

    email, password = os.getenv("SMOKE_EMAIL"), os.getenv("SMOKE_PASSWORD")
    if bool(email) != bool(password):
        raise RuntimeError("Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.")
    if not email:
        print("SKIP sign-in: SMOKE_EMAIL and SMOKE_PASSWORD are not set")
        return
    signed_in = False
    try:
        request(opener, base, "/api/auth/login", {"email": email, "password": password})
        signed_in = True
        if not data_of(request(opener, base, "/api/auth/me")).get("role"):
            raise ValueError("no role")
        print("PASS sign-in and /api/auth/me")
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError("Sign-in smoke check failed") from None
    finally:
        if signed_in:
            request(opener, base, "/api/auth/logout", {})
            print("PASS sign-out")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 deploy/smoke_test.py SERVICE_URL")
    check(sys.argv[1].rstrip("/"))
