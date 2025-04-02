const express = require("express");
const router = express.Router();
const taskController = require("../controllers/taskController");

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Gestion des tâches
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Récupérer toutes les tâches
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: ID du projet pour filtrer les tâches
 *     responses:
 *       200:
 *         description: Liste des tâches
 *       500:
 *         description: Erreur serveur
 */
router.get("/", taskController.getAllTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Récupérer une tâche par ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tâche trouvée
 *       404:
 *         description: Tâche non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get("/:id", taskController.getTaskById);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Créer une nouvelle tâche
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               status:
 *                 type: string
 *                 enum: ["À faire", "En cours", "Terminé", "En retard"]
 *     responses:
 *       201:
 *         description: Tâche créée avec succès
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Projet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post("/", taskController.createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Mettre à jour une tâche
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectId:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               resources:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               status:
 *                 type: string
 *                 enum: ["À faire", "En cours", "Terminé", "En retard"]
 *     responses:
 *       200:
 *         description: Tâche mise à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Tâche ou projet non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/:id", taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Supprimer une tâche
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tâche supprimée
 *       404:
 *         description: Tâche non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete("/:id", taskController.deleteTask);

module.exports = router;