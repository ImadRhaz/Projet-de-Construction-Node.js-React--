// routes/commandeRoutes.js
const express = require("express");
const router = express.Router();
const commandeController = require("../controllers/commandeController");
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Commandes (Supplier)
 *   description: API pour la gestion des commandes par les fournisseurs (basée sur le modèle Commande simple). Authentification requise.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- Input Schema for Creating an Order by Supplier (Matches YOUR Model) ---
 *     CommandeSimpleInput:
 *       type: object
 *       required:
 *         - name
 *         - montantTotal
 *         - projectId # Renamed from 'projet' for clarity in request
 *       properties:
 *         name:
 *           type: string
 *           description: Nom ou identifiant unique pour la commande.
 *           example: "Commande Fournitures Bureau #FB-002"
 *         type:
 *           type: string
 *           description: Type de commande (facultatif).
 *           example: "Achat Matériel"
 *         statut:
 *           type: string
 *           description: Statut initial (facultatif, défaut 'En attente' dans le modèle).
 *           enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée']
 *           default: 'En attente'
 *           example: "Validée" # Example if overriding default
 *         dateCmd:
 *           type: string
 *           format: date-time
 *           description: Date de la commande (facultatif, défaut Date.now() dans le modèle).
 *           example: "2024-07-25T09:30:00Z"
 *         montantTotal:
 *           type: number
 *           format: double
 *           description: Montant total de la commande (doit être >= 0).
 *           example: 350.99
 *           minimum: 0
 *         projectId: # Use projectId in request body for clarity
 *           type: string
 *           format: objectId
 *           description: ID du projet auquel la commande est associée.
 *           example: "65f1a8d8f1b9e3b4e8f0e123"
 *       # NOTE: 'supplier' n'est PAS dans l'input, il est déterminé par l'utilisateur connecté.
 *
 *     # --- Response Schema for an Order (Matches YOUR Model + Populate) ---
 *     CommandeSimpleResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         name:
 *           type: string
 *         type:
 *           type: string
 *         statut:
 *           type: string
 *           enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée']
 *         dateCmd:
 *           type: string
 *           format: date-time
 *         montantTotal:
 *           type: number
 *           format: double
 *         projet: # Field name from model
 *           $ref: '#/components/schemas/ProjectSummaryResponse' # Populated
 *         supplier: # Field name from model
 *           $ref: '#/components/schemas/SupplierSummaryResponse' # Populated
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     # --- Helper Schemas for Populated Fields (Adjust fields based on controller's 'select') ---
 *     ProjectSummaryResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         name:
 *           type: string
 *         status: # Based on controller populate
 *           type: string
 *         # Add description if needed/populated
 *
 *     SupplierSummaryResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         username:
 *           type: string
 *         contact: # Based on controller populate
 *            type: string
 *         # Add phone, address, email etc. if needed/populated
 *
 *     # --- Schema for Updating Status ---
 *     CommandeStatusUpdateInput:
 *       type: object
 *       required:
 *         - statut # Match model field name
 *       properties:
 *         statut: # Match model field name
 *           type: string
 *           description: Le nouveau statut valide de la commande.
 *           enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée']
 *           example: "Livrée"
 *
 *   # --- Security Definition ---
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 */

// --- ROUTES SPECIFIC TO SUPPLIERS (Using the Corrected Controller) ---

/**
 * @swagger
 * /commandes/my:
 *   get:
 *     summary: Récupérer les commandes du fournisseur connecté
 *     tags: [Commandes (Supplier)]
 *     security:
 *       - bearerAuth: []
 *     description: Retourne la liste des commandes créées par le fournisseur actuellement authentifié (modèle simple). Rôle 'Supplier' requis.
 *     responses:
 *       200:
 *         description: Liste des commandes du fournisseur.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CommandeSimpleResponse' # Use correct response schema
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé (rôle non Supplier).
 *       500:
 *         description: Erreur serveur.
 */
router.get("/my",
    authenticateToken,
    commandeController.getMyCommandes
);

/**
 * @swagger
 * /commandes/{id}:
 *   get:
 *     summary: Récupérer une commande spécifique du fournisseur connecté
 *     tags: [Commandes (Supplier)]
 *     security:
 *       - bearerAuth: []
 *     description: Retourne les détails d'une commande spécifique si elle appartient au fournisseur authentifié (modèle simple). Rôle 'Supplier' requis.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: objectId
 *         required: true
 *         description: ID de la commande à récupérer.
 *     responses:
 *       200:
 *         description: Détails de la commande.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeSimpleResponse' # Use correct response schema
 *       400:
 *         description: Format de l'ID de commande invalide.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé (rôle non Supplier).
 *       404:
 *         description: Commande non trouvée ou n'appartient pas au fournisseur.
 *       500:
 *         description: Erreur serveur.
 */
router.get("/:id",
    authenticateToken,
    commandeController.getCommandeById
);


/**
 * @swagger
 * /commandes:
 *   post:
 *     summary: Créer une nouvelle commande (Supplier uniquement, modèle simple)
 *     tags: [Commandes (Supplier)]
 *     security:
 *       - bearerAuth: []
 *     description: Permet à un fournisseur connecté de créer une nouvelle commande (basée sur nom, montant, projet, etc.). Le fournisseur est automatiquement assigné. Rôle 'Supplier' requis.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandeSimpleInput' # Use correct input schema
 *     responses:
 *       201:
 *         description: Commande créée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeSimpleResponse' # Use correct response schema
 *       400:
 *         description: Données invalides (champs requis manquants, montant négatif, ID projet invalide, format date invalide, etc.).
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé (rôle non Supplier).
 *       404:
 *         description: Projet associé non trouvé.
 *       500:
 *         description: Erreur serveur.
 */
router.post("/",
    authenticateToken,
    commandeController.createCommande
);


/**
 * @swagger
 * /commandes/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'une commande (Supplier propriétaire)
 *     tags: [Commandes (Supplier)]
 *     security:
 *       - bearerAuth: []
 *     description: Permet au fournisseur propriétaire de mettre à jour le statut de sa commande via PATCH (modèle simple). Rôle 'Supplier' requis.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: objectId
 *         required: true
 *         description: ID de la commande dont le statut doit être mis à jour.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandeStatusUpdateInput' # Use correct input schema
 *     responses:
 *       200:
 *         description: Statut de la commande mis à jour.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandeSimpleResponse' # Use correct response schema
 *       400:
 *         description: Format ID invalide ou statut manquant/invalide dans le corps de la requête.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé (rôle non Supplier).
 *       404:
 *         description: Commande non trouvée ou n'appartient pas au fournisseur.
 *       500:
 *         description: Erreur serveur.
 */
router.patch("/:id/status", // Using PATCH for partial update
    authenticateToken,
    commandeController.updateCommandeStatus
);

/**
 * @swagger
 * /commandes/{id}:
 *   delete:
 *     summary: Supprimer une commande (Supplier propriétaire ou Admin)
 *     tags: [Commandes (Supplier)]
 *     security:
 *       - bearerAuth: []
 *     description: Permet au fournisseur propriétaire (ou à un Admin) de supprimer une de ses commandes (modèle simple). Les références associées seront nettoyées.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: objectId
 *         required: true
 *         description: ID de la commande à supprimer.
 *     responses:
 *       200:
 *         description: Commande supprimée avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Commande supprimée avec succès."
 *       400:
 *         description: Format de l'ID de commande invalide.
 *       401:
 *         description: Non authentifié.
 *       403:
 *         description: Accès refusé (pas le propriétaire ou non Admin).
 *       404:
 *         description: Commande non trouvée.
 *       500:
 *         description: Erreur serveur.
 */
router.delete("/:id",
    authenticateToken,
    commandeController.deleteCommande // Controller function now exists
);


module.exports = router;