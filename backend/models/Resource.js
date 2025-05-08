const mongoose = require("mongoose");

const resourceStockSchema = new mongoose.Schema({
  productTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductType', // Assurez-vous que 'ProductType' est le nom exact de votre modèle de type de produit
    required: [true, "La référence au type de produit est requise."]
  },
  commandItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommandItem', // Assurez-vous que 'CommandItem' est le nom exact de votre modèle d'item de commande
    required: [true, "La référence à l'item de commande source est requise."],
    unique: true // Assure que chaque item de commande ne peut générer qu'une seule entrée de stock.
                 // Ceci crée implicitement un index unique sur commandItemId.
  },
  quantiteDisponible: {
    type: Number,
    required: [true, "La quantité disponible initiale est requise lors de la création."],
    min: [0, "La quantité disponible ne peut pas être négative."]
  },
  dateEntreeStock: {
    type: Date,
    // 'required' est pertinent si vous ne voulez pas de valeur par défaut et que l'utilisateur DOIT la fournir.
    // Si vous préférez que la date soit automatiquement mise à la création si non fournie, default: Date.now est bien.
    // D'après votre commentaire "La date d'entrée en stock est requise.", on garde 'required'.
    // Si vous voulez qu'elle soit mise par défaut à la création ET modifiable, gardez 'default' et enlevez 'required'.
    // Si elle doit être fournie explicitement :
    required: [true, "La date d'entrée en stock est requise."],
    // Si elle peut être mise par défaut à la création si non fournie :
    // default: Date.now
  }
}, {
  timestamps: true // Ajoute automatiquement les champs createdAt et updatedAt
});

// Index pour optimiser les recherches fréquentes par type de produit.
// L'index unique sur `commandItemId` est déjà créé par l'option `unique: true` dans la définition du champ.
// Il n'est donc pas nécessaire de le déclarer à nouveau ici.
resourceStockSchema.index({ productTypeId: 1 });

// Le nom du modèle "Resource" est utilisé ici.
// Si ce modèle représente spécifiquement un "Stock de Ressource" et que vous avez un autre concept
// plus général de "Ressource Catalogue" (comme ProductType), vous pourriez envisager
// de nommer ce modèle "ResourceStock" pour plus de clarté, mais "Resource" est fonctionnel.
module.exports = mongoose.model("Resource", resourceStockSchema);