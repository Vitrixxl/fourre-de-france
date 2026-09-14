# Consignes pour les agents

Après chaque commit sur `main`, pousser le commit puis mettre à jour l'application
sur le serveur avec la commande suivante :

```sh
ssh vitrix@82.67.236.74 pihost update f2f
```

Vérifier que la commande se termine avec succès (le build Rust sur le Pi prend
plusieurs minutes) et signaler toute erreur de mise à jour.

L'application est servie sur https://f2f.vitrixxl.fr (un seul conteneur : API axum
qui sert aussi le front statique, données SQLite + photos dans le volume `fdf-data`).

Le projet doit toujours pouvoir se lancer avec un simple `docker compose up`.
