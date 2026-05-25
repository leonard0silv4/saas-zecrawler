import jwt from "jsonwebtoken";

/**
 * Validates admin JWT tokens (carry { isAdmin: true }).
 * Issued by POST /api/admin/login.
 */
export function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: "Acesso negado" });
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
}
