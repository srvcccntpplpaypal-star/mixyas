import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:p-6 pb-safe">
      <div className="w-full max-w-4xl bg-white border-t-4 border-primary shadow-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative animate-in slide-in-from-bottom-10 fade-in duration-500">
        <div className="flex-1 text-center md:text-left space-y-2">
          <h3 className="text-xl font-bold uppercase tracking-widest text-foreground">Paramètres de confidentialité</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Afin de vous offrir une expérience bancaire optimale, nous utilisons des cookies analytiques, de performance et de personnalisation. En poursuivant votre navigation sur notre plateforme sécurisée, vous acceptez notre politique d'utilisation des données.
          </p>
        </div>
        <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={acceptCookies} 
            size="lg"
            className="w-full sm:w-auto uppercase tracking-wider font-bold"
          >
            Accepter & Poursuivre
          </Button>
        </div>
      </div>
    </div>
  );
}
