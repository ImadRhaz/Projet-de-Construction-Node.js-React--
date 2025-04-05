// models/CommandeRessource.js
const mongoose = require('mongoose');

const commandeRessourceSchema = new mongoose.Schema({
  commande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true,
  },
  ressource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource',
    required: true,
  },
  quantiteCommandee: {
    type: Number,
    required: [true, "La quantité commandée est requise."],
    min: [1, "La quantité doit être d'au moins 1."]
  },

  // --- ATTRIBUT AJOUTÉ POUR LE STATUT DE VALIDATION FOURNISSEUR ---
  statutFournisseur: {
    type: String,
    // enum définit les valeurs possibles pour ce statut
    enum: ['En attente de validation', 'Validé par fournisseur', 'Refusé par fournisseur'],
    // default définit la valeur initiale quand une ligne est créée
    default: 'En attente de validation',
    required: [true, "Le statut de validation fournisseur est requis pour chaque ligne de commande."] // Rendre le champ obligatoire
  }
  // --------------------------------------------------------------------

}, {
  timestamps: true // createdAt et updatedAt pour cette ligne de commande
});

// Index
commandeRessourceSchema.index({ commande: 1, ressource: 1 }, { unique: true });
commandeRessourceSchema.index({ statutFournisseur: 1 }); // Ajouter un index sur le nouveau statut peut être utile

module.exports = mongoose.model('CommandeRessource', commandeRessourceSchema);