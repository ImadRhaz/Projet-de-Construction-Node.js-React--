const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: Gestion des ressources
 */

/**
 * @swagger
 * /resources:
 *   get:
 *     summary: Récupérer toutes les ressources
 *     tags: [Resources]
 *     responses:
 *       200:
 *         description: Liste des ressources
 *       500:
 *         description: Erreur serveur
 */
router.get("/", resourceController.getAllResources);

/**
 * @swagger
 * /resources/{id}:
 *   get:
 *     summary: Récupérer une ressource par ID
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ressource trouvée
 *       404:
 *         description: Ressource non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.get("/:id", resourceController.getResourceById);

/**
 * @swagger
 * /resources:
 *   post:
 *     summary: Créer une nouvelle ressource
 *     tags: [Resources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ["Matériau", "Équipement", "Personnel"]
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               supplierId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ressource créée avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post("/", resourceController.createResource);

/**
 * @swagger
 * /resources/{id}:
 *   put:
 *     summary: Mettre à jour une ressource
 *     tags: [Resources]
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
 *               type:
 *                 type: string
 *                 enum: ["Matériau", "Équipement", "Personnel"]
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               supplierId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ressource mise à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Ressource non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.put("/:id", resourceController.updateResource);

/**
 * @swagger
 * /resources/{id}:
 *   delete:
 *     summary: Supprimer une ressource
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ressource supprimée
 *       400:
 *         description: Ressource utilisée dans des tâches
 *       404:
 *         description: Ressource non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.delete("/:id", resourceController.deleteResource);

module.exports = router;