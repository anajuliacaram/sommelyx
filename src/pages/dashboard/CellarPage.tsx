import { useAuth } from "@/contexts/AuthContext";
import PersonalCellarPage from "./PersonalCellarPage";
import CommercialCellarPage from "./CommercialCellarPage";

export default function CellarPage() {
  const { profileType } = useAuth();
  return profileType === "commercial" ? <CommercialCellarPage /> : <PersonalCellarPage />;
}
