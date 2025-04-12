// models/ProductType.js - RAPPEL (doit exister)
const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Le nom du type de produit est requis."],
    trim: true,
    unique: true // Important pour éviter les doublons lors de l'upload
  },
  unit: {
    type: String,
    required: [true, "L'unité de mesure est requise."],
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
}, {
  timestamps: true
});

productTypeSchema.index({ category: 1 });

module.exports = mongoose.model('ProductType', productTypeSchema);