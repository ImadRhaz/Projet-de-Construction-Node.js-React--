// controllers/projectController.js

const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const ChefProjet = require("../models/ChefProjet"); // Important pour mettre à jour le ChefProjet
const Task = require("../models/Task");
const Commande = require("../models/Commande");
const TaskResource = require("../models/TaskResource"); // Importer pour suppression en cascade éventuelle

// --- GET ALL PROJECTS ---
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('chefProjet', 'username email role')
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    console.error("Erreur getAllProjects:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des projets.", error: error.message });
  }
};

// --- GET PROJECTS BY CHEF_PROJET ID ---
exports.getProjectsByChefProjet = async (req, res) => {
  try {
    const chefProjetId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(chefProjetId)) {
      return res.status(400).json({ message: "Format de l'ID utilisateur invalide." });
    }

    const userExists = await User.findById(chefProjetId);
    if (!userExists) {
      return res.status(404).json({ message: "Utilisateur non trouvé avec cet ID." });
    }
    // Optionnel: vérifier si c'est bien un ChefProjet
    // if (userExists.role !== 'ChefProjet') {
    //    return res.status(400).json({ message: "L'utilisateur n'est pas un Chef de Projet." });
    // }

    const projects = await Project.find({ chefProjet: chefProjetId })
                                  .populate('chefProjet', 'username email') // Peuple le chef pour confirmation
                                  .sort({ createdAt: -1 });
    res.status(200).json(projects);

  } catch (error) {
    console.error(`Erreur getProjectsByChefProjet pour UserID ${req.params.userId}:`, error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// --- GET PROJECT BY ID ---
exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Format de l'ID de projet invalide." });
    }

    const project = await Project.findById(projectId)
      .populate('chefProjet', 'username email role')
      .populate('tasks') // Peupler les tâches associées
      .populate({ // Peupler les commandes et leur fournisseur
          path: 'commandes',
          options: { sort: { createdAt: -1 } },
          populate: { path: 'supplier', select: 'username email contact phone' }
      });

    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    res.status(200).json(project);

  } catch (error) {
    console.error(`Erreur getProjectById pour ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// --- CREATE PROJECT ---
exports.createProject = async (req, res) => {
    try {
        const { name, description, startDate, endDate, budget, status } = req.body;
        const chefProjetId = req.user?.id;

        if (!chefProjetId) return res.status(401).json({ message: "Utilisateur non authentifié." });
        if (req.user.role !== 'ChefProjet') return res.status(403).json({ message: "Accès refusé. Seul un Chef de Projet peut créer un projet." });

        const projectData = {
            name, description, startDate, endDate,
            budget: (budget !== undefined && budget !== null) ? Number(budget) : undefined,
            status,
            chefProjet: chefProjetId
        };

        const newProject = new Project(projectData);
        const savedProject = await newProject.save();

        // --- MISE À JOUR BIDIRECTIONNELLE ---
        // Ajouter le projet à la liste du ChefProjet
        await ChefProjet.findByIdAndUpdate(chefProjetId, { $addToSet: { projectsManaged: savedProject._id } });
        // --- FIN MISE À JOUR ---

        const projectResponse = await Project.findById(savedProject._id)
                                        .populate('chefProjet', 'username email role');
        res.status(201).json(projectResponse);

    } catch (error) {
        // ... (Gestion d'erreur détaillée comme dans les versions précédentes) ...
        console.error("Erreur createProject:", error);
        // Gestion spécifique des erreurs de validation/cast/unicité
        if (error.name === 'ValidationError' || error.name === 'CastError' || (error.code === 11000)) {
            let details = [];
            let statusCode = 400;
            let message = "Erreur de validation des données.";
            if (error.name === 'ValidationError') { details = Object.values(error.errors).map(el => el.message); }
            else if (error.name === 'CastError') { details.push(`Format invalide pour '${error.path}'.`); }
            else if (error.code === 11000) { statusCode = 409; message = "Erreur: Un projet avec ce nom existe peut-être déjà."; details.push(error.message); }
            return res.status(statusCode).json({ message, details });
        }
        res.status(500).json({ message: "Erreur serveur lors de la création du projet.", error: error.message });
    }
};

// --- UPDATE PROJECT ---
exports.updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
          return res.status(400).json({ message: "Format de l'ID de projet invalide." });
        }
        const { name, description, startDate, endDate, budget, status } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (startDate !== undefined) updateData.startDate = startDate;
        if (endDate !== undefined) updateData.endDate = endDate;
        if (status !== undefined) updateData.status = status;
        if (budget !== undefined && budget !== null) {
            const numBudget = Number(budget);
            if (isNaN(numBudget) || numBudget < 0) return res.status(400).json({ message: "Budget invalide."});
            updateData.budget = numBudget;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Aucun champ à mettre à jour fourni." });
        }

        const projectToUpdate = await Project.findById(projectId);
        if (!projectToUpdate) return res.status(404).json({ message: "Projet non trouvé." });

        // Vérification d'autorisation
        if (req.user.id !== projectToUpdate.chefProjet.toString() && req.user.role !== 'Admin') {
             return res.status(403).json({ message: "Accès refusé." });
        }

        const updatedProject = await Project.findByIdAndUpdate(
             projectId, { $set: updateData }, { new: true, runValidators: true }
        ).populate('chefProjet', 'username email role');

        if (!updatedProject) return res.status(404).json({ message: "Projet non trouvé après màj." });

        res.status(200).json(updatedProject);

    } catch (error) {
       // ... (Gestion d'erreur détaillée comme dans createProject) ...
        console.error("Erreur updateProject:", error);
        // Gestion validation/cast/unicité
        if (error.name === 'ValidationError' || error.name === 'CastError' || (error.code === 11000)) {
            // ... (logique similaire à createProject pour déterminer message/statusCode/details) ...
             return res.status(400).json({ message: "Erreur lors de la mise à jour.", error: error.message }); // Simplifié pour l'exemple
        }
       res.status(500).json({ message: "Erreur serveur lors de la mise à jour du projet.", error: error.message });
    }
};

// --- DELETE PROJECT ---
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Format de l'ID de projet invalide." });
    }

    const projectToDelete = await Project.findById(projectId);
    if (!projectToDelete) return res.status(404).json({ message: "Projet non trouvé." });

    // Vérification d'autorisation
    if (req.user.id !== projectToDelete.chefProjet.toString() && req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Accès refusé." });
    }

    // --- GESTION DES DÉPENDANCES AVANT SUPPRESSION ---
    // 1. Trouver les tâches liées
    const tasksToDelete = await Task.find({ project: projectId }).select('_id'); // Seulement besoin des IDs
    const taskIdsToDelete = tasksToDelete.map(task => task._id);

    // 2. Supprimer les TaskResource liées à ces tâches (si elles existent)
    if (taskIdsToDelete.length > 0) {
        await TaskResource.deleteMany({ task: { $in: taskIdsToDelete } });
        console.log(`Liens TaskResource pour les tâches du projet ${projectId} supprimés.`);
    }

    // 3. Supprimer les tâches elles-mêmes
    if (taskIdsToDelete.length > 0) {
        await Task.deleteMany({ _id: { $in: taskIdsToDelete } });
        console.log(`Tâches du projet ${projectId} supprimées.`);
    }

    // 4. Gérer les Commandes (exemple : juste désassocier pour ne pas bloquer)
    //    Alternative : vérifier count et bloquer, ou supprimer aussi CommandeRessource/Commande
    await Commande.updateMany({ projet: projectId }, { $unset: { projet: "" } }); // Désassocie les commandes
    console.log(`Commandes désassociées du projet ${projectId}.`);
    // --- FIN GESTION DÉPENDANCES ---


    // --- SUPPRESSION PRINCIPALE ET MISE À JOUR BIDIRECTIONNELLE ---
    await Promise.all([
        Project.findByIdAndDelete(projectId), // Supprime le projet
        // Retire le projet de la liste du ChefProjet
        ChefProjet.findByIdAndUpdate(projectToDelete.chefProjet, { $pull: { projectsManaged: projectId } }),
        // Retirer les tâches des listes tasksAssigned des utilisateurs concernés (plus complexe)
        // Pourrait nécessiter de boucler sur taskIdsToDelete et faire $pull sur chaque assignedUser si c'est un ChefProjet
    ]);
    // --- FIN SUPPRESSION ---

    res.status(200).json({ message: "Projet et ses tâches associées supprimés avec succès." });

  } catch (error) {
    console.error("Erreur deleteProject:", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression du projet.", error: error.message });
  }
};