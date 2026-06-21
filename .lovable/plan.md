
# Suppression complète de Stripe → PayPal partout

Le seul flux qui utilise encore Stripe est **l'inscription payante des vendeurs** (BecomeSeller → `seller-registration-payment` → Stripe Checkout → `verify-seller-payment`). Le reste du paiement marketplace, crédits, et abonnements Infinity passe déjà par PayPal. On bascule l'inscription vendeur sur le système PayPal existant et on supprime tout le code/UI Stripe.

## 1. Inscription vendeur → PayPal ($15 USD)

- Étendre `supabase/functions/create-paypal-order/index.ts` pour accepter `order_type: "seller_registration"` avec un montant fixe de **$15 USD** (validé côté serveur, pas accepté du client).
- Étendre `supabase/functions/capture-paypal-order/index.ts` pour, à la capture d'un ordre `seller_registration`, faire un `upsert` du rôle `creator` dans `user_roles` pour `user_id` (récupéré depuis `custom_id`) — exactement la logique actuelle de `verify-seller-payment`.
- Réécrire `src/pages/BecomeSeller.tsx` → `handlePaidRegistration` : appeler `create-paypal-order` avec `order_type: "seller_registration"`, success_url `/seller-registration-success?paypal_order_id={ID}`, cancel_url `/seller-registration-cancelled`, puis rediriger vers `approval_url`.
- Réécrire `src/pages/SellerRegistrationSuccess.tsx` : lire `paypal_order_id` dans l'URL, appeler `capture-paypal-order`, afficher succès et rediriger vers `/seller-dashboard`.

## 2. Suppression des Edge Functions Stripe

Supprimer :
- `supabase/functions/seller-registration-payment/`
- `supabase/functions/verify-seller-payment/`

## 3. Nettoyage UI admin

- `src/components/admin/AdminSettings.tsx` : retirer le champ et l'état `stripeFeeRate`, ne garder que `commission_rate`. Passer `new_stripe_application_fee_rate: null` (ou retirer du payload) lors du save.
- `src/components/admin/AdminVendorManagement.tsx` : retirer la requête `stripe_accounts`, le champ `stripe_connected`, le compteur "Stripe connecté" et les badges Stripe ✓/✗.
- `src/components/AdminTransactionsDashboard.tsx` : renommer `stripe_payment_intent_id` → `paypal_order_id` dans l'affichage et le filtre de recherche (le champ existe déjà dans la table `transactions` ou via `paypal_orders` ; on lit la colonne PayPal correspondante).
- `src/pages/CreateTestAccounts.tsx` : retirer la mention "Paramètres Stripe gérés via les secrets sécurisés".

## 4. Base de données

Migration pour :
- `DROP TABLE public.stripe_accounts CASCADE;`
- `ALTER TABLE public.platform_settings DROP COLUMN stripe_application_fee_rate;`
- Mettre à jour la fonction `update_platform_settings` pour retirer le paramètre `new_stripe_application_fee_rate`.

## 5. Hors-scope (volontairement non touché)

- Les anciennes migrations SQL contenant `stripe_*` restent en l'état (historique versionné).
- Aucun secret Stripe n'est supprimé automatiquement — vous pourrez retirer `STRIPE_SECRET_KEY` manuellement dans Supabase secrets après le déploiement.

## Détails techniques

- Montant inscription vendeur : **$15 USD** (constante serveur dans `create-paypal-order`, jamais issue du client).
- Réutilisation totale de l'infra PayPal existante (`paypal_orders`, `capture-paypal-order`) → pas de nouveau webhook ni nouveau secret.
- Le flux gratuit (`register-free-seller`) reste inchangé.
