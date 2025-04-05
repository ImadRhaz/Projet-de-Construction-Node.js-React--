// controllers/taskResourceController.js

const mongoose = require('mongoose');
const TaskResource = require('../models/TaskResource');
const Task = require('../models/Task');
const Resource = require('../models/Resource');
// Importer User si besoin de vérifier les rôles pour l'autorisation

// --- GET Resources for a specific Task ---
exports.getTaskResources = async (req, res) => {
    try {
        const taskId = req.params.taskId;
        if (!mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "Format de l'ID de tâche invalide." });
        }

        // Optionnel: Vérifier si l'utilisateur a le droit de voir les ressources de cette tâche

        const resources = await TaskResource.find({ task: taskId })
                                         .populate('resource', 'name unit type quantityAvailable'); // Peuple la ressource liée

        if (!resources) { // Ou resources.length === 0
             return res.status(404).json({ message: "Aucune ressource trouvée pour cette tâche ou tâche inexistante." });
        }

        res.status(200).json(resources);
    } catch (error) {
        console.error(`Erreur getTaskResources pour TaskID ${req.params.taskId}:`, error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- ADD a Resource link to a Task ---
exports.addTaskResource = async (req, res) => {
    const { task: taskId, resource: resourceId, quantity, dateUtilisation } = req.body;

    // 1. Validation des IDs et quantité
    if (!taskId || !resourceId || quantity == null) {
        return res.status(400).json({ message: "Les IDs de tâche et ressource, et la quantité sont requis." });
    }
    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ message: "Format d'ID de tâche ou ressource invalide." });
    }
     const numQuantity = Number(quantity);
    if (isNaN(numQuantity) || numQuantity <= 0) {
        return res.status(400).json({ message: "La quantité doit être un nombre positif." });
    }

    try {
        // 2. Vérifier si la tâche et la ressource existent
        const [taskExists, resourceExists] = await Promise.all([
            Task.findById(taskId),
            Resource.findById(resourceId)
        ]);
        if (!taskExists) return res.status(404).json({ message: "Tâche non trouvée." });
        if (!resourceExists) return res.status(404).json({ message: "Ressource non trouvée." });

        // 3. Vérifier si le lien existe déjà (pour éviter les doublons)
        const existingLink = await TaskResource.findOne({ task: taskId, resource: resourceId });
        if (existingLink) {
            return res.status(409).json({ message: "Cette ressource est déjà liée à cette tâche. Mettez à jour la quantité si nécessaire." });
        }

        // 4. (Optionnel) Vérification d'autorisation (ex: seul chefProjet ou assigné peut ajouter?)
        // const project = await Project.findById(taskExists.project).populate('chefProjet');
        // const isAssigned = req.user.id === taskExists.assignedUser.toString();
        // const isChefProjet = req.user.id === project.chefProjet._id.toString();
        // const isAdmin = req.user.role === 'Admin';
        // if (!isAssigned && !isChefProjet && !isAdmin) { ... }

        // 5. Créer et sauvegarder le nouveau lien
        const newTaskResource = new TaskResource({
            task: taskId,
            resource: resourceId,
            quantity: numQuantity,
            dateUtilisation: dateUtilisation || null
        });
        const savedLink = await newTaskResource.save();

        // 6. Renvoyer le lien créé (populé si besoin)
        const response = await TaskResource.findById(savedLink._id)
                                       .populate('resource', 'name unit');
        res.status(201).json(response);

    } catch (error) {
        console.error("Erreur addTaskResource:", error);
        if (error.name === 'ValidationError') {
             const errors = Object.values(error.errors).map(el => el.message);
             return res.status(400).json({ message: "Erreur de validation.", details: errors });
        }
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- UPDATE a TaskResource link (quantity, dateUtilisation) ---
exports.updateTaskResource = async (req, res) => {
    const linkId = req.params.id; // ID du document TaskResource à modifier
    const { quantity, dateUtilisation } = req.body;

    if (!mongoose.Types.ObjectId.isValid(linkId)) {
        return res.status(400).json({ message: "Format de l'ID du lien invalide." });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (quantity !== undefined) {
         const numQuantity = Number(quantity);
         if (isNaN(numQuantity) || numQuantity <= 0) {
             return res.status(400).json({ message: "La quantité doit être un nombre positif." });
         }
         updateData.quantity = numQuantity;
    }
     if (dateUtilisation !== undefined) {
         updateData.dateUtilisation = dateUtilisation; // Peut être null pour effacer
    }

    if (Object.keys(updateData).length === 0) {
         return res.status(400).json({ message: "Aucun champ à mettre à jour fourni (quantity ou dateUtilisation)." });
    }

    try {
        // (Optionnel) Vérifier l'autorisation avant de mettre à jour
        // const link = await TaskResource.findById(linkId).populate({ path: 'task', populate: { path: 'project', select: 'chefProjet' } });
        // if (!link) return res.status(404)...
        // Vérifier si req.user.id est link.task.assignedUser ou link.task.project.chefProjet ou Admin...

        const updatedLink = await TaskResource.findByIdAndUpdate(
            linkId,
            { $set: updateData },
            { new: true, runValidators: true } // Valider et retourner le nouveau doc
        ).populate('resource', 'name unit');

        if (!updatedLink) {
            return res.status(404).json({ message: "Lien Tâche-Ressource non trouvé." });
        }

        res.status(200).json(updatedLink);

    } catch (error) {
        console.error(`Erreur updateTaskResource pour ID ${linkId}:`, error);
         if (error.name === 'ValidationError') {
             const errors = Object.values(error.errors).map(el => el.message);
             return res.status(400).json({ message: "Erreur de validation.", details: errors });
        }
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};

// --- DELETE a TaskResource link ---
exports.deleteTaskResource = async (req, res) => {
    const linkId = req.params.id; // ID du document TaskResource à supprimer

    if (!mongoose.Types.ObjectId.isValid(linkId)) {
        return res.status(400).json({ message: "Format de l'ID du lien invalide." });
    }

    try {
        // (Optionnel) Vérifier l'autorisation avant de supprimer

        const deletedLink = await TaskResource.findByIdAndDelete(linkId);

        if (!deletedLink) {
            return res.status(404).json({ message: "Lien Tâche-Ressource non trouvé." });
        }

        res.status(200).json({ message: "Lien Tâche-Ressource supprimé avec succès." });

    } catch (error) {
        console.error(`Erreur deleteTaskResource pour ID ${linkId}:`, error);
        res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
};