const mongoose = require('mongoose');
const CommandItem = require('../models/CommandItem');
const Commande = require('../models/Commande'); // Nécessaire pour vérifier le fournisseur
const Resource = require('../models/Resource'); // Le modèle de Stock du Dépôt
const ProductType = require('../models/ProductType'); // Pourrait être utile pour des infos

// --- Méthode pour mettre à jour le statut d'un CommandItem (Validation/Annulation) ---
exports.updateCommandItemStatus = async (req, res) => {
    const commandItemId = req.params.id;
    const { statutLigne } = req.body;
    const userId = req.user.id; // ID de l'utilisateur connecté (fournisseur ou admin)

    // Statuts autorisés pour cette action
    const allowedStatuses = ['ValidéFournisseur', 'Annulé']; // Ajoutez d'autres si nécessaire

    if (!statutLigne || !allowedStatuses.includes(statutLigne)) {
        return res.status(400).json({ success: false, message: `Statut invalide. Les statuts autorisés sont : ${allowedStatuses.join(', ')}.` });
    }

    if (!mongoose.Types.ObjectId.isValid(commandItemId)) {
        return res.status(400).json({ success: false, message: "ID de l'item de commande invalide." });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Trouver l'item ET peupler la commande parente pour vérifier le fournisseur
        const commandItem = await CommandItem.findById(commandItemId)
                                            .populate({
                                                path: 'commandeId',
                                                select: 'fournisseurId statutCmd' // Sélectionne juste les champs nécessaires de Commande
                                            })
                                            .session(session);

        // --- Validations ---
        if (!commandItem) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "Ligne de commande non trouvée." });
        }

        // Vérifier si l'item est dans un état modifiable ('Soumis')
        if (commandItem.statutLigne !== 'Soumis') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: `Cette ligne de commande n'est plus en attente de validation (Statut actuel: ${commandItem.statutLigne}).` });
        }

        // Vérifier si la commande parente existe (sécurité)
        if (!commandItem.commandeId) {
             await session.abortTransaction();
             session.endSession();
             // Ceci ne devrait normalement pas arriver si les données sont cohérentes
             return res.status(500).json({ success: false, message: "Erreur: Commande parente introuvable pour cet item."});
        }

        // --- Autorisation ---
        // Vérifier si l'utilisateur connecté est bien le fournisseur associé à la commande OU un admin
        // Adaptez la logique si seuls les admins peuvent annuler, par exemple.
        const isOwnerSupplier = commandItem.commandeId.fournisseurId.toString() === userId;
        const isAdmin = req.user.role === 'admin'; // Assurez-vous que req.user.role existe

        if (!isOwnerSupplier && !isAdmin) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: "Accès refusé. Vous n'êtes pas le fournisseur de cette commande." });
        }

        // --- Mise à jour du Statut ---
        commandItem.statutLigne = statutLigne;
        const updatedItem = await commandItem.save({ session });

        // --- Création de la Ressource (Stock) SI Validé ---
        if (statutLigne === 'ValidéFournisseur') {
            // Vérifier si une ressource existe déjà pour cet item (sécurité en cas de double appel)
            // Bien que l'index unique sur Resource.commandItemId devrait le gérer, une vérif explicite est plus propre.
            const existingResource = await Resource.findOne({ commandItemId: commandItemId }).session(session);
            if(existingResource) {
                 console.warn(`Tentative de recréer un stock pour CommandItem ${commandItemId} déjà traité.`);
                 // On ne bloque pas forcément, la transaction échouera grâce à l'index unique si nécessaire,
                 // mais on pourrait choisir de retourner une erreur 400 ici.
            } else {
                const newResourceStock = new Resource({
                    productTypeId: updatedItem.productTypeId,
                    quantiteDisponible: updatedItem.quantiteCommandee, // La quantité commandée devient dispo
                    commandItemId: updatedItem._id,
                    dateEntreeStock: Date.now(),
                    // coutUnitaireEntree: updatedItem.prixUnitaire, // Décommenter si vous ajoutez ce champ
                    // depotId: ... // Ajouter si vous gérez les dépôts
                });
                await newResourceStock.save({ session });
            }
        }

        // --- Commit ---
        await session.commitTransaction();
        session.endSession();

        // --- Réponse ---
        res.status(200).json({ success: true, data: updatedItem }); // Renvoyer l'item mis à jour

    } catch (error) {
        console.error("Erreur lors de la mise à jour du statut CommandItem:", error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        if (error.code === 11000) { // Erreur clé unique (probablement sur Resource.commandItemId)
             return res.status(400).json({ success: false, message: "Erreur: Le stock pour cette ligne de commande semble déjà exister."});
        }
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
};