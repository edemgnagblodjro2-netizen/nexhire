# Reply to Apple App Review — May 2026

**App:** AttenteZéro (com.attentezero.app)
**Build:** v1.1.18 build 100
**Date:** May 2026
**Destination:** App Store Connect → Resolution Center → Reply to Apple

---

## Message (English — paste into Resolution Center)

Dear App Review Team,

Thank you for your feedback. We have addressed both issues raised in the rejection of build 100 (v1.1.18). Here is a detailed summary of every correction made:

---

### Guideline 3.1.1 — In-App Purchase

AttenteZéro is a free public-interest app serving vulnerable populations (homeless individuals, undocumented immigrants, women in crisis situations). There are no paid features of any kind on iOS.

Changes made:

- Stripe has been **completely removed** from the iOS build. No Stripe SDK code is executed on iOS. The removal is enforced via a `Platform.OS === "ios"` check in `usePremiumGate.ts` and in the `premium.tsx` screen.
- The "Premium" button in the app now displays **"Gratuit" (Free)** on iOS and navigates to an information screen — no paywall, no payment prompt.
- All features that were previously described as "Premium" (unlimited AI assistant, saved favourites, alerts) are **fully accessible for free on iOS** without any purchase or subscription step.

There is no monetization on iOS in this build. The Stripe integration exists only in the Android and web versions of the platform, where it complies with Google Play and web billing rules.

---

### Guideline 5.1.1 — Data Collection and Storage

We have updated both the in-app permission prompt and the public privacy policy to clearly disclose microphone use.

Changes made:

1. **NSMicrophoneUsageDescription** has been added to `Info.plist` (via `app.json`) with the following text:
   > "AttenteZéro utilise le microphone uniquement lorsque vous activez la dictée vocale dans l'assistant IA. L'audio est envoyé à OpenAI (Whisper) pour transcription en temps réel et n'est jamais stocké sur nos serveurs."

   *(Translation: "AttenteZéro uses the microphone only when you activate voice dictation in the AI assistant. Audio is sent to OpenAI (Whisper) for real-time transcription and is never stored on our servers.")*

2. **Privacy Policy** at https://attentezero.ca/privacy has been updated with a dedicated "Audio Data (microphone)" section, which discloses:
   - Audio is only captured when the user explicitly taps the microphone button in the AI assistant.
   - Audio is transmitted in real time to OpenAI (Whisper) for transcription only.
   - Audio is never stored on our servers, never used for any other purpose.
   - Microphone access is requested only when the user explicitly activates it.
   - OpenAI is listed as a sub-processor for voice transcription in the third-party sharing table.

The microphone is used strictly for on-demand voice dictation. It is never accessed in the background or without explicit user action.

---

We are confident that the current build (v1.1.18, build 100) fully resolves both guideline concerns. We appreciate your thorough review and remain available if any further clarification is needed.

Thank you for your time.

— The AttenteZéro Team (CivicAI, NEQ 2280791601)

---

## Instructions pour l'envoi

1. Aller sur **App Store Connect → My Apps → AttenteZéro**
2. Cliquer sur **App Review** dans la barre latérale
3. Ouvrir le refus en cours (build 100) → bouton **"Reply to Apple"** ou **"Resolution Center"**
4. Coller le message anglais ci-dessus
5. Optionnel : joindre une capture d'écran de l'écran "Premium" iOS montrant "Gratuit" pour renforcer le point 3.1.1
6. Envoyer

> **Note :** Une réponse détaillée dans le Resolution Center peut réduire le temps de la review suivante car le reviewer dispose de contexte complet sans avoir à tester chaque point manuellement.
