"""Shared fixtures for backend tests.

CRITICAL: The security fix wires `check_rate_limit` into POST /api/orders/create
with a 3-orders-per-10-minutes window per IP. Tests run against the public
preview URL, so pytest cannot mutate the backend's in-memory dict.

Mitigation: an autouse fixture monkey-patches `requests` so every HTTP call
carries a distinct `X-Forwarded-For` header per test node. That way each test
looks like a fresh IP to the rate limiter and none of them collide.

Tests that specifically want to hit the rate limiter (test_order_security.py)
pin their own X-Forwarded-For and thus bypass this global header (their
explicit header wins the merge).
"""
import os
import sys
import uuid

import pytest
import requests

sys.path.insert(0, "/app/backend")


def _test_ip_for_node(nodeid: str) -> str:
    """Deterministic per-test IPv4 so re-runs are stable within a session."""
    h = abs(hash(nodeid))
    return f"10.{(h >> 16) % 250}.{(h >> 8) % 250}.{h % 250}"


@pytest.fixture(autouse=True)
def _inject_unique_ip_header(request, monkeypatch):
    """Every requests.* call from a test gets a per-test X-Forwarded-For.

    If the caller passes its own headers dict containing X-Forwarded-For,
    that explicit value wins — we don't override it. Otherwise we inject
    ours so tests are isolated at the rate-limiter level.
    """
    ip = _test_ip_for_node(request.node.nodeid)
    default_hdr = {"X-Forwarded-For": ip}
    orig_request = requests.Session.request

    def patched_request(self, method, url, **kwargs):
        hdrs = kwargs.get("headers") or {}
        # normalise keys case-insensitively
        lowered = {k.lower(): k for k in hdrs}
        if "x-forwarded-for" not in lowered:
            merged = {**default_hdr, **hdrs}
            kwargs["headers"] = merged
        return orig_request(self, method, url, **kwargs)

    monkeypatch.setattr(requests.Session, "request", patched_request)

    # requests.get/post/etc create a fresh Session each call → also patched
    yield ip


def pytest_configure(config):
    os.environ.setdefault(
        "REACT_APP_BACKEND_URL",
        "https://codebase-import-8.preview.emergentagent.com",
    )
