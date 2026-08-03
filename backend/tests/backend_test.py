"""Backend API smoke tests for iteration 9.
Tests generic GET endpoints + POST/GET roundtrip for /api/products.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://channel-sync-35.preview.emergentagent.com").rstrip("/")

ENDPOINTS = [
    "/api/products",
    "/api/listings",
    "/api/orders",
    "/api/returns",
    "/api/segments",
    "/api/requests",
    "/api/alerts",
    "/api/users",
]


@pytest.mark.parametrize("path", ENDPOINTS)
def test_get_endpoint_ok(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=30)
    assert r.status_code == 200, f"{path} => {r.status_code} {r.text[:200]}"
    data = r.json()
    assert isinstance(data, list), f"{path} did not return list: {type(data)}"


def test_product_post_get_roundtrip():
    sku = f"TST-{uuid.uuid4().hex[:6].upper()}"
    payload = {"sku": sku, "title": "Test", "brand": "X", "category": "Y"}
    r = requests.post(f"{BASE_URL}/api/products", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["sku"] == sku
    assert created["title"] == "Test"
    assert "id" in created and created["id"].startswith("mp_")

    # Verify it appears in GET
    r2 = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r2.status_code == 200
    ids = [p["id"] for p in r2.json()]
    assert created["id"] in ids

    # Cleanup
    requests.delete(f"{BASE_URL}/api/products/{created['id']}", timeout=30)
