// controllers/commandeController.js
const mongoose = require('mongoose');
const Commande = require('../models/Commande'); // Ajuste chemin
const CommandItem = require('../models/CommandItem'); // Ajuste chemin
const ProductType = require('../models/ProductType'); // Nécessaire pour validation
const Project = require('../models/Project'); // Nécessaire pour validation
const User = require('../models/User'); // Nécessaire pour validation fournisseur

// --- Méthode pour créer une nouvelle commande et ses items ---
// Correspond à l'étape 3: Soumission (Enregistrement BDD) du processus global
exports.createCommande = async (req, res) => {
    const session = await mongoose.startSession(); // Démarrer une session pour la transaction
    session.startTransaction(); // Commencer la transaction

    try {
        const { items, ...commandeData } = req.body; // Sépare les items du reste

        // 1. Validation de base des entrées (reçues du front-end après l'étape 2 interactive)
        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "La commande doit contenir au moins un article (items)." });
        }

        if (!commandeData.projetId || !commandeData.fournisseurId || !commandeData.name ) {
             await session.abortTransaction();
             session.endSession();
             return res.status(400).json({ success: false, message: "Les champs projetId, fournisseurId et name sont requis pour la commande." });
        }

        // 2. Validation des IDs et quantités des items (vérifie que les choix du front-end sont valides)
        const productTypeIds = items.map(item => item.productTypeId);
        // Vérifier l'existence de tous les ProductTypes en une seule requête
        const existingProductTypes = await ProductType.find({ '_id': { $in: productTypeIds } }).session(session).select('_id');
        const existingProductTypeIds = new Set(existingProductTypes.map(pt => pt._id.toString()));

        for (const item of items) {
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
            // Ajouter d'autres validations par item si nécessaire
        }

        // 3. Validation des IDs projet et fournisseur
        const projectExists = await Project.findById(commandeData.projetId).session(session);
        if (!projectExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Le Projet avec l'ID ${commandeData.projetId} n'existe pas.` });
        }
        const supplierExists = await User.findOne({ _id: commandeData.fournisseurId /*, role: 'fournisseur' */ }).session(session);
        if (!supplierExists) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Le Fournisseur (User) avec l'ID ${commandeData.fournisseurId} n'existe pas ou n'a pas le bon rôle.` });
        }


        // 4. Créer l'en-tête de la Commande dans la BDD
        const newCommande = new Commande({
            name: commandeData.name,
            type: commandeData.type,
            statutCmd: 'Soumise', // Statut initial de la commande globale
            dateCmd: commandeData.dateCmd || Date.now(),
            montantTotal: commandeData.montantTotal,
            fournisseurId: commandeData.fournisseurId,
            projetId: commandeData.projetId,
        });
        const savedCommande = await newCommande.save({ session });

        // 5. Préparer et créer les CommandItems dans la BDD
        const commandItemsData = items.map(item => ({
            commandeId: savedCommande._id,
            productTypeId: item.productTypeId,
            quantiteCommandee: item.quantiteCommandee,
            prixUnitaire: item.prixUnitaire,
            statutLigne: 'Soumis' // Statut initial de chaque ligne
        }));
        const createdItems = await CommandItem.insertMany(commandItemsData, { session });

        // 6. Si tout réussit, commiter la transaction (rend les changements permanents)
        await session.commitTransaction();
        session.endSession();

        // 7. Renvoyer la réponse de succès
        res.status(201).json({ success: true, data: savedCommande });

    } catch (error) {
        // 8. En cas d'erreur PENDANT la transaction, l'annuler
        console.error("Erreur lors de la création de la commande:", error);
        // S'assurer que la session existe avant d'essayer d'annuler
        if (session.inTransaction()) {
           await session.abortTransaction();
        }
        session.endSession(); // Toujours terminer la session

        if (error.code === 11000) {
             return res.status(400).json({ success: false, message: "Erreur de duplicat: " + Object.keys(error.keyValue).join(', ') + " doit être unique."});
        }
        res.status(500).json({ success: false, message: "Erreur serveur lors de la création de la commande." });
    }
};

// Les méthodes pour la validation par le fournisseur et la création de stock
// devront être ajoutées séparément dans ce fichier ou un autre contrôleur.
// Par exemple: exports.validateCommandItem = async (req, res) => { ... }






/*
En résumé simple : Cette fonction prend les informations d'une nouvelle commande soumise, 
vérifie que tout est correct, puis enregistre de manière fiable la commande principale et toutes ses lignes 
d'articles dans la base de données, en les marquant comme "Soumis" et en attente de l'étape suivante 
    (validation par le fournisseur).

*/ 