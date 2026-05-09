export function Carte() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 50% 35%, #14b8a6 0%, #0d9488 45%, #0a6e64 100%)",
      }}
    >
      {/* Silhouette stylisée du Québec en watermark (forme abstraite) */}
      <svg
        viewBox="0 0 400 600"
        className="absolute inset-0 w-full h-full opacity-[0.08]"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M 80 180 Q 60 150 90 130 Q 130 110 170 130 Q 200 100 240 110 Q 290 100 320 140 Q 350 170 340 220 Q 360 260 330 300 Q 340 340 310 370 Q 290 410 250 420 Q 230 470 180 460 Q 140 480 110 440 Q 80 420 90 380 Q 60 340 80 300 Q 50 260 70 220 Z"
          fill="white"
        />
        {/* Grille horizontale type carte */}
        {[100, 200, 300, 400, 500].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="white" strokeWidth="0.5" opacity="0.3" />
        ))}
        {[50, 150, 250, 350].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="600" stroke="white" strokeWidth="0.5" opacity="0.3" />
        ))}
      </svg>

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-8 -mt-8">
        {/* Pin animé : effet "se pose" via bounce */}
        <div className="relative">
          {/* Onde radar sous le pin */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-20 h-3 rounded-full bg-white/30 blur-md" />
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-12 h-12 rounded-full border-2 border-white/40 animate-ping"
            style={{ animationDuration: "2.5s" }}
          />
          <div
            className="relative w-28 h-28 rounded-3xl bg-white flex items-center justify-center"
            style={{
              boxShadow: "0 16px 50px rgba(0,0,0,0.28)",
              animation: "bounce 2s ease-in-out infinite",
            }}
          >
            <img
              src="/__mockup/images/az-icon.png"
              alt="AttenteZéro"
              className="w-20 h-20 object-contain"
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-white text-[36px] font-bold tracking-tight"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            AttenteZéro
          </h1>
          <div className="flex items-center gap-1.5 text-white/85 text-[13px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
            </svg>
            <span>Partout au Québec</span>
          </div>
        </div>

        {/* Indicateur de chargement contextuel */}
        <div className="mt-4 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/15 backdrop-blur-sm">
          <div className="relative w-3 h-3">
            <div className="absolute inset-0 rounded-full border-2 border-white/30" />
            <div
              className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin"
              style={{ animationDuration: "1.2s" }}
            />
          </div>
          <span className="text-white/90 text-xs font-medium">
            Chargement des services…
          </span>
        </div>
      </div>

      <div className="absolute bottom-10 flex flex-col items-center gap-0.5">
        <p className="text-white/85 text-sm font-semibold tracking-wide">
          CivicAI
        </p>
        <p className="text-white/40 text-[9px] tracking-[0.2em] uppercase">
          NEQ 2280791601
        </p>
      </div>
    </div>
  );
}
