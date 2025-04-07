// controllers/commandeController.js
const mongoose = require("mongoose");
const Commande = require("../models/Commande");
const User = require("../models/User"); // For role check
const Supplier = require("../models/Supplier"); // For potential bidirectional update
const Project = require("../models/Project");
// Resource model is no longer needed here for creating/fetching basic commandes

// --- CREATE COMMANDE (par Supplier, based on the provided Commande model) ---
exports.createCommande = async (req, res) => {
    try {
        // Expect fields matching the Commande model (except supplier, which comes from req.user)
        // 'projet' field from model comes as 'projectId' in request body for clarity
        const { name, type, statut, dateCmd, montantTotal, projectId } = req.body;
        const supplierId = req.user?.id;

        // 1. Validation de l'utilisateur
        if (!supplierId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        if (req.user.role !== 'Supplier') {
            return res.status(403).json({ message: "Accès refusé. Seul un Supplier peut créer une commande." });
        }

        // 2. Validation des données d'entrée obligatoires
        if (!name) {
             return res.status(400).json({ message: "Le nom/identifiant de la commande est requis." });
        }
         if (montantTotal === undefined || montantTotal === null) {
            return res.status(400).json({ message: "Le montant total est requis." });
        }
         if (isNaN(montantTotal) || montantTotal < 0) {
            return res.status(400).json({ message: "Le montant total doit être un nombre positif." });
        }
        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ message: "Un ID de projet valide est requis." });
        }

        // 3. Vérification que le projet existe
        const projectExists = await Project.findById(projectId);
        if (!projectExists) {
            return res.status(404).json({ message: "Projet non trouvé." });
        }

        // 4. Création de l'objet Commande avec les données du modèle
        const commandeData = {
            name,
            // type is optional
            ...(type && { type }),
            // statut has default, but can be overridden if provided
            ...(statut && { statut }),
             // dateCmd has default, but can be overridden if provided
            ...(dateCmd && { dateCmd }),
            montantTotal,
            supplier: supplierId, // Assign logged-in supplier
            projet: projectId      // Assign project from request
        };

        const newCommande = new Commande(commandeData);
        const savedCommande = await newCommande.save(); // Mongoose will validate based on schema here

        // 5. Mise à jour bidirectionnelle (Optional but good practice)
        await Promise.all([
            Project.findByIdAndUpdate(projectId, {
                $addToSet: { commandes: savedCommande._id } // Add to project's list
            }),
            // Update Supplier if your Supplier schema has a 'commandes' array
            Supplier.findByIdAndUpdate(supplierId, {
                 $addToSet: { commandes: savedCommande._id }
            }).catch(err => console.warn("Note: Could not update Supplier commande list, check Supplier schema:", err.message))
        ]);

        // 6. Réponse avec la commande peuplée
        const commandeResponse = await Commande.findById(savedCommande._id)
            .populate({ path: 'projet', select: 'name _id status' }) // Populate project info
            .populate({ path: 'supplier', select: 'username contact _id' }); // Populate supplier info

        res.status(201).json(commandeResponse);

    } catch (error) {
        console.error("Erreur createCommande:", error);
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const details = Object.values(error.errors).map(el => el.message);
            return res.status(400).json({ message: "Erreur de validation des données.", details });
        }
         // Handle potential cast errors (e.g., invalid date format for dateCmd)
        if (error.name === 'CastError') {
             return res.status(400).json({ message: `Format invalide pour le champ '${error.path}'. Valeur reçue: '${error.value}'` });
        }
        // Generic server error
        res.status(500).json({
            message: "Erreur serveur lors de la création de la commande.",
            error: error.message
        });
    }
};

// --- GET COMMANDES BY SUPPLIER (pour un fournisseur connecté) ---
exports.getMyCommandes = async (req, res) => {
    try {
        const supplierId = req.user?.id;

        if (!supplierId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        if (req.user.role !== 'Supplier') {
            return res.status(403).json({ message: "Accès refusé. Réservé aux fournisseurs." });
        }

        const commandes = await Commande.find({ supplier: supplierId })
            // Populate fields based on your model
            .populate('projet', 'name status _id') // Populate project name and status
            .populate('supplier', 'username contact _id') // Populate supplier username/contact
            .sort({ dateCmd: -1 }); // Sort by command date perhaps? Or createdAt: -1

        res.status(200).json(commandes);

    } catch (error) {
        console.error("Erreur getMyCommandes:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des commandes.",
            error: error.message
        });
    }
};

// --- GET COMMANDE BY ID (pour le fournisseur propriétaire) ---
exports.getCommandeById = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const supplierId = req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(commandeId)) {
            return res.status(400).json({ message: "Format de l'ID de commande invalide." });
        }

        if (!supplierId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        if (req.user.role !== 'Supplier') {
            return res.status(403).json({ message: "Accès refusé. Réservé aux fournisseurs." });
        }

        const commande = await Commande.findOne({
            _id: commandeId,
            supplier: supplierId // *** Crucial ownership check ***
        })
        // Populate based on your model
        .populate('projet', 'name description status _id') // Get more project details
        .populate('supplier', 'username contact phone address email _id'); // Get more supplier details

        if (!commande) {
            return res.status(404).json({ message: "Commande non trouvée ou accès refusé." });
        }

        res.status(200).json(commande);

    } catch (error) {
        console.error("Erreur getCommandeById:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération de la commande.",
            error: error.message
        });
    }
};

// --- UPDATE COMMANDE STATUS (par le fournisseur) ---
exports.updateCommandeStatus = async (req, res) => {
    try {
        const commandeId = req.params.id;
        // Expect 'statut' matching the model field name
        const { statut } = req.body;
        const supplierId = req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(commandeId)) {
            return res.status(400).json({ message: "Format de l'ID de commande invalide." });
        }

        if (!supplierId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        if (req.user.role !== 'Supplier') {
            return res.status(403).json({ message: "Accès refusé. Réservé aux fournisseurs." });
        }

        if (!statut) {
            return res.status(400).json({ message: "Le nouveau statut est requis." });
        }

        // Use the enum values from your schema for validation
        const allowedStatus = Commande.schema.path('statut').enumValues;
        if (!allowedStatus.includes(statut)) {
            return res.status(400).json({
                message: `Statut invalide: ${statut}.`,
                allowedStatus
            });
        }

        const commandeToUpdate = await Commande.findOne({
            _id: commandeId,
            supplier: supplierId // *** Crucial ownership check ***
        });

        if (!commandeToUpdate) {
            return res.status(404).json({ message: "Commande non trouvée ou accès refusé." });
        }

        commandeToUpdate.statut = statut; // Use the correct field name from your model
        const updatedCommande = await commandeToUpdate.save({ runValidators: true });

        // Populate the response
        const populatedResponse = await Commande.findById(updatedCommande._id)
            .populate('projet', 'name status _id')
            .populate('supplier', 'username contact _id');

        res.status(200).json(populatedResponse);

    } catch (error) {
        console.error("Erreur updateCommandeStatus:", error);
         if (error.name === 'ValidationError') {
            const details = Object.values(error.errors).map(el => el.message);
            return res.status(400).json({ message: "Erreur de validation lors de la mise à jour.", details });
        }
        res.status(500).json({
            message: "Erreur serveur lors de la mise à jour du statut.",
            error: error.message
        });
    }
};


// --- DELETE COMMANDE (par le fournisseur propriétaire ou Admin) ---
exports.deleteCommande = async (req, res) => {
    try {
        const commandeId = req.params.id;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        if (!mongoose.Types.ObjectId.isValid(commandeId)) {
            return res.status(400).json({ message: "Format de l'ID de commande invalide." });
        }

        if (!userId) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }

        const commandeToDelete = await Commande.findById(commandeId);

        if (!commandeToDelete) {
            return res.status(404).json({ message: "Commande non trouvée." });
        }

        // Authorization Check
        const isOwner = commandeToDelete.supplier.toString() === userId;
        const isAdmin = userRole === 'Admin';

        if (!isOwner && !isAdmin) {
             return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas le propriétaire ou un administrateur." });
        }

        // Clean up references BEFORE deleting
        await Promise.all([
            Project.findByIdAndUpdate(commandeToDelete.projet, { // Use 'projet' field name
                $pull: { commandes: commandeId }
            }),
            Supplier.findByIdAndUpdate(commandeToDelete.supplier, { // Use 'supplier' field name
                $pull: { commandes: commandeId }
            }).catch(err => console.warn("Note: Could not update Supplier commande list on delete, check Supplier schema:", err.message)),
        ]);

        // Delete the command
        await Commande.findByIdAndDelete(commandeId);

        res.status(200).json({ message: "Commande supprimée avec succès." });

    } catch (error) {
        console.error("Erreur deleteCommande:", error);
        res.status(500).json({
            message: "Erreur serveur lors de la suppression de la commande.",
            error: error.message
        });
    }
};