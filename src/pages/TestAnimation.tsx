import { WineLoadingAnimation } from "@/components/ui/WineLoadingAnimation";

export default function TestAnimation() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#3B0A18" }}
    >
      <WineLoadingAnimation size={200} />
    </div>
  );
}
