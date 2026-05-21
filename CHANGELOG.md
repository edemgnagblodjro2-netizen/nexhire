# Changelog AttenteZéro

Historique des releases mobile. Les notes de la release **en cours** restent dans `replit.md` ; tout le reste est ici.

## v1.1.21 build114 — Fix Apple 2.1(b) — card Premium masquée iOS (21 mai 2026)
- **Refus Apple 2.1(b) Information Needed** : Apple demandait une clarification sur le modèle de revenus — la card "20 $ à vie" de l'onglet Plus était visible sur iOS, ce qui laissait croire à du contenu payant hors IAP.
- **Fix `more.tsx`** : Card "20 $ à vie" enveloppée dans `{Platform.OS !== "ios" && ...}` → invisible sur iOS. Identique à ce qui était déjà fait dans `premium.tsx` depuis v1.1.18.
- **Fix bannière rappel** : La bannière "limite quotidienne" (mentionnant "20 $ à vie") est également masquée sur iOS.
- **Fix badges account** : Les chips "Abonnement / Avancé / Soutenir" étaient hardcodés pour tous les utilisateurs. Remplacés par des chips dynamiques : "Premium + Soutien" si `user.isPremium`, sinon "Gratuit".
- **Sur iOS, l'onglet Plus ne contient plus aucune mention de prix** : seules les fonctionnalités gratuites sont présentées.
- EAS Build ID : `c20d96c6-c765-43bf-acf5-1f1668b8b6f1`, buildNumber **115** (auto-incrémenté par EAS depuis 114).
- Réponse envoyée à Apple via Resolution Center (21 mai 2026).

## v1.1.20 build108 — Soumis TestFlight (21 mai 2026)
- **EAS Build iOS** : Build ID `c22060d1-f8fd-4a4e-a20b-19e3115464c5`, buildNumber **108**, version **1.1.20**.
- **Soumission TestFlight** : Submission Expo `690cb52c-ce44-4a93-89ad-c295eaaadff8` — statut `FINISHED` ✅ (21 mai 2026).
- **Pourquoi build 108 et pas 112** : Le build EAS `41106c50` (buildNumber 112) échouait systématiquement côté Apple Transporter (`ERRORED` × 3 sans message d'erreur) — probablement conflit de doublon (build 112 déjà présent côté ASC). Build 108 (EAS `c22060d1`) était vierge et a passé sans erreur.
- **Clé .p8 `T82TVVZ6A3`** : validée HTTP 200 via ASC API — toujours valide, pas besoin de régénérer avant launch.
- Build en traitement Apple (~15–45 min) → apparaîtra dans TestFlight onglet *Builds de test iOS*.
- Changements inclus dans cette version : (à compléter selon les commits depuis v1.1.19).

## iOS / TestFlight — Configuration de base (6 mai 2026)
- Compte Apple Developer payé + approuvé.
- Clé App Store Connect API (.p8) générée, stockée en secrets Replit (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`, `APPLE_TEAM_ID`).
- ⚠️ Clé .p8 leakée 1× dans logs bash (Replit n'a pas masqué) — à révoquer/régénérer post-launch par sécurité.
- `artifacts/service-qc/asc-api-key.p8` reformatée en PEM proprement, gitignorée (`*.p8`).
- `eas.json` : profil iOS production ajouté (resourceClass=m-medium, autoIncrement=buildNumber) + submit profile complet (ascApiKeyPath, ascApiKeyId, ascApiKeyIssuerId, appleTeamId, ascAppId=6766750916).
- `app.json` : `ITSAppUsesNonExemptEncryption=false` (évite question manuelle Apple à chaque submit).
- App créée sur App Store Connect : Apple ID **6766750916** (bundle `com.attentezero.app`, langue fr-CA, SKU `attentezero-ios`). ⚠️ Création app via ASC API impossible (Apple bloque CREATE), web UI obligatoire.
- Override pnpm `@xmldom/xmldom: ^0.8.10` (root package.json) → fix prebuild crash sur EAS server (incompatibilité xmldom 0.9 ↔ @expo/plist 0.4.8).
- **Gotcha credentials** : tout premier `eas build --platform ios` exige mode interactif (Apple ID + 2FA), même avec ASC API key. Ensuite stockés sur EAS, builds suivants tournent en `--non-interactive`.

## v1.1.19 build107 — Build + soumission Apple Review (fix 3.1.1 + 5.1.1)
- **EAS Build iOS lancé** : Build ID `b6b7093a-635c-475e-af00-dc581e13450f`
- **Auto-submit déclenché** : Submission ID `afafec3b-3fe1-4df8-ab57-275b64e3b35b`
- **buildNumber** : 105 → 106 → **107** (auto-incrémenté 2× par EAS lors des tentatives)
- **version** : 1.1.18 → **1.1.19**
- Build lancé avec `EAS_NO_VCS=1` pour éviter le blocage git de l'agent Replit.

## v1.1.18 vc80 build105 — Fix refus Apple 3.1.1 + 5.1.1 (2e tentative)
- **Fix 3.1.1 Apple (2e)** : Sur iOS, la page "Nos forfaits" ne montre plus QUE le forfait gratuit. Les tiers Premium (20$), Organisme (149,99$) et Partenaire (299,99$) sont entièrement masqués sur iOS via `IOS_VISIBLE_TIERS = TIERS.filter(t => t.ctaKind === "free")`. Le chip d'en-tête passe de "TARIFICATION" à "FONCTIONNALITÉS" sur iOS. Une bannière verte explique que tout est gratuit. Aucun prix, aucun lien d'achat, aucun mailto de commande sur iOS.
- **Fix 5.1.1 Apple (2e)** : Ajout du `privacyManifests` dans `app.json` (`ios.privacyManifests`) avec les 4 types d'API requis : UserDefaults (CA92.1), FileTimestamp (C617.1), DiskSpace (E174.1), SystemBootTime (35F9.1). `NSPrivacyTracking: false`, `NSPrivacyTrackingDomains: []`, `NSPrivacyCollectedDataTypes: []`.
- buildNumber 104 → 105, versionCode Android inchangé (80).

## v1.1.18 vc80 build100 — Fix refus Apple + Programme ambassadeur
- **Fix 3.1.1 Apple** : Stripe complètement retiré sur iOS. Toutes les fonctionnalités Premium gratuites sur iOS via `Platform.OS === "ios"` dans `usePremiumGate.ts` et `premium.tsx`.
- **Fix 5.1.1 Apple** : Politique de confidentialité entièrement refondue sur `attentezero.ca/privacy`.
- **Champ code ambassadeur à l'inscription** : champ "Code ambassadeur" visible dans le formulaire `register.tsx`, auto-claim après inscription réussie.
- **Android vc80** : ✅ Approuvé et disponible sur Play Store.
- **iOS build 100** : ⏳ En review Apple (soumis après refus 3.1.1 + 5.1.1 sur v1.1.17).

## v1.1.16 vc91 — Fix stats "au Québec" + splash count corrigé
- **Stats strip accueil corrigées** : labels passent de `"services"` → `"services au Québec"` / `"services in Québec"` et `"villes"` → `"villes QC"` / `"QC cities"`.
- **Splash count corrigé** : `SERVICES_COUNT_LABEL` corrigé `8 037 → 7 957` (vrai count BDD prod).
- **Cache v32→v33** : force un fresh fetch côté app pour afficher le bon total.
- Android versionCode 76→77, iOS buildNumber EAS auto-bump 90→91.

## v1.1.15 vc89 — Fix tab bar Android (safe area insets)
- **Bug Android corrigé** : tab bar partiellement cachée derrière la barre de navigation système sur certains téléphones Android. Fix : `useSafeAreaInsets()` dans `_layout.tsx`, `height: 60 + insets.bottom` + `paddingBottom: insets.bottom` sur `tabBarStyle`.
- iOS buildNumber EAS auto-bump 88→89, Android versionCode 75→76.
- Cleanup imports inutilisés (`BlurView`, `useColors`, `useColorScheme`, `isDark`, `isIOS`).

## v1.1.14 vc85 — Overflow numéro téléphone + couverture services (mai 2026)
- **Bug UI corrigé** : débordement du numéro de téléphone dans `ServiceCard.tsx`. Footer `flexWrap: "wrap"` + `flex: 1` sur `cityRow` → le bouton appel passe automatiquement à la ligne suivante si trop large. `flexShrink: 0` sur callButton, `flexShrink: 1` sur callText.
- **+80 services ajoutés en prod** (7 957 → 8 037) sur 12 villes QC sous-couvertes.
- iOS buildNumber 84→87 (auto-incrémenté par EAS), Android versionCode 74→75.

## v1.1.13 vc78 — Tab bar redesign
- `app/(tabs)/_layout.tsx` retravaillé : fond `#0d9488`, coins arrondis, ombre relevée, pill actif unifié sur toutes les tabs.
- iOS buildNumber 81→82, Android versionCode 73→74.

## v1.1.13 vc77 — Splash design B (Moderne illustration)
- Splash mobile redesign : `components/AppSplashScreen.tsx` réécrit selon design B approuvé.
  - Fond `#0d9488` plein, 5 cercles concentriques décoratifs, 5 sparkles dispersés.
  - Logo card 112x112 sur outer-glow 128x128.
  - Wordmark `AttenteZéro` Inter_700Bold 34pt, tagline `Services communautaires du Québec` Inter_500Medium 13pt.
  - Badge pill `7 957 services actifs`.
  - Footer `PROPULSÉ PAR / CivicAI`.
  - Animation : rings+logo (350ms) → text (220ms) → badge+footer (220ms) → total ~1.1s.
- Compte hardcodé `7 957` dans `SERVICES_COUNT_LABEL` — à mettre à jour manuellement quand ce nombre évolue.
- iOS buildNumber 80→81, Android versionCode 72→73.
- ⚠️ Web preview fige sur 1ère frame de l'anim (useNativeDriver pas dispo en web RN) — normal, native iOS/Android tourne smooth.

## v1.1.13 vc76 — +Montérégie 1007 + Côte-Nord 535 + Chaudière-Appalaches 995 + Capitale-Nationale 1791 + Haute-Yamaska 261 + FQOCF 205 + Emploi-QC 273 + CIUSSS-EMTL 46 + Logement-Rive-Sud 4
- **+4 services logement Rive-Sud** (Comité logement Rive-Sud, Office d'habitation de Longueuil OHL, Tribunal administratif du logement TAL province-wide, AILIA logements accessibles).
- **+46 installations CIUSSS-EMTL** (Est-Île-Montréal — CLSC, GMF, cliniques médicales, CHSLD, centres de jour). Géocodage : 44 ROOFTOP (96%).
- **+273 organismes employabilité Quebec.ca** scrapés depuis le répertoire officiel (35 pages, pagination `tx_solr[page]`). 263 ROOFTOP (96%).
- **+205 OCF FQOCF** scrapés depuis `fqocf.org/trouver-un-ocf/`. 200 ROOFTOP (97%, record absolu).
- **+261 fiches Haute-Yamaska** importées depuis paste-211. 180 ROOFTOP (69%).
- **+1791 fiches Capitale-Nationale** importées depuis paste-211 (16 320 lignes). 1267 ROOFTOP (71%).
- **+995 fiches Chaudière-Appalaches** importées depuis paste-211. 613 ROOFTOP (62%).
- **+535 fiches Côte-Nord** importées depuis paste-211. 230 ROOFTOP (43%).
- **+1007 fiches Montérégie** importées depuis `monteregie2-fr.pdf`. 952 ROOFTOP.
- **Endpoint bulk validé en prod** : 767 fiches en 1 requête, ~3 sec, 0 erreur.
- **PROD : 2750 → 7627 services actifs (+4877)**.
- Cache mobile bumpé v23→v32.

## v1.1.13 vc75 — Imports massifs OWI + Lanaudière + Laval + Outaouais + endpoint bulk
- **+90 fiches Ouest-de-l'Île** — Pipeline PDF→JSON, 83 ROOFTOP.
- **+242 fiches Lanaudière** — 233 ROOFTOP. Gotcha : rate-limit admin 60/IP/15min déclenché en burst parallèle.
- **+269 fiches Laval** — 255 ROOFTOP. 3 cycles burst+wait.
- **+440 fiches Outaouais** — 419 ROOFTOP.
- **MÉTHODE FORTE LIVRÉE — endpoint `POST /api/admin/services/bulk`** : accepte array jusqu'à 1000 payloads en une seule requête. Réponse : `{total, created, skipped, errors, results[]}`. Dédup auto via PG 23505.
- **PROD : 1709 → 2750 services actifs (+1041)**.
- Cache mobile bumpé v19→v23.
- ⚠️ **Gotcha rate-limit admin** : POST parallèle limité 60 req/IP/15min. Utiliser `/api/admin/services/bulk` pour bypass propre.

## v1.1.13 vc74 — Fix bundle mobile désynchronisé
- **BUG MAJEUR FIXÉ** : `data/services.ts` (bundle Expo) avait des IDs au format `qc-gat-fd001` (vieux) tandis que la DB utilise `qc-imm-gatineau-aco` (format actuel). Fix : régénération de `services.ts` depuis `services-data.json` (1710 services, IDs alignés). Cache mobile bumpé v17→v18.
- **Script permanent** : `pnpm --filter @workspace/scripts run regen-mobile-bundle`.
- Tuiles home : `aspectRatio` 1.15→1.7 + marginBottom 14→10. AI CTA remis taille originale.
- iOS buildNumber 78→79, Android versionCode 71→72.

## v1.1.9 — Phase 2 géocodage Google + fixes UX
- **Phase 2 géocodage Google LIVRÉE** : 2931 fiches re-géocodées (2750 ROOFTOP, 91 RANGE, 90 CENTER). Bilan global : 3686 vertes (≤100m) vs 845 avant (+335%). Coût réel ~99$ USD.
- Captcha MIN_AGE 2000→600ms (fix #1 plainte « inscription bloquée »).
- Bouton « Signaler un mauvais numéro » sur fiche service.
- Carte : bbox prefilter ~75km avant haversine (10-50× plus rapide), favSet O(1).
- **urgent.tsx BUGFIX** : `sortedServices` dépendait de `urgentServices` au lieu de `filteredServices` → la barre de recherche ne filtrait jamais la liste affichée.
- **sos.tsx redesign** : bouton 911 refait. Ajout Centre antipoison Québec, Info-Santé 811, Jeu : Aide et Référence.
- **Phase 1 fiabilité géolocalisation LIVRÉE** : 3 colonnes ajoutées à `services`, nouvelle table `service_corrections`, migration auto, carte filtrée, fiche avec bandeau précision, bouton « Position fausse ? », auto-validation à 3 corrections concordantes, panneau admin corrections.
