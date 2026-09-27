import { Link } from "react-router-dom";
export function LegalConsent({ language = "en" }: { language?: "en" | "es" }) {
  return <p className="legal-consent">{language === "es" ? "Al continuar, aceptas los " : "By continuing you agree to the "}<Link to="/terms">{language === "es" ? "Términos" : "Terms"}</Link>{language === "es" ? " y la " : " and "}<Link to="/privacy">{language === "es" ? "Política de Privacidad" : "Privacy Policy"}</Link>.</p>;
}