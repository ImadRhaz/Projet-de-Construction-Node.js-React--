// routes/projectRoutes.js

const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
// Assurez-vous que le chemin est correct pour votre middleware
const { authenticateToken } = require('../middleware/authMiddleware'); // Ou authMiddleware

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: API pour la gestion des projets
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectInput: # Schéma pour la création/mise à jour (sans champs auto-générés)
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Nom du projet
 *           example: "Nouveau Site Web E-commerce"
 *         description:
 *           type: string
 *           description: Description détaillée du projet
 *           example: "Développement complet d'une plateforme e-commerce"
 *         startDate:
 *           type: string
 *           format: date # Ou date-time
 *           description: Date de début prévue (format YYYY-MM-DD)
 *           example: "2024-09-01"
 *         endDate:
 *           type: string
 *           format: date # Ou date-time
 *           description: Date de fin prévue (format YYYY-MM-DD)
 *           example: "2025-03-31"
 *         budget:
 *           type: number
 *           format: float
 *           description: Budget total alloué
 *           example: 50000
 *         status:
 *           type: string
 *           enum: [Planifié, En cours, En attente, Terminé, Annulé]
 *           description: Statut du projet (Optionnel à la création, défaut 'Planifié')
 *           example: "Planifié"
 *       required:
 *         - name
 *         - description
 *         - startDate
 *         - endDate
 *         - budget
 *     ProjectResponse: # Schéma pour les réponses (incluant les champs auto-générés et peuplés)
 *       allOf: # Hérite des propriétés de ProjectInput
 *         - $ref: '#/components/schemas/ProjectInput'
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: L'ID auto-généré par MongoDB
 *           example: "60c72b3f9b1d8e001c8e4abc"
 *         user: # Peut être un ID ou un objet si peuplé
 *           oneOf:
 *             - type: string
 *               format: objectId
 *             - type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 username:
 *                   type: string
 *           description: L'utilisateur créateur (ID ou objet peuplé)
 *         tasks:
 *           type: array
 *           items:
 *             type: string # Ou un schéma Task si vous en avez un et peuplez
 *             format: objectId
 *           description: Liste des IDs des tâches associées
 *         commandes:
 *           type: array
 *           items:
 *             type: string # Ou un schéma Commande si vous en avez un et peuplez
 *             format: objectId
 *           description: Liste des IDs des commandes associées
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du document
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de la dernière mise à jour du document
 *   securitySchemes:
 *     bearerAuth: # Nom utilisé dans la section 'security' des routes
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: "Entrez le token JWT précédé de 'Bearer '"
 */

// --- ROUTES PROJETS ---

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Récupérer tous les projets
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Une liste de tous les projets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectResponse'
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.get("/", authenticateToken, projectController.getAllProjects);

/**
 * @swagger
 * /projects/user/{userId}:
 *   get:
 *     summary: Récupérer les projets par ID utilisateur
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de l'utilisateur dont on veut les projets
 *     responses:
 *       200:
 *         description: Liste des projets pour l'utilisateur spécifié
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProjectResponse'
 *       400:
 *         description: ID utilisateur invalide
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/user/:userId", authenticateToken, projectController.getProjectsByUserId);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Récupérer un projet spécifique par son ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID du projet à récupérer
 *     responses:
 *       200:
 *         description: Détails du projet trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectResponse'
 *       400:
 *         description: ID projet invalide
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Projet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/:id", authenticateToken, projectController.getProjectById);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Créer un nouveau projet (Utilisateur via Token)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       description: Données du projet à créer. L'utilisateur est déduit du token.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *           # --- MODIFICATION ICI ---
 *           # Ajout d'un exemple spécifique pour le request body avec les types
 *           example:
 *             name: "string"
 *             description: "string"
 *             startDate: "Date"  # Ou "string" si vous préférez le type OpenAPI exact
 *             endDate: "Date"    # Ou "string"
 *             budget: "Number"   # Ou "number" si vous préférez le type OpenAPI exact
 *             status: "string"   # Enum mais le type de base est string
 *           # --- FIN MODIFICATION ---
 *     responses:
 *       201:
 *         description: Projet créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectResponse'
 *       400:
 *         description: Données invalides (Erreur de validation)
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post("/", authenticateToken, projectController.createProject);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Mettre à jour un projet existant
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID du projet à mettre à jour
 *     requestBody:
 *       required: true
 *       description: Champs du projet à mettre à jour.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProjectInput'
 *           # --- MODIFICATION ICI ---
 *           # Ajout d'un exemple spécifique pour le request body avec les types
 *           example:
 *             name: "string"
 *             description: "string"
 *             startDate: "Date"  # Ou "string"
 *             endDate: "Date"    # Ou "string"
 *             budget: "Number"   # Ou "number"
 *             status: "string"   # Enum mais le type de base est string
 *           # --- FIN MODIFICATION ---
 *     responses:
 *       200:
 *         description: Projet mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectResponse'
 *       400:
 *         description: Données invalides ou ID invalide
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (pas le créateur ou admin)
 *       404:
 *         description: Projet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/:id", authenticateToken, projectController.updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Supprimer un projet par ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID du projet à supprimer
 *     responses:
 *       200:
 *         description: Projet supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Projet supprimé avec succès
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (pas le créateur ou admin)
 *       404:
 *         description: Projet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/:id", authenticateToken, projectController.deleteProject);

module.exports = router;