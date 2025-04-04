// models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  // String: name
  name: {
    type: String,
    required: [true, "Le nom du projet est requis."],
    trim: true,
  },
  // String: description
  description: {
    type: String,
    required: [true, "La description du projet est requise."],
    trim: true,
  },
  // Date: startDate
  startDate: {
    type: Date,
    required: [true,"La date de début est requise."],
  },
  // Date: endDate
  endDate: {
    type: Date,
    required: [true, "La date de fin est requise."],
    // Optionnel : validation que endDate est après startDate
    validate: {
        validator: function(value) {
            // 'this' fait référence au document en cours de validation
            return !this.startDate || !value || value >= this.startDate;
        },
        message: 'La date de fin doit être supérieure ou égale à la date de début.'
    }
  },
  // Number: budget
  budget: {
    type: Number,
    required: [true, "Le budget est requis."],
    min: [0, "Le budget ne peut pas être négatif."]
  },
  // String: status
  status: {
    type: String,
    enum: ["Planifié", "En cours", "En attente", "Terminé", "Annulé"], // J'ai ajouté "Annulé" comme option possible
    default: "Planifié",
    required: [true, "Le statut du projet est requis."]
  },
  // User: UserId (Référence vers le modèle User)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Assurez-vous que le nom du modèle User est correct
    required: [true, "Un utilisateur créateur/responsable est requis."]
  },
  // IList<Tache>: Taches (Référence vers plusieurs Tâches)
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task" // Assurez-vous que le nom du modèle Task est correct
  }],

  // ---- MISE À JOUR POUR LA RELATION AVEC COMMANDE ----
  // IList<Commande>: Commandes (Référence vers plusieurs Commandes)
  // Basé sur la cardinalité '0..*' du côté de la classe Commande
  commandes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commande" // Référence au modèle Commande
  }]
  // ---------------------------------------------------

}, {
  // Ajoute automatiquement createdAt et updatedAt
  timestamps: true
});

// --- Index (Optionnel) ---
projectSchema.index({ user: 1 }); // Pour retrouver les projets d'un utilisateur
projectSchema.index({ status: 1 }); // Pour filtrer par statut


// La logique pre('save') pour updatedAt n'est plus nécessaire grâce à timestamps: true
/*
projectSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});
*/

module.exports = mongoose.model("Project", projectSchema);