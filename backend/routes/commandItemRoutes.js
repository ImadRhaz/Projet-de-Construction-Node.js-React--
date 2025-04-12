// routes/commandItemRoutes.js
const express = require('express');
const router = express.Router();
const commandItemController = require('../controllers/commandItemController');
const { authenticateToken, isSupplier, isAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: CommandItems
 *   description: Gestion des lignes de commande individuelles
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CommandItemStatusUpdate:
 *       type: object
 *       required:
 *         - statutLigne
 *       properties:
 *         statutLigne:
 *           type: string
 *           enum: ['ValidéFournisseur', 'Annulé']
 *           example: "ValidéFournisseur"
 * 
 *     CommandItemResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         commandeId:
 *           type: string
 *           format: objectId
 *         productTypeId:
 *           type: string
 *           format: objectId
 *         quantiteCommandee:
 *           type: number
 *         statutLigne:
 *           type: string
 *           enum: ['Soumis', 'ValidéFournisseur', 'Annulé']
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /command-items/{id}/status:
 *   patch:
 *     summary: Mettre à jour le statut d'une ligne de commande
 *     tags: [CommandItems]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Permet à un fournisseur ou admin de valider/annuler une ligne de commande.
 *       Si validation réussie, crée automatiquement le stock correspondant.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de la ligne de commande
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandItemStatusUpdate'
 *     responses:
 *       200:
 *         description: Statut mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommandItemResponse'
 *       400:
 *         description: |
 *           Erreurs possibles :
 *           - ID invalide
 *           - Statut non autorisé
 *           - Ligne déjà traitée
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé (pas le fournisseur assigné)
 *       404:
 *         description: Ligne de commande non trouvée
 *       500:
 *         description: Erreur serveur
 */
router.patch(
    '/:id/status',
    authenticateToken,
    isSupplier, // Seuls les fournisseurs peuvent valider/annuler
    commandItemController.updateCommandItemStatus
);

module.exports = router;