const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: { // Les autres champs restent inchangés
        type: String,
        enum: ["À faire", "En cours", "Terminé", "En retard"],
        default: "À faire",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

// Champ virtuel pour accéder aux ressources via TaskResource
taskSchema.virtual('taskResources', {
    ref: 'TaskResource',
    localField: '_id',
    foreignField: 'task'
});

taskSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model("Task", taskSchema);
