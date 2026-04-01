export function LandingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Ambient light orbs */}
      <div className="absolute top-[-8%] left-[-6%] w-[55vw] h-[55vw] rounded-full bg-wine/[0.04] blur-[180px]" />
      <div className="absolute top-[2%] right-[-8%] w-[45vw] h-[45vw] rounded-full bg-wine-light/[0.15] blur-[160px]" />
      <div className="absolute top-[20%] left-[25%] w-[40vw] h-[40vw] rounded-full bg-cream/[0.3] blur-[140px]" />
      <div className="absolute bottom-[10%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-wine-light/[0.08] blur-[140px]" />
      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />
    </div>
  );
}
