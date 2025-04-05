// controllers/resourceController.js

const mongoose = require("mongoose");
const Resource = require("../models/Resource");
const TaskResource = require("../models/TaskResource"); // Pour vérifier les dépendances
const User = require("../models/User"); // Pour peupler et vérifier rôles
const Supplier = require("../models/Supplier"); // Pour mettre à jour resourcesProvided

// --- GET ALL RESOURCES ---
exports.getAllResources = async (req, res) => {
  try {
    const resources = await Resource.find()
      // Populer le champ 'supplier' (qui référence User)
      // Sélectionner les champs utiles de l'utilisateur/fournisseur
      .populate('supplier', 'username email role contact phone')
      .sort({ createdAt: -1 });

    res.status(200).json(resources);
  } catch (error) {
    console.error("Erreur getAllResources:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des ressources.", error: error.message });
  }
};

// --- GET RESOURCE BY ID ---
exports.getResourceById = async (req, res) => {
  try {
    const resourceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ message: "Format de l'ID de ressource invalide." });
    }

    const resource = await Resource.findById(resourceId)
      .populate('supplier', 'username email role contact phone'); // Peuple le fournisseur

    if (!resource) {
      return res.status(404).json({ message: "Ressource non trouvée" });
    }

    res.status(200).json(resource);
  } catch (error) {
    console.error(`Erreur getResourceById pour ID ${req.params.id}:`, error);
    // CastError est géré par isValidObjectId
    res.status(500).json({ message: "Erreur serveur lors de la récupération de la ressource.", error: error.message });
  }
};

// --- CREATE RESOURCE (par un Supplier authentifié) ---
exports.createResource = async (req, res) => {
  // 1. Récupérer les données du body (SAUF supplierId)
  const { name, type, quantityAvailable, unit } = req.body; // Utilise quantityAvailable
  const supplierId = req.user?.id; // ID de l'utilisateur authentifié

  // 2. Validation d'entrée et d'authentification/autorisation
  if (!supplierId) {
    return res.status(401).json({ message: "Utilisateur non authentifié." });
  }
  // Vérifier si l'utilisateur authentifié est bien un Supplier
  if (req.user.role !== 'Supplier') {
      return res.status(403).json({ message: "Accès refusé. Seul un fournisseur (Supplier) peut créer une ressource." });
  }
  // Mongoose gérera les champs requis (name, type, quantityAvailable, unit) via la validation

  try {
    // 3. Créer la nouvelle ressource en assignant le supplier actuel
    const newResource = new Resource({
      name,
      type,
      quantityAvailable: Number(quantityAvailable), // S'assurer que c'est un nombre
      unit,
      supplier: supplierId // <-- L'ID vient du token de l'utilisateur Supplier
    });

    // 4. Sauvegarder la ressource (Mongoose valide ici)
    const savedResource = await newResource.save();

    // 5. (Optionnel mais recommandé) Mettre à jour la liste du fournisseur
    await Supplier.findByIdAndUpdate(supplierId, { $push: { resourcesProvided: savedResource._id } });

    // 6. Renvoyer la ressource créée (populée)
    const resourceResponse = await Resource.findById(savedResource._id)
                                       .populate('supplier', 'username email contact phone');
    res.status(201).json(resourceResponse);

  } catch (error) {
    console.error("Erreur createResource:", error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      // Vérifier spécifiquement l'erreur d'unicité sur 'name'
      if (error.errors.name && error.errors.name.kind === 'unique') {
           return res.status(409).json({ message: "Erreur de validation.", details: [`Le nom de ressource '${req.body.name}' existe déjà.`] });
      }
      return res.status(400).json({ message: "Erreur de validation des données de la ressource.", details: errors });
    }
     if (error.name === 'CastError') { // Si quantityAvailable n'est pas un nombre valide
        return res.status(400).json({ message: "Erreur de validation.", details: [`Format invalide pour le champ '${error.path}'.`] });
    }
    // Gérer l'erreur d'index unique si findByIdAndUpdate échoue (rare mais possible)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
       return res.status(409).json({ message: "Erreur: Le nom de ressource existe déjà.", details: error.message });
    }
    res.status(500).json({ message: "Erreur serveur lors de la création de la ressource.", error: error.message });
  }
};

// --- UPDATE RESOURCE (par son Supplier ou Admin) ---
exports.updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ message: "Format de l'ID de ressource invalide." });
    }
    // Prendre seulement les champs modifiables (on ne change pas le supplier ici)
    const { name, type, quantityAvailable, unit } = req.body;

    // Préparer l'objet de mise à jour
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (quantityAvailable !== undefined) {
        const numQuantity = Number(quantityAvailable);
        if (isNaN(numQuantity) || numQuantity < 0) {
             return res.status(400).json({ message: "La quantité disponible doit être un nombre positif ou zéro." });
        }
        updateData.quantityAvailable = numQuantity;
    }
    if (unit !== undefined) updateData.unit = unit;

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Aucun champ à mettre à jour fourni." });
    }

    // 1. Trouver la ressource pour vérifier l'autorisation
    const resourceToUpdate = await Resource.findById(resourceId);
    if (!resourceToUpdate) {
      return res.status(404).json({ message: "Ressource non trouvée." });
    }

    // 2. Vérification d'autorisation : Seul le fournisseur original ou un Admin peut modifier
    if (req.user.id !== resourceToUpdate.supplier.toString() && req.user.role !== 'Admin') {
         return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à modifier cette ressource." });
    }

    // 3. Effectuer la mise à jour
    const updatedResource = await Resource.findByIdAndUpdate(
      resourceId,
      { $set: updateData }, // Utilise $set pour màj partielle
      { new: true, runValidators: true } // Valide et retourne le doc à jour
    ).populate('supplier', 'username email contact phone'); // Peuple pour la réponse

    if (!updatedResource) { // Devrait être redondant mais par sécurité
      return res.status(404).json({ message: "Ressource non trouvée après tentative de mise à jour." });
    }

    res.status(200).json(updatedResource);

  } catch (error) {
    console.error(`Erreur updateResource pour ID ${req.params.id}:`, error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(el => el.message);
      if (error.errors.name && error.errors.name.kind === 'unique') {
           return res.status(409).json({ message: "Erreur de validation.", details: [`Le nom de ressource '${req.body.name}' existe déjà.`] });
      }
      return res.status(400).json({ message: "Erreur de validation.", details: errors });
    }
    if (error.name === 'CastError') {
       return res.status(400).json({ message: "Erreur de validation.", details: [`Format invalide pour le champ '${error.path}'.`] });
    }
     if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
       return res.status(409).json({ message: "Erreur: Le nom de ressource existe déjà.", details: error.message });
    }
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la ressource.", error: error.message });
  }
};

// --- DELETE RESOURCE (par son Supplier ou Admin) ---
exports.deleteResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ message: "Format de l'ID de ressource invalide." });
    }

    // 1. Trouver la ressource pour vérifier autorisation et récupérer ID supplier
    const resourceToDelete = await Resource.findById(resourceId);
    if (!resourceToDelete) {
      return res.status(404).json({ message: "Ressource non trouvée." });
    }

    // 2. Vérification d'autorisation
    if (req.user.id !== resourceToDelete.supplier.toString() && req.user.role !== 'Admin') {
         return res.status(403).json({ message: "Accès refusé. Vous n'êtes pas autorisé à supprimer cette ressource." });
    }

    // 3. Vérifier si la ressource est utilisée dans une liaison TaskResource
    const usageCount = await TaskResource.countDocuments({ resource: resourceId });
    if (usageCount > 0) {
      return res.status(400).json({ message: `Impossible de supprimer: cette ressource est liée à ${usageCount} tâche(s). Détachez-la d'abord.` });
    }
    // Ajouter ici une vérification similaire pour CommandeRessource si nécessaire
    // const commandeUsageCount = await CommandeRessource.countDocuments({ ressource: resourceId });
    // if (commandeUsageCount > 0) { ... }


    // 4. Supprimer la ressource
    await Resource.findByIdAndDelete(resourceId);

    // 5. (Optionnel mais recommandé) Retirer la référence de la ressource chez le fournisseur
    await Supplier.findByIdAndUpdate(resourceToDelete.supplier, { $pull: { resourcesProvided: resourceId } });

    res.status(200).json({ message: "Ressource supprimée avec succès." });

  } catch (error) {
    console.error(`Erreur deleteResource pour ID ${req.params.id}:`, error);
    // CastError géré par isValidObjectId
    res.status(500).json({ message: "Erreur serveur lors de la suppression de la ressource.", error: error.message });
  }
};