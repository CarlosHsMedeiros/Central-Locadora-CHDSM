module.exports = function notFound(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Recurso da API não encontrado." } });
};
