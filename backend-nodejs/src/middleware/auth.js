import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET not set");

export function signToken({ user_id, tenant_id, role }) {
  return jwt.sign({ sub: user_id, tenant_id, role }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

/**
 * Auth middleware. Extracts JWT from Authorization header, verifies it, and
 * attaches `req.user` and `req.tenantId`.
 *
 * We ALSO accept an optional `X-Tenant-Slug` header for the sign-in endpoint
 * so the user can specify which workspace to log in to when they belong to
 * more than one.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    req.user = { id: payload.sub, role: payload.role };
    req.tenantId = payload.tenant_id;
    if (!req.tenantId) return res.status(401).json({ error: "no_tenant" });
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

/** Role gating helper — use after requireAuth. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    next();
  };
}
