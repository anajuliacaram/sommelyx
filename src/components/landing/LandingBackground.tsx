export function LandingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(123,30,43,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(198,167,104,0.14),transparent_30%),linear-gradient(135deg,#F8F4EF_0%,#F0E7DD_48%,#E8DDD0_100%)]">
      <div
        className="absolute inset-x-0 top-0 h-[22rem]"
        style={{
          background: "linear-gradient(180deg, rgba(110,30,42,0.12) 0%, rgba(110,30,42,0.05) 42%, rgba(244,241,236,0) 100%)",
        }}
      />
      <div
        className="absolute top-[-8%] left-[-8%] w-[42vw] h-[42vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(198,167,104,0.18) 0%, transparent 68%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-[4%] right-[-12%] w-[34vw] h-[34vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(110,30,42,0.11) 0%, transparent 70%)",
          filter: "blur(66px)",
        }}
      />
      <div
        className="absolute top-[36%] left-[18%] w-[30vw] h-[30vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.42) 0%, transparent 72%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-[5%] right-[10%] w-[24vw] h-[24vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(95,111,82,0.10) 0%, transparent 72%)",
          filter: "blur(60px)",
        }}
      />

      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px",
        }}
      />
    </div>
  );
}
