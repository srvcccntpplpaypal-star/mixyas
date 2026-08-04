import { useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [_location, setLocation] = useLocation();
  const clickCount = useRef(0);
  const lastClickTime = useRef(0);
  const [clickHint, setClickHint] = useState(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current > 1500) {
      clickCount.current = 1;
    } else {
      clickCount.current += 1;
    }
    lastClickTime.current = now;
    setClickHint(clickCount.current);

    // 3 clics → espace gestion affiliés
    if (clickCount.current === 3) {
      clickCount.current = 0;
      setClickHint(0);
      setLocation("/affilier-admin");
      return;
    }

    // 7 clics → dashboard PDG secret
    if (clickCount.current === 7) {
      clickCount.current = 0;
      setClickHint(0);
      setLocation("/admin");
    }
  };

  const isLoggedIn = !!localStorage.getItem("authToken");

  return (
    <header className="sticky top-0 z-40 w-full border-b-4 border-primary bg-[#123274] shadow-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-3 sm:px-6">

        {/* Logo Gozem */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none group"
          onClick={handleLogoClick}
          title="YAS Service"
        >
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 shadow-md group-hover:scale-105 transition-transform border-2 border-white/20">
            <img
              src="/images/gozem-logo.png"
              alt="Gozem"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white font-black text-sm sm:text-xl leading-none tracking-widest uppercase">YAS Service</span>
            <span className="text-[#FFD700] text-[8px] sm:text-[9px] tracking-[0.2em] sm:tracking-[0.3em] uppercase mt-0.5">Plateforme Officielle</span>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          <Link href="/" className="text-white/80 text-sm font-semibold tracking-wider hover:text-[#FFD700] transition-colors uppercase">
            Accueil
          </Link>
          {isLoggedIn && (
            <Link href="/taches" className="text-white/80 text-sm font-semibold tracking-wider hover:text-[#FFD700] transition-colors uppercase">
              Tâches
            </Link>
          )}
          <a href="#services" className="text-white/80 text-sm font-semibold tracking-wider hover:text-[#FFD700] transition-colors uppercase">
            Services
          </a>
          <a href="mailto:mixyastg@gmail.com" className="text-white/80 text-sm font-semibold tracking-wider hover:text-[#FFD700] transition-colors uppercase">
            Support
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          {isLoggedIn ? (
            <Link href="/dashboard" className="inline-flex">
              <Button className="bg-[#FFD700] text-[#123274] hover:bg-[#FFD700]/90 font-bold tracking-wider uppercase border-0">
                Mon Espace
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/connexion" className="hidden sm:inline-flex text-white/80 text-sm font-semibold tracking-wider hover:text-[#FFD700] transition-colors uppercase">
                Connexion
              </Link>
              <Link href="/inscription" className="inline-flex">
                <Button className="bg-[#FFD700] text-[#123274] hover:bg-[#FFD700]/90 font-bold tracking-wider uppercase border-0 text-xs sm:text-sm px-3 sm:px-4">
                  Ouvrir un compte
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
