/**
 * Page de tracking d'un lien affilié.
 * /ref/:code → enregistre le clic, sauvegarde le code dans localStorage,
 * puis redirige vers /inscription.
 */
import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { apiFetch } from "@/lib/api";

export default function RefTracking() {
  const { code } = useParams<{ code: string }>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!code) { setLocation("/inscription"); return; }

    // Sauvegarder le code affilié pour le rattacher à l'inscription
    localStorage.setItem("ref_code", code.toUpperCase());

    // Tracker le clic en arrière-plan (fire & forget)
    apiFetch(`/affiliates/click/${code.toUpperCase()}`, { method: "POST" }).catch(() => {});

    // Rediriger vers l'inscription après un court délai
    const t = setTimeout(() => setLocation("/inscription"), 500);
    return () => clearTimeout(t);
  }, [code, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#123274]">
      <div className="text-center">
        <div className="w-20 h-20 bg-[#FFD700] rounded-full flex items-center justify-center mx-auto mb-6">
          <img src="/images/yas-logo.svg" alt="YAS" className="w-12 h-12 object-contain" />
        </div>
        <div className="text-white font-black text-3xl uppercase tracking-widest mb-2">YAS Service</div>
        <div className="text-[#FFD700] text-sm uppercase tracking-widest animate-pulse">Redirection en cours...</div>
      </div>
    </div>
  );
}
