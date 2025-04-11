// routes/commandeRoutes.js
const express = require("express");
const router = express.Router();
// Assurez-vous que ce chemin pointe correctement vers votre contrôleur
const commandeController = require("../controllers/commandeController");
// Assurez-vous que ce chemin pointe correctement vers votre middleware d'authentification
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Commandes
 *   description: API pour la gestion des commandes (création par ChefProjet sans fournisseur, assignation/màj statut par Supplier)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # --- Input Schemas ---
 *     CommandeCreateInput:
 *       type: object
 *       # supplierId n'est PAS requis ici
 *       required: [name, montantTotal, projectId]
 *       properties:
 *         name: { type: string, example: "Commande Béton C25/30" }
 *         type: { type: string, example: "Matériaux Gros Oeuvre" }
 *         statut: { type: string, enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'], default: 'En attente' }
 *         dateCmd: { type: string, format: date-time, example: "2024-10-01T08:00:00Z" }
 *         montantTotal: { type: number, format: double, minimum: 0, example: 1250.75 }
 *         projectId: { type: string, format: objectId, example: "65f1a8d8f1b9e3b4e8f0e123" }
 *
 *     CommandeStatusUpdateInput:
 *        type: object
 *        required: [statut]
 *        properties:
 *          statut: { type: string, enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'], example: "En cours de livraison" }
 *
 *     # --- Response Schemas ---
 *     CommandeResponse:
 *       type: object
 *       properties:
 *         _id: { type: string, format: objectId }
 *         name: { type: string }
 *         type: { type: string }
 *         statut: { type: string, enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'] }
 *         dateCmd: { type: string, format: date-time }
 *         montantTotal: { type: number, format: double }
 *         projet: { $ref: '#/components/schemas/ProjectSummaryResponse' }
 *         supplier: { $ref: '#/components/schemas/SupplierSummaryResponse' } # Sera null si non assigné
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     ProjectSummaryResponse:
 *       type: object
 *       description: Informations résumées d'un projet pour l'affichage dans une commande.
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         name:
 *           type: string
 *         status:
 *           type: string
 *         chefProjet: # Ajouté pour référence potentielle
 *           type: string
 *           format: objectId
 *           description: ID du Chef de Projet assigné à ce projet.
 *
 *     SupplierSummaryResponse:
 *       type: object
 *       description: Informations résumées d'un fournisseur pour l'affichage dans une commande.
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *         username:
 *           type: string
 *         contact: # Exemple de champ supplémentaire
 *           type: string
 *           description: Nom du contact principal du fournisseur.
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// --- ROUTES ---

/**
 * @swagger
 * /commandes:
 *   post:
 *     summary: Créer une nouvelle commande (ChefProjet uniquement, SANS fournisseur initial)
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Permet à un Chef de Projet de créer une commande SANS spécifier le fournisseur. Le fournisseur sera assigné lors de la première mise à jour de statut par un Supplier. Rôle 'ChefProjet' requis.
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/CommandeCreateInput' } } }
 *     responses:
 *       201: { description: Commande créée (avec supplier=null), content: { application/json: { schema: { $ref: '#/components/schemas/CommandeResponse' } } } }
 *       400: { description: Données invalides }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (rôle incorrect) }
 *       404: { description: Projet non trouvé }
 *       500: { description: Erreur serveur }
 */
router.post("/", authenticateToken, commandeController.createCommande); // Le contrôleur gère la vérification ChefProjet

/**
 * @swagger
 * /commandes:
 *   get:
 *     summary: Récupérer toutes les commandes (Tous rôles authentifiés)
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Retourne la liste complète de toutes les commandes enregistrées (assignées ou non). Accessible par tout utilisateur authentifié.
 *     responses:
 *       200: { description: Liste des commandes, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/CommandeResponse' } } } } }
 *       401: { description: Non authentifié }
 *       # 403 n'est plus pertinent ici car tous les rôles authentifiés sont autorisés
 *       500: { description: Erreur serveur }
 */
router.get("/", authenticateToken, commandeController.getAllCommandes); // Le contrôleur n'a plus de vérification de rôle Admin ici

/**
 * @swagger
 * /commandes/my:
 *   get:
 *     summary: (Supplier) Récupérer MES commandes déjà assignées
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Retourne UNIQUEMENT les commandes déjà assignées au fournisseur connecté. Rôle 'Supplier' requis. Ne montre pas les commandes non assignées.
 *     responses:
 *       200: { description: Liste des commandes assignées au fournisseur, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/CommandeResponse' } } } } }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (rôle non Supplier) }
 *       500: { description: Erreur serveur }
 */
router.get("/my", authenticateToken, commandeController.getMyCommandes); // Le contrôleur gère la vérification Supplier

/**
 * @swagger
 * /commandes/projet/{projectId}:
 *   get:
 *     summary: Récupérer les commandes par ID de Projet
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Retourne les commandes d'un projet (assignées ou non). Accessible par Admin ou ChefProjet du projet.
 *     parameters:
 *       - { in: path, name: projectId, schema: { type: string, format: objectId }, required: true, description: ID du Projet }
 *     responses:
 *       200: { description: Liste des commandes du projet, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/CommandeResponse' } } } } }
 *       400: { description: Format ID Projet invalide }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (pas Admin ni Chef du projet) }
 *       404: { description: Projet non trouvé }
 *       500: { description: Erreur serveur }
 */
router.get("/projet/:projectId", authenticateToken, commandeController.getCommandesByProjetId); // Le contrôleur gère la vérification d'accès

/**
 * @swagger
 * /commandes/{id}:
 *   get:
 *     summary: Récupérer une commande spécifique par son ID
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Retourne une commande unique. Accessible par Admin, fournisseur assigné (si un existe), ou ChefProjet lié.
 *     parameters:
 *       - { in: path, name: id, schema: { type: string, format: objectId }, required: true, description: ID de la commande }
 *     responses:
 *       200: { description: Détails de la commande, content: { application/json: { schema: { $ref: '#/components/schemas/CommandeResponse' } } } }
 *       400: { description: Format ID Commande invalide }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (rôle/relation non autorisé) }
 *       404: { description: Commande non trouvée }
 *       500: { description: Erreur serveur }
 */
router.get("/:id", authenticateToken, commandeController.getCommandeById); // Le contrôleur gère la vérification d'accès

/**
 * @swagger
 * /commandes/{id}/status:
 *   patch:
 *     summary: (Supplier) Mettre à jour le statut et/ou s'assigner une commande
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: |
 *       Permet à un fournisseur connecté de mettre à jour le statut d'une commande.
 *       - Si la commande n'a pas encore de fournisseur (`supplier` est null), cet appel assignera le fournisseur connecté à la commande EN PLUS de mettre à jour le statut.
 *       - Si la commande est déjà assignée à CE fournisseur, seul le statut sera mis à jour.
 *       - Si la commande est déjà assignée à un AUTRE fournisseur, l'accès sera refusé (403).
 *       Rôle 'Supplier' requis.
 *     parameters:
 *       - { in: path, name: id, schema: { type: string, format: objectId }, required: true, description: ID de la commande }
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/CommandeStatusUpdateInput' } } } }
 *     responses:
 *       200: { description: Statut mis à jour (et fournisseur assigné si c'était la première fois), content: { application/json: { schema: { $ref: '#/components/schemas/CommandeResponse' } } } }
 *       400: { description: Format ID invalide ou statut manquant/invalide }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (rôle non Supplier ou commande assignée à un autre) }
 *       404: { description: Commande non trouvée }
 *       500: { description: Erreur serveur }
 */
router.patch("/:id/status", authenticateToken, commandeController.updateCommandeStatus); // Le contrôleur gère l'assignation/màj

/**
 * @swagger
 * /commandes/{id}:
 *   delete:
 *     summary: Supprimer une commande (Admin ou Supplier assigné)
 *     tags: [Commandes]
 *     security: [bearerAuth: []]
 *     description: Permet à l'Admin ou au fournisseur assigné (s'il y en a un) de supprimer une commande.
 *     parameters:
 *       - { in: path, name: id, schema: { type: string, format: objectId }, required: true, description: ID de la commande }
 *     responses:
 *       200: { description: Commande supprimée }
 *       400: { description: Format ID invalide }
 *       401: { description: Non authentifié }
 *       403: { description: Accès refusé (pas Admin ni fournisseur assigné) }
 *       404: { description: Commande non trouvée }
 *       500: { description: Erreur serveur }
 */
router.delete("/:id", authenticateToken, commandeController.deleteCommande); // Le contrôleur gère la vérification d'accès

module.exports = router; // Ne pas oublier d'exporter le routeur