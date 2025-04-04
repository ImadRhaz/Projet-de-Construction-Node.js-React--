// models/CommandeRessource.js
const mongoose = require('mongoose');

const commandeRessourceSchema = new mongoose.Schema({
  // String: CommandeId (Référence à la Commande)
  commande: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commande', // Nom du modèle Commande
    required: true,
  },
  // String: RessourceId (Référence à la Ressource)
  ressource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ressource', // Nom du modèle Ressource
    required: true,
  },
  // Number: quantite (La quantité de CETTE ressource dans CETTE commande)
  quantiteCommandee: { // Renommé pour clarté
    type: Number,
    required: [true, "La quantité commandée pour cette ressource est requise."],
    min: [1, "La quantité commandée doit être d'au moins 1."] // Une quantité de 0 n'a pas de sens ici
  }
 

}, {
  timestamps: true // Utile pour savoir quand une ressource a été ajoutée/modifiée dans une commande
});

// Index composé pour assurer l'unicité (une ressource ne peut pas être deux fois dans la même commande)
// et accélérer les recherches par commande + ressource.
commandeRessourceSchema.index({ commande: 1, ressource: 1 }, { unique: true });

// Index simples pour accélérer les recherches par commande ou par ressource
commandeRessourceSchema.index({ commande: 1 });
commandeRessourceSchema.index({ ressource: 1 });


module.exports = mongoose.model('CommandeRessource', commandeRessourceSchema);