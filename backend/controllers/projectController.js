const Project = require("../models/Project")
const Task = require("../models/Task")


exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 })
    res.status(200).json(projects)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ message: "Projet non trouvé" })
    }

    const task =  await Task.find({projectId : project.id})
    project.count =  task.length;

    res.status(200).json(project)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


exports.createProject = async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget, status } = req.body

    
    if (!name || !description || !startDate || !endDate || !budget) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" })
    }

    const newProject = new Project({
      name,
      description,
      startDate,
      endDate,
      budget,
      status: status || "Planifié",
    })

    const savedProject = await newProject.save()
    res.status(201).json(savedProject)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}


exports.updateProject = async (req, res) => {
  try {
    const { name, description, startDate, endDate, budget, status } = req.body;

    // Validation des données
    if (!name || !description || !startDate || !endDate || !budget) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    // Conversion des dates si nécessaire
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validation que les dates sont valides
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Format de date invalide" });
    }

    // Validation que la date de fin est après la date de début
    if (end < start) {
      return res.status(400).json({ message: "La date de fin doit être après la date de début" });
    }

    // Validation du budget
    if (typeof budget !== 'number' || budget <= 0) {
      return res.status(400).json({ message: "Le budget doit être un nombre positif" });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        startDate: start,
        endDate: end,
        budget,
        status: status || "Planifié", // Valeur par défaut
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true } // Ajout de runValidators
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Projet non trouvé" });
    }

    res.status(200).json(updatedProject);
  } catch (error) {
    // Gestion spécifique des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Erreur de validation",
        details: error.errors 
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
   
    const tasksCount = await Task.countDocuments({ projectId: req.params.id })

    if (tasksCount > 0) {
      return res.status(400).json({ message: "Impossible de supprimer un projet avec des tâches associées" })
    }

    const deletedProject = await Project.findByIdAndDelete(req.params.id)

    if (!deletedProject) {
      return res.status(404).json({ message: "Projet non trouvé" })
    }

    res.status(200).json({ message: "Projet supprimé avec succès" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}