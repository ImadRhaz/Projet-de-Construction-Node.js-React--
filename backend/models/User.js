const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const options = {
  discriminatorKey: 'role',
  collection: 'users'
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Le nom d'utilisateur est requis."],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "L'email est requis."],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Le mot de passe est requis."],
    minlength: 6
  },
  role: {
    type: String,
    required: true,
    // Assurez-vous que 'admin' est inclus si vous l'utilisez comme rôle valide
    enum: ["ChefProjet", "Supplier", "Admin"], // Ajout de 'Admin' basé sur votre middleware isAdmin
  },
}, options);

// Middleware pour hasher le mot de passe avant sauvegarde
// La mise à jour de updatedAt a été supprimée
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour comparer le mot de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;