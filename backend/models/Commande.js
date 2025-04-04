// models/Commande.js
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  // String: name
  name: {
    type: String,
    required: [true, "Le nom de la commande est requis."],
    trim: true,
  },
  // String: type
  type: {
    type: String,
    trim: true,
  },
  // String: Statut
  statut: {
    type: String,
    required: [true, "Le statut de la commande est requis."],
    enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'],
    default: 'En attente',
  },
  // Date: DateCmd
  dateCmd: {
    type: Date,
    required: [true, "La date de commande est requise."],
    default: Date.now,
  },
  // Nombre: MontantTotal
  montantTotal: {
    type: Number,
    required: [true, "Le montant total est requis."],
    min: [0, "Le montant total ne peut pas être négatif."]
  },
  // Fournisseur: FournisseurId
  supplier: { // J'ai gardé 'supplier' comme dans votre code précédent
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier', // Assurez-vous que le modèle Fournisseur s'appelle 'Supplier'
    required: [true, "Le fournisseur est requis."],
  },
  // Projet: ProjetId (Relation 1 Commande -> 1 Projet)
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project', // Nom du modèle Project
    required: [true, "La commande doit être associée à un projet."]
  },

  // --- AJOUT DE LA RELATION AVEC USER ---
  // User: UserId (Relation 1 Commande -> 1 User)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence au modèle User que vous avez fourni
    required: [true, "L'utilisateur qui passe la commande est requis."]
  },
  // ------------------------------------

  // !! PAS DE CHAMP resources: [...] ICI !!
  // La liaison avec les ressources se fait via CommandeRessource

}, {
  timestamps: true // Ajoute createdAt et updatedAt
});

// --- INDEX ---
commandeSchema.index({ projet: 1 });
commandeSchema.index({ supplier: 1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ user: 1 }); // Ajout d'un index pour les recherches par utilisateur


module.exports = mongoose.model('Commande', commandeSchema);