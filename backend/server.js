const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const projectRoutes = require("./routes/projectRoutes")
const taskRoutes = require("./routes/taskRoutes")
const resourceRoutes = require("./routes/resourceRoutes")
const supplierRoutes = require("./routes/supplierRoutes")
const authRoutes = require("./routes/authRoutes")
const swaggerDocs = require("./config/swagger");
const taskResourceRoutes = require("./routes/taskResourceRoutes");
const productTypeRoutes = require('./routes/productTypeRoutes');
const commandeRoutes = require('./routes/commandeRoutes');
const commandItemRoutes = require('./routes/commandItemRoutes');
const defaultMongoUri = "mongodb://127.0.0.1:27017/Natec?replicaSet=rs0";

const { authenticateToken } = require("./middleware/authMiddleware")


dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000


app.use(cors())
app.use(express.json())





mongoose
  .connect(process.env.MONGODB_URI || defaultMongoUri) // Utilise la nouvelle URI par défaut
  .then(() => console.log("Connexion à MongoDB réussie"))
  .catch((err) => console.error("Erreur de connexion à MongoDB:", err))


  app.use("/api/auth", authRoutes)
  app.use("/api/projects", authenticateToken, projectRoutes)
  app.use("/api/tasks", authenticateToken, taskRoutes)
  app.use("/api/resources", authenticateToken, resourceRoutes)
  app.use("/api/suppliers", authenticateToken, supplierRoutes)
  app.use('/api/task-resources', authenticateToken, taskResourceRoutes);
  app.use('/api/commandes', authenticateToken, commandeRoutes);
  app.use('/api/product-types', productTypeRoutes);
  app.use('/api/command-items', commandItemRoutes);
  
  swaggerDocs(app);

app.get("/", (req, res) => {
  res.send("API Natec Services")
})



app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`)
})


