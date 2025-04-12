// routes/commandeRoutes.js
const express = require("express");
const router = express.Router();
const commandeController = require("../controllers/commandeController");

// --- Middlewares ---
const {
    authenticateToken,
    isChefProjet,
    isSupplier, // Gardé ici car pourrait être utile pour d'autres routes Commandes
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
 *       # --- MODIFICATION ICI ---
 *       required: [name, montantTotal, projetId, items] # fournisseurId supprimé
 *       # --- FIN MODIFICATION ---
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
 *         # --- MODIFICATION ICI ---
 *         # La propriété fournisseurId a été supprimée
 *         # fournisseurId:
 *         #   type: string
 *         #   format: objectId
 *         #   example: "65f1a8d8f1b9e3b4e8f0e456"
 *         # --- FIN MODIFICATION ---
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
 *       # ...(inchangé)...
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
 *           # Mise à jour de l'enum pour refléter le modèle
 *           enum: ['EnAttenteAssignation', 'Soumise', 'Partiellement Validée', 'Totalement Validée', 'Annulée']
 *         dateCmd:
 *           type: string
 *           format: date-time
 *         montantTotal:
 *           type: number
 *         # fournisseurId peut être null maintenant
 *         fournisseurId:
 *           type: string
 *           format: objectId
 *           nullable: true
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
 *     summary: Créer une nouvelle demande de commande (ChefProjet uniquement)
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Permet à un Chef de Projet de créer une demande de commande avec des items, sans assigner de fournisseur immédiatement.
 *       La commande sera créée avec le statut "EnAttenteAssignation" (ou similaire, selon votre modèle) et fournisseurId=null.
 *       Une transaction est utilisée pour garantir l'intégrité des données.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandeCreateInput' # Fait référence au schéma mis à jour
 *     responses:
 *       201:
 *         description: Commande créée avec succès (en attente d'assignation fournisseur)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeResponse'
 *       400:
 *         description: |
 *           Erreur de validation :
 *           - Items manquants ou invalides
 *           - Champs obligatoires (name, projetId, montantTotal, items) manquants
 *           - ProductType introuvable
 *           - Projet introuvable
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
    isChefProjet, // Seul le chef de projet crée la demande initiale
    commandeController.createCommande // Le contrôleur modifié n'utilise plus fournisseurId
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

// --- AJOUT FUTUR : Route pour assigner un fournisseur ---
/*
 * @swagger
 * /commandes/{id}/assign-supplier:
 *   patch:
 *     summary: Assigner un fournisseur à une commande existante
 *     tags: [Commandes]
 *     // ... (définir sécurité, paramètres, requestBody avec fournisseurId, responses)
 */
// router.patch('/:id/assign-supplier', authenticateToken, /* peut-être isChefProjet ou isAdmin */, commandeController.assignSupplierToCommande);
// --- FIN AJOUT FUTUR ---


module.exports = router;