import { useState } from "react";

const phases = [
  {
    id: "avant",
    icon: "✈️",
    label: "Avant le départ",
    color: "#E8572A",
    steps: [
      {
        title: "AVE / eTA",
        icon: "🛂",
        desc: "Autorisation de Voyage Électronique obligatoire pour les Français voyageant par avion.",
        actions: ["Vérifier mon éligibilité", "Faire ma demande (7 CAD)"],
        link: "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/ave.html",
        tag: "Obligatoire",
        tagColor: "#E8572A",
      },
      {
        title: "Passeport valide",
        icon: "📘",
        desc: "Votre passeport doit être valide pour toute la durée du séjour. L'AVE est liée électroniquement à ce passeport.",
        actions: ["Vérifier ma date d'expiration"],
        tag: "Obligatoire",
        tagColor: "#E8572A",
      },
      {
        title: "Assurance voyage",
        icon: "🏥",
        desc: "Non obligatoire mais vivement recommandée. Les soins médicaux au Canada peuvent coûter très cher sans couverture.",
        actions: ["Comparer des assurances"],
        tag: "Recommandé",
        tagColor: "#2A7AE8",
      },
      {
        title: "ArriveCAN",
        icon: "📱",
        desc: "Téléchargez l'application pour soumettre votre déclaration de douanes et d'immigration avant d'atterrir.",
        actions: ["Télécharger ArriveCAN"],
        tag: "Pratique",
        tagColor: "#27AE60",
      },
      {
        title: "Budget & Devises",
        icon: "💰",
        desc: "Prévoyez suffisamment de fonds pour votre séjour. 1 EUR ≈ 1.47 CAD (vérifier taux du jour).",
        actions: ["Convertisseur de devises"],
        tag: "Pratique",
        tagColor: "#27AE60",
      },
    ],
  },
  {
    id: "arrivee",
    icon: "🏨",
    label: "À l'arrivée",
    color: "#2A7AE8",
    steps: [
      {
        title: "Logement",
        icon: "🏠",
        desc: "Trouvez l'hébergement idéal selon votre budget et votre destination.",
        actions: ["Hôtels", "Airbnb", "Auberges de jeunesse", "Bed & Breakfast"],
        tag: "Hébergement",
        tagColor: "#2A7AE8",
        subItems: [
          { label: "Montréal", emoji: "🏙️" },
          { label: "Toronto", emoji: "🌆" },
          { label: "Vancouver", emoji: "🏔️" },
          { label: "Québec", emoji: "🏰" },
        ],
      },
      {
        title: "Transport local",
        icon: "🚇",
        desc: "Naviguez facilement dans les villes canadiennes avec les transports en commun ou la location de voiture.",
        actions: ["Métro & Bus", "Location voiture", "Covoiturage", "Taxi / Uber"],
        tag: "Transport",
        tagColor: "#8E44AD",
      },
      {
        title: "Carte SIM / Internet",
        icon: "📶",
        desc: "Restez connecté dès l'aéroport. Des forfaits temporaires sont disponibles chez Rogers, Bell et Telus.",
        actions: ["Forfaits temporaires", "Roaming Europe"],
        tag: "Connectivité",
        tagColor: "#27AE60",
      },
    ],
  },
  {
    id: "explorer",
    icon: "🗺️",
    label: "Explorer",
    color: "#27AE60",
    steps: [
      {
        title: "Sites touristiques incontournables",
        icon: "🎡",
        desc: "Les merveilles du Canada à ne pas manquer selon votre région.",
        tag: "Tourisme",
        tagColor: "#E8572A",
        destinations: [
          {
            city: "Montréal",
            emoji: "🏙️",
            sites: ["Vieux-Montréal", "Mont-Royal", "Quartier des Spectacles", "Musée des Beaux-Arts"],
          },
          {
            city: "Québec",
            emoji: "🏰",
            sites: ["Château Frontenac", "Plaines d'Abraham", "Vieux-Québec", "Chutes Montmorency"],
          },
          {
            city: "Vancouver",
            emoji: "🌊",
            sites: ["Stanley Park", "Granville Island", "Whistler", "Capilano"],
          },
          {
            city: "Toronto",
            emoji: "🗼",
            sites: ["Tour CN", "Distillery District", "Kensington Market", "Niagara Falls"],
          },
        ],
      },
      {
        title: "Gastronomie",
        icon: "🍁",
        desc: "Découvrez la cuisine locale : poutine, sirop d'érable, tourtière, bagels montréalais et bien plus.",
        actions: ["Restaurants francophones", "Marchés locaux", "Spécialités régionales"],
        tag: "Gastronomie",
        tagColor: "#E8572A",
      },
      {
        title: "Nature & Plein air",
        icon: "🏕️",
        desc: "Parcs nationaux, randonnées, kayak, observation des aurores boréales — le Canada est immense.",
        actions: ["Parcs nationaux", "Activités outdoor", "Guides nature"],
        tag: "Nature",
        tagColor: "#27AE60",
      },
      {
        title: "Culture & Événements",
        icon: "🎭",
        desc: "Festivals, musées, événements sportifs. Le Canada francophone offre une vie culturelle riche.",
        actions: ["Festivals", "Musées", "Sport (NHL, CFL)"],
        tag: "Culture",
        tagColor: "#8E44AD",
      },
    ],
  },
  {
    id: "pratique",
    icon: "🛠️",
    label: "Infos pratiques",
    color: "#8E44AD",
    steps: [
      {
        title: "Urgences & Santé",
        icon: "🚑",
        desc: "En cas d'urgence : composez le 911. Localisez les hôpitaux et pharmacies proches de vous.",
        actions: ["911 — Urgences", "Hôpitaux proches", "Pharmacies"],
        tag: "Urgences",
        tagColor: "#E8572A",
      },
      {
        title: "Ambassade de France",
        icon: "🇫🇷",
        desc: "En cas de perte de documents ou problème grave, l'ambassade et les consulats français peuvent vous aider.",
        actions: ["Ottawa (Ambassade)", "Montréal (Consulat)", "Vancouver (Consulat)"],
        tag: "Officiel",
        tagColor: "#2A7AE8",
      },
      {
        title: "Météo & Fuseaux horaires",
        icon: "🌡️",
        desc: "Le Canada couvre 6 fuseaux horaires. Les hivers sont rigoureux : prévoyez des vêtements chauds si nécessaire.",
        actions: ["Météo en temps réel", "Fuseaux horaires"],
        tag: "Info",
        tagColor: "#27AE60",
      },
      {
        title: "Durée de séjour",
        icon: "📅",
        desc: "Vous pouvez rester jusqu'à 6 mois. Calculez votre date limite de séjour dès l'arrivée pour éviter tout problème.",
        actions: ["Calculer ma date limite", "Prolonger mon séjour"],
        tag: "Légal",
        tagColor: "#E8572A",
      },
    ],
  },
];

const tagColors = {
  "Obligatoire": { bg: "#FEE8E0", text: "#C0391B" },
  "Recommandé": { bg: "#E0EFFE", text: "#1A5CA8" },
  "Pratique": { bg: "#E0F5EA", text: "#1A7A42" },
  "Hébergement": { bg: "#E0EFFE", text: "#1A5CA8" },
  "Transport": { bg: "#F0E6FA", text: "#6B2FA0" },
  "Connectivité": { bg: "#E0F5EA", text: "#1A7A42" },
  "Tourisme": { bg: "#FEE8E0", text: "#C0391B" },
  "Gastronomie": { bg: "#FEE8E0", text: "#C0391B" },
  "Nature": { bg: "#E0F5EA", text: "#1A7A42" },
  "Culture": { bg: "#F0E6FA", text: "#6B2FA0" },
  "Urgences": { bg: "#FEE8E0", text: "#C0391B" },
  "Officiel": { bg: "#E0EFFE", text: "#1A5CA8" },
  "Info": { bg: "#E0F5EA", text: "#1A7A42" },
  "Légal": { bg: "#FEE8E0", text: "#C0391B" },
};

function Tag({ label }) {
  const c = tagColors[label] || { bg: "#F0F0F0", text: "#555" };
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: "0.68rem", fontWeight: 700,
      padding: "2px 9px", borderRadius: 99,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>{label}</span>
  );
}

function DestCard({ dest, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#1A1A2E" : "#F5F5F0",
      color: active ? "#fff" : "#1A1A2E",
      border: "none", borderRadius: 10, padding: "8px 14px",
      cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
      transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
    }}>
      {dest.emoji} {dest.city}
    </button>
  );
}

function StepCard({ step }) {
  const [activeDest, setActiveDest] = useState(0);

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      border: "1px solid #EBEBEB",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.5rem" }}>{step.icon}</span>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1A1A2E" }}>{step.title}</span>
        </div>
        <Tag label={step.tag} />
      </div>

      <p style={{ margin: 0, fontSize: "0.875rem", color: "#555", lineHeight: 1.6 }}>{step.desc}</p>

      {step.destinations && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {step.destinations.map((d, i) => (
              <DestCard key={d.city} dest={d} active={activeDest === i} onClick={() => setActiveDest(i)} />
            ))}
          </div>
          <div style={{
            background: "#F8F8F5", borderRadius: 10, padding: "12px 14px",
            display: "flex", flexWrap: "wrap", gap: 8,
          }}>
            {step.destinations[activeDest].sites.map(site => (
              <span key={site} style={{
                background: "#fff", border: "1px solid #DDDDD5",
                borderRadius: 8, padding: "5px 12px",
                fontSize: "0.8rem", color: "#1A1A2E", fontWeight: 500,
              }}>📍 {site}</span>
            ))}
          </div>
        </div>
      )}

      {step.subItems && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {step.subItems.map(item => (
            <span key={item.label} style={{
              background: "#F0F0E8", borderRadius: 8,
              padding: "5px 12px", fontSize: "0.8rem",
              color: "#1A1A2E", fontWeight: 500,
            }}>{item.emoji} {item.label}</span>
          ))}
        </div>
      )}

      {step.actions && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {step.actions.map((action, i) => (
            <button key={action} style={{
              background: i === 0 ? "#1A1A2E" : "#F5F5F0",
              color: i === 0 ? "#fff" : "#1A1A2E",
              border: i === 0 ? "none" : "1px solid #DDDDD5",
              borderRadius: 8, padding: "7px 14px",
              cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
              transition: "all 0.18s",
            }}>{action}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activePhase, setActivePhase] = useState(0);
  const phase = phases[activePhase];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F8F5",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#1A1A2E",
        padding: "28px 24px 0",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Maple leaf watermark */}
        <div style={{
          position: "absolute", right: -20, top: -20,
          fontSize: "9rem", opacity: 0.06, userSelect: "none", lineHeight: 1,
        }}>🍁</div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: "1.4rem" }}>🇫🇷</span>
            <span style={{ color: "#888", fontSize: "0.85rem", fontFamily: "sans-serif" }}>→</span>
            <span style={{ fontSize: "1.4rem" }}>🇨🇦</span>
          </div>
          <h1 style={{
            margin: "0 0 4px",
            color: "#fff",
            fontSize: "1.7rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}>Mon Voyage Canada</h1>
          <p style={{
            margin: "0 0 24px",
            color: "#AAA",
            fontSize: "0.85rem",
            fontFamily: "sans-serif",
          }}>Votre compagnon de voyage France → Canada</p>

          {/* Phase tabs */}
          <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 0 }}>
            {phases.map((p, i) => (
              <button key={p.id} onClick={() => setActivePhase(i)} style={{
                background: activePhase === i ? p.color : "transparent",
                color: activePhase === i ? "#fff" : "#AAA",
                border: "none", borderRadius: "10px 10px 0 0",
                padding: "10px 16px", cursor: "pointer",
                fontFamily: "sans-serif", fontWeight: 600, fontSize: "0.78rem",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Phase header bar */}
      <div style={{
        background: phase.color,
        padding: "14px 24px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: "1.4rem" }}>{phase.icon}</span>
        <span style={{
          color: "#fff", fontWeight: 700,
          fontSize: "1.05rem", fontFamily: "sans-serif",
        }}>{phase.label}</span>
        <span style={{
          marginLeft: "auto",
          background: "rgba(255,255,255,0.25)",
          color: "#fff", borderRadius: 99,
          padding: "2px 10px", fontSize: "0.75rem",
          fontFamily: "sans-serif", fontWeight: 600,
        }}>{phase.steps.length} étapes</span>
      </div>

      {/* Cards */}
      <div style={{
        padding: "20px 16px",
        display: "flex", flexDirection: "column", gap: 14,
        maxWidth: 680, margin: "0 auto",
      }}>
        {phase.steps.map((step, i) => (
          <StepCard key={i} step={step} />
        ))}
      </div>

      {/* Bottom nav suggestion */}
      <div style={{
        background: "#1A1A2E",
        margin: "16px",
        borderRadius: 16,
        padding: "18px 20px",
        display: "flex", alignItems: "center", gap: 14,
        maxWidth: 648, marginLeft: "auto", marginRight: "auto",
      }}>
        <span style={{ fontSize: "1.8rem" }}>💬</span>
        <div>
          <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>
            Besoin d'aide personnalisée ?
          </p>
          <p style={{ margin: "2px 0 0", color: "#888", fontSize: "0.78rem", fontFamily: "sans-serif" }}>
            Posez vos questions à notre assistant IA intégré
          </p>
        </div>
        <button style={{
          marginLeft: "auto", background: "#E8572A",
          color: "#fff", border: "none", borderRadius: 10,
          padding: "9px 16px", cursor: "pointer",
          fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap",
          fontFamily: "sans-serif",
        }}>Demander →</button>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}
