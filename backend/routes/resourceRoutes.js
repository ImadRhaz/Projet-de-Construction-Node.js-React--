// routes/resourceRoutes.js

const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController"); // Assurez-vous que le chemin est correct
const { authenticateToken } = require('../middleware/authMiddleware'); // Assurez-vous que le chemin est correct
// const { isAdmin, isSupplier, isProjectManager, isInventoryManager } = require('../middleware/authMiddleware'); // Décommentez et ajoutez les rôles nécessaires

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: 'Gestion des entrées de stock de ressources (ResourceStock). IMPORTANT : URLs réelles préfixées par /api (ex: /api/resources).'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # Schéma pour la CRÉATION d'une entrée de stock.
 *     # Les champs name, type, unit sont pour le ProductType (créé ou trouvé).
 *     # Les autres champs sont pour le ResourceStock.
 *     ResourceInput:
 *       type: object
 *       required:
 *         - commandItemId # Obligatoire pour lier à une commande
 *         - quantityAvailable # Obligatoire pour le stock
 *       properties:
 *         name:
 *           type: string
 *           description: "Nom du type de produit (ex: Ciment Portland CEM II). Utilisé si productTypeId n'est pas fourni."
 *           example: "Ciment Portland CEM II 32.5N"
 *         type:
 *           type: string
 *           enum: [Matériau, Équipement, Personnel, Logiciel, Autre]
 *           description: "Catégorie du type de produit. Utilisé si productTypeId n'est pas fourni."
 *           example: "Matériau"
 *         unit:
 *           type: string
 *           description: "Unité de mesure du type de produit (kg, m, unité...). Utilisé si productTypeId n'est pas fourni."
 *           example: "sac"
 *         productTypeId:
 *           type: string
 *           format: objectId
 *           description: "Optionnel: ID d'un ProductType existant. Si fourni, name, type, unit sont ignorés."
 *           example: "60c72b2f9b1d8c001f8e4c01"
 *         commandItemId:
 *           type: string
 *           format: objectId
 *           description: "ID de l'item de commande source pour cette entrée de stock."
 *           example: "60c72b2f9b1d8c001f8e4d2a"
 *         quantityAvailable:
 *           type: number
 *           format: double
 *           description: "Quantité pour cette entrée de stock."
 *           example: 150
 *         dateEntreeStock:
 *           type: string
 *           format: date-time
 *           description: "Date d'entrée en stock (optionnel, par défaut maintenant)."
 *           example: "2025-05-10T10:00:00.000Z"
 *
 *     # Schéma pour la MISE À JOUR d'une entrée de stock (ResourceStock)
 *     ResourceUpdateInput:
 *       type: object
 *       properties:
 *         quantiteDisponible:
 *           type: number
 *           format: double
 *           description: "Nouvelle quantité disponible pour cette entrée de stock."
 *           example: 120
 *         dateEntreeStock:
 *           type: string
 *           format: date-time
 *           nullable: true # Permet de passer null pour effacer la date
 *           description: "Nouvelle date d'entrée en stock. Peut être null."
 *           example: "2025-05-11T14:30:00.000Z"
 *         # On ne modifie généralement pas productTypeId ou commandItemId ici.
 *         # Pour changer le type de produit, on créerait une nouvelle entrée de stock.
 *
 *     # Schéma pour les RÉPONSES (GET) - Représente une entrée de stock avec détails du type de produit
 *     ResourceResponse: # DÉFINITION CORRIGÉE ET COMPLÈTE
 *       type: object
 *       properties:
 *         _id: # ID de l'entrée de stock (ResourceStock)
 *           type: string
 *           format: objectId
 *           description: ID unique de l'entrée de stock.
 *         name: # Provenant du ProductType associé
 *           type: string
 *           description: Nom du type de produit.
 *           example: "Ciment Portland CEM II 32.5N"
 *         type: # Provenant du ProductType associé (sa catégorie)
 *           type: string
 *           enum: [Matériau, Équipement, Personnel, Logiciel, Autre]
 *           description: Catégorie du type de produit.
 *           example: "Matériau"
 *         quantityAvailable: # Provenant de l'entrée de stock (ResourceStock)
 *           type: number
 *           format: double
 *           description: Quantité actuellement disponible pour cette entrée de stock.
 *           example: 150
 *         unit: # Provenant du ProductType associé
 *           type: string
 *           description: Unité de mesure du type de produit.
 *           example: "sac"
 *         productTypeId: # ID du ProductType auquel cette entrée de stock est liée
 *           type: string
 *           format: objectId
 *           description: ID du type de produit associé.
 *           example: "60c72b2f9b1d8c001f8e4c01"
 *         commandItemId: # ID du CommandItem qui a généré cette entrée de stock
 *           type: string
 *           format: objectId
 *           description: ID de l'item de commande source.
 *           example: "60c72b2f9b1d8c001f8e4d2a"
 *         dateEntreeStock:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Date d'entrée en stock de cet item.
 *           example: "2025-05-10T10:00:00.000Z"
 *         createdAt: # Date de création de l'entrée de stock
 *           type: string
 *           format: date-time
 *           description: Date de création de l'enregistrement de stock.
 *         updatedAt: # Date de dernière mise à jour de l'entrée de stock
 *           type: string
 *           format: date-time
 *           description: Date de la dernière mise à jour de l'enregistrement de stock.
 *       # Le champ 'supplier' n'est PAS inclus ici, conformément à la décision.
 *
 *   securitySchemes: # Doit être défini
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// --- ROUTES POUR LES RESSOURCES (ENTRÉES DE STOCK /api/resources) ---

/**
 * @swagger
 * /resources:
 *   get:
 *     summary: Récupérer toutes les entrées de stock de ressources
 *     tags: [Resources]
 *     description: 'Retourne la liste de toutes les entrées de stock disponibles, avec les détails du type de produit associé. Note: URL réelle /api/resources.'
 *     security:
 *       - bearerAuth: [] # Authentification requise
 *     responses:
 *       200:
 *         description: 'Succès - Liste des entrées de stock'
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ResourceResponse" # Référence ResourceResponse
 *       401: { description: 'Non authentifié' }
 *       500: { description: 'Erreur serveur' }
 */
router.get("/", authenticateToken, resourceController.getAllResources);

/**
 * @swagger
 * /resources/{id}:
 *   get:
 *     summary: Récupérer une entrée de stock spécifique par son ID
 *     tags: [Resources]
 *     description: 'Retourne les détails d''une entrée de stock spécifique. Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Authentification requise
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de l'entrée de stock (ResourceStock)
 *     responses:
 *       200:
 *         description: 'Succès - Détails de l''entrée de stock'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ResourceResponse" # Référence ResourceResponse
 *       400: { description: 'ID invalide' }
 *       401: { description: 'Non authentifié' }
 *       404: { description: 'Entrée de stock non trouvée' }
 *       500: { description: 'Erreur serveur' }
 */
router.get("/:id", authenticateToken, resourceController.getResourceById);

/**
 * @swagger
 * /resources:
 *   post:
 *     summary: Créer une nouvelle entrée de stock pour une ressource
 *     tags: [Resources]
 *     description: |
 *       Crée une nouvelle entrée de stock (ResourceStock).
 *       - `commandItemId` et `quantityAvailable` sont requis.
 *       - Si `productTypeId` est fourni, il est utilisé pour lier à un type de produit existant.
 *       - Sinon, `name`, `type`, `unit` sont utilisés pour trouver ou créer un nouveau `ProductType`.
 *       Des rôles spécifiques (ex: Admin, Supplier, ProjectManager) peuvent être requis.
 *       Note: URL réelle /api/resources.
 *     security:
 *       - bearerAuth: [] # Authentification requise + vérification rôle dans contrôleur/middleware
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ResourceInput"
 *           example:
 *             name: "Sable de rivière 0/4"
 *             type: "Matériau"
 *             unit: "tonne"
 *             commandItemId: "60c72b2f9b1d8c001f8e4d2a"
 *             quantityAvailable: 50
 *             dateEntreeStock: "2025-05-10T10:00:00.000Z"
 *     responses:
 *       201:
 *         description: 'Entrée de stock créée avec succès'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ResourceResponse" # Référence ResourceResponse
 *       400: { description: 'Données invalides (validation, ex: commandItemId manquant)' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Accès refusé (rôle insuffisant)' }
 *       404: { description: 'Dépendance non trouvée (ex: ProductType, CommandItem)'}
 *       409: { description: 'Conflit (ex: entrée de stock déjà existante pour commandItemId)' }
 *       500: { description: 'Erreur serveur' }
 */
// La vérification de rôle (ex: isSupplier ou autre) devrait être ici ou dans le contrôleur
router.post("/", authenticateToken, /* adaptRoleMiddleware, */ resourceController.createResource);

/**
 * @swagger
 * /resources/{id}:
 *   put:
 *     summary: Mettre à jour une entrée de stock existante
 *     tags: [Resources]
 *     description: 'Met à jour les champs modifiables d''une entrée de stock (ex: quantité, date). Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Authentification + vérification propriété/rôle dans contrôleur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de l'entrée de stock à mettre à jour
 *     requestBody:
 *       required: true
 *       description: Champs de l'entrée de stock à mettre à jour.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResourceUpdateInput' # Utilise ResourceUpdateInput
 *           example:
 *             quantiteDisponible: 125
 *             dateEntreeStock: "2025-05-11T14:30:00.000Z"
 *     responses:
 *       200:
 *         description: 'Entrée de stock mise à jour'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ResourceResponse" # Référence ResourceResponse
 *       400: { description: 'Données ou ID invalides' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé (rôle insuffisant, etc.)' }
 *       404: { description: 'Entrée de stock non trouvée' }
 *       500: { description: 'Erreur serveur' }
 */
router.put("/:id", authenticateToken, /* adaptRoleMiddleware, */ resourceController.updateResource);

/**
 * @swagger
 * /resources/{id}:
 *   delete:
 *     summary: Supprimer une entrée de stock
 *     tags: [Resources]
 *     description: 'Supprime une entrée de stock si elle n''est pas utilisée ou selon vos règles métier. Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Authentification + vérification propriété/rôle dans contrôleur
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: ID de l'entrée de stock à supprimer
 *     responses:
 *       200:
 *         description: 'Entrée de stock supprimée'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Entrée de stock supprimée avec succès."
 *       400: { description: 'Impossible de supprimer (ex: stock utilisé par une tâche) ou ID invalide' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé' }
 *       404: { description: 'Entrée de stock non trouvée' }
 *       500: { description: 'Erreur serveur' }
 */
router.delete("/:id", authenticateToken, /* adaptRoleMiddleware, */ resourceController.deleteResource);

module.exports = router;