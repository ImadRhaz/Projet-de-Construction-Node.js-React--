// routes/taskRoutes.js

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticateToken } = require('../middleware/authMiddleware');
// Importez vos middlewares de rôle si vous en avez pour sécuriser certaines routes
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
 *     # --- Schémas pour Task (basés sur le contrôleur actuel) ---
 *     TaskResourceInput:
 *       type: object
 *       required: [resourceId, quantity]
 *       properties:
 *         resourceId: { type: string, format: objectId, description: ID de la ressource }
 *         quantity: { type: number, description: Quantité nécessaire }
 *
 *     TaskInput: # Pour la création (accepte les ressources initiales)
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
 *     TaskUpdateInput: # Pour la mise à jour (N'ACCEPTE PAS les ressources)
 *       type: object
 *       properties:
 *         projectId: { type: string, format: objectId, description: "Déplacer vers un autre projet (optionnel)"}
 *         description: { type: string }
 *         startDate: { type: string, format: date-time, nullable: true }
 *         endDate: { type: string, format: date-time, nullable: true }
 *         assignedUserId: { type: string, format: objectId, description: "Réassigner la tâche (optionnel)" }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué] }
 *
 *     TaskResourceResponse: # Pour l'affichage des ressources liées
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         resource: { type: object, properties: { _id: string, name: string, unit: string, type: string, quantityAvailable: number }, description: Ressource peuplée }
 *         quantity: { type: number }
 *         # Ajoutez dateUtilisation si vous l'utilisez
 *         # dateUtilisation: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time } # Timestamp du lien TaskResource
 *         updatedAt: { type: string, format: date-time } # Timestamp du lien TaskResource
 *
 *     TaskResponse: # Pour les réponses GET (avec ressources potentielles peuplées)
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         project: { type: object, properties: { _id: string, name: string, status: string, chefProjet: string }, description: Projet peuplé (ID chef inclus) }
 *         description: { type: string }
 *         startDate: { type: string, format: date-time, nullable: true }
 *         endDate: { type: string, format: date-time, nullable: true }
 *         assignedUser: { type: object, properties: { _id: string, username: string, email: string, role: string }, description: Utilisateur assigné peuplé }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué] }
 *         taskResources: # Champ virtuel peuplé par GET /tasks/{id}
 *           type: array
 *           items: { $ref: '#/components/schemas/TaskResourceResponse' }
 *         createdAt: { type: string, format: date-time } # Timestamp de la Tâche
 *         updatedAt: { type: string, format: date-time } # Timestamp de la Tâche
 *   # --- Fin des Schémas ---
 *
 *   securitySchemes: # Doit être défini
 *     bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
 */

// --- ROUTES POUR LES TÂCHES ---

/**
 * @swagger
 * /tasks: # <-- Chemin relatif gardé
 *   get:
 *     summary: Récupérer toutes les tâches (filtrable par projet)
 *     tags: [Tasks]
 *     description: 'Retourne une liste de tâches. Peut être filtrée par projectId. Note : URL réelle /api/tasks.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema: { type: string, format: objectId }
 *         required: false
 *         description: Filtrer par ID de projet
 *     responses:
 *       '200': # Syntaxe YAML standard recommandée
 *         description: Liste des tâches (peut être vide)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 # Utiliser une version simplifiée de TaskResponse ici si getTaskById peuple plus
 *                 $ref: "#/components/schemas/TaskResponse"
 *       '400': { description: 'Format projectId invalide' }
 *       '401': { description: 'Non authentifié' }
 *       '500': { description: 'Erreur serveur' }
 */
router.get("/", authenticateToken, taskController.getAllTasks);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   get:
 *     summary: Récupérer une tâche spécifique par son ID (avec ressources liées)
 *     tags: [Tasks]
 *     description: 'Retourne les détails complets d''une tâche, y compris les ressources associées (via TaskResources). Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectId }
 *         description: ID de la tâche
 *     responses:
 *       '200':
 *         description: Détails de la tâche
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TaskResponse" # Ce schéma inclut taskResources
 *       '400': { description: 'ID tâche invalide' }
 *       '401': { description: 'Non authentifié' }
 *       '404': { description: 'Tâche non trouvée' }
 *       '500': { description: 'Erreur serveur' }
 */
router.get("/:id", authenticateToken, taskController.getTaskById);

/**
 * @swagger
 * /tasks: # <-- Chemin relatif gardé
 *   post:
 *     summary: Créer une nouvelle tâche (avec liaison ressources initiales)
 *     tags: [Tasks]
 *     description: 'Crée une tâche et ses liaisons TaskResource initiales si un tableau `resources` est fourni. Note : URL réelle /api/tasks.'
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskInput" } # Accepte les ressources
 *           example:
 *             projectId: "67f14cdc38276b9d8b85b1e7"
 *             description: "Coulage dalle béton"
 *             startDate: "2025-05-15T00:00:00Z"
 *             resources:
 *               - resourceId: "67ec0600f560b983df0b085d" # Ciment
 *                 quantity: 50
 *               - resourceId: "67ec0600f560b983df0b086f" # Sable
 *                 quantity: 150.5
 *               - resourceId: "67ec0600f560b983df0b087a" # Gravier
 *                 quantity: 200
 *     responses:
 *       '201':
 *         description: Tâche créée (réponse peut inclure des erreurs partielles si la liaison a échoué)
 *         content:
 *           application/json:
 *             schema:
 *               # Le contrôleur renvoie la tâche peuplée, qui correspond à TaskResponse
 *               $ref: "#/components/schemas/TaskResponse"
 *       '400': { description: 'Données invalides (IDs, validation Mongoose, etc.)' }
 *       '401': { description: 'Non authentifié' }
 *       '403': { description: 'Non autorisé (ex: pas le rôle requis)' }
 *       '404': { description: 'Projet, Utilisateur assigné ou une Ressource non trouvé(e)' }
 *       '500': { description: 'Erreur serveur' }
 */
router.post("/", authenticateToken, /*isChefProjet,*/ taskController.createTask);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   put:
 *     summary: Mettre à jour les informations d'une tâche (PAS ses ressources)
 *     tags: [Tasks]
 *     description: 'Met à jour les champs de la tâche (description, dates, statut, assignation, projet). Pour gérer les ressources liées, utilisez les endpoints /task-resources. Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectId }
 *         description: ID de la tâche à mettre à jour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskUpdateInput" } # N'inclut PAS 'resources'
 *           example: { status: "En cours", startDate: "2025-05-16T00:00:00Z" }
 *     responses:
 *       '200':
 *         description: Tâche mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/TaskResponse" # Retourne la tâche mise à jour
 *       '400': { description: 'Données ou ID invalides' }
 *       '401': { description: 'Non authentifié' }
 *       '403': { description: 'Non autorisé à modifier' }
 *       '404': { description: 'Tâche, Nouveau Projet ou Nouvel Assigné non trouvé' }
 *       '500': { description: 'Erreur serveur' }
 */
router.put("/:id", authenticateToken, taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}: # <-- Chemin relatif gardé
 *   delete:
 *     summary: Supprimer une tâche et ses liens de ressources associés
 *     tags: [Tasks]
 *     description: 'Supprime la tâche et TOUS ses enregistrements TaskResource correspondants. Note : URL réelle /api/tasks/{id}.'
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: objectId }
 *         description: ID de la tâche à supprimer
 *     responses:
 *       '200':
 *         description: Tâche supprimée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tâche et ses ressources associées supprimées avec succès."
 *       '400': { description: 'ID invalide' }
 *       '401': { description: 'Non authentifié' }
 *       '403': { description: 'Non autorisé à supprimer' }
 *       '404': { description: 'Tâche non trouvée' }
 *       '500': { description: 'Erreur serveur' }
 */
router.delete("/:id", authenticateToken, taskController.deleteTask);

module.exports = router;