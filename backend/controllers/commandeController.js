// controllers/commandeController.js
const mongoose = require('mongoose');
// Vérifiez que les chemins vers vos modèles sont corrects
const Commande = require('../models/Commande');
const CommandItem = require('../models/CommandItem');
const ProductType = require('../models/ProductType');
const Project = require('../models/Project');
const User = require('../models/User');
const Resource = require('../models/Resource'); // Adaptez le chemin si nécessaire


// --- 1. CRÉER LA DEMANDE DE COMMANDE (par ChefProjet) ---
//    Crée une Commande avec statut 'EnAttenteAssignation', fournisseurId=null, et remplit itemsDemandes.
exports.createCommande = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // --- CORRECTION : Lire 'items' et 'montantTotal' du body ---
        const { items, montantTotal, ...commandeData } = req.body;

        // Validation de base
        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ success: false, message: "La commande doit contenir au moins un article (items)." });
        }
        // --- CORRECTION : Valider 'montantTotal' ---
        if (!commandeData.projetId || !commandeData.name || montantTotal === undefined) {
             await session.abortTransaction(); session.endSession();
             return res.status(400).json({ success: false, message: "Les champs projetId, name, et montantTotal sont requis." });
        }
        if (!mongoose.Types.ObjectId.isValid(commandeData.projetId)) {
             await session.abortTransaction(); session.endSession();
             return res.status(400).json({ success: false, message: "Format de projetId invalide." });
        }
        // Assurez-vous que montantTotal est un nombre valide
        if (typeof montantTotal !== 'number' || montantTotal < 0) {
             await session.abortTransaction(); session.endSession();
             return res.status(400).json({ success: false, message: "montantTotal doit être un nombre positif ou zéro." });
        }
        // --- FIN CORRECTION ---


        // Validation des items (existence ProductType et validité données item)
        const productTypeIds = items.map(item => item.productTypeId);
        const existingProductTypesCount = await ProductType.countDocuments({ '_id': { $in: productTypeIds } }).session(session);
        if (existingProductTypesCount !== productTypeIds.length) {
            // Gérer l'erreur si un ProductType n'existe pas
            await session.abortTransaction(); session.endSession();
             const existingProductTypes = await ProductType.find({ '_id': { $in: productTypeIds } }).select('_id');
             const existingIdsSet = new Set(existingProductTypes.map(pt => pt._id.toString()));
             const invalidId = productTypeIds.find(id => !existingIdsSet.has(id?.toString()));
             return res.status(400).json({ success: false, message: `Au moins un ProductType fourni n'existe pas (ex: ${invalidId || 'ID invalide'}).` });
        }
        for (const item of items) {
            // --- CORRECTION : Utilise 'items' et 'prixUnitaire' ---
            if (!item.productTypeId || !mongoose.Types.ObjectId.isValid(item.productTypeId) || !item.quantiteCommandee || item.quantiteCommandee <= 0) {
               await session.abortTransaction(); session.endSession();
               return res.status(400).json({ success: false, message: `Item invalide: productTypeId valide et quantiteCommandee (>0) sont requis.` });
           }
           if (item.prixUnitaire !== undefined && item.prixUnitaire !== null && (typeof item.prixUnitaire !== 'number' || item.prixUnitaire < 0)) {
                await session.abortTransaction(); session.endSession();
                return res.status(400).json({ success: false, message: `Prix unitaire invalide pour l'item avec productTypeId ${item.productTypeId}.` });
           }
           // --- FIN CORRECTION ---
        }

        const projectExists = await Project.findById(commandeData.projetId).session(session);
        if (!projectExists) { await session.abortTransaction(); session.endSession(); return res.status(404).json({ success: false, message: `Projet non trouvé.` }); }

        // Création de la Commande
        const newCommande = new Commande({
            name: commandeData.name,
            type: commandeData.type,
            statutCmd: 'EnAttenteAssignation', // Statut initial correct
            dateCmd: commandeData.dateCmd || Date.now(),
            // --- CORRECTION : Utilise 'montantTotal' ---
            montantTotal: montantTotal,
            // --- FIN CORRECTION ---
            projetId: commandeData.projetId,
            fournisseurId: null // Correct, pas de fournisseur au début
            // Pas de itemsDemandes ou commandItemsIds ici
        });
        const savedCommande = await newCommande.save({ session }); // Valide le modèle Commande

        // --- CORRECTION : Créer les CommandItems réels à partir de 'items' ---
        const commandItemsData = items.map(item => ({
            commandeId: savedCommande._id, // Lie à la commande créée
            productTypeId: item.productTypeId,
            quantiteCommandee: item.quantiteCommandee,
            prixUnitaire: item.prixUnitaire, // Utilise le prix de l'item fourni
            statutLigne: 'Soumis' // Statut initial des lignes
        }));
        await CommandItem.insertMany(commandItemsData, { session });
        // --- FIN CORRECTION ---

        // Mise à jour du Projet
        await Project.findByIdAndUpdate(commandeData.projetId, { $addToSet: { commandes: savedCommande._id } }, { session: session });

        // Commit
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ success: true, data: savedCommande });

    } catch (error) {
        console.error("Erreur lors de la création de la commande:", error);
        if (session.inTransaction()) { await session.abortTransaction(); }
        session.endSession();
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            // ---> L'erreur que vous voyez ("montantTotal est requis") vient d'ici <---
            return res.status(400).json({ success: false, message: "Erreur de validation: " + messages.join(', ') });
        }
        if (error.code === 11000) {
             return res.status(400).json({ success: false, message: "Erreur de duplicat: " + Object.keys(error.keyValue).join(', ') + " doit être unique."});
        }
        res.status(500).json({ success: false, message: "Erreur serveur (create)." });
    }
}; // Fin de createCommande (corrigé pour modèle simplifié)

// --- 2. ASSIGNER UN FOURNISSEUR (par ChefProjet/Admin) ---
//    Met à jour fournisseurId et passe le statut à 'EnAttenteValidationFournisseur'.
exports.assignSupplierToCommande = async (req, res) => {
    try {
        const { id } = req.params; // ID de la commande
        const { fournisseurId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(fournisseurId)) {
            return res.status(400).json({ success: false, message: "Format d'ID invalide pour la commande ou le fournisseur." });
         }

        const supplier = await User.findOne({ _id: fournisseurId, role: 'Supplier' });
        if (!supplier) {
            return res.status(404).json({ success: false, message: "Fournisseur non trouvé ou rôle incorrect." });
        }

        const commande = await Commande.findById(id);
        if (!commande) {
            return res.status(404).json({ success: false, message: "Commande non trouvée." });
        }

        if (commande.statutCmd !== 'EnAttenteAssignation') {
            return res.status(400).json({ success: false, message: `Impossible d'assigner. Statut actuel: '${commande.statutCmd}'. Requis: 'EnAttenteAssignation'.` });
        }

        // --- Logique d'autorisation à implémenter ---
        // Exemple : Seul l'admin ou le chef du projet peut assigner
        // Attention: nécessite de peupler projetId.chefProjet si vous utilisez cette logique
        // const project = await Project.findById(commande.projetId).populate('chefProjet');
        // if (req.user.role !== 'Admin' && (!project || !project.chefProjet || project.chefProjet._id.toString() !== req.user.id)) {
        //    return res.status(403).json({ success: false, message: "Accès refusé. Seul l'Admin ou le Chef de Projet peut assigner." });
        // }

        // --- CORRECTION : Assurer l'existence de montantTotalEstime avant save() ---
        // (Important si des données anciennes sans ce champ ou itemsDemandes existent)
        if (commande.montantTotalEstime === undefined || commande.montantTotalEstime === null) {
             console.warn(`Commande ${id}: montantTotalEstime manquant lors de l'assignation. Mise à 0 par défaut.`);
             commande.montantTotalEstime = 0; // Assigne une valeur par défaut pour passer la validation
        }
        // Assurer aussi que itemsDemandes existe (même si vide, car required:true mais sans la validation de longueur)
        if (!commande.itemsDemandes) {
            console.warn(`Commande ${id}: itemsDemandes manquant lors de l'assignation. Initialisé à [].`);
            commande.itemsDemandes = []; // Initialise à un tableau vide si absent
        }
        // --- FIN CORRECTION ---


        // Mettre à jour les champs
        commande.fournisseurId = fournisseurId;
        commande.statutCmd = 'EnAttenteValidationFournisseur'; // Passe à l'étape suivante

        // Sauvegarder (déclenche la validation du schéma complet, mais sans la validation de longueur pour itemsDemandes)
        const updatedCommande = await commande.save();

        res.status(200).json({ success: true, message: "Fournisseur assigné avec succès.", data: updatedCommande });

    } catch (error) {
         console.error("Erreur assignSupplier:", error);
         // Gérer spécifiquement l'erreur de validation qui pourrait encore survenir (ex: autre champ manquant)
         if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            // Inclure le message spécifique de l'erreur de validation
            return res.status(400).json({ success: false, message: "Erreur de validation lors de la sauvegarde: " + messages.join(', ') });
         }
         res.status(500).json({ success: false, message: "Erreur serveur lors de l'assignation du fournisseur." });
    }
}; // Fin de assignSupplierToCommande


// --- 3. VALIDER LA COMMANDE ET CRÉER LES ITEMS (par Fournisseur assigné/Admin) ---
//    Vérifie l'autorisation, crée les CommandItem à partir de itemsDemandes,
//    change le statut à 'ValideeFournisseur', et lie les IDs dans commandItemsIds.

exports.confirmCommandeBySupplier = async (req, res) => {
    const { id } = req.params; // ID de la commande
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ success: false, message: "Format ID de commande invalide." });
        }

        const commande = await Commande.findById(id).session(session);
        if (!commande) {
            await session.abortTransaction(); session.endSession();
            return res.status(404).json({ success: false, message: "Commande non trouvée." });
        }

        if (req.user.role !== 'Admin' && (!commande.fournisseurId || commande.fournisseurId.toString() !== req.user.id)) {
            await session.abortTransaction(); session.endSession();
            return res.status(403).json({ success: false, message: "Accès refusé. Vous n'êtes pas le fournisseur assigné ou un Admin." });
        }

        if (commande.statutCmd !== 'EnAttenteValidationFournisseur') {
            await session.abortTransaction(); session.endSession();
            return res.status(400).json({ success: false, message: `Impossible de valider/confirmer. Statut actuel: '${commande.statutCmd}'. Requis: 'EnAttenteValidationFournisseur'.` });
        }

        // Mettre à jour la commande principale
        commande.statutCmd = 'ValideeFournisseur';
        const updatedCommande = await commande.save({ session });

        // Mettre à jour le statut des CommandItems associés
        await CommandItem.updateMany(
            { commandeId: updatedCommande._id, statutLigne: 'Soumis' },
            { $set: { statutLigne: 'ValidéFournisseur' } }, // Ou 'EnStock', 'PrêtPourStockage' etc.
            { session }
        );

        // --- CRÉATION DES RESSOURCES EN STOCK ---
        // 1. Récupérer les CommandItems de cette commande qui viennent d'être validés
        const commandItemsPourStock = await CommandItem.find({
            commandeId: updatedCommande._id,
            // Optionnel: vous pourriez vouloir ajouter un filtre sur statutLigne si certains items
            // d'une même commande pouvaient être validés et d'autres non, mais ici on suppose
            // que tous les items 'Soumis' deviennent 'ValidéFournisseur'.
        }).session(session);

        if (commandItemsPourStock.length === 0) {
            console.warn(`Aucun CommandItem trouvé pour la commande ${updatedCommande._id} pour l'entrée en stock.`);
            // Vous pourriez décider si c'est une erreur ou non. Pour l'instant, on continue.
        }

        const dateActuelle = new Date(); // Date d'entrée en stock
        const resourcesToCreate = commandItemsPourStock.map(item => ({
            productTypeId: item.productTypeId,
            commandItemId: item._id, // Lien vers le CommandItem source
            quantiteDisponible: item.quantiteCommandee, // La quantité commandée devient disponible
            dateEntreeStock: dateActuelle // Utilise la date actuelle pour l'entrée en stock
        }));

        // Insérer les nouvelles ressources en stock
        // S'il n'y a pas d'items, `insertMany` avec un tableau vide ne fera rien, ce qui est correct.
        if (resourcesToCreate.length > 0) {
            await Resource.insertMany(resourcesToCreate, { session });
            console.log(`${resourcesToCreate.length} ressource(s) créée(s) en stock pour la commande ${updatedCommande._id}.`);
        }
        // --- FIN CRÉATION DES RESSOURCES EN STOCK ---

        await session.commitTransaction();
        session.endSession();

        // Préparer la réponse
        const finalCommandePopulated = await Commande.findById(updatedCommande._id)
             .populate({ path: 'projetId', populate: { path: 'chefProjet', model: 'User', select: 'username email' } })
             .populate('fournisseurId', 'username email')
             .lean(); // Utiliser .lean()

        const itemsDeCommande = await CommandItem.find({ commandeId: finalCommandePopulated._id })
            .populate('productTypeId', 'name unite category')
            .lean();

        // Optionnel: Récupérer aussi les ressources créées pour les inclure dans la réponse si besoin
        // const newlyCreatedResources = await Resource.find({ commandItemId: { $in: commandItemsPourStock.map(item => item._id) } }).lean();

        const responseData = {
            ...finalCommandePopulated,
            items: itemsDeCommande,
            // newlyCreatedResources: newlyCreatedResources // Décommentez si vous voulez les retourner
        };

        res.status(200).json({ success: true, message: "Commande confirmée et ressources mises en stock.", data: responseData });

    } catch (error) {
         console.error(`Erreur confirmation commande et mise en stock pour ${id}:`, error);
         if (session.inTransaction()) { await session.abortTransaction(); }
         session.endSession();
         if (error.name === 'ValidationError') { // Peut venir de Resource.insertMany aussi
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: "Erreur de validation: " + messages.join(', ') });
         }
         if (error.code === 11000 && error.keyPattern && error.keyPattern.commandItemId) { // Erreur de duplicata sur commandItemId
             return res.status(400).json({ success: false, message: "Erreur: Une entrée de stock existe déjà pour l'un de ces items de commande." });
         }
         res.status(500).json({
             success: false,
             message: "Erreur serveur lors de la confirmation et mise en stock.",
             errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
         });
    }
};

exports.getAllCommandes = async (req, res) => {
    try {
        // On ignore complètement req.query.
        // On récupère toujours toutes les commandes.

        console.log("[getAllCommandes] Récupération de toutes les commandes sans aucun filtre.");

        const commandes = await Commande.find({}) // Toujours find({}) pour tout récupérer
            .populate({ path: 'projetId', select: 'name chefProjet', populate: { path: 'chefProjet', model: 'User', select: 'username' } })
            .populate('fournisseurId', 'username email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: commandes.length, data: commandes });

    } catch (error) {
        console.error("Erreur lors de la récupération de toutes les commandes:", error);
        res.status(500).json({ success: false, message: "Erreur serveur lors de la récupération des commandes." });
    }
};
// --- RÉCUPÉRER UNE COMMANDE PAR SON ID (Peuple les items réels si validée) ---

exports.getCommandeById = async (req, res) => {
    try {
        const commandeId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(commandeId)) {
            return res.status(400).json({ success: false, message: "Format ID de commande invalide." });
        }

        // 1. Récupérer la commande principale
        const commande = await Commande.findById(commandeId)
            .populate({ path: 'projetId', populate: { path: 'chefProjet', model: 'User', select: 'username email role' } })
            .populate('fournisseurId', 'username email role contact phone')
            // NE PAS essayer de .populate('commandItemsIds') ici
            .lean(); // Utiliser .lean() pour obtenir un objet JavaScript simple, plus facile à manipuler

        if (!commande) {
            return res.status(404).json({ success: false, message: "Commande non trouvée." });
        }

        // --- Logique d'autorisation (votre code existant est correct ici) ---
        let canView = false;
        if (req.user.role === 'Admin') { canView = true; }
        else if (req.user.role === 'ChefProjet' && commande.projetId && commande.projetId.chefProjet && commande.projetId.chefProjet._id.toString() === req.user.id) { canView = true; }
        else if (req.user.role === 'Supplier' && commande.fournisseurId && commande.fournisseurId._id.toString() === req.user.id) { canView = true; }

        if (!canView) {
            // Pour le développement, vous pouvez commenter la ligne de refus d'accès
            // return res.status(403).json({ success: false, message: "Accès refusé." });
            console.warn(`Accès autorisé pour test (getCommandeById) à la commande ${commandeId} par ${req.user.username}`);
        }
        // --- Fin Logique d'autorisation ---

        // 2. Récupérer les CommandItems associés SÉPARÉMENT
        const itemsDeCommande = await CommandItem.find({ commandeId: commande._id }) // Filtre par le champ commandeId de CommandItem
            .populate('productTypeId', 'name unite category') // Peuple les détails du ProductType pour chaque item
            .lean(); // Utiliser .lean() pour des objets JS simples

        // 3. Préparer la réponse en combinant la commande et ses items
        const responseData = {
            ...commande,      // commande est déjà un objet JS simple grâce à .lean()
            items: itemsDeCommande // Attribue le tableau des items récupérés
        };

        res.status(200).json({ success: true, data: responseData });

    } catch (error) {
        console.error(`Erreur getCommandeById ${req.params.id}:`, error); // Affiche l'erreur dans la console serveur
        res.status(500).json({
            success: false,
            message: "Erreur serveur lors de la récupération de la commande.",
            // Fournir plus de détails sur l'erreur en mode développement peut aider au débogage
            errorDetails: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};