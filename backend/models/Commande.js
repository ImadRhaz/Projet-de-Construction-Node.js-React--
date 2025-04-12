// models/Commande.js
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  name: { // Nom/identifiant unique pour cette commande
    type: String,
    required: [true, "Le nom/identifiant de la commande est requis."],
    trim: true,
    // unique: true, // Envisagez si le nom doit être unique
  },
  type: { // Type de commande (optionnel)
    type: String,
    trim: true,
  },
  statutCmd: { // Renommé 'statut' en 'statutCmd' pour clarté
    type: String,
    required: true,
    enum: ['Soumise', 'Partiellement Validée', 'Totalement Validée', 'Annulée', /* autres statuts globaux */],
    default: 'Soumise',
  },
  dateCmd: {
    type: Date,
    required: [true, "La date de commande est requise."],
    default: Date.now,
  },
  montantTotal: { // Pourrait être calculé dynamiquement
    type: Number,
    required: [true, "Le montant total est requis."], // Ou calculé plus tard
    min: [0, "Le montant total ne peut pas être négatif."]
  },

  // --- Relations ---
  fournisseurId: { // Renommé pour clarté (correspond à FournisseurId dans UML)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence User (qui sera un Fournisseur via discriminateur)
    required: [true, "La commande doit être associée à un fournisseur."]
  },
  projetId: { // Renommé pour clarté (correspond à ProjetId dans UML)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, "La commande doit être associée à un projet."]
  },
  // La liste des CommandItem est obtenue via une requête sur CommandItem avec ce CommandeId

}, {
  timestamps: true // Ajoute createdAt et updatedAt
});

// --- INDEX ---
commandeSchema.index({ projetId: 1 });
commandeSchema.index({ fournisseurId: 1 });
commandeSchema.index({ statutCmd: 1 });

module.exports = mongoose.model('Commande', commandeSchema);