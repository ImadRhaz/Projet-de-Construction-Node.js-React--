const express = require("express");
const router = express.Router();
const commandeController = require("../controllers/commandeController");

// --- Middlewares ---
const {
    authenticateToken,
    isChefProjet,
    isSupplier,
    isAdmin
} = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Commandes
 *   description: API pour la gestion des commandes fournisseurs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CommandeCreateInput:
 *       type: object
 *       required: [name, montantTotal, projetId, fournisseurId, items]
 *       properties:
 *         name:
 *           type: string
 *           example: "Commande Béton C25/30"
 *         type:
 *           type: string
 *           example: "Matériaux Gros Oeuvre"
 *         dateCmd:
 *           type: string
 *           format: date-time
 *           example: "2024-10-01T08:00:00Z"
 *         montantTotal:
 *           type: number
 *           format: double
 *           minimum: 0
 *           example: 1250.75
 *         projetId:
 *           type: string
 *           format: objectId
 *           example: "65f1a8d8f1b9e3b4e8f0e123"
 *         fournisseurId:
 *           type: string
 *           format: objectId
 *           example: "65f1a8d8f1b9e3b4e8f0e456"
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required: [productTypeId, quantiteCommandee]
 *             properties:
 *               productTypeId:
 *                 type: string
 *                 format: objectId
 *                 example: "65f1a8d8f1b9e3b4e8f0e789"
 *               quantiteCommandee:
 *                 type: number
 *                 minimum: 1
 *                 example: 10
 *               prixUnitaire:
 *                 type: number
 *                 minimum: 0
 *                 example: 125.50

 *     CommandeResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         statutCmd:
 *           type: string
 *           enum: ['Soumise', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée']
 *         dateCmd:
 *           type: string
 *           format: date-time
 *         montantTotal:
 *           type: number
 *         fournisseurId:
 *           type: string
 *         projetId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time

 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /commandes:
 *   post:
 *     summary: Créer une nouvelle commande (ChefProjet uniquement)
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Permet à un Chef de Projet de créer une commande avec des items.
 *       La commande sera créée avec le statut "Soumise".
 *       Une transaction est utilisée pour garantir l'intégrité des données.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandeCreateInput'
 *     responses:
 *       201:
 *         description: Commande créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeResponse'
 *       400:
 *         description: |
 *           Erreur de validation :
 *           - Items manquants ou invalides
 *           - Champs obligatoires manquants
 *           - ProductType introuvable
 *           - Projet ou fournisseur introuvable
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé (rôle non ChefProjet)
 *       500:
 *         description: Erreur serveur
 */
router.post(
    "/",
    authenticateToken,
    isChefProjet,
    commandeController.createCommande
);

/**
 * @swagger
 * /commandes/test:
 *   get:
 *     summary: Route test
 *     tags: [Commandes]
 *     responses:
 *       200:
 *         description: Réponse de test
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "API Commandes opérationnelle"
 */
router.get("/test", (req, res) => {
    res.send("API Commandes opérationnelle");
});

module.exports = router;