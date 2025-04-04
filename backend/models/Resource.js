const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["Matériau", "Équipement", "Personnel"],
    required: true,
  },
  quantityAvailable: {  
    type: Number,
    required: true,
    min: 0,
  },
  unit: {             
    type: String,
    required: true,
    trim: true,
  },
  supplier: {       
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});


resourceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Resource", resourceSchema);