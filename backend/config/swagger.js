const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Natec Services",
      version: "1.0.0",
      description: "Documentation de l'API Natec Services avec Swagger",
    },
    servers: [{ url: "http://localhost:5000/api" }],
    // Ajout de la configuration JWT
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Entrez votre token JWT sous la forme: Bearer <token>"
        }
      }
    },
    // Sécurité appliquée globalement
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    "./routes/authRoutes.js",
    "./routes/projectRoutes.js",
    "./routes/taskRoutes.js", 
    "./routes/resourceRoutes.js",
    "./routes/supplierRoutes.js",
    "./routes/commandeRoutes.js",
    "./routes/productTypeRoutes.js",
    "./routes/commandeItemRoutes.js",
  ],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use("/api/docs", 
    swaggerUi.serve, 
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true // Garde le token après rafraîchissement
      }
    })
  );
};