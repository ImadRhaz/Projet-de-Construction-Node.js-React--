// models/Commande.js
const mongoose = require('mongoose');

const commandeSchema = new mongoose.Schema({
  // Correspond à 'name' dans l'UML
  name: {
    type: String,
    required: [true, "Le nom/identifiant de la commande est requis."],
    trim: true,
  },
  // Correspond à 'type' dans l'UML
  type: {
    type: String,
    trim: true,
    // Ex: "Achat Matériel", "Prestation Service", etc.
  },
  // Correspond à 'Statut' dans l'UML (nommé 'statut' en minuscules)
  statut: {
    type: String,
    required: [true, "Le statut de la commande est requis."],
    enum: ['En attente', 'Validée', 'Refusée', 'En cours de livraison', 'Livrée', 'Annulée'],
    default: 'En attente',
  },
  // Correspond à 'DateCmd' dans l'UML (nommé 'dateCmd')
  dateCmd: {
    type: Date,
    required: [true, "La date de commande est requise."],
    default: Date.now,
  },
  // Correspond à 'MontantTotal' dans l'UML (nommé 'montantTotal')
  montantTotal: {
    type: Number,
    required: [true, "Le montant total est requis."],
    min: [0, "Le montant total ne peut pas être négatif."]
  },

  // --- Relations ---

  // Correspond à 'Fournisseur: FournisseurId' dans l'UML
  supplier: { // Nom du champ
    type: mongoose.Schema.Types.ObjectId,
    // IMPORTANT: Référence le modèle de base 'User' car Supplier est un discriminateur
    ref: 'User',
    required: [true, "Le fournisseur (utilisateur avec rôle Supplier) est requis."],
    // Rappel: La logique applicative doit vérifier que le rôle de cet User est bien 'Supplier'.
  },
  // Correspond à 'Projet: ProjetId' dans l'UML
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project', // Référence le modèle Project
    required: [true, "La commande doit être associée à un projet."]
  },

  // Le champ 'user' a été retiré car non présent dans le diagramme UML de Commande

}, {
  timestamps: true // Ajoute createdAt et updatedAt
});

// --- INDEX ---
commandeSchema.index({ projet: 1 });
commandeSchema.index({ supplier: 1 }); // Index sur la référence User (qui sera un Supplier)
commandeSchema.index({ statut: 1 });
// L'index sur 'user' a été retiré

module.exports = mongoose.model('Commande', commandeSchema);