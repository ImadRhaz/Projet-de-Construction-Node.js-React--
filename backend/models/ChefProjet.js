// models/ChefProjet.js
const mongoose = require("mongoose");
const User = require("./User"); // Importer le modèle de base User

// Schéma pour les champs SPÉCIFIQUES au ChefProjet
const chefProjetSchema = new mongoose.Schema({
  // Ces listes représentent les relations '0..*' vues depuis le ChefProjet
  // Utiles pour des requêtes comme: "Donne-moi tous les projets de ce chef"
  projectsManaged: [{ // Renommé pour plus de clarté (au lieu de juste 'projects')
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  }],
  tasksAssigned: [{ // Renommé pour plus de clarté (au lieu de juste 'tasks')
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task" // Assurez-vous que le modèle Tache est bien exporté comme "Task"
  }],
  // Ajoutez ici d'autres champs spécifiques SEULEMENT aux Chefs de Projet si nécessaire
  // Par exemple: bureau: String, niveauCertification: String etc.
});

// Création du modèle Discriminator 'ChefProjet'
// Il hérite de tous les champs de User et ajoute ceux de chefProjetSchema.
// Mongoose s'assurera que les documents créés via ce modèle auront role='ChefProjet'
const ChefProjet = User.discriminator("ChefProjet", chefProjetSchema);

module.exports = ChefProjet;