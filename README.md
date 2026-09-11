# Diagnostic numérique

Plateforme de diagnostic pour préparer 12 ateliers de médiation numérique. Interface en français, sans inscription participant. Le site statique est compatible avec GitHub Pages.

## État de cette première version

- Parcours de 90 minutes : habitudes, 12 questions, 6 manipulations, pause, 3 situations et bilan.
- Démonstration participant et tableau de bord avec données explicitement fictives, utilisables sans Supabase.
- Collecte centrale préparée avec Supabase : accès animateur par e-mail et mot de passe, code de séance, sauvegarde automatique, résultats et export CSV.
- **Les vraies séances sont utilisables sans Supabase avec récupération de fichiers. La transmission automatique reste désactivée tant que `dist/config.js` et Supabase ne sont pas configurés.**
- L’envoi de réponses par e-mail n’est pas implémenté. C’est une alternative à choisir ou un complément futur. Le CSV se télécharge depuis l’espace animateur.

## Consulter le site

Après activation de GitHub Pages et déploiement : https://mathieubal.github.io/diagnostic-numerique/

Le site est publié à cette adresse. Dans le dépôt, ouvrir **Settings > Pages**, puis sélectionner **GitHub Actions** comme source. Le workflow `Publier le site` publie uniquement `dist/`, après les vérifications. Au besoin, lancer ce workflow manuellement dans **Actions**.

## Connexion de la collecte centrale — à faire plus tard

1. Créer ou choisir un projet Supabase dédié.
2. Dans SQL Editor, exécuter une fois `supabase/schema.sql`. Ce script crée les tables, active RLS et limite les accès aux fonctions RPC autorisées.
3. Créer le compte du formateur dans **Authentication > Users**. Utiliser un mot de passe personnel, jamais inscrit dans GitHub.
4. Dans SQL Editor, autoriser ce compte :

   ```sql
   insert into public.trainers(user_id)
   select id from auth.users where email = 'adresse-du-formateur@example.com';
   ```

5. Renseigner `supabaseUrl` et `supabaseKey` dans `dist/config.js`. La clé doit être **publishable** ou l’ancienne clé **anon**. Une clé `service_role` ou secrète ne doit jamais figurer dans le site ou le dépôt.
6. Vérifier la collecte avec une séance d’essai et deux navigateurs indépendants avant d’accueillir le groupe. Le test connecté reste à effectuer tant qu’aucun projet n’est relié.

Documentation : [fonctions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Animer une séance

1. Se connecter à `admin.html`, créer une séance et communiquer son code.
2. Préparer un dossier `Atelier` sur le bureau de chaque poste, avec `Depart.txt` et `entrainement.html` (dans `dist/`). Un éditeur de texte doit ouvrir les `.txt`.
3. Les participants ouvrent le site, renseignent prénom/pseudonyme et code, puis avancent. Le bouton « Je ne sais pas » et les réponses laissées vides restent distincts.
4. Le site transmet les modifications après une courte pause de saisie et réessaie en cas de coupure. Le message de statut distingue les réponses locales des réponses reçues par le serveur. Le participant conserve une copie JSON en cas de problème.
5. L’animateur consulte la séance, ajoute ses observations et télécharge le CSV. L’enregistrement a lieu au fil du parcours, même si le participant ne termine pas.
6. Fermer la collecte seulement après vérification des dernières transmissions. La fermeture bloque les nouvelles inscriptions et sauvegardes ; une réouverture reste possible.

Le poste participant conserve un identifiant secret aléatoire pour reprendre le parcours. Le prénom n’est pas une authentification. Sur un poste partagé, effacer la copie locale via l’accueil après collecte. Ne pas utiliser la navigation privée si l’on souhaite reprendre plus tard. Le compte animateur reste en mémoire de l’onglet et demande une nouvelle connexion après rechargement.

## Interpréter les résultats

La vitesse n’est pas une note. Les manipulations hors navigateur doivent être observées par l’animateur : « réalisé seul » est une déclaration, pas une preuve. Les codes 0–3/NO de l’animateur sont séparés des déclarations. Aucun score général ni classement. Les usages sur mobile et certains domaines ne sont explorés que par questions ou besoins déclarés.

Les questions et leurs corrections sont dans le code du site : ce diagnostic n’est pas un examen sécurisé. Les réponses nominatives ne sont jamais écrites dans le dépôt. Définir avec la structure une durée de conservation adaptée, puis supprimer les séances concernées dans Supabase (suppression en cascade des participants).

## Vérification technique

Node.js 22 ou supérieur, sans installation de dépendances :

```sh
npm test
npm run check
```

Le workflow exécute ces vérifications avant publication. Tests locaux : CSV (encodage, guillemets, retours ligne, neutralisation des formules), échappement HTML, indicateurs de réponses et cohérence du contenu. La validation connectée de Supabase et la vérification visuelle dans un navigateur restent à faire. Les tests couvrent aussi le récapitulatif, la synthèse par domaine et les observations incomplètes.

Pour un essai local : servir `dist/` avec un serveur HTTP statique. Ouvrir directement `index.html` en `file://` ne convient pas aux modules JavaScript.

## Organisation

- `dist/` : site publié, interface participant et animateur, contenu, exercices et configuration publique.
- `supabase/schema.sql` : installation du stockage et des accès.
- `tests/` : vérifications sans dépendances.

L’interface utilise des modules JavaScript standards. `dist/api.js` isole la collecte pour faciliter un éventuel remplacement par un service de transmission par mail.


## Améliorations ergonomiques

- Navigation directe entre les sept parties, y compris sur mobile. Les durées restent indicatives.
- Récapitulatif des éléments sans réponse et retour direct vers chacun avant de terminer.
- Démonstration mémorisée séparément du parcours réel, avec reprise après rechargement.
- Taille du texte et contraste réglables, labels accessibles, messages d’enregistrement visibles.
- Recherche et filtres participants, synthèse des neuf domaines et export dédié.
- Observation de douze gestes distincts, évaluations des situations et protection contre la perte de notes non enregistrées.
- Les anciennes observations globales D1–D6 restent conservées et exportées, mais ne servent pas à déduire les nouveaux gestes détaillés.
- Préparation de séance intégrée avec déroulé de 90 minutes et fichiers à installer sur les postes.

Les nouveaux champs restent dans les objets JSON déjà prévus : aucune migration du schéma n’est nécessaire pour cette évolution. La connexion Supabase et le test de collecte réelle restent à effectuer.


## Utiliser la plateforme dès maintenant, sans Supabase

1. Sur le poste formateur, ouvrir `admin.html`, puis **Ouvrir mes séances sur cet ordinateur**.
2. Créer une séance. Ouvrir le lien habituel du site sur tous les postes : aucun code à saisir en mode par fichiers.
3. Chaque personne saisit un prénom ou pseudonyme distinct et commence son vrai diagnostic. Les réponses sont conservées dans son navigateur ; elles ne sont pas transmises.
4. Dans **Préparer la séance**, imprimer une grille d’observation par personne. Noter les gestes et réponses orales au fil de l’atelier.
5. Réserver les cinq dernières minutes du bilan à la récupération : chacun termine puis clique sur **Télécharger mon résultat**. Récupérer les fichiers JSON de Téléchargements sur une clé USB ou dans un dossier partagé.
6. Sur le poste formateur, sélectionner tous les fichiers de la séance et cliquer sur **Importer les fichiers sélectionnés**. Vérifier le nombre et les prénoms. Les résultats sans code sont affectés à la séance sélectionnée par l’animateur : vérifier le groupe avant import. Les anciens fichiers portant un autre code restent refusés ; deux personnes de même prénom ne sont pas fusionnées.
7. Reporter les observations dans chaque dossier, puis exporter le CSV et **Sauvegarder toute la séance**. Le JSON contient les réponses et observations et se réimporte sur un autre poste ; le CSV sert à l’analyse.
8. Après confirmation de récupération, effacer les copies locales sur les postes partagés. La suppression d’une séance dans l’espace formateur nécessite confirmation.

Le code est un repère de regroupement, pas un mot de passe. La récupération par fichiers est manuelle et ne nécessite pas de serveur. Ne pas déposer les réponses dans le dépôt GitHub public. Le site a besoin d’Internet pour charger et pour la recherche web ; ce mode ne promet pas un fonctionnement entièrement hors ligne.

Les sauvegardes de séance utilisent le format versionné `diagnostic-seance` et les résultats individuels `diagnostic-participant`. Les fichiers de démonstration sont refusés à l’import. Les réimports utilisent un identifiant de participant et un numéro de révision : les anciennes réponses ne remplacent pas les plus récentes et les observations présentes sont conservées. Maximum : 250 participants par séance et 20 Mo par fichier importé. La capacité du stockage du navigateur peut être inférieure : en cas d’alerte, exporter immédiatement la sauvegarde avant de fermer la page.

Validation supplémentaire : aller-retour résultat → import → observations → sauvegarde → restauration → CSV, doublons, révisions anciennes, prénoms identiques et rejets des fichiers invalides. La vérification dans un vrai navigateur et sur les postes de l’atelier reste à faire. Avant la séance, faire un essai avec un pseudonyme de test sur deux postes et vérifier la récupération du fichier.

Le lien participant est désormais commun à tous les groupes. Le prénom est le seul champ obligatoire en mode par fichiers ; la séance est choisie par l’animateur lors de l’import. Les liens d’exercice sont accessibles depuis les consignes : aucune autre adresse à distribuer.


## Parcours thématique enrichi (version 2)

Un seul lien et le prénom uniquement en mode par fichiers. Le parcours contient désormais 12 questions, 12 mini-jeux (association, tri, ordre et choix contextualisés), 6 manipulations réelles et 3 situations ouvertes, soit 33 activités et 36 écrans avec habitudes, pause et bilan.

Durées indicatives : habitudes 5 min ; appareil/clavier/souris 12 min ; fichiers/documents 15 min ; recherche 10 min ; pause 5 min ; e-mails 10 min ; sécurité 10 min ; démarches 8 min ; mobile/réseaux/IA 10 min ; bilan et récupération 5 min. Total : 90 min. Annoncer les transitions, permettre de passer et noter les observations manquantes plutôt que pousser à finir. Les durées des six manipulations sont incluses dans leurs catégories, pas ajoutées au programme.

La synthèse conserve neuf domaines distincts, même lorsque mobile, réseaux et IA sont réunis dans une partie d’animation. Les mini-jeux ajoutent des réponses carte par carte, leur correction, les omissions, ainsi que la confiance et l’aide déclarées facultativement. Une réponse non fournie ne devient pas une erreur. Pas de classement ni de score global. Garder les corrections pour le débrief, car une correction immédiate pourrait influencer les activités suivantes.

Les réponses des anciens parcours sont conservées et leur position locale est remappée vers l’activité correspondante. Leurs mini-jeux non effectués apparaissent comme non renseignés.

Si Supabase avait déjà été installé, exécuter `supabase/upgrade-parcours-v2.sql` avant d’activer la transmission du nouveau parcours (la limite de position passe de 23 à 35). Le mode par fichiers fonctionne sans cette migration. Pour une nouvelle installation, utiliser le schéma principal à jour.


## Analyse graphique et programme d’ateliers (version 3)

Dans l’espace animateur, **Graphiques** affiche l’avancement, les réponses aux questions et aux cartes par domaine, l’autonomie observée, les envies, la confiance croisée avec les réponses, et une matrice participants × domaines. Cliquer un segment ou sa légende permet de retrouver les personnes ; cliquer une case détaille les éléments puis ouvre leur dossier. Les dénominateurs sont explicités : les barres de connaissances comptent des réponses (absences comprises), celles d’autonomie comptent des personnes. La confiance ne croise que des mini-jeux complètement renseignés avec une confiance déclarée. Les évaluations humaines de S1/S2/S3 interviennent dans les domaines correspondants de la matrice et des propositions.

**Mes 12 ateliers** propose deux prérequis, puis les autres domaines classés par nombre de personnes avec besoin repéré et ensuite par demandes. Deux consolidations et un bilan complètent le programme ; une demande de documents/tableaux remplace une consolidation par ce thème non évalué en détail. Le programme explique les données disponibles et les lacunes. Titres, objectifs, activités, variantes, vérifications, participants et notes sont modifiables ; l’ordre aussi. Enregistrer fige cette version. Recalculer est explicite et demande confirmation avant de remplacer les adaptations. Le CSV exporte le programme courant ; la sauvegarde JSON de séance inclut la version enregistrée. Les anciennes sauvegardes restent importables.

Les graphiques et propositions fonctionnent immédiatement avec les fichiers importés et la démonstration. La collecte automatique n’est pas activée tant que le projet Supabase reste non configuré. Les programmes en mode local sont enregistrés dans le navigateur et inclus dans la sauvegarde de séance ; en mode connecté, ils sont réservés au propriétaire de la séance.

### Activer le lien unique connecté

- Nouvelle installation : installer le `supabase/schema.sql` actuel (il inclut les fonctions d’analyse et d’accueil unique).
- Installation ancienne : appliquer `supabase/upgrade-parcours-v2.sql` si nécessaire, puis `supabase/upgrade-analyse-v3.sql`.
- Créer le compte animateur et l’autoriser comme indiqué au début de ce document, puis renseigner seulement l’URL publique et la clé publishable/anon dans `dist/config.js`.
- Dans l’espace animateur connecté : créer ou sélectionner une séance et cliquer **Accueillir sur le lien unique**. Cette action ouvre la séance et y rattache les nouvelles arrivées sur le lien habituel. Les anciens participants restent dans leur séance ; changer la séance d’accueil ne déplace pas leurs réponses.
- Les participants saisissent seulement leur prénom. Sans séance d’accueil ouverte, le site leur demande de prévenir l’animateur. Une inscription réessayée avec le même identifiant et secret conserve sa séance d’origine, même si l’accueil a changé entretemps.
- Une seule séance d’accueil pour ce projet dédié. Un autre animateur ne peut pas prendre la main sur une entrée appartenant à un collègue. Aucun accès public aux réponses, observations ou programmes ; seules les fonctions d’inscription et de sauvegarde participant sont accessibles sans compte.
- Avant utilisation réelle : depuis deux navigateurs, créer une séance, l’activer, remplir quelques réponses, confirmer leur réception, enregistrer une observation et un programme, se reconnecter et vérifier leur présence. Tester ensuite la fermeture de la collecte et le refus d’accès avec un compte non autorisé. Cette validation connectée reste à effectuer : aucun projet Supabase n’était accessible pendant le développement.

Vérifications automatiques : calculs avec réponses partielles, dénominateurs, sélection des personnes par segment, confiance, observations de situations, conditions des acquis, programme sans données, programme de 12 ateliers et aller-retour des adaptations par sauvegarde. Vérification visuelle dans un navigateur non réalisée.


## Supprimer une ancienne séance (version 4)

Pour une base existante, exécuter une fois `supabase/upgrade-suppression-v4.sql`. Ce script installe la fonction ; il ne supprime aucune donnée. Le schéma complet inclut cette fonction pour les nouvelles installations.

Dans l’espace animateur connecté : sélectionner la séance, fermer sa collecte, puis ouvrir **Supprimer cette séance**. Un bouton permet de sauvegarder son JSON avant suppression. Le bouton de suppression demande de recopier le nom exact ; la référence de séance est aussi affichée dans la confirmation. La vérification du compte animateur, de la propriété, de la fermeture et du nom est effectuée côté base. Le bouton n’agit pas dans la démonstration.

La suppression efface définitivement la séance, son programme, ses participants et leurs observations. Si elle était désignée comme accueil, cette désignation disparaît ; aucune autre séance n’est activée automatiquement. Les fichiers exportés et les copies conservées dans les navigateurs participants ne sont pas effacés à distance. Le mode local conserve son action distincte **Effacer cette séance de ce navigateur**.

La validation de la suppression en base doit être faite après installation, sur une séance de test appartenant au formateur. Aucun effacement réel n’a été effectué pendant le développement.
