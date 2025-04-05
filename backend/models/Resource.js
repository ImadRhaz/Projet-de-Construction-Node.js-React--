// models/Resource.js
const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom de la ressource est requis."],
    trim: true,
    unique: true // <-- GARDEZ CECI. Crée automatiquement un index unique sur 'name'.
  },
  type: {
    type: String,
    enum: ["Matériau", "Équipement", "Personnel", "Logiciel", "Autre"],
    required: [true, "Le type de la ressource est requis."],
  },
  quantityAvailable: {
    type: Number,
    required: [true, "La quantité disponible est requise."],
    min: [0, "La quantité disponible ne peut pas être négative."]
  },
  unit: {
    type: String,
    required: [true, "L'unité de mesure est requise."],
    trim: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Référence le modèle de base User
    required: [true, "Le fournisseur (utilisateur avec rôle Supplier) est requis."]
    // Rappel: La logique applicative doit vérifier le rôle.
  },
}, {
  timestamps: true // Gère createdAt et updatedAt
});

// --- Index ---
// L'index sur 'name' est automatiquement créé par 'unique: true' ci-dessus.

// Vous pouvez garder les autres index s'ils sont utiles pour vos requêtes
resourceSchema.index({ type: 1 });
resourceSchema.index({ supplier: 1 }); // Index sur la référence User (qui sera un Supplier)

module.exports = mongoose.model("Resource", resourceSchema);