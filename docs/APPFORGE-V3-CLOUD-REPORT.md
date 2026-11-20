# AgriMarché MG — rapport d'étape AppForge V3 Cloud

**Date : 20 novembre 2026**  
**Périmètre :** accès Cloud automatique lié à la licence, sans compte AppForge Cloud.

## État avant cette modification

- Un cahier des charges V1.0 et une maquette HTML de démonstration existaient dans la Bibliothèque.
- La maquette contenait des interactions simulées et affichait un faux statut « Synchronisé »; elle n'avait ni persistance métier, ni API, ni autorité de licences, ni D1.
- Le dépôt public `RMLala/AgriMarche-MG` a été créé depuis le workflow du modèle après confirmation de visibilité.
- La PR `RMLala/android-template#7` est fusionnée; elle ajoute la règle au standard, sans implémenter l'application.

## Développé dans cette reprise locale

- Worker Cloudflare : vérification d'attestation via binding privé de l'autorité AppForge; refus fermé si l'autorité manque, si la licence, l'appareil ou le droit Cloud est refusé.
- Jetons HMAC à durée limitée, bornés par l'expiration de licence; route de renouvellement qui revalide la licence et l'appareil.
- Vérification du jeton et nouvelle autorisation serveur sur chaque statut, push et pull; quota de lot vérifié; données D1 cloisonnées par scope opaque de licence.
- Synchronisation avec journal d'opérations, identifiant idempotent, contrôle optimiste des révisions et remontée de conflits sans écraser les données du serveur.
- Client sans formulaire de compte Cloud, sans stockage persistant du jeton; hors ligne conserve la file locale et les conflits. Le module d'outbox chiffre les payloads avec une clé fournie par la couche PIN/stockage sécurisé existante.
- Maquette : retrait du statut fictif « Synchronisé », ajout d'une rubrique Réglages Cloud et d'un bouton manuel; « Cloud vérifié » n'apparaît qu'après obtention du jeton auprès du Worker.
- Aucun service worker/PWA généré.

## Tests exécutés

- `npm test` dans `src/cloud/worker/` : **22 tests réussis, 0 échec**. Couverture des jetons, activation simulée, renouvellement, licence expirée/révoquée, appareil non autorisé, synchronisation de deux appareils autorisés, isolation entre licences, idempotence, conflit, quota, mode hors ligne et reprise de file.
- `node --check` sur Worker, client Cloud et outbox : réussi.
- `0001_sync.sql` appliqué avec SQLite local en mémoire : syntaxe et création des trois tables vérifiées.
- GitHub Actions sur la PR #1 : audit AppForge V3 **success**; build Debug API23/API29 **success**; deux artefacts Debug présents. Le job Release est sauté sur une PR conformément au workflow.

Ces tests utilisent un binding d'autorité et un faux D1. Ils ne constituent pas les 10 tests d'intégration production demandés; ils ne valident aucun paiement MVola réel ni un Worker/D1 Cloudflare déployé.

## Bloquants / dépendances

- Aucun Worker AppForge License Authority existant n'est raccordé dans ce projet. Le contrat attendu est décrit dans `README.md`; validation par l'équipe AppForge requise.
- D1, Worker de production, secret de signature, origine autorisée et quotas réels ne sont pas configurés. Aucun déploiement effectué.
- Le prototype n'a pas de bridge licence AppForge, de stockage PIN réel, de données métier persistantes ni de client Android. Le module web exige `AppForgeLicenseBridge` et l'adaptateur local chiffré pour démarrer.
- La clé de chiffrement PIN n'est pas implémentée dans ce prototype; aucun jeton ne doit être conservé dans IndexedDB/localStorage.
- Aucun APK, test physique, synchronisation entre deux vrais appareils, backup/restore ou certification fonctionnelle V3 n'a été exécuté.
- Le dépôt a été créé par le workflow du modèle (secret organisation requis). Sources poussées sur `work/agri-cloud-license-v3-2026-11-20`, commit `50ddae4faaa838fdd2bb1f7fb66538384a027d06`; PR #1 ouverte vers `main`, non fusionnée. Les workflows PR vérifiés sont verts pour l'audit V3 et les builds Debug. Les Release signées API23/API29 n'ont pas été exécutées; leur job est ignoré sur PR.

## Anomalies corrigées

- L'ancien libellé « Synchronisé » était affiché sans jeton valide; remplacé par « Cloud non vérifié » jusqu'à vérification serveur.
- Un conflit renvoyé à nouveau ne doit pas vider la file locale; le client ne supprime désormais que les opérations dont le statut est `applied`.

## Conclusion et statut pour le pilotage global

**Socle développé, poussé et soumis en PR; contrôles locaux et CI réussis, intégration Cloud réelle toujours en attente des dépendances AppForge et Cloudflare.** Ne pas qualifier AgriMarché de « Cloud connecté », de production ou pleinement conforme V3. Les builds Debug API23/API29 existent comme artefacts CI, pas comme livraison testée; aucun Release signé ni déploiement Cloud n'a eu lieu.

### Trois prochaines actions

1. Faire réviser la PR #1 et valider l'architecture avant fusion.
2. Faire valider le contrat Worker `LICENSE_AUTHORITY`, les données de révocation/quota et la remise de l'attestation de licence MVola.
3. Raccorder le bridge AppForge, le stockage PIN/Android sécurisé et D1 réel, puis lancer les 10 scénarios d'intégration sur Worker et deux appareils.
