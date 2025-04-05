// models/Task.js
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, "La description de la tâche est requise."],
        trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(value) {
            return !this.startDate || !value || value >= this.startDate;
        },
        message: 'La date de fin de la tâche doit être postérieure ou égale à la date de début.'
      }
    },
    status: {
        type: String,
        enum: ["À faire", "En cours", "Terminé", "En retard", "Bloqué"],
        default: "À faire",
        required: [true, "Le statut de la tâche est requis."]
    },
    // --- Relations ---
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: [true, "La tâche doit être associée à un projet."]
    },
    assignedUser: {  // Car Meme Admin ou employé peut creer une Tache
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "La tâche doit être assignée à un utilisateur."]
    },
    // --- Champ Virtuel pour la Relation avec TaskResource ---
    // Ce champ permet de "peupler" les ressources associées à cette tâche.
    // Il correspond à la relation 1 vers 0..* partant de Tache vers TacheResource.

}, {
    timestamps: true, // Gère createdAt et updatedAt
    // Important pour que les champs virtuels soient inclus dans les sorties JSON/objet
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Définition du champ virtuel 'taskResources'
taskSchema.virtual('taskResources', {
    ref: 'TaskResource',      // Le modèle à utiliser pour le peuplement
    localField: '_id',        // Le champ dans Task (_id)
    foreignField: 'task'      // Le champ dans TaskResource qui référence Task (nommé 'task')
});


// --- Index ---
taskSchema.index({ project: 1 });
taskSchema.index({ assignedUser: 1 });
taskSchema.index({ status: 1 });

module.exports = mongoose.model("Task", taskSchema);