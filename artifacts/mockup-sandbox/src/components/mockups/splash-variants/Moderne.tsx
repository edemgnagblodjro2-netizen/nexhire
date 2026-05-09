export function Moderne() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "#0d9488" }}
    >
      {/* Cercles concentriques décoratifs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${i * 180}px`,
              height: `${i * 180}px`,
              borderWidth: i === 3 ? "1.5px" : "1px",
              borderColor: `rgba(255,255,255,${0.18 - i * 0.025})`,
            }}
          />
        ))}
      </div>

      {/* Petits points lumineux dispersés */}
      <div className="absolute top-[12%] left-[18%] w-1 h-1 rounded-full bg-white/40" />
      <div className="absolute top-[22%] right-[14%] w-1.5 h-1.5 rounded-full bg-white/50" />
      <div className="absolute bottom-[28%] left-[10%] w-1 h-1 rounded-full bg-white/30" />
      <div className="absolute bottom-[18%] right-[22%] w-1 h-1 rounded-full bg-white/40" />
      <div className="absolute top-[40%] left-[8%] w-0.5 h-0.5 rounded-full bg-white/60" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8">
        <div
          className="w-28 h-28 rounded-[26px] bg-white flex items-center justify-center"
          style={{
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.25), 0 0 0 8px rgba(255,255,255,0.06)",
          }}
        >
          <img
            src="/__mockup/images/az-icon.png"
            alt="AttenteZéro"
            className="w-20 h-20 object-contain"
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h1
            className="text-white text-[34px] font-bold tracking-tight"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            AttenteZéro
          </h1>
          <p className="text-emerald-100/90 text-[13px] font-medium tracking-wide">
            Services communautaires du Québec
          </p>
        </div>

        {/* Badge stats */}
        <div className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20">
          <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
          <span className="text-white text-sm font-semibold tabular-nums">
            7&nbsp;957
          </span>
          <span className="text-white/80 text-sm">services actifs</span>
        </div>
      </div>

      {/* Footer CivicAI */}
      <div className="absolute bottom-10 flex flex-col items-center gap-1">
        <p className="text-white/40 text-[10px] tracking-[0.25em] uppercase">
          Propulsé par
        </p>
        <p className="text-white/85 text-sm font-semibold tracking-wide">
          CivicAI
        </p>
      </div>
    </div>
  );
}
