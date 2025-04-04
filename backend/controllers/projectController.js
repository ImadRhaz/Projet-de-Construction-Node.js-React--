// controllers/projectController.js

// Importez les modèles nécessaires
const Project = require("../models/Project");
const User = require("../models/User");
const Task = require("../models/Task"); // Import même si non utilisé directement partout
const Commande = require("../models/Commande"); // Import même si non utilisé directement partout

// --- GET ALL PROJECTS ---
// Récupère tous les projets, peuplant l'utilisateur créateur
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('user', 'username') // Sélectionne uniquement 'username' de l'utilisateur
      .sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    console.error("Erreur getAllProjects:", error); // Log l'erreur côté serveur
    res.status(500).json({ message: "Erreur serveur lors de la récupération des projets.", error: error.message });
  }
};

// --- GET PROJECTS BY USER ID ---
// Récupère tous les projets créés par un utilisateur spécifique via son ID dans l'URL
exports.getProjectsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId; // Récupère l'ID utilisateur depuis les paramètres de l'URL

    // Vérifier si l'utilisateur existe réellement
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: "Utilisateur non trouvé avec cet ID." });
    }

    // Trouve tous les projets où le champ 'user' correspond à l'ID fourni
    const projects = await Project.find({ user: userId })
                                  .sort({ createdAt: -1 }); // Trier par date de création

    res.status(200).json(projects); // Renvoie un tableau vide si aucun projet trouvé, ce n'est pas une erreur

  } catch (error) {
    console.error(`Erreur getProjectsByUserId pour UserID ${req.params.userId}:`, error);
    if (error.kind === 'ObjectId') { // Gérer les erreurs de format d'ID
        return res.status(400).json({ message: "ID d'utilisateur fourni invalide." });
    }
    res.status(500).json({ message: "Erreur serveur lors de la récupération des projets de l'utilisateur.", error: error.message });
  }
};

// --- GET PROJECT BY ID ---
// Récupère un projet spécifique par son ID, peuplant les détails associés
exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await Project.findById(projectId)
      .populate('user', 'username') // Peuple l'utilisateur
      .populate('tasks')            // Peuple les tâches (peut être volumineux)
      .populate({                 // Peuple les commandes avec détails imbriqués
          path: 'commandes',
          populate: [
              { path: 'user', select: 'username' },  // Utilisateur de la commande
              { path: 'supplier', select: 'name' }   // Fournisseur de la commande
              // Ajoutez d'autres populate si besoin
          ]
      });

    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }
    res.status(200).json(project);

  } catch (error) {
    console.error(`Erreur getProjectById pour ID ${req.params.id}:`, error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: "ID de projet fourni invalide." });
    }
    res.status(500).json({ message: "Erreur serveur lors de la récupération du projet.", error: error.message });
  }
};

// --- CREATE PROJECT (Version correcte utilisant l'ID du token) ---
exports.createProject = async (req, res) => {
    try {
        // Récupérer les données du projet depuis le corps de la requête
        const { name, description, startDate, endDate, budget, status } = req.body;

        // Récupérer l'ID de l'utilisateur connecté depuis le token JWT (via middleware)
        const userId = req.user?.id; // <--- VIENT DU TOKEN (req.user)

        // Vérifier si l'utilisateur est authentifié
        if (!userId) {
            return res.status(401).json({ message: "Utilisateur non authentifié ou ID non trouvé dans le token." });
        }

        // Création de l'instance de projet avec l'ID utilisateur du TOKEN
        const newProject = new Project({
            name, description, startDate, endDate, budget, status,
            user: userId // <--- ASSIGNATION DE L'UTILISATEUR DU TOKEN
        });

        // Sauvegarde et validation Mongoose
        const savedProject = await newProject.save();

        // Ajouter la référence du projet à la liste de l'utilisateur
        await User.findByIdAndUpdate(userId, { $push: { projects: savedProject._id } });

        // Peupler et renvoyer la réponse
        const projectResponse = await Project.findById(savedProject._id).populate('user', 'username');
        res.status(201).json(projectResponse);

    } catch (error) {
        console.error("Erreur createProject:", error);
        if (error.name === 'ValidationError') { // Gérer les erreurs de validation
            const errors = Object.values(error.errors).map(el => el.message);
            return res.status(400).json({ message: "Erreur de validation des données du projet.", details: errors });
        }
        res.status(500).json({ message: "Erreur serveur lors de la création du projet.", error: error.message });
    }
};

// --- UPDATE PROJECT ---
// Met à jour un projet, vérifiant l'autorisation
exports.updateProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        // Récupérer uniquement les champs modifiables du corps
        const { name, description, startDate, endDate, budget, status } = req.body;
        const updateData = { name, description, startDate, endDate, budget, status };

        // 1. Trouver le projet pour vérifier l'autorisation
        const project = await Project.findById(projectId);
        if (!project) {
             return res.status(404).json({ message: "Projet non trouvé" });
        }

        // 2. Vérifier l'autorisation : seul le créateur ou un admin peut modifier
        if (req.user.id !== project.user.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce projet." });
        }

        // 3. Mettre à jour avec validation
        const updatedProject = await Project.findByIdAndUpdate(
             projectId,
             { $set: updateData }, // $set est plus sûr pour ne mettre à jour que les champs fournis
             { new: true, runValidators: true } // Indispensable pour la validation et retourner le nouveau doc
        ).populate('user', 'username'); // Renvoyer avec l'utilisateur peuplé

        res.status(200).json(updatedProject);

    } catch (error) {
        console.error("Erreur updateProject:", error);
        if (error.kind === 'ObjectId') { // Erreur de format d'ID
            return res.status(400).json({ message: "ID de projet invalide." });
        }
        if (error.name === 'ValidationError') { // Erreur de validation Mongoose
            const errors = Object.values(error.errors).map(el => el.message);
            return res.status(400).json({ message: "Erreur de validation lors de la mise à jour.", details: errors });
        }
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour du projet.", error: error.message });
    }
};

// --- DELETE PROJECT ---
// Supprime un projet, vérifiant l'autorisation et les dépendances
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    // 1. Trouver le projet
    const projectToDelete = await Project.findById(projectId);
    if (!projectToDelete) {
         return res.status(404).json({ message: "Projet non trouvé" });
    }

    // 2. Vérifier l'autorisation
    if (req.user.id !== projectToDelete.user.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce projet." });
    }

    // 3. Vérifier les dépendances (exemple : tâches)
    if (projectToDelete.tasks && projectToDelete.tasks.length > 0) {
        // Règle métier : ne pas supprimer si des tâches existent
        return res.status(400).json({ message: "Impossible de supprimer : des tâches sont associées à ce projet. Supprimez d'abord les tâches." });
        // Alternative : supprimer les tâches ici si la règle le permet
    }
     // 4. Vérifier les dépendances (exemple : commandes)
    if (projectToDelete.commandes && projectToDelete.commandes.length > 0) {
       // Règle métier : ne pas supprimer si des commandes existent
       return res.status(400).json({ message: "Impossible de supprimer : des commandes sont associées à ce projet." });
       // Alternative : supprimer/désassocier les commandes ici
    }

    // 5. Supprimer le projet
    await Project.findByIdAndDelete(projectId);

    // 6. Retirer la référence du projet de la liste de l'utilisateur
    await User.findByIdAndUpdate(projectToDelete.user, { $pull: { projects: projectId } });

    res.status(200).json({ message: "Projet supprimé avec succès" });

  } catch (error) {
    console.error("Erreur deleteProject:", error);
    if (error.kind === 'ObjectId') { // Erreur de format d'ID
        return res.status(400).json({ message: "ID de projet invalide." });
    }
    res.status(500).json({ message: "Erreur serveur lors de la suppression du projet.", error: error.message });
  }
};