// models/Commande.js
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom/identifiant de la commande est requis."],
    trim: true,
  },
  type: {
    type: String,
    trim: true,
  },
  statut: {
    type: String,
    required: [true, "Le statut de la commande est requis."],
    enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'],
    default: 'En attente',
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

  supplier: { // Nom du champ
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence 'User'
    // >>> PAS REQUIS À LA CRÉATION <<<
    required: false, // Important pour cette logique
    default: null    // Valeur par défaut explicite
  },
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project', // Référence le modèle Project
    required: [true, "La commande doit être associée à un projet."]
  },

}, {
  timestamps: true // Ajoute createdAt et updatedAt
});

// --- INDEX ---
commandeSchema.index({ projet: 1 });
commandeSchema.index({ supplier: 1 }); // Index sur supplier (qui peut être null)
commandeSchema.index({ statut: 1 });

module.exports = mongoose.model('Commande', commandeSchema);