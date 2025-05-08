// routes/taskRoutes.js

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");
const { authenticateToken } = require('../middleware/authMiddleware');
// const { isAdmin, isChefProjet } = require('../middleware/authMiddleware'); // Décommentez si utilisé pour certaines routes spécifiques

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
 *     # --- Schémas d'entrée (Input) ---
 *     TaskResourceInput:
 *       type: object
 *       required: [resourceId, quantity]
 *       properties:
 *         resourceId: { type: string, format: objectId, description: "ID de la ressource (Resource Stock)" }
 *         quantity: { type: number, minimum: 0.01, description: "Quantité de ressource nécessaire" }
 *
 *     TaskCreateInput:
 *       type: object
 *       required: [projectId, description]
 *       properties:
 *         projectId: { type: string, format: objectId, description: "ID du projet associé" }
 *         description: { type: string, minLength: 3, description: "Description de la tâche" }
 *         startDate: { type: string, format: date-time, description: "Date de début (Optionnel)" }
 *         endDate: { type: string, format: date-time, description: "Date de fin (Optionnel)" }
 *         assignedUserId: { type: string, format: objectId, description: "ID de l'utilisateur assigné (Optionnel, défaut à l'utilisateur du token si non admin)" }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué], default: 'À faire', description: "Statut initial (Optionnel)" }
 *         resources:
 *           type: array
 *           description: "Ressources à lier initialement à la tâche (Optionnel)"
 *           items: { $ref: '#/components/schemas/TaskResourceInput' }
 *
 *     TaskUpdateInput:
 *       type: object
 *       properties: # Aucun champ n'est 'required' pour un PATCH/PUT partiel
 *         projectId: { type: string, format: objectId, description: "Nouvel ID de projet pour déplacer la tâche (Optionnel)"}
 *         description: { type: string, minLength: 3, description: "Nouvelle description" }
 *         startDate: { type: string, format: date-time, nullable: true, description: "Nouvelle date de début" }
 *         endDate: { type: string, format: date-time, nullable: true, description: "Nouvelle date de fin" }
 *         assignedUserId: { type: string, format: objectId, nullable: true, description: "Nouvel utilisateur assigné" }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué], description: "Nouveau statut" }
 *
 *     # --- Schémas de Réponse (Output/Response) ---
 *     ResourceStockDetails: # Détails d'une ressource de stock (utilisé dans TaskResourceLinkedResponse)
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         productTypeId: { # Supposons que ProductType est peuplé sur Resource
 *           type: object,
 *           properties: {
 *             _id: { type: string, format: objectId },
 *             name: { type: string },
 *             unite: { type: string }
 *             # type: { type: string } # Si vous avez un champ type sur ProductType
 *           }
 *         }
 *         quantiteDisponible: { type: number }
 *         # dateEntreeStock: { type: string, format: date-time } # Si vous voulez l'afficher
 *
 *     TaskResourceLinkedResponse: # Ressource liée à une tâche (document TaskResource peuplé)
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId, description: "ID du lien TaskResource" }
 *         resource: { $ref: "#/components/schemas/ResourceStockDetails", description: "Détails de la ressource de stock peuplée" }
 *         quantity: { type: number, description: "Quantité de cette ressource allouée/utilisée pour cette tâche" } # Renommé de quantityUsed pour correspondre à TaskResourceInput
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     TaskBase: # Champs de base d'une Tâche
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         description: { type: string }
 *         startDate: { type: string, format: date-time, nullable: true }
 *         endDate: { type: string, format: date-time, nullable: true }
 *         status: { type: string, enum: [À faire, En cours, Terminé, En retard, Bloqué] }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     TaskPopulatedResponse: # Tâche avec ses relations peuplées
 *       allOf:
 *         - $ref: '#/components/schemas/TaskBase'
 *       type: object
 *       properties:
 *         project: # Projet peuplé
 *           type: object
 *           properties:
 *             _id: { type: string, format: objectId }
 *             name: { type: string }
 *             status: { type: string } # Statut du projet
 *             chefProjet: { # Chef de projet peuplé (assurez-vous que votre contrôleur peuple cela)
 *               type: object,
 *               nullable: true, # Peut-être qu'un projet n'a pas toujours de chefProjet assigné ou peuplé
 *               properties: {
 *                 _id: { type: string, format: objectId },
 *                 username: { type: string }
 *               }
 *             }
 *         assignedUser: # Utilisateur assigné peuplé
 *           type: object
 *           nullable: true
 *           properties:
 *             _id: { type: string, format: objectId }
 *             username: { type: string }
 *             email: { type: string }
 *             role: { type: string }
 *         taskResources: # Tableau des ressources liées à la tâche (TaskResource)
 *           type: array
 *           items: { $ref: '#/components/schemas/TaskResourceLinkedResponse' }
 *
 *     ErrorResponse: # Schéma générique pour les réponses d'erreur
 *       type: object
 *       properties:
 *         success: { type: boolean, example: false }
 *         message: { type: string }
 *         # error: { type: string } # Si vous renvoyez error.message directement
 *
 *   securitySchemes:
 *     bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
 */

// --- ROUTES POUR LES TÂCHES ---

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Récupérer toutes les tâches (filtrable par projet)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: projectId, in: query, schema: { type: string, format: objectId }, required: false, description: "Filtrer par ID de projet" }
 *     responses:
 *       '200':
 *         description: Liste des tâches récupérées avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, description: "Nombre total de tâches correspondant aux filtres" }
 *                 data:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/TaskPopulatedResponse" }
 *       '400':
 *         description: Requête invalide (ex: format projectId incorrect).
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.get("/", authenticateToken, taskController.getAllTasks);

/**
 * @swagger
 * /tasks/by-project/{projectId}:
 *   get:
 *     summary: Récupérer toutes les tâches pour un projet spécifique
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID du projet pour lequel récupérer les tâches
 *     responses:
 *       '200':
 *         description: Liste des tâches du projet récupérées avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, description: "Nombre de tâches trouvées pour ce projet" }
 *                 data:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/TaskPopulatedResponse" }
 *       '400':
 *         description: Format de projectId invalide.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '404':
 *         description: Projet non trouvé.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.get(
    "/by-project/:projectId",
    authenticateToken,
    taskController.getTasksForSpecificProject // Assurez-vous que cette fonction existe dans taskController
);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Récupérer une tâche spécifique par son ID (avec ressources liées)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la tâche" }
 *     responses:
 *       '200':
 *         description: Détails de la tâche récupérés avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: "#/components/schemas/TaskPopulatedResponse" }
 *       '400':
 *         description: ID de tâche invalide.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '404':
 *         description: Tâche non trouvée.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.get("/:id", authenticateToken, taskController.getTaskById);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Créer une nouvelle tâche (avec liaison ressources initiales)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskCreateInput" }
 *           example:
 *             projectId: "60c72b2f9b1e8c1f8c8b4567" # Remplacer par un ID de projet valide de votre BDD
 *             description: "Préparation du terrain et des fondations"
 *             startDate: "2025-07-01T08:00:00Z"
 *             # assignedUserId: "60c72b2f9b1e8c1f8c8b4568" # Remplacer par un ID utilisateur valide (optionnel)
 *             resources:
 *               - resourceId: "681cef52a454e331acaef4ce" # Remplacer par un ID de ressource stock valide
 *                 quantity: 5
 *     responses:
 *       '201':
 *         description: Tâche créée avec succès. Peut inclure des erreurs partielles pour les liaisons de ressources.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, nullable: true, description: "Message additionnel, ex: en cas d'erreurs partielles."}
 *                 data: { $ref: "#/components/schemas/TaskPopulatedResponse" }
 *                 resourceErrors: {
 *                   type: array,
 *                   items: { type: string },
 *                   description: "Liste des erreurs rencontrées lors de la liaison des ressources.",
 *                   nullable: true
 *                 }
 *       '400':
 *         description: Données invalides pour la création de la tâche.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '403':
 *         description: Non autorisé à créer une tâche pour ce projet.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '404':
 *         description: Projet, Utilisateur assigné ou une Ressource spécifiée non trouvé(e).
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.post("/", authenticateToken, /*isChefProjet,*/ taskController.createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Mettre à jour les informations d'une tâche (PAS ses ressources liées)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la tâche à mettre à jour" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TaskUpdateInput" }
 *           example: { status: "En cours", description: "Fondations - Phase 1 terminée, attente inspection" }
 *     responses:
 *       '200':
 *         description: Tâche mise à jour avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: "#/components/schemas/TaskPopulatedResponse" }
 *       '400':
 *         description: Données ou ID de tâche invalides.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '403':
 *         description: Non autorisé à modifier cette tâche.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '404':
 *         description: Tâche, nouveau projet ou nouvel utilisateur assigné non trouvé(e).
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.put("/:id", authenticateToken, /*isChefProjet,*/ taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Supprimer une tâche et ses liens de ressources associés
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la tâche à supprimer" }
 *     responses:
 *       '200':
 *         description: Tâche supprimée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Tâche et ses ressources associées supprimées avec succès." }
 *       '400':
 *         description: ID de tâche invalide.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '401':
 *         description: Non authentifié.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '403':
 *         description: Non autorisé à supprimer cette tâche.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '404':
 *         description: Tâche non trouvée.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 *       '500':
 *         description: Erreur serveur interne.
 *         content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
 */
router.delete("/:id", authenticateToken, /*isChefProjet,*/ taskController.deleteTask);

module.exports = router;