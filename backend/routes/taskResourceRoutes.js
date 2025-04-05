// routes/taskRoutes.js

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticateToken } = require('../middleware/authMiddleware');
// const { isAdmin, isChefProjet } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: 'Gestion des tâches associées aux projets. IMPORTANT : Les URLs réelles d''appel sont préfixées par /api (ex: appelez /api/tasks pour la route documentée comme /tasks).'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- Schémas (définis correctement) ---
 *     TaskResourceInput:
 *       type: object
 *       required: [resourceId, quantity]
 *       properties:
 *         resourceId: { type: string, format: objectId, description: ID de la ressource }
 *         quantity: { type: number, description: Quantité nécessaire }
 *
 *     TaskInput: # Pour la création
 *       type: object
 *       required: [projectId, description]
 *       properties:
 *         projectId: { type: string, format: objectId, description: ID Projet associé }
 *         description: { type: string, description: Description de la tâche }
 *         startDate: { type: string, format: date-time, description: Date début (Optionnel) }
 *         endDate: { type: string, format: date-time, description: Date fin (Optionnel) }
 *         assignedUserId: { type: string, format: objectId, description: Utilisateur assigné (Optionnel, défaut=token user) }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué], default: 'À faire', description: Statut (Optionnel) }
 *         resources:
 *           type: array
 *           description: Ressources à lier initialement (Optionnel)
 *           items: { $ref: '#/components/schemas/TaskResourceInput' }
 *
 *     TaskUpdateInput: # Pour la mise à jour (sans resources)
 *       type: object
 *       properties:
 *         projectId: { type: string, format: objectId }
 *         description: { type: string }
 *         startDate: { type: string, format: date-time }
 *         endDate: { type: string, format: date-time }
 *         assignedUserId: { type: string, format: objectId }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué] }
 *
 *     TaskResourceResponse: # Pour l'affichage des ressources liées
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         resource: { type: object, properties: { _id: string, name: string, unit: string }, description: Ressource peuplée }
 *         quantity: { type: number }
 *
 *     TaskResponse: # Pour les réponses GET
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         project: { type: object, properties: { _id: string, name: string }, description: Projet peuplé }
 *         description: { type: string }
 *         startDate: { type: string, format: date-time, nullable: true }
 *         endDate: { type: string, format: date-time, nullable: true }
 *         assignedUser: { type: object, properties: { _id: string, username: string, email: string, role: string }, description: Utilisateur assigné peuplé }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué] }
 *         taskResources: # Champ virtuel peuplé
 *           type: array
 *           items: { $ref: '#/components/schemas/TaskResourceResponse' }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *   # --- Fin des Schémas ---
 *
 *   securitySchemes: # Défini une seule fois (peut être globalement)
 *     bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
 */

// --- ROUTES POUR LES TÂCHES ---

/**
 * @swagger
 * /tasks: # <-- Chemin relatif gardé
 *   get:
 *     summary: Récupérer toutes les tâches (filtrable par projet)
 *     tags: [Tasks]
 *     description: 'Retourne une liste de tâches. Peut être filtrée par projectId via query parameter. Note : URL réelle /api/tasks.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: projectId, schema: { type: string, format: objectId }, required: false, description: ID du projet pour filtrer }
 *     # --- CORRECTION: Syntaxe compacte pour les réponses ---
 *     responses:
 *       200: { description: 'Succès - Liste des tâches', content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/TaskResponse" }}}}}
 *       400: { description: 'Format projectId invalide' }
 *       401: { description: 'Non authentifié' }
 *       500: { description: 'Erreur serveur' }
 *     # --- FIN CORRECTION ---
 */
router.get("/", authenticateToken, taskController.getAllTasks);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   get:
 *     summary: Récupérer une tâche spécifique par son ID
 *     tags: [Tasks]
 *     description: 'Retourne les détails d''une tâche, incluant les ressources liées peuplées. Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la tâche }
 *     # --- CORRECTION: Syntaxe compacte ---
 *     responses:
 *       200: { description: 'Succès - Détails de la tâche', content: { application/json: { schema: { $ref: "#/components/schemas/TaskResponse" }}}}
 *       400: { description: 'ID tâche invalide' }
 *       401: { description: 'Non authentifié' }
 *       404: { description: 'Tâche non trouvée' }
 *       500: { description: 'Erreur serveur' }
 *     # --- FIN CORRECTION ---
 */
router.get("/:id", authenticateToken, taskController.getTaskById);

/**
 * @swagger
 * /tasks: # <-- Chemin relatif gardé
 *   post:
 *     summary: Créer une nouvelle tâche (et lier ses ressources initiales)
 *     tags: [Tasks]
 *     description: 'Crée une tâche et associe les ressources fournies. assignedUser par défaut = user du token. Note : URL réelle /api/tasks.'
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskInput" }
 *           example:
 *             projectId: "67f14cdc38276b9d8b85b1e7"
 *             description: "Préparation du mortier"
 *             resources:
 *               - resourceId: "67ec0600f560b983df0b085d"
 *                 quantity: 5
 *               - resourceId: "67ec0600f560b983df0b086f"
 *                 quantity: 15.5
 *     # --- CORRECTION: Syntaxe compacte ---
 *     responses:
 *       201: { description: 'Tâche créée (voir réponse pour erreurs partielles ressources)', content: { application/json: { schema: { $ref: "#/components/schemas/TaskResponse" }}}}
 *       400: { description: 'Données invalides' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé' }
 *       404: { description: 'Projet/Utilisateur/Ressource non trouvé' }
 *       500: { description: 'Erreur serveur' }
 *     # --- FIN CORRECTION ---
 */
router.post("/", authenticateToken, /*isChefProjet,*/ taskController.createTask);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   put:
 *     summary: Mettre à jour les informations d'une tâche
 *     tags: [Tasks]
 *     description: 'Met à jour les détails d''une tâche. NE MODIFIE PAS les ressources liées (utiliser /api/task-resources). Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la tâche }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskUpdateInput" } # Utilise le schéma SANS resources
 *           example: { description: "Mortier préparé et livré", status: "Terminé" }
 *     # --- CORRECTION: Syntaxe compacte ---
 *     responses:
 *       200: { description: 'Tâche mise à jour', content: { application/json: { schema: { $ref: "#/components/schemas/TaskResponse" }}}}
 *       400: { description: 'Données ou ID invalides' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé' }
 *       404: { description: 'Tâche/Projet/User non trouvé' }
 *       500: { description: 'Erreur serveur' }
 *     # --- FIN CORRECTION ---
 */
router.put("/:id", authenticateToken, taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   delete:
 *     summary: Supprimer une tâche et ses liens de ressources
 *     tags: [Tasks]
 *     description: 'Supprime une tâche et toutes ses liaisons TaskResource. Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la tâche }
 *     # --- CORRECTION: Syntaxe compacte ---
 *     responses:
 *       200: { description: 'Tâche supprimée', content: { application/json: { schema: { type: object, properties: { message: { type: string, example: "Tâche et ses ressources associées supprimées avec succès." }}}}} }
 *       400: { description: 'ID invalide' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé' }
 *       404: { description: 'Tâche non trouvée' }
 *       500: { description: 'Erreur serveur' }
 *     # --- FIN CORRECTION ---
 */
router.delete("/:id", authenticateToken, taskController.deleteTask);

module.exports = router;