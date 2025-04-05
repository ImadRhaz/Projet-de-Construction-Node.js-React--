// routes/resourceRoutes.js

const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");
const { authenticateToken } = require('../middleware/authMiddleware');
// Importez les middlewares de rôle si vous voulez les appliquer ici
// const { isAdmin, isSupplier } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: 'Gestion des ressources du catalogue. IMPORTANT : URLs réelles préfixées par /api (ex: /api/resources).'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # Schéma pour la CRÉATION/MISE À JOUR de ressource
 *     ResourceInput:
 *       type: object
 *       required: # Le supplier est déduit du token
 *         - name
 *         - type
 *         - quantityAvailable
 *         - unit
 *       properties:
 *         name:
 *           type: string
 *           description: Nom unique de la ressource
 *           example: "Ciment Portland CEM II 32.5N - Sac 25kg"
 *         type:
 *           type: string
 *           enum: [Matériau, Équipement, Personnel, Logiciel, Autre]
 *           description: Catégorie de la ressource
 *           example: "Matériau"
 *         quantityAvailable:
 *           type: number
 *           format: double # ou integer
 *           description: Quantité actuellement en stock ou disponible
 *           example: 150
 *         unit:
 *           type: string
 *           description: Unité de mesure (kg, m, unité, heure...)
 *           example: "sac"
 *
 *     # Schéma pour les RÉPONSES (GET)
 *     ResourceResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ResourceInput'
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: objectId
 *           description: ID unique de la ressource
 *         supplier: # Fournisseur (User avec rôle Supplier) potentiellement peuplé
 *           type: object
 *           properties:
 *             _id: { type: string, format: objectId }
 *             username: { type: string }
 *             email: { type: string, format: email }
 *             contact: { type: string } # Champs spécifiques Supplier
 *             phone: { type: string }
 *             # Ne pas inclure le mot de passe ou trop d'infos
 *           description: Le fournisseur associé à cette ressource
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *   securitySchemes: # Doit être défini
 *     bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
 */

// --- ROUTES POUR LES RESSOURCES (/resources) ---

/**
 * @swagger
 * /resources: # <-- Chemin relatif
 *   get:
 *     summary: Récupérer toutes les ressources du catalogue
 *     tags: [Resources]
 *     description: 'Retourne la liste de toutes les ressources disponibles. Note: URL réelle /api/resources.'
 *     security:
 *       - bearerAuth: [] # Tout utilisateur authentifié peut voir le catalogue
 *     responses:
 *       # Utilisation de la syntaxe compacte comme demandé
 *       200: { description: 'Succès - Liste des ressources', content: { application/json: { schema: { type: array, items: { $ref: "#/components/schemas/ResourceResponse" }}}}}
 *       401: { description: 'Non authentifié' }
 *       500: { description: 'Erreur serveur' }
 */
// Préfixe '/api/resources' dans server.js, ici '/' est correct
// authenticateToken est appliqué dans server.js
router.get("/", resourceController.getAllResources);

/**
 * @swagger
 * /resources/{id}: # <-- Chemin relatif
 *   get:
 *     summary: Récupérer une ressource spécifique par son ID
 *     tags: [Resources]
 *     description: 'Retourne les détails d''une ressource spécifique. Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Tout utilisateur authentifié peut voir une ressource
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la ressource }
 *     responses:
 *       200: { description: 'Succès - Détails de la ressource', content: { application/json: { schema: { $ref: "#/components/schemas/ResourceResponse" }}}}
 *       400: { description: 'ID invalide' }
 *       401: { description: 'Non authentifié' }
 *       404: { description: 'Ressource non trouvée' }
 *       500: { description: 'Erreur serveur' }
 */
// Le chemin Express est '/:id'
router.get("/:id", resourceController.getResourceById);

/**
 * @swagger
 * /resources: # <-- Chemin relatif
 *   post:
 *     summary: Créer une nouvelle ressource (par un Supplier)
 *     tags: [Resources]
 *     description: 'Crée une nouvelle ressource dans le catalogue. Seul un utilisateur avec le rôle "Supplier" peut utiliser cet endpoint. Le fournisseur est automatiquement assigné via le token. Note: URL réelle /api/resources.'
 *     security:
 *       - bearerAuth: [] # Authentification requise + vérification rôle dans contrôleur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ResourceInput" } # N'inclut PAS supplierId
 *           example:
 *             name: "Sable de rivière lavé 0/4 - Tonne"
 *             type: "Matériau"
 *             quantityAvailable: 50 # Quantité initiale
 *             unit: "tonne"
 *     responses:
 *       201: { description: 'Ressource créée avec succès', content: { application/json: { schema: { $ref: "#/components/schemas/ResourceResponse" }}}}
 *       400: { description: 'Données invalides (validation)' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Accès refusé (pas un Supplier)' }
 *       409: { description: 'Conflit (nom de ressource déjà existant)' }
 *       500: { description: 'Erreur serveur' }
 */
// Le chemin Express est '/'
// La vérification isSupplier peut être faite ici ou dans le contrôleur
router.post("/", /* isSupplier, */ resourceController.createResource);

/**
 * @swagger
 * /resources/{id}: # <-- Chemin relatif
 *   put:
 *     summary: Mettre à jour une ressource existante
 *     tags: [Resources]
 *     description: 'Met à jour les détails d''une ressource. Seul le fournisseur original ou un admin peut la modifier. Le champ `supplier` ne peut pas être modifié ici. Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Authentification + vérification propriété/rôle dans contrôleur
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la ressource }
 *     requestBody:
 *       required: true
 *       description: Champs à mettre à jour.
 *       content:
 *         application/json:
 *           schema:
 *             # On peut réutiliser ResourceInput car tous les champs sont potentiellement modifiables
 *             # sauf le supplier, qui n'est pas dans ResourceInput de toute façon.
 *             $ref: '#/components/schemas/ResourceInput'
 *           example:
 *             quantityAvailable: 200 # Mise à jour du stock
 *             name: "Ciment CEM II 32.5N (Sac 25kg)" # Correction nom
 *     responses:
 *       200: { description: 'Ressource mise à jour', content: { application/json: { schema: { $ref: "#/components/schemas/ResourceResponse" }}}}
 *       400: { description: 'Données ou ID invalides' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé (pas propriétaire ni admin)' }
 *       404: { description: 'Ressource non trouvée' }
 *       409: { description: 'Conflit (nom déjà pris par une autre ressource)'}
 *       500: { description: 'Erreur serveur' }
 */
// Le chemin Express est '/:id'
router.put("/:id", resourceController.updateResource);

/**
 * @swagger
 * /resources/{id}: # <-- Chemin relatif
 *   delete:
 *     summary: Supprimer une ressource du catalogue
 *     tags: [Resources]
 *     description: 'Supprime une ressource si elle n''est pas utilisée. Seul le fournisseur original ou un admin peut la supprimer. Note: URL réelle /api/resources/{id}.'
 *     security:
 *       - bearerAuth: [] # Authentification + vérification propriété/rôle dans contrôleur
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: objectId }, description: ID de la ressource }
 *     responses:
 *       200: { description: 'Ressource supprimée', content: { application/json: { schema: { type: object, properties: { message: { type: string, example: "Ressource supprimée avec succès." }}}}} }
 *       400: { description: 'Impossible de supprimer (ressource utilisée) ou ID invalide' }
 *       401: { description: 'Non authentifié' }
 *       403: { description: 'Non autorisé (pas propriétaire ni admin)' }
 *       404: { description: 'Ressource non trouvée' }
 *       500: { description: 'Erreur serveur' }
 */
// Le chemin Express est '/:id'
router.delete("/:id", resourceController.deleteResource);

module.exports = router;