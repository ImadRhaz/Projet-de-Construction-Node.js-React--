// routes/productTypeRoutes.js
const express = require('express');
const multer = require('multer');
const productTypeController = require('../controllers/productTypeController'); // Ajustez le chemin si nécessaire

// --- IMPORT DE VOS MIDDLEWARES D'AUTHENTIFICATION ---
const authMiddleware = require('../middleware/authMiddleware'); // <-- VÉRIFIEZ CE CHEMIN !!!
const authenticateToken = authMiddleware.authenticateToken;
//const isAdmin = authMiddleware.isAdmin; // <-- Suppression de cette ligne
const isChefProjet = authMiddleware.isChefProjet; // <-- Ajout de cette ligne

const router = express.Router();

// --- Configuration de Multer (inchangée) ---
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'text/csv') {
            cb(null, true);
        } else {
            cb(new Error('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv'), false);
        }
    }
});


// --- Documentation Swagger (JSDoc avec descriptions entre guillemets) ---

/**
 * @swagger
 * tags:
 *   name: ProductTypes
 *   description: "API pour gérer le catalogue des types de produits."
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductType:
 *       type: object
 *       required:
 *         - name
 *         - unit
 *       properties:
 *         _id:
 *           type: string
 *           description: "Identifiant unique auto-généré par MongoDB."
 *           example: "60d0fe4f5311236168a109cb"
 *         name:
 *           type: string
 *           description: "Nom unique et descriptif du type de produit."
 *           unique: true
 *           example: "Sac Ciment Portland 50kg"
 *         unit:
 *           type: string
 *           description: "Unité de mesure principale pour ce type de produit."
 *           example: "Sac"
 *         category:
 *           type: string
 *           description: "Catégorie à laquelle appartient le produit (ex: Matériau, Équipement). Optionnel."
 *           example: "Matériau"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: "Date et heure de création du document (auto-gérée par timestamps)."
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: "Date et heure de la dernière mise à jour du document (auto-gérée par timestamps)."
 *
 *     ErrorResponse:
 *        type: object
 *        required:
 *          - success
 *          - message
 *        properties:
 *          success:
 *             type: boolean
 *             description: "Indique si l'opération a échoué. Toujours `false` pour une erreur."
 *             example: false
 *          message:
 *             type: string
 *             description: "Description de l'erreur rencontrée."
 *             example: "Accès non autorisé. Token manquant."
 *
 *   securitySchemes:
 *      bearerAuth:
 *          type: http
 *          scheme: bearer
 *          bearerFormat: JWT
 *          description: "Utilisez le token JWT obtenu lors de la connexion. Format: Bearer <token>"
 */

/**
 * @swagger
 * /product-types:
 *   get:
 *     tags: [ProductTypes]
 *     summary: "Récupérer la liste de tous les types de produits."
 *     description: "Retourne un tableau contenant tous les types de produits présents dans le catalogue, triés par nom. Nécessite une authentification valide."
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: "Opération réussie. Retourne la liste des types de produits."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   description: "Le nombre total de types de produits retournés."
 *                   example: 25
 *                 data:
 *                   type: array
 *                   description: "Le tableau des types de produits."
 *                   items:
 *                     $ref: '#/components/schemas/ProductType'
 *       '401':
 *         description: "Échec de l'authentification (token manquant, invalide ou expiré)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: "Erreur interne du serveur lors de la récupération des données."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// --- ROUTE GET / ---
router.get(
    '/',
    authenticateToken, // Utilise votre middleware importé
    productTypeController.getAllProductTypes
);

/**
 * @swagger
 * /product-types/upload:
 *   post:
 *     tags: [ProductTypes]
 *     summary: "Téléverser un fichier Excel/CSV pour créer ou mettre à jour les types de produits."
 *     description: >
 *       Permet de téléverser un fichier (.xlsx, .xls, .csv) pour ajouter de nouveaux types de produits
 *       ou mettre à jour ceux existants (basé sur le champ unique 'name'). C'est une opération "upsert".
 *       La première ligne du fichier doit contenir les en-têtes: `name`, `unit`. L'en-tête `category` est optionnel.
 *       Nécessite une authentification valide et des privilèges de Chef de projet.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: "Le fichier à téléverser."
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               excelFile:
 *                 type: string
 *                 format: binary
 *                 description: "Le fichier (.xlsx, .xls, .csv). En-têtes requis: name, unit. Optionnel: category."
 *             required:
 *               - excelFile
 *     responses:
 *       '200':
 *         description: "Fichier traité avec succès. Retourne un résumé des opérations effectuées."
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # ... (schema réponse succès inchangé) ...
 *       '400':
 *         description: "Requête invalide (fichier manquant, format de fichier incorrect, fichier vide, données non valides dans le fichier)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: "Non authentifié (token JWT manquant ou invalide)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: "Accès refusé (l'utilisateur authentifié n'a pas les privilèges requis, ex: non Admin)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: "Erreur interne du serveur lors du traitement du fichier ou de l'écriture en base de données."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// --- ROUTE POST /upload ---
router.post(
    '/upload',
    authenticateToken, // Utilise votre middleware importé
    isChefProjet, // Utilise votre middleware importé
    upload.single('excelFile'),
    productTypeController.uploadProductTypes
);

module.exports = router;