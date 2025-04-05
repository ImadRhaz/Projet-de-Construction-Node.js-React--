const jwt = require("jsonwebtoken");
// Vous devriez utiliser une variable d'environnement pour votre secret JWT
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_tres_long_et_securise"; // Changez ceci !

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  // Le token est généralement envoyé comme "Bearer VOTRE_TOKEN"
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    // Pas de token fourni
    return res.status(401).json({ message: "Accès non autorisé. Token manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) {
      // Gestion spécifique des erreurs JWT
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: "Token expiré." });
      }
      if (err.name === 'JsonWebTokenError') {
         return res.status(403).json({ message: "Token invalide." });
      }
      // Autres erreurs possibles
      return res.status(403).json({ message: "Échec de l'authentification du token." });
    }

    // Le payload décodé (contenant id, username, role) est attaché à la requête
    req.user = userPayload;
    next(); // Passe au middleware ou au contrôleur suivant
  });
};

// Middleware pour vérifier si l'utilisateur a le rôle 'Admin'
exports.isAdmin = (req, res, next) => {
  // Assurez-vous que authenticateToken a été exécuté avant
  if (!req.user) {
     return res.status(401).json({ message: "Utilisateur non authentifié." });
  }

  // CORRECTION: Comparer avec "Admin" (majuscule) comme dans l'enum du schéma
  if (req.user.role !== "Admin") {
    return res.status(403).json({ message: "Accès refusé. Privilèges administrateur requis." });
  }

  next(); // L'utilisateur est admin, continuer
};

// Vous pourriez ajouter d'autres vérifications de rôle ici si nécessaire
exports.isChefProjet = (req, res, next) => {
   if (!req.user) {
     return res.status(401).json({ message: "Utilisateur non authentifié." });
  }
  if (req.user.role !== "ChefProjet") {
    return res.status(403).json({ message: "Accès refusé. Privilèges Chef de Projet requis." });
  }
  next();
};

exports.isSupplier = (req, res, next) => {
   if (!req.user) {
     return res.status(401).json({ message: "Utilisateur non authentifié." });
  }
  if (req.user.role !== "Supplier") {
    return res.status(403).json({ message: "Accès refusé. Privilèges Fournisseur requis." });
  }
  next();
};