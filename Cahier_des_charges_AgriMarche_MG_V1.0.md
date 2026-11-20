# 15 — AgriMarché MG
## Cahier des charges fonctionnel et technique — V1.0

**Date :** 12 novembre 2026  
**Statut :** Base de cadrage V1.0 — développement progressif  
**Cible :** producteurs, groupements, coopératives, acheteurs professionnels et particuliers à Madagascar  
**Langues :** français et malagasy  
**Devise par défaut :** Ariary (MGA), configurable par organisation

---

## 1. Vision et objectifs

AgriMarché MG aide à organiser la vente de produits agricoles depuis la déclaration d'une disponibilité jusqu'au paiement et à la clôture d'un litige. L'application doit fonctionner dans des zones à réseau intermittent : les utilisateurs préparent les fiches et opérations hors ligne, puis synchronisent les changements lorsque la connexion revient.

Deux modes répondent à des besoins différents, mais partagent un socle de données et de gestion :

1. **Gestion privée** : un producteur ou groupement gère son catalogue, ses disponibilités, ses commandes et ses comptes. Il peut gérer plusieurs responsables et sites. Les données commerciales restent privées ; aucune fiche n'est publiée au marché sans action explicite.
2. **Marketplace multi-vendeurs** : plusieurs vendeurs publient des offres, et les acheteurs recherchent, négocient, réservent et passent commande. Chaque commande est rattachée à un vendeur ; une commande multi-vendeurs est séparée en sous-commandes pour garder les stocks, livraisons, commissions et règlements distincts.

Le mode est choisi à la création de l'espace et peut être activé ultérieurement par son administrateur. Un espace ne change pas implicitement le statut public de ses données.

### Résultats attendus

- Réduire les ventes sur des stocks déjà épuisés ou réservés.
- Donner une visibilité vérifiable sur l'origine déclarée, la quantité, l'unité, la qualité et le site de collecte.
- Suivre les offres, négociations, réservations, commandes, livraisons, paiements, commissions et réclamations.
- Fournir des outils de gestion utiles sans connexion continue.
- Permettre une progression du produit : socle privé, puis marketplace contrôlée, puis services professionnels.

### Hors périmètre V1

- Paiement mobile automatique ou séquestre intégré sans partenaire contractuel validé.
- Certification biologique ou sanitaire émise par AgriMarché ; l'application enregistre les justificatifs déclarés et leurs vérifications.
- Cotations officielles ou garantie de prix ; les prix publiés sont indicatifs et datés.
- Transport propre, géolocalisation continue, enchères automatiques, prêts ou assurance agricole.
- Prédiction des récoltes par IA ou notation de solvabilité automatique.

---

## 2. Acteurs et droits

| Rôle | Principales actions |
|---|---|
| Propriétaire / administrateur du compte | Paramétrage, utilisateurs, accès, modes, commissions, export, suppression contrôlée |
| Responsable de site | Récoltes, lots, pesées, stocks et préparation des commandes de son site |
| Agent de collecte / peseur | Déclaration de collecte et pesée, sans accès aux règlements globaux |
| Gestionnaire commercial | Offres, prix, négociations, réservations et commandes |
| Caissier / comptable | Paiements, remboursements, commissions et rapprochements |
| Acheteur | Recherche, demandes de prix, commandes, preuves de réception, avis et litiges |
| Opérateur marketplace | Modération des vendeurs et offres, traitement des litiges, gestion des commissions et audit |
| Auditeur en lecture seule | Consultation des opérations et historique autorisés |

Les droits sont accordés par organisation, site et module. Les actions sensibles exigent la permission dédiée. Un utilisateur ne voit que les organisations et sites qui lui sont accordés.

---

## 3. Parcours utilisateurs

### 3.1 Première configuration

1. Choisir français ou malagasy, créer un espace et définir son nom, sa région, sa devise et son fuseau horaire.
2. Choisir **Gestion privée** ou **Marketplace**. Le choix peut être modifié par un administrateur ; passer à la marketplace nécessite une activation explicite du vendeur et une revue de son profil.
3. Créer les sites (village, magasin, entrepôt, point de collecte), les responsables, les rôles et les unités utilisées.
4. Renseigner les règles : réservation, tolérance de poids, annulation, commission, politique de litige et approbation avant publication.
5. Importer ou saisir producteurs, produits et stocks initiaux. Une vérification signale les doublons et les unités manquantes.

### 3.2 Publier une offre

1. Sélectionner produit, variété, qualité déclarée, origine, site, lot et photos facultatives.
2. Saisir quantité disponible et unité, prix par unité, date de disponibilité, quantité minimale, conditionnement et prix négociable ou fixe.
3. Indiquer si l'offre est privée, partagée avec certains acheteurs ou publique sur la marketplace.
4. Vérifier l'aperçu, confirmer la quantité publiable et soumettre à modération si la règle le prévoit.
5. À la synchronisation, le serveur vérifie conflits de disponibilité, statut vendeur et règles de publication. Une offre en attente n'est pas achetable.

### 3.3 Acheteur — demande à commande

1. Filtrer le marché par produit, région, période, prix, unité, quantité minimale, vendeur et disponibilité.
2. Ouvrir une offre, examiner le vendeur, la date de mise à jour, l'unité et les conditions.
3. Envoyer une demande de prix ou proposer quantité, prix et date souhaités. Une offre négociée est horodatée et conservée dans l'historique.
4. Après acceptation, confirmer la réservation ou convertir en commande. Le système réévalue le stock à l'instant de confirmation.
5. Choisir enlèvement ou livraison, préciser lieu et contact, puis confirmer les coûts connus. Pas de frais estimé présenté comme définitif.
6. Enregistrer acompte, paiement, preuve et solde dû. Le vendeur marque la commande expédiée ; l'acheteur confirme réception ou ouvre une réclamation.
7. Après clôture, les parties peuvent laisser une évaluation. Les avis liés à une transaction vérifiée sont identifiés comme tels.

### 3.4 Producteur / groupement — préparation et exécution

1. Recevoir une demande et accepter, refuser ou proposer un contre-prix.
2. Réserver le volume accepté. La réservation a une expiration paramétrable ; le stock réservé n'est pas vendable ailleurs.
3. Préparer le lot et saisir le poids mesuré. Les ajustements requièrent motif et sont historisés.
4. Remettre ou expédier avec preuve, responsable, date et statut de livraison.
5. Confirmer les paiements reçus et la commission due ; rapprocher les versements réellement constatés.
6. Clôturer ou contester une commande avec preuves et échanges rattachés.

### 3.5 Hors ligne et synchronisation

- Consultation, création et modification permises localement selon droits mis en cache ; étiquette claire **Enregistré sur cet appareil**.
- Un identifiant unique est attribué localement à toute opération. La file de synchronisation conserve auteur, appareil, heure locale, heure serveur après envoi et résultat.
- Les quantités et réservations ne sont garanties qu'après validation serveur. Une réservation créée hors ligne reste **à confirmer** et ne bloque pas le stock partagé.
- En conflit, aucune donnée n'est silencieusement écrasée : l'application garde les deux versions, signale l'écart et demande résolution selon permission.
- Les paiements, remboursements, commissions acquittées, réception définitive et clôture de litige ne peuvent pas être marqués comme vérifiés définitivement hors ligne. Une saisie brouillon reste possible.
- Indicateurs : hors ligne, nombre d'opérations en attente, dernière synchronisation, erreurs à traiter et bouton de relance.

---

## 4. Exigences fonctionnelles

### 4.1 Référentiel et vendeurs

- Profil producteur ou groupement : identité déclarée, contacts, organisation, régions/sites, description, pièces de justificatif facultatives et statut de validation.
- Catalogue : catégorie, produit, variété, saison, photos, description FR/MG, unité de vente, unité de stock et règle de conversion validée.
- Unités : kg, tonne, sac, panier, caisse, botte, pièce et unité personnalisée. Conversion explicite seulement ; conserver valeur originale et unité de saisie.
- Disponibilités : saison, dates, quantité estimée et dernière confirmation. Une disponibilité estimative n'est pas un stock de lot prêt à vendre.

### 4.2 Lots, pesées et stocks

- Lot rattaché au produit, producteur, site et campagne/récolte. Suivre quantité initiale, disponible, réservée, vendue, rejetée/perdue et unité.
- Pesée : poids brut, tare, poids net = brut − tare ; contrôler valeurs positives et unité. Tolérances sont configurables par type de produit et commande.
- Mouvement de stock append-only : réception, ajustement motivé, réservation, libération, expédition, retour, perte et correction. Une correction ne supprime pas le mouvement initial.
- La qualité, le calibre et le grade sont des valeurs déclaratives configurables ; l'auteur, date et justificatif éventuel sont enregistrés.
- Pas de stock négatif en validation serveur, sauf mode brouillon explicitement permis.

### 4.3 Prix et négociation

- Prix demandé par unité normalisée, quantité minimale, prix fixe/négociable, validité, date de mise à jour, devise et conditions incluses/exclues.
- Historique immuable des propositions, réponses, auteur, date, quantité, prix et expiration.
- Une négociation acceptée génère une offre de commande datée et valable jusqu'à une échéance ; changement de prix après acceptation crée une nouvelle proposition.
- Affichage d'un prix total indicatif = quantité × prix unitaire ; frais de livraison et commission ne sont ajoutés que s'ils sont déterminés et clairement attribués.

### 4.4 Commandes et réservations

- Statuts : brouillon → demande envoyée → négociation → acceptée → réservation en attente / confirmée → préparation → expédiée / remise → reçue → clôturée. États transverses : refusée, annulée, contestée.
- Réservation atomique côté serveur : quantité demandée doit être ≤ quantité disponible ; idempotence pour éviter les doubles commandes après resynchronisation.
- Expiration libère le stock automatiquement au serveur et crée une trace. Annulation après préparation peut demander motif et validation.
- Commandes multi-vendeurs ventilées en sous-commandes par vendeur/site. Pas de mélange de règlements ou d'obligations de livraison entre vendeurs.

### 4.5 Livraison et réception

- Mode : enlèvement, livraison organisée par vendeur, acheteur ou transporteur tiers ; responsable et coûts convenus.
- Jalons datés : préparation, remise transporteur, expédition, livraison, réception partielle ou complète.
- Preuve facultative ou exigée selon paramètre : signature, photo ou code de réception. Les pièces sont privées et accessibles uniquement aux parties et rôles autorisés.
- Quantité reçue, unité, qualité constatée et écart par rapport à la quantité commandée sont enregistrés séparément.

### 4.6 Paiements, commissions et litiges

- Paiements en MGA par défaut : espèces, MVola / Orange Money / Airtel Money, virement ou autre moyen configurable. Le système n'initie pas de transfert sans intégration activée.
- Saisir montant, date, payeur, bénéficiaire, référence et justificatif facultatif ; distinguer déclaré, à vérifier, confirmé, rejeté et remboursé.
- Solde commande = montant convenu + frais validés − paiements confirmés − remboursements confirmés. Les paiements en attente ne réduisent pas le solde confirmé.
- Commission configurable : pourcentage, montant fixe, par vendeur/catégorie ou forfait ; définir la base, le payeur, l'événement de calcul, le minimum/plafond et date d'effet. Enregistrer une photographie de la règle sur chaque commande pour préserver le calcul historique.
- Litige : motif, description, montant/quantité contestée, pièces, messages, statut, médiateur, décisions, échéances et journal. Pas de décision automatique.
- Évaluation de 1 à 5, commentaire et réponse vendeur ; une évaluation transactionnelle n'est autorisée qu'après réception confirmée. Modération, signalement et droit de réponse.

### 4.7 Tableaux de bord et rapports

- Vendeur : quantités disponibles/réservées/vendues, commandes à traiter, revenus bruts, commissions, paiements confirmés et restants, ventes par produit/site/période.
- Acheteur : demandes, commandes en cours, dépenses engagées, paiements, réceptions et réclamations.
- Marketplace : GMV (valeur des commandes confirmées), ventes nettes estimées, commission facturée/encaissée, vendeurs et acheteurs actifs, taux de conversion, annulations et litiges.
- Exports CSV/XLSX/PDF dans la limite des droits ; inclure période, filtres, devise, unités, critères et date d'extraction.
- Distinguer clairement montant commandé, montant encaissé et commission calculée/encaissée.

---

## 5. Règles de gestion configurables

| Règle | Paramètres possibles | Valeur de départ suggérée |
|---|---|---|
| Publication vendeur | immédiate, validation admin, privée | validation au lancement du marché |
| Durée de réservation | minutes/heures/jours, prolongation | 24 h, renouvelable par accord |
| Quantité minimale | par produit/offre | définie par vendeur |
| Tolérance pesée | seuil absolu ou % par produit | 0 % jusqu'à configuration explicite |
| Commission | %, fixe, barème, partie payeuse | 0 % jusqu'à acceptation des conditions |
| Annulation | délais, motifs, pénalité éventuelle | sans pénalité automatique en V1 |
| Confirmation réception | code, signature, confirmation simple | confirmation simple + preuve optionnelle |
| Évaluation | seuil de commande clôturée, délai | clôture requise |
| Litige | délais de réponse/escalade, médiateur | délais visibles et gérés manuellement |
| Visibilité des prix | publique, acheteurs approuvés, privée | définie par offre |
| Stock négatif | interdit ou toléré en brouillon | interdit en validation serveur |
| Mode offline | fonctions et durée des droits en cache | saisie locale ; règles sensibles revalidées en ligne |

Toute modification d'une règle doit être versionnée (auteur, date d'effet, ancienne/nouvelle valeur). Les règles de commande déjà acceptées restent figées sur cette commande.

---

## 6. Écrans et navigation

### Application mobile / web adaptative

1. Connexion, choix de langue, récupération d'accès.
2. Création d'espace et assistant de configuration des modes.
3. Accueil : indicateurs, actions rapides, commandes et alertes de synchronisation.
4. Marché : recherche, filtres, carte/liste, fiche offre, profil vendeur.
5. Catalogue : produits, variétés, unités, campagnes et prix.
6. Lots & collecte : création lot, pesées, qualité, pièces jointes et mouvements.
7. Offres : disponibilité, publication, visibilité, aperçu et validation.
8. Négociations : fil d'offres, contre-propositions, historique et échéances.
9. Commandes : liste, détail, sous-commandes, statut, documents et actions.
10. Réservations et préparation : quantité engagée, prélèvement de lot et expédition.
11. Livraison/réception : jalons, preuve, poids reçu et écarts.
12. Paiements & commissions : échéancier, saisie de versement, justificatifs et rapprochement.
13. Avis & litiges : évaluations, demandes, échanges, pièces et résolution.
14. Rapports : filtres, graphiques, export.
15. Utilisateurs & accès : membres, rôles, sites, journal d'activité.
16. Réglages : règles métier, devise, unités, commissions, langues, synchronisation et sauvegardes.

### Principes d'interface

- Saisie mobile par étapes, gros contrôles tactiles, fonctionnement avec réseau lent.
- Toujours afficher unité et date d'actualisation avec les quantités et prix.
- Distinguer disponible, réservé, estimé, expédié et confirmé.
- Confirmations explicites pour publication publique, annulation, ajustement de stock et remboursement.
- Français/Malagasy pour navigation et états. Les descriptions produits restent saisies ou traduites par l'utilisateur.
- Les actions non synchronisées portent un indicateur visible et ne donnent pas l'illusion d'une validation partagée.

---

## 7. Modèle de données V1

Les tables métier partagent un `tenant_id` (organisation/espace), UUID côté client, date de création/modification, utilisateur auteur et version. Les données marketplace publiques sont des projections de champs explicitement publiés, jamais des tables privées exposées directement.

| Entité | Champs principaux / liens |
|---|---|
| `tenants` | id, nom, mode privé/marketplace, langue, devise, statut, paramètres |
| `users` | id, email/téléphone, nom, statut, préférences langue |
| `memberships` | tenant_id, user_id, rôle, état, périmètre site |
| `sites` | tenant_id, nom, région/district/commune/village, coordonnées facultatives, statut |
| `products` | tenant_id, nom, catégorie, variété, unités, conversions autorisées, descriptions FR/MG |
| `seller_profiles` | tenant_id, profil public autorisé, statut, coordonnées de contact contrôlées |
| `lots` | product_id, site_id, campagne, origine déclarée, qualité, dates, statut |
| `weighings` | lot_id, poids brut, tare, net calculé, unité, peseur, appareil, horodatage |
| `stock_movements` | lot_id, type, quantité signée, unité normalisée/originale, motif, référence opération |
| `offers` | seller_id, lot_id?, quantité, prix/unité, devise, minimum, visibilité, statut, valid_until |
| `negotiations` | offer_id, buyer_id, statut, version courante |
| `negotiation_messages` | negotiation_id, acteur, quantité, prix, conditions, expiration, date |
| `reservations` | offer_id, buyer_id, quantité, statut, expire_at, confirmé serveur |
| `orders` | buyer, total, devise, statut, mode de livraison, dates et conditions figées |
| `order_items` | order_id, seller_id, offer_id, produit, quantité, prix, unité et règles tarifaires figées |
| `deliveries` | order_id, site, responsable, transporteur, jalons, preuve, statut |
| `receipts` | delivery_id, quantité/unité reçue, état, différence, confirmation |
| `payments` | order_id, payeur, bénéficiaire, montant, mode, référence, statut, preuve |
| `commission_rules` | tenant_id, portée, formule, taux/montant, payeur, dates d'effet, version |
| `order_commissions` | order_id, règle figée, base, montant calculé, statut facturation/encaissement |
| `reviews` | order_id, auteur, cible, note, commentaire, statut modération, réponse |
| `disputes` | order_id, auteur, motif, revendication, statut, médiateur, résolution |
| `dispute_events` | dispute_id, acteur, message/action, pièce, date |
| `attachments` | tenant_id, objet, stockage chiffré, type, hash, niveau accès |
| `audit_events` | tenant_id, acteur, action, objet, avant/après, source, appareil, horodatage serveur |
| `sync_operations` | tenant_id, operation_id unique, appareil, payload versionné, état, conflit, erreurs |

### Contraintes d'intégrité

- Index par tenant et périmètre sur toutes les données privées.
- Identifiants UUID créés localement ; contrainte serveur d'unicité d'idempotence.
- Prix et poids stockés en décimal précis, pas en flottant binaire. Devise et unité toujours explicites.
- Les mouvements comptables et de stock confirmés sont immuables ; corrections par contre-écriture tracée.
- Rétention, anonymisation et suppression selon statut légal/contractuel défini avant exploitation commerciale.

---

## 8. Architecture cible

### Clients

- Application web adaptative/PWA autonome pour démonstration et usage connecté/hors ligne limité.
- Android via Capacitor, livraisons Debug et deux APK Release signés : minSdk API 23 et API 29 ; les APK doivent utiliser les mêmes données et API fonctionnelles.
- Stockage local chiffrable selon capacités de la plateforme : IndexedDB/SQLite, file d'attente, cache minimal des données utiles. PIN/biométrie ne remplace pas le contrôle serveur.

### Backend

- Cloudflare Workers pour API, authentification/autorisation, validation des règles et synchronisation.
- D1 pour données transactionnelles initiales : tenants, utilisateurs, catalogues, offres, commandes, mouvements et audit léger. Transactions et réservations atomiques côté serveur ; au besoin, Durable Objects pour sérialiser l'inventaire/réservation par offre ou lot.
- R2 pour photos et pièces jointes avec URLs signées courtes, validation du type et taille, et règles d'accès par tenant.
- Services de notification activés uniquement via fournisseurs choisis et consentement ; l'API garde les événements sans dépendre du fournisseur.
- Endpoints idempotents ; pagination, filtre tenant systématique, validation des payloads, limites de fréquence et schéma versionné.

### Synchronisation

- Opérations locales en journal ordonné avec UUID et précondition de version (`expected_version`).
- Le serveur répond par opération : acceptée, déjà appliquée, rejetée ou conflit ; le client ne supprime la file qu'après résultat persistant.
- Fusion automatique seulement pour champs non conflictuels (ex. brouillon de description). Prix, disponibilité, poids final, paiement, commande et statut juridique exigent la règle serveur ou résolution humaine.
- Synchronisation des données minimales selon rôle ; photos/téléchargements différés.

### AppForge et licences

- AppForge gère plans/licences et limites de l'application ; il ne conserve pas le secret d'accès à la base depuis le client.
- Vérification de licence en ligne au lancement quand disponible ; hors ligne, accès aux données locales conformément au bail signé/cache. Révocation appliquée à la prochaine vérification, sans supprimer les données utilisateur.
- Plan éditeur interne réservé aux tests et démonstrations ; opérations d'administration séparées des données des vendeurs.

### GitHub et livraison

- Dépôt dédié `AgriMarche-MG`, branche de travail indépendante de `main`, jamais de développement directement sur `main`.
- Pull Request vers la branche principale, Actions pour lint/build et artefacts.
- Livrables : version HTML/PWA, projet Android, APK Debug, APK Release signée API 23, APK Release signée API 29, notes de version, instructions de configuration.
- VersionName repris de Debug pour Release ; versionCode incrémenté uniquement lors d'une distribution, sauf application démarrant en V1.0 selon convention du dépôt.
- Signature via GitHub Secrets, clé de publication commune de l'éditeur ; secrets jamais dans le HTML, APK, Git ou les journaux CI.

---

## 9. Sécurité, confidentialité et gouvernance

- Authentification par téléphone/email et mécanisme de récupération vérifié ; durée de session configurable et révocation des appareils.
- Autorisation vérifiée côté serveur sur chaque requête, cloisonnement strict par tenant/site/objet et tests d'accès croisé.
- Contrôle MFA recommandé pour administrateurs marketplace et opérateurs. Permissions minimales pour pesée, stock, paiement, modération et litige.
- Chiffrement en transit et au repos, secrets en variables protégées, rotation et sauvegarde testée. Données locales sensibles minimisées et protégées par verrouillage appareil.
- Journal append-only des changements de prix, quantité, stock, commande, paiement, commission, rôle, accès, litige et paramètre ; horodatage serveur conservé.
- Protection contre double réservation, replay, injection, téléversement malveillant, abus de recherche, brute force et falsification de preuves. Vérification d'idempotence et limitation de débit.
- Minimiser l'exposition des téléphones, adresses et documents personnels. Coordonnées exactes partagées seulement lorsque nécessaires à une commande.
- Modération de contenus, signalement de fraude, règles de suspension et procédure d'appel opérateur. Les avis ne peuvent pas être vendus ou édités par le vendeur.
- Sauvegardes chiffrées, procédure de restauration documentée et politique de rétention conforme aux exigences contractuelles et légales à confirmer avant lancement.
- Page de confidentialité et conditions de vente : opérateur légal, rôle d'intermédiaire, responsabilités de qualité, fiscalité, commission, remboursements, preuve et litiges à valider avec conseil local avant mise en production.

---

## 10. Modèle économique

### Pistes à tester (non définitives)

1. **Gestion privée** : abonnement Premium par producteur ou groupement, avec limite de sites/utilisateurs/volumes et rapports avancés.
2. **Marketplace Pro** : abonnement vendeur professionnel pour multi-sites, équipe, exports, règles avancées, historique et rapports.
3. **Commission par transaction** : pourcentage ou frais fixe affiché avant acceptation ; uniquement sur événement défini (réception confirmée ou paiement confirmé) et selon termes explicites.
4. **Services optionnels** : visibilité sponsorisée clairement marquée, documents, onboarding, assistance ou intégration logistique via partenaires. Pas de classement payant dissimulé.

### Principes

- Aucun prélèvement caché : prix, commission, payeur, événements de calcul et taxes éventuelles visibles avant confirmation.
- Pas de frais appliqués rétroactivement ; la règle exacte est figée lors de l'acceptation.
- Paiements manuels d'abord ; les frais des opérateurs mobiles/banques sont identifiés séparément.
- Mesurer coûts Cloudflare, stockage images, support, acquisition et fraude avant d'arrêter les tarifs. Réaliser des entretiens terrain et un pilote régional avant généralisation.
- L'opérateur doit clarifier son rôle juridique, la facturation des commissions et les responsabilités sur les ventes entre tiers.

---

## 11. Critères d'acceptation V1

1. Un administrateur peut créer un espace privé et ajouter un site, un produit, une unité personnalisée et deux responsables avec droits différents.
2. Un lot avec poids brut et tare calcule le poids net correct ; toute correction conserve motif, auteur et ancienne valeur.
3. Une offre privée n'apparaît pas dans le marché public ; une publication nécessite confirmation et statut autorisé.
4. Deux acheteurs ne peuvent pas réserver ensemble plus que le stock disponible ; une répétition de requête réseau ne crée pas de doublon.
5. Une négociation conserve l'historique complet et l'accord fige prix, quantité, devise et conditions sur la commande.
6. La commande multi-vendeur produit des sous-commandes séparées et des stocks/commissions indépendants.
7. Une commande peut avoir paiements partiels ; solde calculé seulement avec paiements confirmés.
8. La commission historique reste exacte après modification du barème général.
9. Hors ligne, création d'un brouillon de lot/offre et d'une demande de commande est possible ; le statut indique clairement ce qui attend validation serveur.
10. Un conflit de stock ou de version est signalé sans perte silencieuse ; l'utilisateur autorisé peut résoudre et la décision est auditée.
11. Un vendeur ne voit pas les données privées d'un autre vendeur ; les tests multi-tenant valident les accès sur API et exports.
12. Une réception partielle peut déclencher écart/litige ; aucune résolution automatique n'est imposée.
13. Tous les écrans principaux sont accessibles en français et malagasy, avec chaînes externalisées.
14. Les exports reflètent filtres et période et distinguent commande, encaissement et commission.
15. Restauration d'une sauvegarde d'essai et réconciliation de la file de synchronisation sont vérifiées avant pilote réel.

---

## 12. Plan de tests

### Fonctionnels

- Création organisation privée et activation marketplace ; publication et retrait d'une offre.
- Unités et conversions : kg/sac, caisse/pièce ; refus d'une conversion absente.
- Poids brut/tare/net, pesées répétées, tolérances, quantité partielle et pertes.
- Propositions concurrentes, expiration, refus, contre-offre et acceptation.
- Réservation en concurrence, annulation, expiration, reprise après perte réseau et requête idempotente.
- Commande multi-vendeurs, livraison fractionnée, réception partielle, paiements partiels et remboursement.
- Calcul de commission par taux, montant fixe, base, payeur, dates d'effet et règle historique.
- Litige, ajout de preuve, droits de lecture, escalade manuelle et clôture.
- Avis vérifié, avis non autorisé avant réception, réponse et modération.

### Offline/synchronisation

- Mode avion pendant création, fermeture/réouverture, reprise et envoi différé.
- Doublon de synchronisation, ordre d'opérations, échec partiel et retry.
- Modification simultanée même offre, même lot, fiche descriptive et règle de prix.
- Horloge appareil erronée ; conserver serveur comme temps de référence pour événements sensibles.
- Effacement de l'application/cache et restauration depuis sauvegarde autorisée.

### Sécurité

- Accès inter-tenant, inter-site, rôles supprimés, liens de pièces expirés et accès direct par identifiant.
- Double réservation, replay d'une confirmation, paiement dupliqué, paramètres client falsifiés.
- Fichiers non conformes, fichiers volumineux, XSS dans description/avis, injections et abus de débit.
- Session révoquée, licence expirée, réseau absent et appareil perdu.

### Qualité & compatibilité

- Test mobile Android API 23 et API 29, navigateurs desktop/mobile, FR/MG, connexions lentes, petit écran et accessibilité.
- Builds CI reproductibles ; APK Debug et deux variantes Release vérifiées séparément avant distribution.
- Tests de performance sur catalogue/recherche, rapports, photos et synchronisation par lots.
- Tests de restauration sauvegarde et vérification des journaux d'audit.

---

## 13. Roadmap progressive

| Étape | Contenu | Critère de sortie |
|---|---|---|
| 0 — Cadrage V1.0 | Parcours, règles, modèle, prototype d'écrans, validation du scénario terrain | Périmètre priorisé et hypothèses tarifaires listées |
| 1 — Socle privé | Authentification, tenants/sites, rôles, catalogue, unités, lots, pesées, stock, ventes manuelles, offline-first | Un groupement peut tenir son stock et traiter une commande interne en essai |
| 2 — Vente privée | Offres privées/partagées, demandes, négociation, réservation en ligne, commandes, livraison, paiements manuels, rapports de base | Parcours bout en bout privé avec traçabilité et synchronisation vérifiée |
| 3 — Marketplace pilote | Profils vendeurs, recherche publique, publication contrôlée, sous-commandes, commissions configurables, évaluations et litiges | Pilote fermé dans une région avec règles et assistance opérationnelles |
| 4 — Premium | Multi-sites, équipe élargie, exports, rapports comparatifs, sauvegarde/restauration, alertes et options avancées | Critères Premium adoptés par utilisateurs pilotes |
| 5 — Pro / industrialisation | API intégrations, gestion avancée de commissions, multi-organisations, SLA/monitoring, sécurité approfondie, builds et licences AppForge | Revue sécurité et modèle économique validés pour commercialisation |

### Priorités produit

- **MVP** : mode privé, produits, unités, lots, pesées, offres privées, demandes/commandes, stock, paiements manuels, audit local/serveur et synchronisation contrôlée.
- **Premium** : multi-sites, multi-responsables, rapports et exports enrichis, documents, règles personnalisées et gestion d'équipe.
- **Pro** : marketplace multi-vendeurs, modération, commissions, sous-commandes, réputation vérifiée, gestion de litiges et outils opérateur.

---

## 14. Décisions ouvertes à confirmer avant pilote

- Région, filières et unités de départ (prioriser 2–3 filières pour valider le vocabulaire et les poids).
- Prix fixe, négociable ou les deux selon catégorie ; tolérances de pesée par produit.
- Qui encaisse : directement vendeur ou opérateur ; l'architecture V1 privilégie le paiement direct entre parties et la consignation de preuve.
- Commission éventuelle, payeur et événement de déclenchement ; valeur initiale à zéro tant qu'elle n'est pas approuvée.
- Documents de vérification vendeur et politique de confidentialité/litige locale.
- Limites de stockage, quotas hors ligne et durée de cache selon appareils/connectivité.
- Niveau de visibilité des coordonnées avant et après commande.

---

## 15. État vérifiable de cette première étape

- **Réalisé dans ce livrable :** cadrage V1.0, parcours, règles, écrans, modèle de données, architecture cible, sécurité, hypothèses économiques, critères d'acceptation, matrice de tests et roadmap.
- **Maquette :** livrée dans le fichier HTML associé ; elle illustre des écrans et interactions de démonstration.
- **Non réalisé à ce stade :** backend Cloudflare, base D1, authentification réelle, synchronisation serveur, AppForge, dépôt GitHub, actions CI, APK et validation terrain.
- **Prochaines actions :** 1) valider les filières/unités pilote ; 2) initialiser le dépôt et le squelette API/client sur branche dédiée ; 3) construire le socle privé avec journal local et tests de synchronisation.
