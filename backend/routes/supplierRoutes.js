const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Gestion des fournisseurs
 */

/**
 * @swagger
 * /suppliers:
 *   get:
 *     summary: Récupérer tous les fournisseurs
 *     tags: [Suppliers]
 *     responses:
 *       200:
 *         description: Liste des fournisseurs
 *       500:
 *         description: Erreur serveur
 */
router.get("/", supplierController.getAllSuppliers);

/**
 * @swagger
 * /suppliers/{id}:
 *   get:
 *     summary: Récupérer un fournisseur par ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fournisseur trouvé
 *       404:
 *         description: Fournisseur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.get("/:id", supplierController.getSupplierById);

/**
 * @swagger
 * /suppliers:
 *   post:
 *     summary: Créer un nouveau fournisseur
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Fournisseur créé avec succès
 *       400:
 *         description: Données invalides
 *       500:
 *         description: Erreur serveur
 */
router.post("/", supplierController.createSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   put:
 *     summary: Mettre à jour un fournisseur
 *     tags: [Suppliers]
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
 *               contact:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fournisseur mis à jour
 *       400:
 *         description: Données invalides
 *       404:
 *         description: Fournisseur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/:id", supplierController.updateSupplier);

/**
 * @swagger
 * /suppliers/{id}:
 *   delete:
 *     summary: Supprimer un fournisseur
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fournisseur supprimé
 *       400:
 *         description: Fournisseur associé à des ressources
 *       404:
 *         description: Fournisseur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/:id", supplierController.deleteSupplier);

module.exports = router;