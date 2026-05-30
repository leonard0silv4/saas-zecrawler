# Catalog — Design

## Implementação

- Endpoints protegidos por `requireModule("catalog")`.
- Controller: `backend/src/controllers/CatalogProductController.js`.
- Modelo: `CatalogProduct`.
- Upload usa `multer.memoryStorage()` e parsing com `xlsx`.
- Números brasileiros são normalizados por `parseBrNumber`.
