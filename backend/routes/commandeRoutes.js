// routes/commandeRoutes.js
const express = require("express");
const router = express.Router();
const commandeController = require("../controllers/commandeController");
const {
    authenticateToken,
    isChefProjet,
    isSupplier, // Non utilisé directement comme middleware ici, mais le rôle est vérifié dans les contrôleurs
    isAdmin    // Idem
} = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Commandes
 *   description: API pour la gestion des commandes
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # Schéma pour la CRÉATION d'une COMMANDE (par ChefProjet)
 *     CommandeCreateInput:
 *       type: object
 *       required: [name, montantTotal, projetId, items]
 *       properties:
 *         name: { type: string, description: "Nom/identifiant de la commande.", example: "Commande Ciment CEM II" }
 *         type: { type: string, description: "Type/catégorie (optionnel).", example: "Matériaux Gros Oeuvre" }
 *         dateCmd: { type: string, format: date-time, description: "Date de la commande (optionnel, défaut à maintenant)." }
 *         montantTotal: { type: number, format: double, minimum: 0, description: "Montant total de la commande." }
 *         projetId: { type: string, format: objectId, description: "ID du projet associé." }
 *         items:
 *           type: array
 *           minItems: 1
 *           description: "Liste des articles de la commande qui deviendront des CommandItems."
 *           items:
 *             type: object
 *             required: [productTypeId, quantiteCommandee]
 *             properties:
 *               productTypeId: { type: string, format: objectId, description: "ID du type de produit." }
 *               quantiteCommandee: { type: number, minimum: 1, description: "Quantité commandée." }
 *               prixUnitaire: { type: number, minimum: 0, description: "Prix unitaire (optionnel à ce stade)." }
 *
 *     # Schéma pour l'ASSIGNATION d'un fournisseur
 *     AssignSupplierInput:
 *       type: object
 *       required: [fournisseurId]
 *       properties:
 *         fournisseurId: { type: string, format: objectId, description: "ID du fournisseur (User rôle Supplier) à assigner." }
 *
 *     # Schéma de réponse de BASE pour une commande
 *     CommandeBaseResponse:
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         name: { type: string }
 *         type: { type: string, nullable: true }
 *         statutCmd: { type: string, enum: ['EnAttenteAssignation', 'EnAttenteValidationFournisseur', 'ValideeFournisseur'] }
 *         dateCmd: { type: string, format: date-time }
 *         montantTotal: { type: number }
 *         fournisseurId: { type: string, format: objectId, nullable: true, description: "ID du fournisseur si assigné." }
 *         projetId: { type: string, format: objectId, description: "ID du projet." }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     # Schéma pour un item de commande RÉEL (CommandItem)
 *     CommandItemDetailResponse:
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         commandeId: { type: string, format: objectId }
 *         productTypeId:
 *           type: object
 *           properties: { _id: { type: string }, name: { type: string }, unite: { type: string }, category: { type: string } }
 *         quantiteCommandee: { type: number }
 *         prixUnitaire: { type: number, nullable: true }
 *         statutLigne: { type: string, example: "Soumis" } # Ou "ValidéFournisseur" après confirmation
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     # Schéma de réponse DÉTAILLÉE pour une commande (avec ses items réels)
 *     CommandeDetailResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/CommandeBaseResponse'
 *       type: object
 *       properties:
 *         fournisseurId: # Exemple peuplé
 *           type: object
 *           nullable: true
 *           properties: { _id: {type: string}, username: {type: string}, email: {type: string} }
 *         projetId: # Exemple peuplé
 *           type: object
 *           properties: { _id: {type: string}, name: {type: string}, chefProjet: { type: object, nullable: true, properties: { _id: {type: string}, username: {type: string} } } }
 *         items:
 *           type: array
 *           description: "Liste des articles (CommandItem) réels de la commande, peuplés."
 *           items:
 *             $ref: '#/components/schemas/CommandItemDetailResponse'
 *
 *   securitySchemes:
 *     bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
 */

// --- 1. POST /commandes (Créer la COMMANDE par ChefProjet) ---
/**
 * @swagger
 * /commandes:
 *   post:
 *     summary: Créer une nouvelle commande et ses items (ChefProjet)
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: "Crée une commande avec statut 'EnAttenteAssignation', fournisseurId null, et crée les CommandItems associés directement."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandeCreateInput'
 *     responses:
 *       201:
 *         description: "Commande et items créés avec succès."
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/CommandeBaseResponse' } } }
 *       400: { description: "Erreur de validation." }
 *       401: { description: "Non authentifié." }
 *       403: { description: "Accès refusé." }
 *       404: { description: "Ressource non trouvée." }
 *       500: { description: "Erreur serveur." }
 */
router.post(
    "/",
    authenticateToken,
    isChefProjet,
    commandeController.createCommande
);

// --- 2. PATCH /commandes/{id}/assign-supplier (Assigner Fournisseur) ---
/**
 * @swagger
 * /commandes/{id}/assign-supplier:
 *   patch:
 *     summary: Assigner un fournisseur à une commande
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: "Assigne un fournisseur. Statut 'EnAttenteAssignation' -> 'EnAttenteValidationFournisseur'. Rôle: Admin ou ChefProjet du projet."
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la commande" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AssignSupplierInput'
 *     responses:
 *       200:
 *         description: "Fournisseur assigné."
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/CommandeBaseResponse' } } }
 *       400: { description: "Données invalides." }
 *       401: { description: "Non authentifié." }
 *       403: { description: "Accès refusé." }
 *       404: { description: "Ressource non trouvée." }
 *       500: { description: "Erreur serveur." }
 */
router.patch(
    '/:id/assign-supplier',
    authenticateToken,
    // La logique d'autorisation (Admin OU ChefProjet propriétaire) est dans le contrôleur
    commandeController.assignSupplierToCommande
);

// --- 3. POST /commandes/{id}/validate (Confirmer par Fournisseur/Admin) --- << MODIFIÉ LE TITRE SWAGGER
/**
 * @swagger
 * /commandes/{id}/validate:
 *   post:
 *     summary: Confirmer une commande par le fournisseur assigné (ou Admin)  # << MODIFIÉ SUMMARY
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Permet au fournisseur assigné (ou Admin) de confirmer une commande.
 *       Passe le statut de 'EnAttenteValidationFournisseur' à 'ValideeFournisseur'.
 *       Les CommandItems sont supposés avoir été créés lors du POST initial sur /commandes.
 *       Cette étape met à jour le statut de la commande et potentiellement le statut des lignes des CommandItems.
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la commande à confirmer" }
 *     responses:
 *       200:
 *         description: "Commande confirmée." # << MODIFIÉ DESCRIPTION
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean }, message: {type: string}, data: { $ref: '#/components/schemas/CommandeDetailResponse' } } }
 *       400: { description: "Commande non confirmable (ex: mauvais statut)." } # << MODIFIÉ DESCRIPTION
 *       401: { description: "Non authentifié." }
 *       403: { description: "Accès refusé." }
 *       404: { description: "Ressource non trouvée." }
 *       500: { description: "Erreur serveur." }
 */
router.post(
    '/:id/validate', // L'URL de la route reste '/validate' pour l'instant
    authenticateToken,
    // La logique d'autorisation (Admin OU Fournisseur assigné) est dans le contrôleur
    commandeController.confirmCommandeBySupplier // << MODIFIÉ ICI
);

// --- GET /commandes (Liste TOUTES les commandes SANS FILTRE PAR DEFAUT) ---
/**
 * @swagger
 * /commandes:
 *   get:
 *     summary: Récupérer TOUTES les commandes
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retourne la liste complète de toutes les commandes dans le système.
 *       Aucun filtre n'est appliqué par défaut basé sur le rôle.
 *       Tous les paramètres de requête fournis dans l'URL (ex: ?projetId=...) sont ignorés par le contrôleur actuel
 *       si vous utilisez la version "getAllCommandes simple" qui ignore req.query.
 *       L'accès est protégé par authentification.
 *     # Si les paramètres sont VRAIMENT ignorés par le contrôleur getAllCommandes actuel,
 *     # il est préférable de supprimer la section 'parameters' ci-dessous pour éviter la confusion.
 *     # parameters:
 *     #   - { name: projetId, in: query, schema: { type: string, format: objectId }, description: "Filtrer par ID de projet (actuellement ignoré par la version 'simple' du contrôleur)." }
 *     #   - { name: fournisseurId, in: query, schema: { type: string, format: objectId }, description: "Filtrer par ID de fournisseur (actuellement ignoré par la version 'simple' du contrôleur)." }
 *     #   - { name: statutCmd, in: query, schema: { type: string, enum: ['EnAttenteAssignation', 'EnAttenteValidationFournisseur', 'ValideeFournisseur'] }, description: "Filtrer par statut (actuellement ignoré par la version 'simple' du contrôleur)." }
 *     responses:
 *       200:
 *         description: "Liste de toutes les commandes."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CommandeBaseResponse'
 *       401: { description: "Non authentifié." }
 *       500: { description: "Erreur serveur." }
 */
router.get(
    "/",
    authenticateToken,
    commandeController.getAllCommandes
);

// --- GET /commandes/{id} ---
/**
 * @swagger
 * /commandes/{id}:
 *   get:
 *     summary: Récupérer une commande spécifique par son ID
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     description: "Retourne les détails d'une commande, y compris ses CommandItems peuplés. L'accès peut être contrôlé dans le contrôleur."
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: string, format: objectId }, description: "ID de la commande" }
 *     responses:
 *       200:
 *         description: "Détails de la commande."
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { success: { type: boolean }, data: { $ref: '#/components/schemas/CommandeDetailResponse' } } }
 *       400: { description: "Format d'ID invalide." }
 *       401: { description: "Non authentifié." }
 *       403: { description: "Accès refusé." }
 *       404: { description: "Ressource non trouvée." }
 *       500: { description: "Erreur serveur." }
 */
router.get(
    "/:id",
    authenticateToken,
    commandeController.getCommandeById
);

module.exports = router;