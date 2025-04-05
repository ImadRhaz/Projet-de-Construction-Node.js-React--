// controllers/taskController.js

const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/User");
const ChefProjet = require("../models/ChefProjet"); // Important pour màj ChefProjet.tasksAssigned
const TaskResource = require("../models/TaskResource");
const Resource = require("../models/Resource");

// --- GET ALL TASKS ---
exports.getAllTasks = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Format ID projet invalide." });
      query.project = projectId;
    }
    const tasks = await Task.find(query)
      .populate("project", "name status")
      .populate("assignedUser", "username email role")
      .sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Erreur getAllTasks:", error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// --- GET TASK BY ID ---
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Format ID tâche invalide." });

    const task = await Task.findById(taskId)
      .populate("project", "name status chefProjet")
      .populate("assignedUser", "username email role")
      .populate({
          path: 'taskResources',
          options: { sort: { createdAt: 1 } },
          populate: { path: 'resource', select: 'name unit type quantityAvailable' }
      });
    if (!task) return res.status(404).json({ message: "Tâche non trouvée." });
    res.status(200).json(task);
  } catch (error) {
    console.error(`Erreur getTaskById pour ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Erreur serveur.", error: error.message });
  }
};

// --- CREATE TASK (Avec création TaskResource et màj ChefProjet.tasksAssigned) ---
exports.createTask = async (req, res) => {
  const { projectId, description, startDate, endDate, assignedUserId, status, resources } = req.body;
  const creatorUserId = req.user?.id;

  if (!projectId || !description) return res.status(400).json({ message: "ID projet et description requis." });
  if (!creatorUserId) return res.status(401).json({ message: "Non authentifié." });
  if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Format ID projet invalide." });
  const resourceLinksToCreate = Array.isArray(resources) ? resources : [];

  try {
    const projectExists = await Project.findById(projectId).populate('chefProjet', '_id');
    if (!projectExists) return res.status(404).json({ message: "Projet non trouvé." });

    let finalAssignedUserId = assignedUserId || creatorUserId;
    if (!mongoose.Types.ObjectId.isValid(finalAssignedUserId)) return res.status(400).json({ message: "Format ID utilisateur assigné invalide."});
    const assignedUserExists = await User.findById(finalAssignedUserId);
    if (!assignedUserExists) return res.status(404).json({ message: `Utilisateur à assigner (ID: ${finalAssignedUserId}) non trouvé.` });

    // Optionnel: Autorisation
    // if (creatorUserId !== projectExists.chefProjet._id.toString() && req.user.role !== 'Admin') { ... }

    // Créer la tâche
    const newTask = new Task({
      project: projectId, description, startDate: startDate || null, endDate: endDate || null,
      assignedUser: finalAssignedUserId, status
    });
    const savedTask = await newTask.save();

    // Créer les liens TaskResource
    const errorsTaskResources = [];
    for (const resourceInfo of resourceLinksToCreate) { // Boucle synchrone avec await dedans
      if (!resourceInfo.resourceId || !mongoose.Types.ObjectId.isValid(resourceInfo.resourceId) || resourceInfo.quantity == null || Number(resourceInfo.quantity) <= 0) {
        errorsTaskResources.push(`Données ressource invalides: ${JSON.stringify(resourceInfo)}`); continue;
      }
      try {
        const resourceExists = await Resource.findById(resourceInfo.resourceId);
        if (!resourceExists) { errorsTaskResources.push(`Ressource ${resourceInfo.resourceId} non trouvée.`); continue; }

        const newTaskResource = new TaskResource({ task: savedTask._id, resource: resourceInfo.resourceId, quantity: Number(resourceInfo.quantity) });
        await newTaskResource.save();
      } catch (linkError) { errorsTaskResources.push(`Erreur liaison ressource ${resourceInfo.resourceId}: ${linkError.message}`); }
    }

    // --- MISES À JOUR BIDIRECTIONNELLES ---
    await Promise.all([
        // Ajouter tâche au projet
        Project.findByIdAndUpdate(projectId, { $push: { tasks: savedTask._id } }),
        // Ajouter tâche à l'assigné SI c'est un ChefProjet
        (assignedUserExists.role === 'ChefProjet')
          ? ChefProjet.findByIdAndUpdate(finalAssignedUserId, { $addToSet: { tasksAssigned: savedTask._id } })
          : Promise.resolve() // Ne rien faire sinon
    ]);
    // --- FIN MISES À JOUR ---

    // Renvoyer réponse
    const taskResponse = await Task.findById(savedTask._id)
                                .populate("project", "name")
                                .populate("assignedUser", "username email")
                                .populate({ path: 'taskResources', populate: { path: 'resource', select: 'name unit' } });

    if (errorsTaskResources.length > 0) {
       console.warn(`Tâche ${savedTask._id} créée, mais avec erreurs liaison:`, errorsTaskResources);
       return res.status(201).json({ message: "Tâche créée, mais certaines liaisons ont échoué.", task: taskResponse, resourceErrors: errorsTaskResources });
    }
    res.status(201).json(taskResponse);

  } catch (error) { // Erreurs création Task principale ou validation IDs
    // ... (Gestion erreurs comme avant) ...
    console.error("Erreur majeure createTask:", error);
    if (error.name === 'ValidationError') { /* ... */ }
    res.status(500).json({ message: "Erreur serveur création tâche.", error: error.message });
  }
};

// --- UPDATE TASK ---
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Format ID tâche invalide." });
    const { description, startDate, endDate, assignedUserId, status, projectId } = req.body;

    const taskToUpdate = await Task.findById(taskId).populate('project', 'chefProjet');
    if (!taskToUpdate) return res.status(404).json({ message: "Tâche non trouvée." });

    // Autorisation (Exemple)
    const isAssigned = req.user.id === taskToUpdate.assignedUser.toString();
    const isChefProjetCurrent = req.user.id === taskToUpdate.project.chefProjet.toString();
    const isAdmin = req.user.role === 'Admin';
    if (!isAssigned && !isChefProjetCurrent && !isAdmin) return res.status(403).json({ message: "Accès refusé." });

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (status !== undefined) updateData.status = status;

    let oldAssignedUserId = taskToUpdate.assignedUser.toString();
    let newAssignedUserId = assignedUserId;
    let userChanged = false;
    if (newAssignedUserId !== undefined && newAssignedUserId !== oldAssignedUserId) {
        if (!mongoose.Types.ObjectId.isValid(newAssignedUserId)) return res.status(400).json({ message: "Format ID nouvel assigné invalide."});
        const newAssignedUser = await User.findById(newAssignedUserId);
        if (!newAssignedUser) return res.status(404).json({ message: "Nouvel utilisateur assigné non trouvé." });
        updateData.assignedUser = newAssignedUserId;
        userChanged = true;
    } else {
        newAssignedUserId = oldAssignedUserId; // Garde l'ID pour la mise à jour potentielle de sa liste
    }

    let oldProjectId = taskToUpdate.project._id.toString();
    let newProjectId = projectId;
    let projectChanged = false;
    if (newProjectId !== undefined && newProjectId !== oldProjectId) {
        if (!mongoose.Types.ObjectId.isValid(newProjectId)) return res.status(400).json({ message: "Format ID nouveau projet invalide."});
        const newProject = await Project.findById(newProjectId).populate('chefProjet', '_id');
        if (!newProject) return res.status(404).json({ message: "Nouveau projet non trouvé." });
        // Vérif autorisation déplacement ?
        // if (req.user.id !== newProject.chefProjet._id.toString() && !isAdmin) return res.status(403)...
        updateData.project = newProjectId;
        projectChanged = true;
    } else {
        newProjectId = oldProjectId; // Garde l'ID pour la mise à jour potentielle de sa liste
    }

    // Mise à jour de la tâche
    const updatedTask = await Task.findByIdAndUpdate(taskId, { $set: updateData }, { new: true, runValidators: true })
                                .populate("project", "name").populate("assignedUser", "username email");

    if (!updatedTask) return res.status(404).json({ message: "Tâche non trouvée après màj." });

    // --- MISES À JOUR BIDIRECTIONNELLES (conditionnelles) ---
    const updates = [];
    // Si le projet a changé
    if (projectChanged) {
        updates.push(Project.findByIdAndUpdate(oldProjectId, { $pull: { tasks: taskId } }));
        updates.push(Project.findByIdAndUpdate(newProjectId, { $addToSet: { tasks: taskId } }));
    }
    // Si l'utilisateur assigné a changé
    if (userChanged) {
        const oldUser = await User.findById(oldAssignedUserId); // Rôle de l'ancien
        if (oldUser && oldUser.role === 'ChefProjet') {
            updates.push(ChefProjet.findByIdAndUpdate(oldAssignedUserId, { $pull: { tasksAssigned: taskId } }));
        }
        const newUser = await User.findById(newAssignedUserId); // Rôle du nouveau
        if (newUser && newUser.role === 'ChefProjet') {
            updates.push(ChefProjet.findByIdAndUpdate(newAssignedUserId, { $addToSet: { tasksAssigned: taskId } }));
        }
    }
    if(updates.length > 0) await Promise.all(updates); // Exécute les mises à jour nécessaires
    // --- FIN MISES À JOUR ---

    res.status(200).json(updatedTask);

  } catch (error) {
    // ... (Gestion erreurs comme avant) ...
     console.error(`Erreur updateTask pour ID ${req.params.id}:`, error);
     // ... (Gestion validation/cast/unicité) ...
     res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la tâche.", error: error.message });
  }
};


// --- DELETE TASK ---
exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
     if (!mongoose.Types.ObjectId.isValid(taskId)) return res.status(400).json({ message: "Format ID tâche invalide." });

    const taskToDelete = await Task.findById(taskId).populate('project', 'chefProjet'); // Peuple projet pour ID et chef
    if (!taskToDelete) return res.status(404).json({ message: "Tâche non trouvée." });

    // Autorisation (Exemple)
    const isAssigned = req.user.id === taskToDelete.assignedUser.toString();
    const isChefProjet = req.user.id === taskToDelete.project.chefProjet.toString();
    const isAdmin = req.user.role === 'Admin';
    if (!isAssigned && !isChefProjet && !isAdmin) return res.status(403).json({ message: "Accès refusé." });

    // Préparer les opérations de suppression/mise à jour
    const operations = [
        Task.findByIdAndDelete(taskId),                         // Supprime la tâche
        TaskResource.deleteMany({ task: taskId }),              // Supprime les liens ressources
        Project.findByIdAndUpdate(taskToDelete.project._id, { $pull: { tasks: taskId } }), // Met à jour le projet
    ];

    // Ajouter la mise à jour de l'utilisateur assigné SI c'est un ChefProjet
    const assignedUser = await User.findById(taskToDelete.assignedUser);
    if (assignedUser && assignedUser.role === 'ChefProjet') {
        operations.push(ChefProjet.findByIdAndUpdate(taskToDelete.assignedUser, { $pull: { tasksAssigned: taskId } }));
    }

    // Exécuter toutes les opérations
    await Promise.all(operations);

    res.status(200).json({ message: "Tâche et ses associations supprimées avec succès." });

  } catch (error) {
    console.error(`Erreur deleteTask pour ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression.", error: error.message });
  }
};