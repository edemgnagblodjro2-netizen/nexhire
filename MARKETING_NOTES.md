# 📣 AttenteZéro — Plan d'acquisition « gratuit »

> 3 leviers à activer en parallèle après le build vc64. Pas de budget pub requis.

---

## 1️⃣ Universal Links (deeplinks) — **côté technique : déjà fait dans le code**

### Ce qui est déjà en place
- ✅ `app.json` déclare `applinks:attentezero.ca` + `applinks:attentezero.replit.app` (iOS)
- ✅ `app.json` déclare `intentFilters` avec `autoVerify:true` (Android)
- ✅ Endpoint `/.well-known/apple-app-site-association` servi par l'API
- ✅ Endpoint `/.well-known/assetlinks.json` servi par l'API
- ✅ Page de fallback `/s/:id` avec design + auto-redirect vers l'app si installée
- ✅ Bouton « Partager » sur chaque fiche service génère `https://attentezero.ca/s/{id}`

### Ce qu'il TE reste à faire (1 fois, 30 min)

**Option A (recommandée) : domaine custom `attentezero.ca`**
1. Acheter `attentezero.ca` chez OVH / Namecheap (~15 $/an)
2. Dans le panneau DNS du domaine : ajouter un CNAME pointant vers ton URL Replit déployée
3. Dans la console Replit Deployments : ajouter `attentezero.ca` comme custom domain → Replit gère le TLS automatiquement
4. Ajouter ces secrets sur le déploiement :
   - `APPLE_TEAM_ID` (déjà existant, à vérifier)
   - `APP_STORE_URL=https://apps.apple.com/ca/app/attentezero/id6766750916`
   - `PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.attentezero.app`
5. Vérifier que `https://attentezero.ca/.well-known/apple-app-site-association` retourne du JSON
6. ✅ Désormais, quand quelqu'un partage `https://attentezero.ca/s/abc123` :
   - **App installée** → ouvre directement la fiche dans l'app
   - **App pas installée** → page web jolie + redirection App Store

**Option B (gratuite) : utiliser le sous-domaine Replit**
- Pas de domaine custom, on garde `https://attentezero.replit.app` (à vérifier que c'est bien le slug)
- ⚠️ Moins « pro » à partager mais ça marche

---

## 2️⃣ TikTok / Instagram Reels — scripts prêts à tourner

> 📊 **Pourquoi ce levier** : TikTok est devenu le **moteur de recherche n°1 des 18-30 ans** au Québec.
> Quasi zéro contenu social existant sur les aides québécoises. Trou béant.
> Format : vidéo verticale 30-60s, voix off (ou texte à l'écran), musique tendance.

### Reel #1 — « 3 aides que 90% des Québécois ignorent »
**Hook (3 sec)** : « Tu vis au Québec et tu gagnes moins de 50 000 $ ? Tu laisses peut-être 4 000 $ par année sur la table. »
**Corps (25 sec)** :
- 1️⃣ « Crédit solidarité — jusqu'à 1 450 $/an, à demander une seule fois »
- 2️⃣ « Allocation pour les travailleurs (ACT) — jusqu'à 2 800 $/an si tu travailles à faible revenu »
- 3️⃣ « Supplément de revenu garanti pour aînés — jusqu'à 12 800 $/an »
**CTA (2 sec)** : « Calcule combien T'AS DROIT en 30 secondes sur AttenteZéro — lien en bio. »

### Reel #2 — « Combien tu peux toucher au Québec »
**Hook** : « Maman seule avec 2 enfants, salaire 35 000 $ — voici ce qu'elle peut toucher : »
**Corps** : Animation chiffres qui défilent
- ACE : 14 745 $
- Allocation famille QC : 4 384 $
- Crédit solidarité : 1 450 $
- ACT : 2 813 $
- **Total : 23 392 $/an = +1 950 $/mois**
**CTA** : « Tu veux SAVOIR pour ton cas ? Télécharge AttenteZéro (gratuit). »

### Reel #3 — « Nouveau au Canada ? Voici quoi faire en 7 jours »
**Hook** : « Tu viens d'arriver à Montréal ? Voici les 7 démarches obligatoires : »
**Corps** : Liste rapide (NAS, RAMQ, École, Banque, IMM, Aide aux nouveaux arrivants, Cours de français)
**CTA** : « Toutes ces ressources sont sur AttenteZéro — gratuit, en 6 langues. »

### Reel #4 — « POV : tu trouves une banque alimentaire à 800m »
**Format** : POV stitch / before-after. Captures écran de l'app en mode carte.
**CTA** : « 5 000+ services au Québec. AttenteZéro. »

### Reel #5 — Témoignage utilisateur (à filmer après les 100 premiers users)
Vraie personne raconte « Comment j'ai trouvé un logement d'urgence en 2 heures grâce à AttenteZéro. »

### 💡 Tips de croissance TikTok
- **Poster 3-5 fois par semaine** pendant 6 semaines pour amorcer l'algo
- **Hashtags à coller** : `#québec #montréal #aidesociale #immigration #nouveauarrivant #astucesquébec #québécois`
- **Musique tendance** : utiliser les sons populaires du moment (le menu musique TikTok montre 🚀 sur les sons qui montent)
- **Premier commentaire = ton CTA** : « Lien dans la bio pour calculer combien tu touches 👇 »
- **Réponse en vidéo aux commentaires** : « Comment ça marche pour les étudiants ? » → fait un Reel #6

---

## 3️⃣ Influenceurs « finances perso Québec » — 10 cibles + template

### Liste cible (par ordre de pertinence)

| Personne | Plateforme principale | Audience cible | Reach approx |
|---|---|---|---|
| **Pierre-Yves McSween** | Podcast + Radio + Insta | Finances perso Québec | 100k+ |
| **PYR Marcoux** | YouTube + Insta | Investissement Québec | 50k+ |
| **Bénita Niamoton** (Bénita Conseils) | TikTok + Insta | Aide sociale, immigration | 80k+ |
| **Pierre Vital** (immigrant entrepreneur) | TikTok + LinkedIn | Nouveaux arrivants | 30k+ |
| **Caroline Codsi** | LinkedIn | Femmes au travail QC | 20k+ |
| **Jasmine Boudreau** | TikTok | Vie quotidienne QC | 50k+ |
| **Mocey** | TikTok | Astuces quotidiennes QC | 200k+ |
| **Sandrine Bourque** | TikTok + Insta | Famille monoparentale QC | 40k+ |
| **Eve Côté** | TikTok | Mère, vie de famille QC | 100k+ |
| **Le Wallet** (page community) | Insta | Finances jeunes Québécois | 30k+ |

### Template d'email/DM (à personnaliser)

> **Objet** : 🇨🇦 Outil gratuit pour ton audience québécoise — collaboration ?
>
> Bonjour [Prénom],
>
> Je suis [ton prénom], fondateur d'**AttenteZéro** — une app **100% gratuite** qui aide les Québécois à trouver les services communautaires + à calculer combien d'aide gouvernementale ils peuvent toucher (ACE, allocation famille, crédit solidarité, etc.).
>
> Je te contacte parce que ton audience [raison spécifique : ex « est exactement composée de jeunes parents qui pourraient toucher 4 000+ $/an d'aides sans le savoir »].
>
> **Ce que je propose** :
> - Tu testes l'app (1-2 min) → si tu aimes, tu la recommandes à ton audience
> - Je te donne **ton propre code de parrainage** (déjà existant dans l'app) → tu touches X par téléchargement OU on fait une **collab payée** (200-500 $/post)
> - Je peux te fournir des **chiffres exclusifs** sur les recherches d'aide au QC pour tes contenus
>
> Tu peux télécharger l'app ici : [URL TestFlight ou lien App Store une fois live]
>
> Si tu as 10 min cette semaine, je peux te montrer une démo Zoom rapide.
>
> Merci pour ton temps !
> [Ta signature]

### 💡 Tips outreach
- **DM Insta > Email** : 5x plus de réponses
- **Personnalise** la 1ère phrase à chaque fois (mentionne un de leurs récents posts)
- **Envoie 5-10 DM par jour** pendant 2 semaines → tu vas avoir 2-3 collabs gratuites + 1-2 payantes
- **Programme parrainage déjà dans l'app** : utilise-le, donne 1 mois premium par filleul
- **Privilégie les TikTokers de 30-100k followers** : meilleur taux d'engagement, prix abordable, audience moins « pollute »

---

## 📅 Plan suggéré

### Semaine 1 (juste après l'App Store launch)
- [ ] Acheter attentezero.ca + DNS + ajouter sur Replit Deployments
- [ ] Vérifier que `/.well-known/apple-app-site-association` répond
- [ ] Créer comptes TikTok + Insta « @attentezero » officiels
- [ ] Tourner & poster 3 premiers Reels (Reel #1, #2, #3)

### Semaine 2-3
- [ ] Poster 1 Reel/jour (5/semaine min)
- [ ] Envoyer 50 DMs influenceurs (5-7 par jour)
- [ ] Lancer parrainage : 1er mois premium gratuit / filleul

### Semaine 4
- [ ] Analyser : quels Reels ont fait > 10k vues → en faire des suites
- [ ] Recontacter les influenceurs « no-reply » avec un angle différent
- [ ] Planifier 1 collab payée (200-500 $) sur le créateur le plus pertinent

---

## 📌 KPIs à suivre

| Mois | Objectif réaliste |
|---|---|
| M1 | 500 téléchargements |
| M3 | 5 000 téléchargements |
| M6 | 25 000 téléchargements |
| M12 | 100 000 téléchargements |

> Avec 5 % d'utilisateurs actifs/mois, M12 = ~5 000 MAU → suffisant pour discussions B2G sérieuses (subventions Québec, MIDI, partenariats CISSS).
