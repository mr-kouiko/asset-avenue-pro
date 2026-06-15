## Objectif
Finaliser la connexion Google Search Console pour `https://visustock.com/`.

## Pré-requis
La balise `<meta name="google-site-verification" content="gZ9OtLFb30GwvlTsWqJqIiR1r4mqQMz02j6NufJJ9YY" />` doit être **publiée** et visible dans le HTML de `https://visustock.com/`. Si vous n'avez pas encore cliqué sur Publish depuis l'ajout de la balise, faites-le avant d'approuver ce plan — sinon Google répondra `failedToFindMetaTag`.

## Étapes
1. **Vérification de la balise live** — `curl https://visustock.com/` et confirmer que la meta tag est présente dans le HTML servi.
2. **Appel verify** — POST sur `siteVerification/v1/webResource?verificationMethod=META` via le gateway, avec `identifier: https://visustock.com/`. Une réponse 200 = propriété vérifiée.
3. **Ajout du site à Search Console** — PUT sur `webmasters/v3/sites/https%3A%2F%2Fvisustock.com%2F` pour qu'il apparaisse dans la liste des propriétés.
4. **Soumission du sitemap** — PUT sur `webmasters/v3/sites/https%3A%2F%2Fvisustock.com%2F/sitemaps/https%3A%2F%2Fvisustock.com%2Fsitemap.xml`.
5. **Marquer le finding `gsc:gsc` comme fixed** dans le panneau SEO.

## En cas d'échec à l'étape 2
Si Google ne trouve pas la balise (site pas encore publié, cache CDN, etc.), je m'arrête et vous demande de publier puis de relancer "vérifier".

Aucune modification de code n'est nécessaire — uniquement des appels API.