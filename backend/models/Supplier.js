// models/Supplier.js
const mongoose = require("mongoose");
// Assurez-vous que le chemin vers User est correct
const User = require("./User"); // Ou "../models/User" ou le chemin approprié

const supplierSchema = new mongoose.Schema({
  // Correspond à 'contact' dans l'UML
  contact: {
    type: String,
    required: [true, "Le nom du contact est requis."],
    trim: true,
  },
  // Correspond à 'phone' dans l'UML
  phone: {
    type: String,
    required: [true, "Le numéro de téléphone est requis."],
    trim: true,
    // Vous pourriez ajouter une validation de format ici si nécessaire
  },
  // Correspond à 'adress' dans l'UML (nommé 'address' pour standardisation)
  address: {
    type: String,
    required: [true, "L'adresse est requise."],
    trim: true,
  },
  // Correspond à 'IList<Resource>: Resources' dans l'UML
  // Utile pour peupler les ressources fournies par ce Supplier
  // La relation principale est définie dans le modèle Resource (champ 'supplier')
  resourcesProvided: [{ // Nommé plus explicitement
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  }],
  // Ajoutez ici d'autres champs spécifiques aux fournisseurs si nécessaire
  // ex: numeroSIRET: String, conditionsPaiement: String
});

// Création du modèle Discriminator 'Supplier' basé sur User
const Supplier = User.discriminator("Supplier", supplierSchema);

module.exports = Supplier;