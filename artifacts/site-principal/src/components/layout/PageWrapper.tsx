import { useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "./Navbar";
import { CookieConsent } from "./CookieConsent";
import { useTrackVisit } from "@workspace/api-client-react";

export function PageWrapper({ children, title }: { children: React.ReactNode, title: string }) {
  const [location] = useLocation();
  const trackVisit = useTrackVisit();

  useEffect(() => {
    document.title = `${title} | Banque Or`;
  }, [title]);

  useEffect(() => {
    // Tracking on route change
    const userStr = localStorage.getItem("currentUser");
    let userId = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id;
      } catch (e) {}
    }

    trackVisit.mutate({
      data: {
        page: location,
        userAgent: window.navigator.userAgent,
        referrer: document.referrer || null,
        userId
      }
    });
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      <footer className="bg-foreground text-white py-16 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6 opacity-80">
              <div className="w-8 h-8 bg-primary flex items-center justify-center rounded-sm">
                <span className="text-foreground font-bold text-lg">B</span>
              </div>
              <span className="text-xl font-bold tracking-widest uppercase">Banque Or</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6">
              Établissement financier de premier plan dédié à la sécurisation de vos actifs et à la croissance de votre patrimoine. Une expertise institutionnelle à votre service.
            </p>
          </div>
          <div>
            <h4 className="text-primary font-bold uppercase tracking-widest mb-6 text-sm">Mentions légales</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Conditions générales</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sécurité des données</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary font-bold uppercase tracking-widest mb-6 text-sm">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>Service Client: +225 00 00 00 00</li>
              <li>Email: contact@banque-or.com</li>
              <li>Siège: Abidjan, Côte d'Ivoire</li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 sm:px-6 mt-16 pt-8 border-t border-gray-800 text-center text-xs text-gray-500 uppercase tracking-widest">
          © {new Date().getFullYear()} Banque Or. Tous droits réservés.
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}
