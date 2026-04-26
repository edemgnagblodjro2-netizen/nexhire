import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={[styles.sectionTitleRow]}>
        <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>{children}</Text>
  );
}

function BulletItem({ children }: { children: string }) {
  const colors = useColors();
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
      <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );
}

export default function LegalScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 14 }]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Mentions légales</Text>
          <Text style={styles.headerSub}>
            Conditions d'utilisation · Politique de confidentialité
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Last updated */}
        <View style={[styles.dateBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            Dernière mise à jour : avril 2026
          </Text>
        </View>

        {/* DISCLAIMER */}
        <Section title="⚠️ Avertissement important">
          <View style={[styles.alertBox, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
            <Text style={styles.alertText}>
              Cette application fournit des informations et des orientations vers des
              services communautaires, sociaux et de santé.
            </Text>
            <Text style={[styles.alertText, { marginTop: 8, fontFamily: "Inter_700Bold" }]}>
              Elle ne remplace en aucun cas les services d'urgence.
            </Text>
            <Text style={[styles.alertText, { marginTop: 8 }]}>
              En cas d'urgence ou de danger immédiat, veuillez appeler le{" "}
              <Pressable onPress={() => Linking.openURL("tel:911")}>
                <Text style={styles.alertLink}>911</Text>
              </Pressable>{" "}
              ou contacter les services d'urgence appropriés.
            </Text>
            <Text style={[styles.alertText, { marginTop: 8 }]}>
              Les informations fournies peuvent varier et ne sont pas garanties en temps
              réel. L'utilisateur est responsable de vérifier les informations avant toute
              action.
            </Text>
          </View>
        </Section>

        {/* CONDITIONS D'UTILISATION */}
        <Section title="📋 Conditions d'utilisation">
          <Paragraph>
            En utilisant cette application, vous acceptez les conditions suivantes :
          </Paragraph>
          <BulletItem>
            L'application fournit uniquement des recommandations et ne garantit pas la
            disponibilité des services.
          </BulletItem>
          <BulletItem>
            L'utilisateur demeure responsable de ses décisions et actions.
          </BulletItem>
          <BulletItem>
            L'application ne fournit pas de diagnostic médical ni de conseil juridique.
          </BulletItem>
          <BulletItem>
            Les données de localisation peuvent être utilisées pour améliorer les résultats
            proposés.
          </BulletItem>
          <BulletItem>
            L'éditeur ne peut être tenu responsable des erreurs, omissions ou conséquences
            liées à l'utilisation de l'application.
          </BulletItem>
          <Paragraph>
            L'accès à l'application est conditionnel à l'acceptation de ces conditions.
            L'éditeur se réserve le droit de modifier ces conditions à tout moment. Votre
            utilisation continue de l'application après modification vaut acceptation.
          </Paragraph>
        </Section>

        {/* POLITIQUE DE CONFIDENTIALITÉ */}
        <Section title="🔒 Politique de confidentialité">
          <Paragraph>
            Nous accordons une importance primordiale à la protection de vos données
            personnelles. Voici comment nous les traitons :
          </Paragraph>

          <Text style={[styles.subHeading, { color: colors.foreground }]}>
            Données collectées
          </Text>
          <Paragraph>
            L'application peut collecter les données suivantes lors de votre utilisation :
          </Paragraph>
          <BulletItem>
            Localisation géographique — pour trier les services par proximité
          </BulletItem>
          <BulletItem>
            Requêtes utilisateur — pour améliorer la pertinence des résultats
          </BulletItem>
          <BulletItem>
            Adresse enregistrée (optionnelle) — pour personnaliser les recommandations
          </BulletItem>

          <Text style={[styles.subHeading, { color: colors.foreground }]}>
            Utilisation des données
          </Text>
          <BulletItem>
            Ces données sont utilisées uniquement pour améliorer les recommandations.
          </BulletItem>
          <BulletItem>
            Elles ne sont pas vendues, louées ni partagées avec des tiers.
          </BulletItem>
          <BulletItem>
            Aucune donnée n'est utilisée à des fins publicitaires.
          </BulletItem>

          <Text style={[styles.subHeading, { color: colors.foreground }]}>
            Vos droits
          </Text>
          <Paragraph>
            Conformément à la Loi 25 (Québec) et au RGPD, vous disposez des droits
            suivants :
          </Paragraph>
          <BulletItem>Accès à vos données personnelles</BulletItem>
          <BulletItem>Rectification des informations inexactes</BulletItem>
          <BulletItem>Suppression de vos données à tout moment</BulletItem>
          <BulletItem>Portabilité de vos données</BulletItem>
          <Paragraph>
            Pour exercer ces droits ou pour toute question relative à la confidentialité,
            contactez-nous via le profil de l'application.
          </Paragraph>
        </Section>

        {/* LIMITATION DE RESPONSABILITÉ */}
        <Section title="⚖️ Limitation de responsabilité">
          <Paragraph>
            L'application AttenteZéro est un outil d'orientation vers des ressources
            communautaires. L'éditeur s'efforce de maintenir des informations exactes et
            à jour, mais ne peut garantir l'exactitude, l'exhaustivité ou la disponibilité
            en temps réel de tous les services répertoriés.
          </Paragraph>
          <Paragraph>
            L'éditeur décline toute responsabilité en cas de : préjudice direct ou indirect
            lié à l'utilisation des informations fournies, indisponibilité d'un service
            répertorié, erreur ou omission dans les coordonnées ou horaires des organismes.
          </Paragraph>
        </Section>

        {/* CONTACT */}
        <Section title="✉️ Contact">
          <Paragraph>
            Pour toute question relative aux présentes mentions légales, conditions
            d'utilisation ou politique de confidentialité, veuillez nous contacter via la
            section Profil de l'application.
          </Paragraph>
        </Section>

        <View style={[styles.footerNote, { borderColor: colors.border }]}>
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
            AttenteZéro — Application de services communautaires du Québec
          </Text>
          <Text style={[styles.footerNoteText, { color: colors.mutedForeground }]}>
            Ces documents sont régis par les lois du Québec et du Canada.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 18,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 4,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginBottom: 24,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  accentBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    flex: 1,
  },
  alertBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  alertText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#b91c1c",
    lineHeight: 21,
  },
  alertLink: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#b91c1c",
    textDecorationLine: "underline",
  },
  paragraph: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  subHeading: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
    marginBottom: -4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  footerNote: {
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 8,
    gap: 4,
    alignItems: "center",
  },
  footerNoteText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
