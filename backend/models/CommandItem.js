const mongoose = require('mongoose');

const commandItemSchema = new mongoose.Schema({
  commandeId: { // Lien vers la commande globale
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande',
    required: true,
  },
  productTypeId: { // Lien vers le TYPE de produit commandé (ESSENTIEL)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType', // Référence le nouveau modèle ProductType
    required: true,
  },
  quantiteCommandee: { // Renommé 'quantite' pour clarté
    type: Number,
    required: [true, "La quantité commandée est requise."],
    min: [1, "La quantité doit être d'au moins 1."]
  },
  statutLigne: { // Renommé 'Statut' pour clarté (Correspond au statutFournisseur de votre code précédent)
    type: String,
    enum: ['Soumis', 'ValidéFournisseur', 'Annulé'], // Statuts possibles pour CETTE ligne
    default: 'Soumis',
    required: true
  },
  // Optionnel mais recommandé :
  prixUnitaire: {
     type: Number,
     required: false // Ou true si toujours connu à la commande
  }
  // createdAt de l'UML est géré par timestamps

}, {
  timestamps: true // Gère createdAt et updatedAt pour cette ligne
});

// Index
// Assure qu'on ne commande pas deux fois le même type de produit DANS LA MÊME commande
// (Adaptez si ce n'est pas une règle métier voulue)
commandItemSchema.index({ commandeId: 1, productTypeId: 1 }, { unique: true });
commandItemSchema.index({ statutLigne: 1 });

module.exports = mongoose.model('CommandItem', commandItemSchema);