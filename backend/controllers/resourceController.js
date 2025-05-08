// controllers/resourceController.js

const mongoose = require("mongoose");
const Resource = require("../models/Resource"); // Votre modèle ResourceStock
const ProductType = require("../models/ProductType"); // Modèle pour les types de produits (catalogue)
const CommandItem = require("../models/CommandItem"); // Modèle pour les items de commande
const TaskResource = require("../models/TaskResource"); // Pour vérifier les dépendances d'utilisation
// const User = require("../models/User"); // Utile pour req.user si non déjà globalement disponible

// --- Helper function to format resource response ---
const formatResourceResponse = (stockItem) => {
  if (!stockItem) return null;

  // Assurez-vous que productTypeId est bien un objet peuplé avant d'accéder à ses propriétés
  const productType = stockItem.productTypeId && typeof stockItem.productTypeId === 'object'
                      ? stockItem.productTypeId
                      : {};

  return {
    _id: stockItem._id.toString(),
    name: productType.name,
    type: productType.category, // 'category' dans ProductType, 'type' dans Swagger
    quantityAvailable: stockItem.quantiteDisponible,
    unit: productType.unite, // 'unite' dans ProductType, 'unit' dans Swagger
    productTypeId: productType._id ? productType._id.toString() : (stockItem.productTypeId ? stockItem.productTypeId.toString() : undefined),
    commandItemId: stockItem.commandItemId ? stockItem.commandItemId.toString() : undefined,
    dateEntreeStock: stockItem.dateEntreeStock,
    createdAt: stockItem.createdAt,
    updatedAt: stockItem.updatedAt,
  };
};

// --- GET ALL RESOURCES (Stock Entries) ---
exports.getAllResources = async (req, res) => {
  try {
    const stockItems = await Resource.find()
      .populate({
        path: 'productTypeId',
        select: 'name category unite _id', // Ajout de _id pour le retour dans formatResourceResponse
      })
      .sort({ createdAt: -1 });

    const formattedResources = stockItems.map(formatResourceResponse);
    res.status(200).json(formattedResources);
  } catch (error) {
    console.error("Erreur getAllResources:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des entrées de stock.", error: error.message });
  }
};

// --- GET RESOURCE BY ID (Stock Entry by ID) ---
exports.getResourceById = async (req, res) => {
  try {
    const resourceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: "Format de l'ID de l'entrée de stock invalide." });
    }

    const stockItem = await Resource.findById(resourceId)
      .populate({
        path: 'productTypeId',
        select: 'name category unite _id', // Ajout de _id
      });

    if (!stockItem) {
      return res.status(404).json({ message: "Entrée de stock non trouvée." });
    }

    res.status(200).json(formatResourceResponse(stockItem));
  } catch (error) {
    console.error(`Erreur getResourceById pour ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération de l'entrée de stock.", error: error.message });
  }
};

// --- CREATE RESOURCE (Stock Entry) ---
exports.createResource = async (req, res) => {
  const {
    name, // Pour ProductType
    type, // Pour ProductType (category)
    unit, // Pour ProductType (unite)
    productTypeId, // Optionnel: ID d'un ProductType existant
    commandItemId,
    quantityAvailable,
    dateEntreeStock
  } = req.body;

  const userId = req.user?.id; // Utilisateur authentifié

  // Validation d'authentification et autorisation (exemple)
  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non authentifié." });
  }
  // Exemple: Seul un Admin ou Supplier (ou autre rôle pertinent) peut créer des entrées de stock
  if (!['Admin', 'Supplier', 'ProjectManager'].includes(req.user.role)) { // Adaptez les rôles
      return res.status(403).json({ message: "Accès refusé. Rôle insuffisant pour créer une entrée de stock." });
  }

  // Validation des champs requis pour ResourceStock
  if (!commandItemId || quantityAvailable === undefined ) { // dateEntreeStock peut avoir une valeur par défaut
    return res.status(400).json({ message: "Les champs 'commandItemId' et 'quantityAvailable' sont requis." });
  }
  if (!mongoose.Types.ObjectId.isValid(commandItemId)) {
    return res.status(400).json({ message: "Format de 'commandItemId' invalide." });
  }
  // Vérifier si commandItem existe
  const commandItemExists = await CommandItem.findById(commandItemId);
  if (!commandItemExists) {
      return res.status(400).json({ message: `L'item de commande avec l'ID '${commandItemId}' n'existe pas.` });
  }

  let finalProductTypeId = productTypeId;

  try {
    // 1. Gérer ProductType: utiliser existant ou créer/trouver
    if (!finalProductTypeId) {
      if (!name || !type || !unit) {
        return res.status(400).json({ message: "Si 'productTypeId' n'est pas fourni, les champs 'name', 'type', et 'unit' sont requis pour définir le type de produit." });
      }
      // Essayer de trouver un ProductType existant ou en créer un nouveau
      // Utilisation de findOneAndUpdate avec upsert pour la création atomique si nécessaire, ou une approche en deux étapes.
      let existingProductType = await ProductType.findOne({ name, category: type, unite: unit });
      if (!existingProductType) {
        // Ici, vous pourriez vouloir une autorisation spécifique pour créer de nouveaux ProductTypes
        console.log(`Création d'un nouveau ProductType: ${name}, ${type}, ${unit}`);
        existingProductType = new ProductType({ name, category: type, unite: unit /* , createdBy: userId */ });
        await existingProductType.save();
      }
      finalProductTypeId = existingProductType._id;
    } else {
      if (!mongoose.Types.ObjectId.isValid(finalProductTypeId)) {
        return res.status(400).json({ message: "Format de 'productTypeId' invalide." });
      }
      const ptExists = await ProductType.findById(finalProductTypeId);
      if (!ptExists) {
          return res.status(404).json({ message: `Le type de produit avec l'ID '${finalProductTypeId}' n'a pas été trouvé.` });
      }
    }

    // 2. Créer la nouvelle entrée de stock (Resource)
    const newResourceStock = new Resource({
      productTypeId: finalProductTypeId,
      commandItemId,
      quantiteDisponible: Number(quantityAvailable),
      dateEntreeStock: dateEntreeStock ? new Date(dateEntreeStock) : Date.now(),
      // createdBy: userId, // Si vous avez ce champ dans resourceStockSchema
    });

    // 3. Sauvegarder l'entrée de stock
    let savedResourceStock = await newResourceStock.save();

    // 4. Renvoyer l'entrée de stock créée et formatée (populée)
    savedResourceStock = await Resource.findById(savedResourceStock._id)
                                       .populate({ path: 'productTypeId', select: 'name category unite _id' });

    res.status(201).json(formatResourceResponse(savedResourceStock));

  } catch (error) {
    console.error("Erreur createResource:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      if (error.errors.commandItemId && error.errors.commandItemId.kind === 'unique') {
           return res.status(409).json({ message: "Conflit: Une entrée de stock existe déjà pour cet item de commande."});
      }
      return res.status(400).json({ message: "Erreur de validation des données.", details: errors });
    }
    if (error.code === 11000 && error.keyPattern) { // Erreur d'index unique
        if (error.keyPattern.commandItemId) {
             return res.status(409).json({ message: "Conflit: Une entrée de stock existe déjà pour cet item de commande." });
        }
        // Si ProductType a un nom unique (ou autre champ unique)
        if (error.message.includes('producttypes') && error.keyPattern.name) {
            return res.status(409).json({ message: `Conflit: Un type de produit avec le nom '${name}' (et même catégorie/unité) existe déjà.` });
        }
    }
    res.status(500).json({ message: "Erreur serveur lors de la création de l'entrée de stock.", error: error.message });
  }
};

// --- UPDATE RESOURCE (Stock Entry) ---
exports.updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id; // ID de l'entrée de stock (ResourceStock)
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: "Format de l'ID de l'entrée de stock invalide." });
    }

    // Champs modifiables pour une entrée de stock (ResourceUpdateInput)
    const { quantiteDisponible, dateEntreeStock } = req.body;
    const userId = req.user?.id; // Utilisateur authentifié

    const updateData = {};
    if (quantiteDisponible !== undefined) {
      const numQuantity = Number(quantiteDisponible);
      if (isNaN(numQuantity) || numQuantity < 0) {
        return res.status(400).json({ message: "La quantité disponible doit être un nombre positif ou zéro." });
      }
      updateData.quantiteDisponible = numQuantity;
    }
    if (dateEntreeStock !== undefined) {
      if (dateEntreeStock === null || dateEntreeStock === '') { // Permet de supprimer la date si besoin
          updateData.dateEntreeStock = null;
      } else {
          updateData.dateEntreeStock = new Date(dateEntreeStock);
          if (isNaN(updateData.dateEntreeStock.getTime())) {
              return res.status(400).json({ message: "Format de dateEntreeStock invalide." });
          }
      }
    }
    // updateData.updatedBy = userId; // Si vous tracez qui a mis à jour (ajouter au schéma)

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Aucun champ à mettre à jour fourni." });
    }

    // 1. Trouver l'entrée de stock pour vérifier l'autorisation (si nécessaire)
    const stockToUpdate = await Resource.findById(resourceId);
    if (!stockToUpdate) {
      return res.status(404).json({ message: "Entrée de stock non trouvée." });
    }

    // 2. Vérification d'autorisation (exemple: Admin ou rôle spécifique)
    // Adaptez cette logique. Qui peut modifier une entrée de stock ?
    if (!['Admin', 'InventoryManager'].includes(req.user.role)) { // Adaptez les rôles
        // Vous pourriez vérifier si l'utilisateur est lié à la commande d'origine, etc.
        // return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à modifier cette entrée de stock." });
    }

    // 3. Effectuer la mise à jour
    let updatedStockItem = await Resource.findByIdAndUpdate(
      resourceId,
      { $set: updateData },
      { new: true, runValidators: true } // runValidators est important pour les min/max, etc.
    ).populate({ path: 'productTypeId', select: 'name category unite _id' });

    if (!updatedStockItem) { // Devrait être redondant car findById a été fait avant
      return res.status(404).json({ message: "Entrée de stock non trouvée après tentative de mise à jour." });
    }

    res.status(200).json(formatResourceResponse(updatedStockItem));

  } catch (error) {
    console.error(`Erreur updateResource pour ID ${req.params.id}:`, error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      return res.status(400).json({ message: "Erreur de validation.", details: errors });
    }
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de l'entrée de stock.", error: error.message });
  }
};

// --- DELETE RESOURCE (Stock Entry) ---
exports.deleteResource = async (req, res) => {
  try {
    const resourceId = req.params.id; // ID de l'entrée de stock
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: "Format de l'ID de l'entrée de stock invalide." });
    }

    // 1. Trouver l'entrée de stock pour s'assurer qu'elle existe avant de vérifier les dépendances
    const stockToDelete = await Resource.findById(resourceId);
    if (!stockToDelete) {
      return res.status(404).json({ message: "Entrée de stock non trouvée." });
    }

    // 2. Vérification d'autorisation (exemple: Admin ou rôle spécifique)
    // Adaptez cette logique. Qui peut supprimer une entrée de stock ?
     if (!['Admin', 'InventoryManager'].includes(req.user.role)) { // Adaptez les rôles
        // return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à supprimer cette entrée de stock." });
    }

    // 3. Vérifier si l'entrée de stock est utilisée dans une liaison TaskResource
    //    Le champ dans TaskResource qui référence ResourceStock doit être `resourceStockId` ou similaire.
    //    Adaptez `resource: resourceId` au nom de champ correct dans votre modèle TaskResource.
    //    Si votre modèle Resource est bien celui des stocks, TaskResource devrait référencer _id de Resource.
    const usageInTasks = await TaskResource.findOne({ resource: resourceId }); // ou le nom correct du champ
    if (usageInTasks) {
      return res.status(400).json({
        message: `Impossible de supprimer: cette entrée de stock est liée à au moins une tâche (ID tâche: ${usageInTasks.task}). Détachez-la d'abord.`,
        // Vous pourriez vouloir retourner plus de détails sur la tâche si nécessaire
      });
    }
    // Ajouter ici d'autres vérifications de dépendances si nécessaire (ex: si elle est dans une livraison en cours, etc.)


    // 4. Supprimer l'entrée de stock
    await Resource.findByIdAndDelete(resourceId);

    // 5. Logique post-suppression (si applicable)
    // Par exemple, si la suppression d'une entrée de stock doit déclencher une notification ou ajuster
    // un total agrégé quelque part (bien que ce soit généralement géré par des calculs dynamiques).

    res.status(200).json({ message: "Entrée de stock supprimée avec succès." });

  } catch (error) {
    console.error(`Erreur deleteResource pour ID ${req.params.id}:`, error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de l'entrée de stock.", error: error.message });
  }
};