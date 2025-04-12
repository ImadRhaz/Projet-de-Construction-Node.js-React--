const mongoose = require("mongoose");

const resourceStockSchema = new mongoose.Schema({
  productTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType',
    required: [true, "La référence au type de produit est requise."]
  },
  commandItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommandItem',
    required: [true, "La référence à l'item de commande source est requise."],
    unique: true // Gardez UNIQUEMENT cette déclaration d'unicité
  },
  quantiteDisponible: {
    type: Number,
    required: [true, "La quantité initiale disponible est requise lors de la création."],
    min: [0, "La quantité disponible ne peut pas être négative."]
  },
  dateEntreeStock: {
    type: Date,
    required: [true, "La date d'entrée en stock est requise."],
    default: Date.now
  }
}, {
  timestamps: true
});

// Index - SUPPRIMEZ la ligne suivante car l'unicité est déjà gérée dans la définition du champ
// resourceStockSchema.index({ commandItemId: 1 }, { unique: true }); 

// Gardez uniquement cet index pour les recherches par type de produit
resourceStockSchema.index({ productTypeId: 1 });

module.exports = mongoose.model("Resource", resourceStockSchema);