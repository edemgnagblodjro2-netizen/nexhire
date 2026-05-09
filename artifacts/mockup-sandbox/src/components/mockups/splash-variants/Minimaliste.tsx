export function Minimaliste() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between py-20"
      style={{
        background:
          "linear-gradient(180deg, #14b8a6 0%, #0d9488 55%, #0a7268 100%)",
      }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-7 px-8">
        <div
          className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
        >
          <img
            src="/__mockup/images/az-icon.png"
            alt="AttenteZéro"
            className="w-24 h-24 object-contain"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-white text-4xl font-light tracking-wide"
            style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "0.02em" }}
          >
            Attente<span className="font-semibold">Zéro</span>
          </h1>
          <p className="text-white/80 text-sm font-light text-center max-w-[260px] leading-relaxed">
            Trouvez de l'aide près de chez vous
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
          <div
            className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <p className="text-white/50 text-[10px] tracking-[0.2em] uppercase">
          un produit CivicAI
        </p>
      </div>
    </div>
  );
}
