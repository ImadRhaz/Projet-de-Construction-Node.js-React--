const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Gestion des projets
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Récupérer tous les projets
 *     tags: [Projects]
 *     responses:
 *       200:
 *         description: Liste des projets
 */
router.get("/", projectController.getAllProjects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Récupérer un projet par ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projet trouvé
 *       404:
 *         description: Projet non trouvé
 */
router.get("/:id", projectController.getProjectById);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Créer un nouveau projet
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: number
 *     responses:
 *       201:
 *         description: Projet créé avec succès
 *       400:
 *         description: Données invalides
 */
router.post("/", projectController.createProject);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Mettre à jour un projet
 *     tags: [Projects]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               budget:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: ["Planifié", "En cours", "En attente", "Terminé"]
 *     responses:
 *       200:
 *         description: Projet mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Projet non trouvé
 */
router.put("/:id", projectController.updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Supprimer un projet
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projet supprimé
 *       404:
 *         description: Projet non trouvé
 */
router.delete("/:id", projectController.deleteProject);

module.exports = router;