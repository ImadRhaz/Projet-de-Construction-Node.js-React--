const User = require("../models/User");
// Importer les modèles discriminateurs
const ChefProjet = require("../models/ChefProjet");
const Supplier = require("../models/Supplier");
const jwt = require("jsonwebtoken");
// Vous devriez utiliser une variable d'environnement pour votre secret JWT
const JWT_SECRET = process.env.JWT_SECRET || "votre_secret_jwt_tres_long_et_securise"; // Changez ceci !

exports.register = async (req, res) => {
  // Destructurer TOUS les champs potentiels du body
  const { username, email, password, role, contact, phone, address /* autres champs spécifiques éventuels */ } = req.body;

  // --- Validation d'entrée ---
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: "Les champs username, email, password et role sont requis." });
  }

  // Vérifier si le rôle fourni est valide
  const validRoles = User.schema.path('role').enumValues; // Récupère l'enum du schéma
  if (!validRoles.includes(role)) {
     return res.status(400).json({ message: `Rôle invalide. Les rôles valides sont : ${validRoles.join(', ')}` });
  }

  try {
    // Vérifier l'unicité (username ET email)
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const field = existingUser.username === username ? 'username' : 'email';
      return res.status(400).json({ message: `Un utilisateur avec ce ${field} existe déjà.` });
    }

    let newUser;
    const userData = { username, email, password, role }; // Données communes

    // --- Instancier le bon modèle basé sur le rôle ---
    if (role === "Supplier") {
      // Vérifier les champs requis pour Supplier
      if (!contact || !phone || !address) {
        return res.status(400).json({ message: "Les champs contact, phone et address sont requis pour le rôle Supplier." });
      }
      // Ajouter les champs spécifiques au Supplier
      Object.assign(userData, { contact, phone, address });
      newUser = new Supplier(userData); // Utilise le constructeur Supplier

    } else if (role === "ChefProjet") {
      // Ajouter les champs spécifiques au ChefProjet si nécessaire (ici aucun requis à la création)
      newUser = new ChefProjet(userData); // Utilise le constructeur ChefProjet

    } else if (role === "Admin") {
       // Pour Admin, on utilise le constructeur User de base (sauf si vous créez un discriminateur Admin)
       newUser = new User(userData);

    } else {
       // Ce cas ne devrait pas arriver grâce à la validation précédente, mais par sécurité
       return res.status(400).json({ message: "Rôle utilisateur non supporté pour l'enregistrement direct." });
    }

    // Sauvegarder le nouvel utilisateur (peu importe son type réel)
    await newUser.save();

    // Ne pas renvoyer le mot de passe ou des infos trop sensibles
    res.status(201).json({ message: "Utilisateur créé avec succès." });

  } catch (error) {
    // Gestion des erreurs de validation Mongoose ou autres erreurs serveur
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Erreur de validation", errors: error.errors });
    }
    console.error("Erreur lors de l'enregistrement:", error); // Log l'erreur côté serveur
    res.status(500).json({ message: "Erreur serveur lors de la création de l'utilisateur.", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Nom d'utilisateur et mot de passe requis." });
    }

    // User.findOne fonctionne car il cherche dans toute la collection 'users'
    const user = await User.findOne({ username });
    if (!user) {
      // Message générique pour ne pas indiquer si c'est le user ou le mdp qui est faux
      return res.status(401).json({ message: "Authentification échouée." });
    }

    // user.comparePassword fonctionne car hérité du schéma User de base
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Authentification échouée." });
    }

    // Le rôle est correctement récupéré depuis le document user trouvé
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }, // Durée de validité du token
    );

    // Renvoyer le token et des informations utilisateur SANS le mot de passe
    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email, // Ajouter l'email si utile côté client
        role: user.role,
        // Ne PAS inclure les champs spécifiques ici, getCurrentUser est là pour ça
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion.", error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  // req.user est défini par le middleware authenticateToken
  if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
  }

  try {
    // User.findById fonctionne et retourne le document complet (avec champs spécifiques)
    const user = await User.findById(req.user.id).select("-password"); // Exclure le mot de passe

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Renvoie l'objet utilisateur complet (base + spécifique au rôle)
    res.status(200).json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur courant:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};