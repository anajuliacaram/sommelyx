export function LandingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Global photo overlay so the image reads consistently across the product */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(10, 20, 15, 0.22) 0%, rgba(10, 20, 15, 0.42) 100%)",
        }}
      />

      {/* Soft ambient light blobs */}
      <div
        className="absolute top-[-10%] left-[-8%] w-[60vw] h-[60vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(198,167,104,0.08) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />
      <div
        className="absolute top-[5%] right-[-12%] w-[50vw] h-[50vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(80,120,90,0.10) 0%, transparent 70%)",
          filter: "blur(140px)",
        }}
      />
      <div
        className="absolute top-[40%] left-[20%] w-[45vw] h-[45vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute bottom-[5%] right-[10%] w-[35vw] h-[35vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(110,30,42,0.06) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      {/* Subtle grain texture */}
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
