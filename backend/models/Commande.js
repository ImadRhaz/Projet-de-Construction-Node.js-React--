// models/Commande.js
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  name: { // Nom/identifiant unique pour cette commande
    type: String,
    required: [true, "Le nom/identifiant de la commande est requis."],
    trim: true,
  },
  type: { // Type de commande (optionnel)
    type: String,
    trim: true,
  },
  statutCmd: { // Statut global de la commande
    type: String,
    required: true,
    // Peut-être ajouter 'EnAttenteAssignation' ?
    enum: ['EnAttenteAssignation', 'Soumise', 'Partiellement Validée', 'Totalement Validée', 'Annulée'],
    default: 'EnAttenteAssignation', // <-- Valeur par défaut si pas de fournisseur
  },
  dateCmd: {
    type: Date,
    required: [true, "La date de commande est requise."],
    default: Date.now,
  },
  montantTotal: {
    type: Number,
    required: [true, "Le montant total est requis."],
    min: [0, "Le montant total ne peut pas être négatif."]
  },

  // --- Relations ---
  fournisseurId: { // ID du Fournisseur
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // --- MODIFICATION ICI ---
    required: false, // N'est plus obligatoire à la création
    default: null    // Valeur par défaut explicite
    // --- FIN MODIFICATION ---
  },
  projetId: { // ID du Projet
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, "La commande doit être associée à un projet."]
  },

}, {
  timestamps: true
});

// --- INDEX ---
commandeSchema.index({ projetId: 1 });
commandeSchema.index({ fournisseurId: 1 }); // Garder l'index même si non requis
commandeSchema.index({ statutCmd: 1 });

module.exports = mongoose.model('Commande', commandeSchema);