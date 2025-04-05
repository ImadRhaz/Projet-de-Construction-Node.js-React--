// models/TaskResource.js
const mongoose = require('mongoose');

const taskResourceSchema = new mongoose.Schema({
  // Clé étrangère vers Tache (Correspond à TacheId dans l'UML)
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task', // Référence le modèle Task
    required: [true, "La référence à la tâche est obligatoire."],
    index: true // Bon d'indexer les clés étrangères
  },
  // Clé étrangère vers Ressource (Correspond à RessouId dans l'UML)
  resource: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource', // Référence le modèle Resource
    required: [true, "La référence à la ressource est obligatoire."],
    index: true // Bon d'indexer les clés étrangères
  },
  // Quantité de cette ressource utilisée POUR CETTE tâche
  quantity: {
    type: Number,
    required: [true, "La quantité utilisée est obligatoire."],
    min: [0, "La quantité ne peut pas être négative."] // Ajout d'une validation min
  },
  // Date d'utilisation spécifique (Correspond à DateUtilisation dans l'UML)
  dateUtilisation: {
    type: Date
    // Optionnelle, peut être renseignée quand la ressource est effectivement utilisée
  }
  // Pas besoin de timestamps ici généralement, sauf si on veut tracer quand le LIEN a été créé/modifié.
});

// Index composé peut être utile si vous recherchez souvent par tâche ET ressource
taskResourceSchema.index({ task: 1, resource: 1 });

module.exports = mongoose.model('TaskResource', taskResourceSchema);