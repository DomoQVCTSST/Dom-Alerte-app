# Dom-Alerte — Site (dépôt public)

Ce dépôt contient uniquement le **site statique** de l'application DomAlerte
(HTML/CSS/JS). Il ne contient **aucune donnée** : aucune fiche d'incident,
aucun identifiant, aucun mot de passe.



## Pourquoi séparer les deux ?

- Ce dépôt étant **public**, GitHub Pages peut l'héberger gratuitement.
- Le dépôt de données reste **privé**, car il contient des informations
  personnelles sensibles.
- Le code ici ne fonctionne qu'une fois connecté à un dépôt de données via
  un token — sans token valide, aucune donnée n'est accessible ni visible
  dans ce dépôt.

## Activer l'hébergement (GitHub Pages)

**Settings → Pages** → Source : branche `main`, dossier `/ (root)`.
Le site sera accessible à :
`https://domoqvctsst.github.io/Dom-Alerte-app/`

## Première connexion

1. Ouvrez `index.html` (via l'URL Pages une fois activée, ou en local).
2. Les champs propriétaire/dépôt sont pré-remplis avec `DomoQVCTSST` /
   `Dom-Alerte` (le dépôt privé de données). Collez votre token GitHub
   personnel (scope `repo`, avec accès à ce dépôt privé).
3. Si `data/users.json` est vide côté dépôt privé, l'écran de création du
   compte administrateur apparaît automatiquement.

## Structure

```
index.html          Connexion (configuration du dépôt de données + login)
dashboard.html        Tableau de bord (KPI + graphiques)
saisie.html              Formulaire de saisie / modification d'un incident
fiches.html                Historique, filtres, export Excel
parametres.html              Connexion au dépôt de données, comptes utilisateurs
style.css                      Charte graphique
github-db.js                    Accès à l'API GitHub (lecture/écriture JSON)
auth.js                          Comptes, session, hachage des mots de passe
app-data.js                        Listes de valeurs, CRUD incidents, export Excel
```

Le script de migration Excel → JSON (`migrate_excel_to_json.py`) vit dans le
dépôt privé de données, pas ici, puisqu'il manipule des données sensibles.
