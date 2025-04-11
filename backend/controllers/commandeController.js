// controllers/commandeController.js
const mongoose = require("mongoose");
const Commande = require("../models/Commande");
const User = require("../models/User");
const Supplier = require("../models/Supplier");
const Project = require("../models/Project");

// --- CREATE COMMANDE (par ChefProjet, SANS fournisseur initial) ---
exports.createCommande = async (req, res) => {
    // ... (Code inchangé)
    try {
        const { name, type, statut, dateCmd, montantTotal, projectId } = req.body;
        const chefProjetId = req.user?.id;
        if (!chefProjetId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        if (req.user.role !== 'ChefProjet') return res.status(403).json({ message: "Accès refusé. Seul un Chef de Projet peut créer une commande." });
        if (!name) return res.status(400).json({ message: "Le nom/identifiant de la commande est requis." });
        if (montantTotal === undefined || montantTotal === null || isNaN(montantTotal) || montantTotal < 0) return res.status(400).json({ message: "Le montant total doit être un nombre positif." });
        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Un ID de projet valide est requis." });
        const projectExists = await Project.findById(projectId);
        if (!projectExists) return res.status(404).json({ message: "Projet non trouvé." });
        const commandeData = { name, ...(type && { type }), ...(statut && { statut }), ...(dateCmd && { dateCmd }), montantTotal, projet: projectId };
        const newCommande = new Commande(commandeData);
        const savedCommande = await newCommande.save();
        await Project.findByIdAndUpdate(projectId, { $addToSet: { commandes: savedCommande._id } });
        const commandeResponse = await Commande.findById(savedCommande._id)
            .populate({ path: 'projet', select: 'name _id status' })
            .populate({ path: 'supplier', select: 'username contact _id' });
        res.status(201).json(commandeResponse);
    } catch (error) {
        console.error("Erreur createCommande:", error);
        if (error.name === 'ValidationError') return res.status(400).json({ message: "Erreur de validation.", details: Object.values(error.errors).map(el => el.message) });
        if (error.name === 'CastError') return res.status(400).json({ message: `Format invalide pour le champ '${error.path}'.` });
        res.status(500).json({ message: "Erreur serveur lors de la création.", error: error.message });
    }
};

// --- GET ALL COMMANDES (Accessible par TOUS les rôles authentifiés) ---
exports.getAllCommandes = async (req, res) => {
    try {
        // >>> MODIFICATION : Vérification du rôle Admin SUPPRIMÉE <<<
        // if (req.user.role !== 'Admin') {
        //     return res.status(403).json({ message: "Accès refusé. Réservé aux administrateurs." });
        // }
        // Le middleware authenticateToken garantit déjà que req.user existe si on arrive ici.

        // Récupération de toutes les commandes
        const commandes = await Commande.find({})
            .populate('projet', 'name status _id chefProjet')
            .populate('supplier', 'username contact _id')
            .sort({ createdAt: -1 });

        res.status(200).json(commandes);

    } catch (error) {
        console.error("Erreur getAllCommandes:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération de toutes les commandes.",
            error: error.message
        });
    }
};

// --- GET COMMANDES BY PROJECT ID (Admin or Project's ChefProjet) ---
exports.getCommandesByProjetId = async (req, res) => {
    // ... (Code inchangé)
     try {
        const projectId = req.params.projectId;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Format ID Projet invalide." });
        if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        const project = await Project.findById(projectId).select('chefProjet name');
        if (!project) return res.status(404).json({ message: "Projet non trouvé." });
        const isProjectManager = project.chefProjet?.toString() === userId;
        const isAdmin = userRole === 'Admin';
        if (!isAdmin && !isProjectManager) return res.status(403).json({ message: "Accès refusé." });
        const commandes = await Commande.find({ projet: projectId })
            .populate('projet', 'name status _id')
            .populate('supplier', 'username contact _id')
            .sort({ dateCmd: -1 });
        res.status(200).json(commandes);
    } catch (error) {
        console.error("Erreur getCommandesByProjetId:", error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- GET MY COMMANDES (Supplier getting their own *assigned* commandes) ---
exports.getMyCommandes = async (req, res) => {
    // ... (Code inchangé)
     try {
        const supplierId = req.user?.id;
        if (!supplierId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        if (req.user.role !== 'Supplier') return res.status(403).json({ message: "Accès refusé. Réservé aux fournisseurs." });
        const commandes = await Commande.find({ supplier: supplierId })
            .populate('projet', 'name status _id')
            .populate('supplier', 'username contact _id')
            .sort({ dateCmd: -1 });
        res.status(200).json(commandes);
    } catch (error) {
        console.error("Erreur getMyCommandes:", error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- GET COMMANDE BY ID (Admin, Assigned Supplier, or Project's ChefProjet) ---
exports.getCommandeById = async (req, res) => {
    // ... (Code inchangé)
     try {
        const commandeId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!mongoose.Types.ObjectId.isValid(commandeId)) return res.status(400).json({ message: "Format ID commande invalide." });
        if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        const commande = await Commande.findById(commandeId)
            .populate({ path: 'projet', select: 'chefProjet name _id' })
            .populate({ path: 'supplier', select: 'username _id' });
        if (!commande) return res.status(404).json({ message: "Commande non trouvée." });
        const isAdmin = userRole === 'Admin';
        const isAssignedSupplier = commande.supplier ? commande.supplier._id.toString() === userId : false;
        const isProjectManager = commande.projet?.chefProjet?.toString() === userId;
        if (!isAdmin && !isAssignedSupplier && !isProjectManager) return res.status(403).json({ message: "Accès refusé." });
        const commandeDetails = await Commande.findById(commandeId)
             .populate('projet', 'name description status _id chefProjet')
             .populate('supplier', 'username contact phone address email _id');
        res.status(200).json(commandeDetails || commande);
    } catch (error) {
        console.error("Erreur getCommandeById:", error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- UPDATE COMMANDE STATUS (par un fournisseur, AVEC auto-assignation si nécessaire) ---
exports.updateCommandeStatus = async (req, res) => {
    // ... (Code inchangé)
     try {
        const commandeId = req.params.id;
        const { statut } = req.body;
        const currentSupplierId = req.user?.id;
        if (!mongoose.Types.ObjectId.isValid(commandeId)) return res.status(400).json({ message: "Format ID commande invalide." });
        if (!currentSupplierId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        if (req.user.role !== 'Supplier') return res.status(403).json({ message: "Accès refusé. Seuls les fournisseurs peuvent modifier le statut." });
        if (!statut) return res.status(400).json({ message: "Le nouveau statut est requis." });
        const allowedStatus = Commande.schema.path('statut').enumValues;
        if (!allowedStatus.includes(statut)) return res.status(400).json({ message: `Statut invalide: ${statut}.`, allowedStatus });
        const commandeToUpdate = await Commande.findById(commandeId);
        if (!commandeToUpdate) return res.status(404).json({ message: "Commande non trouvée." });
        let wasJustAssigned = false;
        if (commandeToUpdate.supplier) {
            if (commandeToUpdate.supplier.toString() !== currentSupplierId) return res.status(403).json({ message: "Accès refusé. Cette commande est déjà assignée à un autre fournisseur." });
        } else {
            commandeToUpdate.supplier = currentSupplierId;
            wasJustAssigned = true;
        }
        commandeToUpdate.statut = statut;
        const updatedCommande = await commandeToUpdate.save({ runValidators: true });
        if (wasJustAssigned) {
            await Supplier.findByIdAndUpdate(currentSupplierId, { $addToSet: { commandes: updatedCommande._id } })
                .catch(err => console.warn("Note: Could not update Supplier commande list on assign:", err.message));
        }
        const populatedResponse = await Commande.findById(updatedCommande._id)
            .populate('projet', 'name status _id')
            .populate('supplier', 'username contact _id');
        res.status(200).json(populatedResponse);
    } catch (error) {
        console.error("Erreur updateCommandeStatus:", error);
         if (error.name === 'ValidationError') return res.status(400).json({ message: "Erreur validation.", details: Object.values(error.errors).map(el => el.message) });
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- DELETE COMMANDE (Admin or Assigned Supplier) ---
exports.deleteCommande = async (req, res) => {
    // ... (Code inchangé)
     try {
        const commandeId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!mongoose.Types.ObjectId.isValid(commandeId)) return res.status(400).json({ message: "Format ID commande invalide." });
        if (!userId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        const commandeToDelete = await Commande.findById(commandeId);
        if (!commandeToDelete) return res.status(404).json({ message: "Commande non trouvée." });
        const isAdmin = userRole === 'Admin';
        const isOwner = commandeToDelete.supplier ? commandeToDelete.supplier.toString() === userId : false;
        if (!isAdmin && !isOwner) return res.status(403).json({ message: "Accès refusé. Seul l'administrateur ou le fournisseur assigné peut supprimer." });
        const updatePromises = [ Project.findByIdAndUpdate(commandeToDelete.projet, { $pull: { commandes: commandeId } }) ];
        if(commandeToDelete.supplier) {
             updatePromises.push( Supplier.findByIdAndUpdate(commandeToDelete.supplier, { $pull: { commandes: commandeId } }) .catch(err => console.warn("Note: Could not update Supplier on delete:", err.message)) );
        }
        await Promise.all(updatePromises);
        await Commande.findByIdAndDelete(commandeId);
        res.status(200).json({ message: "Commande supprimée avec succès." });
    } catch (error) {
        console.error("Erreur deleteCommande:", error);
        res.status(500).json({ message: "Erreur serveur lors de la suppression.", error: error.message });
    }
};