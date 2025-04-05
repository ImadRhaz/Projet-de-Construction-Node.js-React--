// routes/projectRoutes.js

const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const { authenticateToken } = require('../middleware/authMiddleware');
// const { isAdmin, isChefProjet } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Projects
 *   # AJOUT D'UNE NOTE IMPORTANTE SUR LES URLS RÉELLES
 *   description: 'API pour la gestion des projets. IMPORTANT : Les URLs réelles d''appel sont préfixées par /api (ex: appelez /api/projects pour la route documentée comme /projects).'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectInput: # Schéma pour la CRÉATION / MISE À JOUR
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - startDate
 *         - endDate
 *         - budget
 *       properties:
 *         name:
 *           type: string
 *           example: "Construction Immeuble Le Central"
 *         description:
 *           type: string
 *           example: "Construction d'un immeuble résidentiel de 10 étages."
 *         startDate:
 *           type: string
 *           format: date-time
 *           example: "2025-09-01T00:00:00.000Z"
 *         endDate:
 *           type: string
 *           format: date-time
 *           example: "2027-03-31T00:00:00.000Z"
 *         budget:
 *           type: number # <-- Type correct
 *           format: double
 *           example: 1500000.50
 *         status:
 *           type: string
 *           enum: [Planifié, En cours, En attente, Terminé, Annulé]
 *           default: Planifié
 *           example: "Planifié"
 *
 *     ProjectResponse: # Schéma pour les RÉPONSES (GET)
 *       allOf:
 *         - $ref: '#/components/schemas/ProjectInput'
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60c72b3f9b1d8e001c8e4abc"
 *         chefProjet: # <-- Nom corrigé
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "653bb587a4b01a7d8c9d0f5e"
 *             username:
 *               type: string
 *               example: "chef_martin"
 *             email:
 *               type: string
 *               format: email
 *               example: "martin@example.com"
 *             role:
 *               type: string
 *               example: "ChefProjet"
 *           description: Le chef de projet assigné (objet utilisateur peuplé)
 *         tasks:
 *           type: array
 *           items: { type: string, format: objectId }
 *           example: ["61c72b3f9b1d8e001c8e4def"]
 *         commandes:
 *           type: array
 *           items: { type: string, format: objectId }
 *           example: ["63c72b3f9b1d8e001c8e4123"]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: "Token JWT Bearer."
 */

// --- ROUTES PROJETS ---

/**
 * @swagger
 * /projects: # <-- Chemin documenté SANS /api
 *   get:
 *     summary: Récupérer la liste de tous les projets
 *     tags: [Projects]
 *     description: 'Retourne tous les projets. Note : L''URL réelle d''appel est /api/projects.'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Succès - Liste des projets.
 *         content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/ProjectResponse" }}}}
 *       401: { description: Non authentifié }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/' relatif au préfixe /api/projects
router.get("/", authenticateToken, projectController.getAllProjects);

/**
 * @swagger
 * /projects/chef/{userId}: # <-- Chemin documenté SANS /api
 *   get:
 *     summary: Récupérer les projets gérés par un Chef de Projet
 *     tags: [Projects]
 *     description: 'Retourne les projets d''un chef spécifique. Note : L''URL réelle d''appel est /api/projects/chef/{userId}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string, format: objectId }, description: ID du Chef de Projet }
 *     responses:
 *       200:
 *         description: Succès - Liste des projets du chef.
 *         content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/ProjectResponse" }}}}
 *       400: { description: ID invalide }
 *       401: { description: Non authentifié }
 *       404: { description: Utilisateur non trouvé }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/chef/:userId' relatif au préfixe /api/projects
router.get("/chef/:userId", authenticateToken, projectController.getProjectsByChefProjet);

/**
 * @swagger
 * /projects/{id}: # <-- Chemin documenté SANS /api
 *   get:
 *     summary: Récupérer un projet spécifique par son ID
 *     tags: [Projects]
 *     description: 'Retourne les détails d''un projet. Note : L''URL réelle d''appel est /api/projects/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID du Projet }
 *     responses:
 *       200:
 *         description: Succès - Détails du projet.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ProjectResponse" }}}
 *       400: { description: ID invalide }
 *       401: { description: Non authentifié }
 *       404: { description: Projet non trouvé }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/:id' relatif au préfixe /api/projects
router.get("/:id", authenticateToken, projectController.getProjectById);

/**
 * @swagger
 * /projects: # <-- Chemin documenté SANS /api
 *   post:
 *     summary: Créer un nouveau projet
 *     tags: [Projects]
 *     description: 'Crée un projet (chefProjet via token). Note : L''URL réelle d''appel est /api/projects.'
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ProjectInput" }
 *           example:
 *             name: "Rénovation Toiture Bâtiment A"
 *             description: "Réfection complète de la toiture."
 *             startDate: "2025-11-01T00:00:00.000Z"
 *             endDate: "2026-01-31T00:00:00.000Z"
 *             budget: 45000 # <-- Type number correct
 *             status: "Planifié"
 *     responses:
 *       201:
 *         description: Projet créé.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ProjectResponse" }}}
 *       400: { description: Données invalides }
 *       401: { description: Non authentifié }
 *       403: { description: Rôle non autorisé }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/' relatif au préfixe /api/projects
router.post("/", authenticateToken, /* isChefProjet, */ projectController.createProject);

/**
 * @swagger
 * /projects/{id}: # <-- Chemin documenté SANS /api
 *   put:
 *     summary: Mettre à jour un projet existant
 *     tags: [Projects]
 *     description: 'Met à jour un projet (autorisation vérifiée). Note : L''URL réelle d''appel est /api/projects/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID du Projet }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ProjectInput" }
 *           example:
 *             description: "Mise à jour du périmètre"
 *             budget: 48000 # <-- Type number
 *             status: "En cours"
 *     responses:
 *       200:
 *         description: Projet mis à jour.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ProjectResponse" }}}
 *       400: { description: Données ou ID invalides }
 *       401: { description: Non authentifié }
 *       403: { description: Non autorisé }
 *       404: { description: Projet non trouvé }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/:id' relatif au préfixe /api/projects
router.put("/:id", authenticateToken, projectController.updateProject);

/**
 * @swagger
 * /projects/{id}: # <-- Chemin documenté SANS /api
 *   delete:
 *     summary: Supprimer un projet par son ID
 *     tags: [Projects]
 *     description: 'Supprime un projet (autorisation vérifiée). Note : L''URL réelle d''appel est /api/projects/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID du Projet }
 *     responses:
 *       200:
 *         description: Projet supprimé.
 *         content: { application/json: { schema: { type: object, properties: { message: { type: string, example: "Projet supprimé avec succès" }}}}}
 *       400: { description: Impossible de supprimer (dépendances) ou ID invalide }
 *       401: { description: Non authentifié }
 *       403: { description: Non autorisé }
 *       404: { description: Projet non trouvé }
 *       500: { description: Erreur serveur }
 */
// Le chemin Express reste '/:id' relatif au préfixe /api/projects
router.delete("/:id", authenticateToken, projectController.deleteProject);

module.exports = router;