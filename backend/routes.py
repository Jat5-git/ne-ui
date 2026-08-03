"""
FastAPI backend for the Multi-Channel Listing SaaS.
Persists master products, listings, orders, returns, segments, request history, and users
to MongoDB. Frontend still uses React Context by default; these endpoints are provided so
the app can be migrated to a persistent backend one entity at a time.

All routes are prefixed with /api and mounted onto the existing FastAPI `app` in server.py.
Import at the bottom of server.py:  `from routes import router as domain_router; app.include_router(domain_router)`
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os, uuid

mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo[os.environ["DB_NAME"]]

router = APIRouter(prefix="/api")


# ----------------- Pydantic models -----------------
def _iso() -> str: return datetime.now(timezone.utc).isoformat()

class Product(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"mp_{uuid.uuid4().hex[:6]}")
    sku: str
    title: str
    brand: str
    category: str
    mrp: float = 0
    cost: float = 0
    stock: int = 0
    stock_mode: str = "central"    # central | allocated
    weight: float = 0
    status: str = "draft"          # listed | draft | unlisted
    channels: List[str] = []
    image: Optional[str] = None
    channel_attributes: Dict[str, Any] = {}
    custom_attributes: Dict[str, Any] = {}
    updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())

class Listing(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"lst_{uuid.uuid4().hex[:8]}")
    master_id: str
    master_sku: str
    channel: str                   # amazon | shopify | flipkart | woocommerce
    channel_sku: str
    title: str
    status: str = "active"         # active | paused | error
    stock: int = 0
    price: float = 0
    units_sold_30d: int = 0
    revenue_30d: float = 0
    last_synced: str = Field(default_factory=_iso)

class OrderLine(BaseModel):
    master_id: str
    master_sku: str
    qty: int
    unit_price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:6]}")
    channel: str
    channel_order_id: str
    customer: str
    status: str = "placed"         # placed|processing|shipped|delivered|cancelled|returned
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    line_items: List[OrderLine] = []

class ReturnLine(BaseModel):
    master_id: str
    master_sku: str
    qty: int
    refund_amount: float

class Return(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"ret_{uuid.uuid4().hex[:6]}")
    order_id: str
    channel: str
    reason: str = ""
    status: str = "requested"      # requested|in_transit|received|refunded|rejected
    date: str = Field(default_factory=lambda: datetime.now(timezone.utc).date().isoformat())
    line_items: List[ReturnLine] = []

class Segment(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"seg_{uuid.uuid4().hex[:6]}")
    name: str
    description: str = ""
    product_ids: List[str] = []
    created_at: str = Field(default_factory=_iso)
    created_by: str = "Ananya Rao"

class RequestLog(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:8]}")
    action: str
    target: str
    detail: str = ""
    status: str = "success"        # success | error
    actor: str = "Ananya Rao"
    started_at: str = Field(default_factory=_iso)
    completed_at: str = Field(default_factory=_iso)

class User(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(default_factory=lambda: f"u_{uuid.uuid4().hex[:6]}")
    name: str
    email: Optional[str] = None
    role: str = "admin"


# ----------------- Generic helpers -----------------
def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

async def _list(coll: str, limit: int = 1000):
    rows = await db[coll].find({}, {"_id": 0}).to_list(limit)
    return rows

async def _get(coll: str, id: str):
    doc = await db[coll].find_one({"id": id}, {"_id": 0})
    if not doc: raise HTTPException(404, f"{coll} not found")
    return doc

async def _upsert(coll: str, id: str, patch: dict):
    await db[coll].update_one({"id": id}, {"$set": patch}, upsert=True)
    return await _get(coll, id)

async def _delete(coll: str, id: str):
    r = await db[coll].delete_one({"id": id})
    if r.deleted_count == 0: raise HTTPException(404, f"{coll} not found")
    return {"deleted": id}


# ----------------- Products -----------------
@router.get("/products",             response_model=List[Product]) 
async def list_products():           return await _list("products")
@router.get("/products/{id}",        response_model=Product)
async def get_product(id: str):      return await _get("products", id)
@router.post("/products",            response_model=Product)
async def create_product(p: Product):
    doc = p.model_dump(); await db.products.insert_one(dict(doc)); return doc
@router.put("/products/{id}",        response_model=Product)
async def update_product(id: str, patch: Dict[str, Any]):
    return await _upsert("products", id, patch)
@router.delete("/products/{id}")
async def delete_product(id: str):   return await _delete("products", id)

# ----------------- Listings -----------------
@router.get("/listings",             response_model=List[Listing]) 
async def list_listings():           return await _list("listings")
@router.post("/listings",            response_model=Listing)
async def create_listing(l: Listing):
    doc = l.model_dump(); await db.listings.insert_one(dict(doc)); return doc
@router.put("/listings/{id}",        response_model=Listing)
async def update_listing(id: str, patch: Dict[str, Any]):
    patch.setdefault("last_synced", _iso())
    return await _upsert("listings", id, patch)
@router.delete("/listings/{id}")
async def delete_listing(id: str):   return await _delete("listings", id)

@router.post("/listings/{id}/sync")
async def sync_listing(id: str, patch: Dict[str, Any]):
    """Push a subset of master fields (title/price/stock) into the listing and mark last_synced."""
    patch.setdefault("last_synced", _iso())
    listing = await _upsert("listings", id, patch)
    await db.requests.insert_one({
        "id": f"req_{uuid.uuid4().hex[:8]}", "action": "Sync to channel",
        "target": f"{listing.get('master_sku')} → {listing.get('channel')}",
        "detail": ",".join(patch.keys()), "status": "success",
        "actor": "Ananya Rao", "started_at": _iso(), "completed_at": _iso(),
    })
    return listing

# ----------------- Orders + status transitions (drive stock/revenue) -----------------
BLOCKING = {"placed", "processing", "shipped"}
@router.get("/orders",               response_model=List[Order]) 
async def list_orders():             return await _list("orders")
@router.post("/orders",              response_model=Order)
async def create_order(o: Order):
    doc = o.model_dump(); await db.orders.insert_one(dict(doc)); return doc
@router.put("/orders/{id}/status")
async def order_status(id: str, body: Dict[str, str]):
    new = body.get("status")
    if not new: raise HTTPException(400, "status is required")
    order = await _get("orders", id)
    prev = order["status"]
    valid = {"placed": {"processing", "cancelled"}, "processing": {"shipped", "cancelled"}, "shipped": {"delivered", "cancelled"}, "delivered": {"returned"}, "cancelled": set(), "returned": set()}
    if new not in valid.get(prev, set()):
        raise HTTPException(400, f"Invalid transition {prev} → {new}")
    await db.orders.update_one({"id": id}, {"$set": {"status": new}})
    # On delivery: decrement master + allocated listing stock
    if new == "delivered":
        for li in order.get("line_items", []):
            await db.products.update_one({"id": li["master_id"]}, {"$inc": {"stock": -li["qty"]}})
            await db.listings.update_one({"master_id": li["master_id"], "channel": order["channel"]}, {"$inc": {"stock": -li["qty"], "units_sold_30d": li["qty"], "revenue_30d": li["qty"] * li["unit_price"]}, "$set": {"last_synced": _iso()}})
    return await _get("orders", id)

# ----------------- Returns -----------------
RESTOCKING = {"received", "refunded"}
@router.get("/returns",              response_model=List[Return])
async def list_returns():            return await _list("returns")
@router.post("/returns",             response_model=Return)
async def create_return(r: Return):
    doc = r.model_dump(); await db.returns.insert_one(dict(doc)); return doc
@router.put("/returns/{id}/status")
async def return_status(id: str, body: Dict[str, str]):
    new = body.get("status"); ret = await _get("returns", id)
    prev = ret["status"]
    await db.returns.update_one({"id": id}, {"$set": {"status": new}})
    if prev not in RESTOCKING and new in RESTOCKING:
        for li in ret.get("line_items", []):
            await db.products.update_one({"id": li["master_id"]}, {"$inc": {"stock": li["qty"]}})
    return await _get("returns", id)

# ----------------- Segments -----------------
@router.get("/segments",             response_model=List[Segment])
async def list_segments():           return await _list("segments")
@router.get("/segments/{id}",        response_model=Segment)
async def get_segment(id: str):      return await _get("segments", id)
@router.post("/segments",            response_model=Segment)
async def create_segment(s: Segment):
    doc = s.model_dump(); await db.segments.insert_one(dict(doc)); return doc
@router.put("/segments/{id}",        response_model=Segment)
async def update_segment(id: str, patch: Dict[str, Any]):
    return await _upsert("segments", id, patch)
@router.delete("/segments/{id}")
async def delete_segment(id: str):   return await _delete("segments", id)

# ----------------- Request history (append-only) -----------------
@router.get("/requests",             response_model=List[RequestLog])
async def list_requests(actor: Optional[str] = None, status: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None):
    q = {}
    if actor: q["actor"] = actor
    if status: q["status"] = status
    if date_from or date_to:
        q["started_at"] = {}
        if date_from: q["started_at"]["$gte"] = date_from
        if date_to:   q["started_at"]["$lte"] = date_to + "T23:59:59"
    return await db.requests.find(q, {"_id": 0}).sort("started_at", -1).to_list(2000)
@router.post("/requests",            response_model=RequestLog)
async def log_request(r: RequestLog):
    doc = r.model_dump(); await db.requests.insert_one(dict(doc)); return doc

# ----------------- Users -----------------
@router.get("/users",                response_model=List[User])
async def list_users():              return await _list("users")
@router.post("/users",               response_model=User)
async def create_user(u: User):
    doc = u.model_dump(); await db.users.insert_one(dict(doc)); return doc

# ----------------- Alerts (computed) -----------------
LOW_STOCK = 10
@router.get("/alerts")
async def list_alerts():
    """Derives alerts from live product + listing state."""
    alerts, products, listings = [], await _list("products"), await _list("listings")
    # Compute blocked map from orders
    orders = await _list("orders")
    blocked = {}
    for o in orders:
        if o["status"] not in BLOCKING: continue
        for li in o.get("line_items", []):
            blocked[li["master_id"]] = blocked.get(li["master_id"], 0) + li["qty"]
    for p in products:
        avail = max(0, p.get("stock", 0) - blocked.get(p["id"], 0))
        if avail == 0 and p.get("status") == "listed":
            alerts.append({"id": f"a_oos_{p['id']}", "severity": "critical", "type": "out_of_stock", "entity_id": p["id"], "entity_label": f"{p['sku']} · {p['title']}", "message": "Out of stock across all channels", "detected_at": p.get("updated")})
        elif 0 < avail <= LOW_STOCK and p.get("status") == "listed":
            alerts.append({"id": f"a_low_{p['id']}", "severity": "warning", "type": "low_stock", "entity_id": p["id"], "entity_label": f"{p['sku']} · {p['title']}", "message": f"Only {avail} units available (threshold ≤ {LOW_STOCK})", "detected_at": p.get("updated")})
    for l in listings:
        if l.get("status") == "error":
            alerts.append({"id": f"a_sync_{l['id']}", "severity": "critical", "type": "sync_error", "entity_id": l["id"], "entity_label": f"{l['channel_sku']} · {l['channel']}", "message": "Listing failed to sync — check attribute schema", "detected_at": l.get("last_synced")})
    return alerts
