// controllers/productTypeController.js
const ProductType = require('../models/ProductType'); // Vérifiez/Ajustez le chemin vers votre modèle ProductType
const xlsx = require('xlsx'); // Bibliothèque pour lire les fichiers Excel/CSV

/**
 * @desc    Récupérer tous les types de produits (catalogue)
 * @route   GET /api/product-types
 * @access  Private (Nécessite authentification via middleware 'authenticateToken')
 */
exports.getAllProductTypes = async (req, res) => {
    try {
        // Recherche tous les documents dans la collection ProductType
        // Trie les résultats par ordre alphabétique du nom
        const productTypes = await ProductType.find({}).sort({ name: 1 });

        // Renvoie une réponse de succès avec le nombre d'éléments et les données
        res.status(200).json({
            success: true,
            count: productTypes.length,
            data: productTypes
        });
    } catch (error) {
        // En cas d'erreur pendant la recherche en base de données
        console.error("Erreur lors de la récupération des types de produits:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des données." });
    }
};

/**
 * @desc    Téléverser un fichier Excel/CSV pour créer ou mettre à jour les types de produits
 * @route   POST /api/product-types/upload
 * @access  Private (Nécessite authentification via middleware 'authenticateToken')
 */
exports.uploadProductTypes = async (req, res) => {
    // 1. Vérification préliminaire: le middleware Multer doit avoir attaché le fichier
    if (!req.file || !req.file.buffer) {
        // Cette vérification est une double sécurité, Multer devrait déjà rejeter si aucun fichier n'est envoyé
        return res.status(400).json({ success: false, message: "Aucun fichier valide n'a été reçu." });
    }

    try {
        // 2. Lecture du fichier Excel/CSV depuis le buffer mémoire
        // 'req.file.buffer' contient les données binaires du fichier téléversé
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        // 3. Validation de la feuille de calcul
        const sheetName = workbook.SheetNames[0]; // Prend la première feuille par défaut
        if (!sheetName) {
            return res.status(400).json({ success: false, message: "Le fichier Excel/CSV ne contient aucune feuille de calcul." });
        }
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
             // Ne devrait normalement pas arriver si SheetNames[0] existe
             return res.status(400).json({ success: false, message: "Impossible d'accéder à la première feuille de calcul."});
        }

        // 4. Conversion de la feuille en tableau d'objets JSON
        // Chaque objet représente une ligne, les clés sont les en-têtes de colonnes ('name', 'unit', 'category')
        const data = xlsx.utils.sheet_to_json(sheet, {
             // Optionnel: gérer les lignes vides ou incomplètes
             // defval: '', // Remplacer les cellules vides par une chaîne vide
             // raw: false // Assurer que les valeurs sont interprétées comme des chaînes si possible
        });

        // Vérifier si des données ont été extraites
        if (!data || data.length === 0) {
             return res.status(400).json({ success: false, message: "Aucune donnée trouvée dans la première feuille après la ligne d'en-tête." });
        }

        // 5. Préparation des opérations MongoDB bulkWrite (mode "upsert")
        let validOperationsCount = 0;
        const operations = data
            .map((row, index) => {
                // Nettoyage et validation des données pour chaque ligne
                const name = row.name ? String(row.name).trim() : null; // Convertit en String et nettoie
                const unit = row.unit ? String(row.unit).trim() : null;
                const category = row.category ? String(row.category).trim() : undefined; // Category est optionnelle

                // Vérification de la présence des champs requis ('name' et 'unit')
                if (!name || !unit) {
                    console.warn(`Ligne ${index + 2} ignorée (nom ou unité manquant): name='${name}', unit='${unit}'`); // +2 car l'index est 0-based et il y a l'en-tête
                    return null; // Marque cette ligne comme invalide pour le filtrage
                }

                // Si valide, incrémente le compteur et prépare l'opération 'updateOne'
                validOperationsCount++;
                return {
                    updateOne: {
                        filter: { name: name }, // Le filtre pour trouver un document existant (basé sur le nom unique)
                        update: {
                            $set: { // Opérateur pour définir/mettre à jour les champs
                                name: name,
                                unit: unit,
                                // Ajoute la catégorie seulement si elle a une valeur non vide
                                ...(category && { category: category })
                            },
                            // Optionnel: Vous pourriez vouloir mettre à jour la date 'updatedAt' même si rien d'autre ne change
                            // $currentDate: { updatedAt: true }
                        },
                        upsert: true // Option clé: si aucun document ne correspond au 'filter', en crée un nouveau.
                    }
                };
            })
            .filter(op => op !== null); // Retire les opérations nulles (correspondant aux lignes ignorées)

        // Vérifier s'il y a des opérations valides à exécuter
        if (operations.length === 0) {
             return res.status(400).json({ success: false, message: "Aucune ligne avec des données valides (nom et unité requis) trouvée dans le fichier." });
        }

        // 6. Exécution des opérations en masse dans MongoDB
        // bulkWrite est efficace pour exécuter plusieurs opérations en une seule fois
        const result = await ProductType.bulkWrite(operations, { ordered: false }); // 'ordered: false' permet de continuer même si une opération échoue

        // 7. Construction et envoi de la réponse de succès
        res.status(200).json({
            success: true,
            message: "Téléversement et traitement du catalogue terminés avec succès.",
            details: {
                totalRowsInFile: data.length,      // Nombre total de lignes de données lues
                validRowsProcessed: validOperationsCount, // Nombre de lignes jugées valides
                // Informations retournées par bulkWrite:
                inserted: result.upsertedCount,    // Nombre de nouveaux documents créés
                matched: result.matchedCount,      // Nombre de documents existants trouvés par le filtre
                modified: result.modifiedCount,    // Nombre de documents existants qui ont été modifiés
                // Vous pouvez ajouter d'autres détails de 'result' si nécessaire (ex: result.result.nUpserted)
            }
        });

    } catch (error) {
        // 8. Gestion des erreurs potentielles
        console.error("Erreur lors du traitement du fichier téléversé:", error);

        // Vérifier si c'est une erreur de clé unique (si un nom était déjà pris et 'unique:true' sur le schéma)
        if (error.code === 11000) {
             return res.status(400).json({ success: false, message: "Erreur de duplicat lors de l'insertion/mise à jour. Vérifiez les noms uniques.", details: error.message });
        }
        // Renvoyer une erreur générique pour les autres cas
        res.status(500).json({ success: false, message: "Une erreur interne est survenue lors du traitement du fichier.", details: error.message });
    }
};