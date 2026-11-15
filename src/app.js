const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const apiRoutes = require("./routes");
const corsOptions = require("./utils/corsOptions");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const protectBackendFiles = require("./middlewares/protectBackendFiles");
const requireMigrationAdmin = require("./middlewares/requireMigrationAdmin");
const migrationRoutes = require("./routes/migracaoRoutes");
const authenticate = require("./middlewares/authenticate");
const authorize = require("./middlewares/authorize");
const auditAdministrativeAction = require("./middlewares/auditAdministrativeAction");

const { originGuard, validateInput } = require("./middlewares/requestSecurity");
const apiRateLimit = require("./middlewares/apiRateLimit");
const env = require("./config/env");
const app = express();
const publicDirectory = path.resolve(__dirname, "..");

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "http://127.0.0.1:3000"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "http://127.0.0.1:3000"],
      frameSrc: ["'self'", "http://127.0.0.1:3000"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: env.nodeEnv === "production" ? [] : null,
      frameAncestors: ["'self'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));
app.use("/api", apiRateLimit, originGuard);
app.use(cors((req,done)=>done(null,{...corsOptions,origin:req.get("origin")===req.protocol+"://"+req.get("host")?true:corsOptions.origin})));
app.use("/api", (req,res,next)=>{res.set("Cache-Control","no-store");next();});
// A chave é verificada antes de aceitar lotes maiores (anexos legados em data URL).
app.use("/api/admin/migracao", authenticate, authorize("administrador"), auditAdministrativeAction, requireMigrationAdmin, express.json({ limit: "25mb", inflate: false }), validateInput, migrationRoutes);
app.use("/api/operacao", authenticate, auditAdministrativeAction, express.json({ limit: "35mb", inflate: false }), validateInput, require("./routes/operacaoRoutes"));
app.use("/api/veiculos", authenticate, auditAdministrativeAction, express.json({limit:"8mb",inflate:false}), validateInput, require("./routes/veiculoRoutes"));
app.get("/api/drive/oauth/callback", require("./utils/driveLocalOrigin").redirect);
app.use("/api/drive", authenticate, auditAdministrativeAction, express.json({ limit: "7mb", inflate: false }), require("./routes/googleDriveRoutes"));
app.use("/api/nfse", authenticate, auditAdministrativeAction, express.json({limit:"1mb",inflate:false}), require("./middlewares/requestSecurity").inspectNfseInput, require("./routes/nfseRoutes"));
app.use(express.json({ limit: "1mb", inflate: false }));
app.use("/api", validateInput);
app.use("/api", apiRoutes);
app.use("/api", notFound);

// Preserva todas as URLs e páginas atuais na raiz do projeto.
app.get("/DOMPURIFY.js", (req,res)=>res.sendFile(require.resolve("dompurify/dist/purify.min.js")));
app.use(protectBackendFiles);
app.use(require("./middlewares/protectPages"));
app.use(express.static(publicDirectory, { index: "index.html", dotfiles: "ignore" }));
app.use(errorHandler);

module.exports = app;

