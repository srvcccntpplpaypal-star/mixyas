import { useState, useEffect, type ChangeEvent } from "react";
import { useLocation, Link } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
  CheckCircle2, Clock, AlertCircle, CreditCard, ArrowLeft, Copy, Check,
} from "lucide-react";

interface DepositInfo {
  phoneNumber: string | null;
  amount?: number;
  currency?: string;
  instructions?: string;
  message?: string;
}

interface DepositRecord {
  id: number;
  amount: number;
  referenceCode: string;
  status: "en_attente" | "confirme" | "rejete";
  createdAt: string;
}

const STATUS_CONFIG = {
  en_attente: { label: "En attente", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Clock className="w-4 h-4" /> },
  confirme: { label: "Confirmé ✓", color: "text-green-600 bg-green-50 border-green-200", icon: <CheckCircle2 className="w-4 h-4" /> },
  rejete: { label: "Rejeté", color: "text-red-600 bg-red-50 border-red-200", icon: <AlertCircle className="w-4 h-4" /> },
};

export default function Depot() {
  const [_location, setLocation] = useLocation();
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [history, setHistory] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refCode, setRefCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) { setLocation("/connexion"); return; }
    Promise.all([
      apiFetch<DepositInfo>("/deposit/info"),
      apiFetch<DepositRecord[]>("/deposit/history"),
    ]).then(([i, h]) => { setInfo(i); setHistory(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setLocation]);

  const handleCopy = () => {
    if (info?.phoneNumber) {
      navigator.clipboard.writeText(info.phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setProofFile(null);
      setProofPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Veuillez sélectionner une image valide (PNG, JPG, WEBP).");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Impossible de traiter cette image."));
        image.src = previewUrl;
      });

      const canvas = document.createElement("canvas");
      const maxDimension = 1200;
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas non pris en charge.");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      const compressedFile = blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file;
      setProofFile(compressedFile);
      setProofPreview(previewUrl);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de compresser l’image.");
      setProofFile(null);
      setProofPreview(null);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (!proofFile) {
        setError("Veuillez joindre une preuve de paiement sous forme d'image.");
        setSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("referenceCode", refCode);
      formData.append("proofImage", proofFile);
      await apiFetch("/deposit/submit", { method: "POST", body: formData });
      setSuccess(true);
      setRefCode("");
      setProofFile(null);
      setProofPreview(null);
      const h = await apiFetch<DepositRecord[]>("/deposit/history");
      setHistory(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Effectuer un Dépôt">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-primary font-bold uppercase tracking-widest animate-pulse">Chargement...</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Effectuer un Dépôt">
      {/* Header */}
      <div className="bg-foreground text-white py-10 border-b-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6 flex items-center gap-4">
          <CreditCard className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Effectuer un Dépôt</h1>
            <p className="text-gray-400 text-sm mt-1">Déposez 5 000 FCFA pour créditer votre portefeuille</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6 text-xs uppercase tracking-widest font-bold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour au dashboard
          </Button>
        </Link>

        {/* Info seuil */}
        <div className="bg-primary/10 border-2 border-primary/20 rounded-sm p-5 mb-8 text-center">
          <p className="text-lg font-bold text-foreground uppercase tracking-wider">Seuil minimum de retrait : 10 000 F</p>
          <p className="text-sm text-muted-foreground mt-1">En déposant 5 000 FCFA, vous vous rapprochez de cet objectif.</p>
        </div>

        {success && (
          <Card className="border-2 border-green-200 mb-6">
            <CardContent className="p-6 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 mb-1">Demande de dépôt enregistrée !</p>
                <p className="text-sm text-green-700">Votre dépôt sera vérifié et crédité dans les 24h. Merci pour votre confiance.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Numéro de dépôt */}
        <Card className="border-2 mb-6">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-sm uppercase tracking-widest">
              Étape 1 — Envoyez le paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {info?.phoneNumber ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Envoyez exactement <strong className="text-foreground">5 000 FCFA</strong> via Mobile Money au numéro suivant :
                </p>
                <div className="flex items-center gap-3 bg-primary/5 border-2 border-primary/20 rounded-sm p-4 mb-4">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Numéro de dépôt</div>
                    <div className="text-2xl font-bold text-foreground tracking-widest">{info.phoneNumber}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="font-bold text-xs uppercase tracking-widest">
                    {copied ? <><Check className="w-3 h-3 mr-1" /> Copié</> : <><Copy className="w-3 h-3 mr-1" /> Copier</>}
                  </Button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 text-sm text-amber-800">
                  <strong>Important :</strong> Notez le code de transaction généré par votre opérateur Mobile Money. Vous en aurez besoin à l'étape suivante.
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 mb-1">Numéro de dépôt non encore configuré</p>
                  <p className="text-sm text-amber-700">Contactez notre support pour obtenir le numéro de dépôt : <a href="mailto:mixyastg@gmail.com" className="underline">mixyastg@gmail.com</a></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Validation dépôt */}
        {info?.phoneNumber && (
          <Card className="border-2 mb-8">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-sm uppercase tracking-widest">
                Étape 2 — Confirmez votre dépôt
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Après avoir effectué le paiement, entrez le code de transaction pour valider votre dépôt.
              </p>
              <div className="space-y-2">
                <Label>Code de transaction Mobile Money *</Label>
                <Input
                  placeholder="Ex : TXN123456789"
                  value={refCode}
                  onChange={e => setRefCode(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Preuve de paiement (image compressée) *</Label>
                <Input type="file" accept="image/*" onChange={handleFileChange} className="file:mr-4 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold" />
                <p className="text-xs text-muted-foreground">Ajoutez une capture ou une photo du reçu. L’image sera envoyée automatiquement avec votre dépôt.</p>
                {proofPreview && (
                  <div className="rounded-sm border border-dashed border-primary/30 p-2">
                    <img src={proofPreview} alt="Aperçu de la preuve de dépôt" className="max-h-48 w-full rounded-sm object-contain" />
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-sm">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <Button
                className="w-full font-bold uppercase tracking-widest h-12"
                onClick={handleSubmit}
                disabled={refCode.length < 3 || !proofFile || submitting}
              >
                {submitting ? "Soumission..." : "Valider mon dépôt de 5 000 F"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        {history.length > 0 && (
          <Card className="border-2">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-sm uppercase tracking-widest">Historique de vos dépôts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {history.map(d => {
                  const cfg = STATUS_CONFIG[d.status];
                  return (
                    <div key={d.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-bold border rounded-sm px-2 py-1 ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{d.amount.toLocaleString()} FCFA</div>
                          <div className="text-xs text-muted-foreground font-mono">Réf: {d.referenceCode}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
