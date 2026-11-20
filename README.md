# AgriMarché MG — accès Cloud AppForge V3

Cette reprise conserve le cahier des charges et le prototype existants et ajoute un premier socle Cloud lié à la licence, sans compte Cloud client et sans PWA.

## État

- `src/cloud/worker/`: Worker Cloudflare pour la vérification de licence, l'émission/renouvellement de jetons courts, l'autorisation à chaque opération et les routes de synchronisation.
- `src/cloud/migrations/0001_sync.sql`: tables synchronisées cloisonnées par périmètre opaque de licence, journal d'opérations et changements.
- `src/cloud/client/`: client de session sans compte, file d'attente hors ligne, conservation des conflits et stockage IndexedDB chiffré par une clé fournie par la couche PIN/stockage protégé de l'application.
- `AgriMarche_MG_Prototype_V1.html`: prototype existant ajusté pour afficher un état Cloud honnête et une rubrique Réglages sans formulaire de compte Cloud.

## Contrat AppForge requis

Le binding privé `LICENSE_AUTHORITY` doit implémenter :

- `POST /internal/v1/cloud/verify`: vérifier l'attestation de licence après validation MVola, l'appareil, le droit Cloud, les quotas, l'état et l'expiration; répondre avec `active`, `cloud_allowed`, `device_allowed`, `license_scope` opaque, `expires_at`, `cloud_quota`.
- `POST /internal/v1/cloud/authorize`: revalider activation, appareil, révocation, quotas et accès du scope pour chaque appel; répondre avec `allowed`, `active`, `cloud_allowed`, `device_allowed`, `quota_remaining`.

Aucune de ces opérations n'est un compte client Cloud. Le client obtient l'attestation via le bridge AppForge déjà activé (`getCloudAssertion`) et un identifiant d'installation fourni par la plateforme (`getDeviceId`). L'interface n'offre pas d'e-mail, mot de passe, compte ou organisation Cloud.

## Secrets et configuration

- Configurer `CLOUD_TOKEN_SIGNING_KEY` comme secret Cloudflare Worker (jamais dans `[vars]`, HTML, Android ou GitHub).
- Créer D1 et remplacer `database_id` dans `wrangler.toml`; renseigner l'origine autorisée réelle dans `ALLOWED_ORIGINS`.
- Raccorder le binding Worker privé `LICENSE_AUTHORITY` après validation de son nom et de son schéma par le propriétaire AppForge.
- Ne pas déployer tant que ces dépendances et la politique CORS ne sont pas vérifiées.
- Le jeton reste en mémoire dans le client web; il n'est pas stocké dans IndexedDB. Les opérations locales nécessitent une clé de chiffrement fournie par l'application après déverrouillage PIN.

## Vérifications locales

Depuis `src/cloud/worker/` :

```sh
npm test
```

La suite courante utilise un faux binding d'autorité et un faux D1 en mémoire. Elle prouve des règles logicielles locales, pas un déploiement Cloudflare, une validation de paiement MVola réelle, ni une recette sur deux appareils physiques.
