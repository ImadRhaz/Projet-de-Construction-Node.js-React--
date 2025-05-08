// models/Commande.js
const mongoose = require('mongoose');

// --- Schéma Principal de la Commande (Simplifié) ---
const commandeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Le nom ou identifiant de la commande est requis."],
        trim: true,
        // unique: true, // Décommentez si nécessaire
    },
    type: { // Catégorie ou type général de la commande (optionnel)
        type: String,
        trim: true,
    },
    statutCmd: { // Le statut global de la commande
        type: String,
        required: true,
        // L'enum reflète les étapes possibles après la création initiale
        enum: {
            values: ['EnAttenteAssignation', 'EnAttenteValidationFournisseur', 'ValideeFournisseur'],
            message: 'Le statut "{VALUE}" n\'est pas supporté.'
        },
        // La commande est créée par le ChefProjet sans fournisseur au début
        default: 'EnAttenteAssignation',
    },
    dateCmd: { // Date de création de la commande
        type: Date,
        required: [true, "La date de commande est requise."],
        default: Date.now,
    },
    montantTotal: { // Montant total calculé ou fourni lors de la création
        type: Number,
        required: [true, "Le montant total est requis."],
        min: [0, "Le montant total ne peut pas être négatif."]
    },

    // --- Relations ---
    fournisseurId: { // Le fournisseur qui sera assigné plus tard
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence le modèle User (qui peut être un Supplier via discriminateur)
        default: null // Commence sans fournisseur
    },
    projetId: { // Le projet associé
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project', // Référence le modèle Project
        required: [true, "La commande doit être associée à un projet."]
    },

    // --- PAS DE CHAMPS itemsDemandes ou commandItemsIds ---
    // La liaison avec les items se fait via le champ 'commandeId'
    // présent dans chaque document du modèle 'CommandItem'.

}, {
    timestamps: true // Ajoute automatiquement les champs `createdAt` et `updatedAt`
});

// --- INDEX (pour optimiser les recherches courantes) ---
commandeSchema.index({ projetId: 1 });       // Recherche par projet
commandeSchema.index({ fournisseurId: 1 }); // Recherche par fournisseur (même si initialement null)
commandeSchema.index({ statutCmd: 1 });      // Recherche par statut

// Création et exportation du modèle Mongoose basé sur le schéma
module.exports = mongoose.model('Commande', commandeSchema);