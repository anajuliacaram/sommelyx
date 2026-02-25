import { useAuth } from "@/contexts/AuthContext";
import PersonalDashboard from "./PersonalDashboard";
import CommercialDashboard from "./CommercialDashboard";

export default function DashboardIndex() {
  const { profileType } = useAuth();
  return profileType === "commercial" ? <CommercialDashboard /> : <PersonalDashboard />;
}
