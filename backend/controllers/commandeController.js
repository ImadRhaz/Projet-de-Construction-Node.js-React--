// controllers/commandeController.js
const mongoose = require('mongoose');
const Commande = require('../models/Commande');
const CommandItem = require('../models/CommandItem');
const ProductType = require('../models/ProductType');
const Project = require('../models/Project');
const User = require('../models/User'); // Gardé pour d'autres validations potentielles

exports.createCommande = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Prend aussi fournisseurId s'il est envoyé, mais on ne l'utilisera pas forcément
        const { items, fournisseurId, ...commandeData } = req.body;

        // 1. Validation de base des entrées
        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "La commande doit contenir au moins un article (items)." });
        }
        // --- MODIFICATION ICI : On ne requiert plus fournisseurId ---
        if (!commandeData.projetId || !commandeData.name ) {
             await session.abortTransaction();
             session.endSession();
             // Message d'erreur mis à jour
             return res.status(400).json({ success: false, message: "Les champs projetId et name sont requis pour la commande." });
        }
        // --- FIN MODIFICATION ---

        // 2. Validation des items... (inchangé)
        const productTypeIds = items.map(item => item.productTypeId);
        const existingProductTypes = await ProductType.find({ '_id': { $in: productTypeIds } }).session(session).select('_id');
        const existingProductTypeIds = new Set(existingProductTypes.map(pt => pt._id.toString()));

        for (const item of items) {
             // ... (validations inchangées) ...
             if (!item.productTypeId || !item.quantiteCommandee || item.quantiteCommandee <= 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: `Item invalide: productTypeId et quantiteCommandee (>0) sont requis. Problème avec l'item pour productTypeId ${item.productTypeId || 'inconnu'}.` });
            }
            if (!existingProductTypeIds.has(item.productTypeId.toString())) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: `Le ProductType avec l'ID ${item.productTypeId} n'existe pas.` });
            }
        }

        // 3. Validation projet (fournisseur supprimé)
        const projectExists = await Project.findById(commandeData.projetId).session(session);
        if (!projectExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Le Projet avec l'ID ${commandeData.projetId} n'existe pas.` });
        }
        // --- SUPPRESSION : Bloc de validation du fournisseur supprimé ---
        /*
        const supplierExists = await User.findOne({ _id: fournisseurId ... }).session(session);
        if (!supplierExists ...) {
             // ... abort, return ...
        }
        */
        // --- FIN SUPPRESSION ---

        // 4. Créer l'en-tête de la Commande
        const newCommande = new Commande({
            name: commandeData.name,
            type: commandeData.type,
            // statutCmd: 'Soumise', // La valeur par défaut du schéma ('EnAttenteAssignation') sera utilisée
            dateCmd: commandeData.dateCmd || Date.now(),
            montantTotal: commandeData.montantTotal,
            // --- MODIFICATION : fournisseurId n'est plus défini ici ---
            // fournisseurId: fournisseurId, // Supprimé (utilisera default: null)
            // --- FIN MODIFICATION ---
            projetId: commandeData.projetId,
        });
        const savedCommande = await newCommande.save({ session });

        // 5. Préparer et créer les CommandItems... (inchangé)
        const commandItemsData = items.map(item => ({
            commandeId: savedCommande._id,
            productTypeId: item.productTypeId,
            quantiteCommandee: item.quantiteCommandee,
            prixUnitaire: item.prixUnitaire,
            statutLigne: 'Soumis' // Ou 'EnAttenteAssignation' ? A définir. Gardons 'Soumis' pour l'instant.
        }));
        const createdItems = await CommandItem.insertMany(commandItemsData, { session });

        // 6. Mise à jour bidirectionnelle du Projet (inchangé)
        await Project.findByIdAndUpdate(
            commandeData.projetId,
            { $addToSet: { commandes: savedCommande._id } },
            { session: session }
        );

        // 7. Commit de la transaction (inchangé)
        await session.commitTransaction();
        session.endSession();

        // 8. Renvoyer la réponse (inchangé)
        res.status(201).json({ success: true, data: savedCommande });

    } catch (error) {
        // 9. Gestion de l'erreur et Abort (inchangé)
        console.error("Erreur lors de la création de la commande:", error);
        if (session.inTransaction()) {
           await session.abortTransaction();
        }
        session.endSession();

        if (error.code === 11000) {
             return res.status(400).json({ success: false, message: "Erreur de duplicat: " + Object.keys(error.keyValue).join(', ') + " doit être unique."});
        }
        res.status(500).json({ success: false, message: "Erreur serveur lors de la création de la commande." });
    }
};