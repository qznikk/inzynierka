import jwt from "jsonwebtoken";

export function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: "Auth required" });

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
