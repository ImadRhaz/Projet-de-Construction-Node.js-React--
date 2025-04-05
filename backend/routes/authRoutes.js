const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   # CORRECTION: Ajouter des guillemets simples autour de la description
 *   description: 'Gestion de l''authentification et des utilisateurs (inscription, connexion). Note : Les URLs réelles sont préfixées par /api (ex: /api/auth/register) en raison de la configuration serveur.'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserBase:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID unique de l'utilisateur
 *           example: "653bb587a4b01a7d8c9d0f5e"
 *         username:
 *           type: string
 *           description: Nom d'utilisateur unique
 *           example: "chef_martin"
 *         email:
 *           type: string
 *           format: email
 *           description: Adresse email unique de l'utilisateur
 *           example: "martin@example.com"
 *         role:
 *           type: string
 *           enum: [ChefProjet, Supplier, Admin]
 *           description: Rôle de l'utilisateur
 *           example: "ChefProjet"
 *     UserInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *         - role
 *       properties:
 *         username:
 *           type: string
 *           example: "nouveau_fournisseur"
 *         email:
 *           type: string
 *           format: email
 *           example: "contact@fournisseur-xyz.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Mot de passe (min 6 caractères)
 *           example: "motdepasseSécurisé123"
 *         role:
 *           type: string
 *           enum: [ChefProjet, Supplier, Admin]
 *           description: Le rôle à assigner à l'utilisateur.
 *           example: "Supplier"
 *         contact:
 *           type: string
 *           description: Nom du contact (Requis si role=Supplier)
 *           example: "Alice Dupont"
 *         phone:
 *           type: string
 *           description: Téléphone (Requis si role=Supplier)
 *           example: "0123456789"
 *         address:
 *           type: string
 *           description: Adresse (Requis si role=Supplier)
 *           example: "123 Rue de l'Industrie, 75000 Paris"
 *     LoginInput:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           example: "chef_martin"
 *         password:
 *           type: string
 *           format: password
 *           example: "sonMotDePasse"
 *     LoginResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Token JWT pour les requêtes authentifiées
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1M2JiNTg3YTRiMDFhN2Q4YzlkMGY1ZSIsInVzZXJuYW1lIjoiY2hlZl9tYXJ0aW4iLCJyb2xlIjoiQ2hlZlByb2pldCIsImlhdCI6MTY5ODQxMjQ1MCwiZXhwIjoxNjk4NDk4ODUwfQ.abcdef..."
 *         user:
 *           $ref: '#/components/schemas/UserBase'
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur (ChefProjet, Supplier, Admin)
 *     tags: [Auth]
 *     # CORRECTION: Ajouter des guillemets simples
 *     description: 'Crée un nouvel utilisateur avec le rôle spécifié. Notez que l''URL réelle d''appel est /api/auth/register.'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  message:
 *                    type: string
 *                    example: "Utilisateur créé avec succès."
 *       400:
 *         description: Données d'entrée invalides, rôle non supporté, utilisateur existant, ou champs spécifiques manquants pour le rôle.
 *       500:
 *         description: Erreur serveur interne.
 */
router.post("/register", authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion d'un utilisateur existant
 *     tags: [Auth]
 *     # CORRECTION: Ajouter des guillemets simples
 *     description: 'Authentifie un utilisateur et retourne un token JWT. Notez que l''URL réelle d''appel est /api/auth/login.'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Connexion réussie. Retourne le token JWT et les informations de base de l'utilisateur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Nom d'utilisateur ou mot de passe manquant.
 *       401:
 *         description: Échec de l'authentification (identifiants incorrects).
 *       500:
 *         description: Erreur serveur interne.
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Récupérer les informations complètes de l'utilisateur actuellement connecté
 *     tags: [Auth]
 *     # CORRECTION: Ajouter des guillemets simples
 *     description: 'Retourne les détails de l''utilisateur authentifié via le token. Notez que l''URL réelle d''appel est /api/auth/me.'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Succès. Retourne l'objet utilisateur complet (incluant les champs spécifiques au rôle, sauf le mot de passe).
 *         content:
 *           application/json:
 *             schema:
 *               # CORRECTION: Ajouter des guillemets simples à la description interne aussi
 *               description: 'L''objet utilisateur complet. La structure exacte dépend du rôle (UserBase + champs spécifiques pour ChefProjet/Supplier). Mot de passe exclu.'
 *               $ref: '#/components/schemas/UserBase'
 *       401:
 *         description: Non autorisé (Token manquant).
 *       403:
 *         description: Accès interdit (Token invalide ou expiré).
 *       404:
 *         description: Utilisateur non trouvé.
 *       500:
 *         description: Erreur serveur interne.
 */
router.get("/me", authenticateToken, authController.getCurrentUser);

module.exports = router;