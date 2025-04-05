// models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom du projet est requis."],
    trim: true,
  },
  description: {
    type: String,
    required: [true, "La description du projet est requise."],
    trim: true,
  },
  startDate: {
    type: Date,
    required: [true,"La date de début est requise."],
  },
  endDate: {
    type: Date,
    required: [true, "La date de fin est requise."],
    validate: {
        validator: function(value) {
            // La date de fin doit être >= à la date de début (si les deux sont définies)
            return !this.startDate || !value || value >= this.startDate;
        },
        message: 'La date de fin doit être postérieure ou égale à la date de début.'
    }
  },
  budget: {
    type: Number,
    required: [true, "Le budget est requis."],
    min: [0, "Le budget ne peut pas être négatif."]
  },
  status: {
    type: String,
    enum: ["Planifié", "En cours", "En attente", "Terminé", "Annulé"],
    default: "Planifié",
    required: [true, "Le statut du projet est requis."]
  },
  // --- Relations ---
  // Relation 1-1 avec ChefProjet (via le modèle User)
  // Correspond à 'Chef_ProjetId' dans l'UML
  chefProjet: { // Nommé 'chefProjet' pour la clarté
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence TOUJOURS le modèle de base quand on utilise des discriminateurs
    required: [true, "Un chef de projet est requis pour le projet."]
    // Note: Pour s'assurer que c'est BIEN un ChefProjet, la logique applicative
    // (ex: lors de la création/mise à jour) devra vérifier le champ 'role' de l'User référencé.
  },
  // Relation 1-N avec Tache (Liste des tâches du projet)
  // Correspond à 'IList<Tache>: Taches' dans l'UML
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task" // Référence le modèle Task (Tache)
  }],
  // Relation 1-N avec Commande (Liste des commandes liées au projet)
  // Correspond à 'IList<Commande>: Commandes' dans l'UML
  commandes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Commande" // Assurez-vous d'avoir un modèle Commande
  }]

}, {
  // Ajoute automatiquement les champs createdAt et updatedAt
  timestamps: true
});

// --- Index (Optionnels mais recommandés pour les requêtes fréquentes) ---
projectSchema.index({ chefProjet: 1 }); // Pour trouver les projets d'un chef
projectSchema.index({ status: 1 });     // Pour filtrer par statut
projectSchema.index({ name: 1 });       // Pour rechercher par nom

module.exports = mongoose.model("Project", projectSchema);