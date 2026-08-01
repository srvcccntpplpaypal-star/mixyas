import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { Shield, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type KycStatus = "non_soumis" | "en_attente" | "approuve" | "rejete";
interface KycState {
  status: KycStatus;
  kyc: null | { id: number; fullName: string; status: string; adminNote?: string; createdAt: string };
}

type DocumentType = "CNI" | "Passeport" | "Permis de conduire";

interface FormDataState {
  fullName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  documentType: DocumentType | "";
  documentNumber: string;
  selfieDesc: string;
  address: string;
  addressProofDesc: string;
}

const STEPS = [
  { label: "Identité personnelle", icon: "1" },
  { label: "Document d'identité", icon: "2" },
  { label: "Selfie + carte", icon: "3" },
  { label: "Adresse", icon: "4" },
];

export default function Kyc() {
  const [_location, setLocation] = useLocation();
  const [kycState, setKycState] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormDataState>({
    fullName: "",
    birthDate: "",
    birthPlace: "",
    nationality: "",
    documentType: "",
    documentNumber: "",
    selfieDesc: "",
    address: "",
    addressProofDesc: "",
  });

  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("authToken")) {
      setLocation("/connexion");
      return;
    }

    apiFetch<KycState>("/kyc/status")
      .then(setKycState)
      .catch(() => setKycState({ status: "non_soumis", kyc: null }))
      .finally(() => setLoading(false));
  }, [setLocation]);

  const setField = (key: keyof FormDataState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    if (step === 0) {
      return form.fullName && form.birthDate && form.birthPlace && form.nationality;
    }
    if (step === 1) {
      return form.documentType && form.documentNumber && documentFront && documentBack;
    }
    if (step === 2) {
      return selfieFile && form.selfieDesc.length >= 10;
    }
    if (step === 3) {
      return form.address && form.addressProofDesc.length >= 10;
    }
    return false;
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      birthDate: "",
      birthPlace: "",
      nationality: "",
      documentType: "",
      documentNumber: "",
      selfieDesc: "",
      address: "",
      addressProofDesc: "",
    });
    setDocumentFront(null);
    setDocumentBack(null);
    setSelfieFile(null);
    setStep(0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    if (!documentFront || !documentBack || !selfieFile) {
      setError("Veuillez ajouter toutes les photos demandées.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("fullName", form.fullName);
    formData.append("birthDate", form.birthDate);
    formData.append("birthPlace", form.birthPlace);
    formData.append("nationality", form.nationality);
    formData.append("documentType", form.documentType);
    formData.append("documentNumber", form.documentNumber);
    formData.append("selfieDesc", form.selfieDesc);
    formData.append("address", form.address);
    formData.append("addressProofDesc", form.addressProofDesc);
    formData.append("documentFront", documentFront, documentFront.name);
    formData.append("documentBack", documentBack, documentBack.name);
    formData.append("selfie", selfieFile, selfieFile.name);

    try {
      await apiFetch("/kyc/submit", {
        method: "POST",
        body: formData,
      });
      setSubmitSuccess(true);
      setKycState({ status: "en_attente", kyc: null });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Vérification KYC">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-primary font-bold uppercase tracking-widest animate-pulse">Chargement...</div>
        </div>
      </PageWrapper>
    );
  }

  const status = kycState?.status ?? "non_soumis";
  const canShowForm = status === "non_soumis" || status === "rejete";

  return (
    <PageWrapper title="Vérification KYC">
      <div className="bg-foreground text-white py-10 border-b-4 border-primary">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-widest">Vérification d'Identité (KYC)</h1>
              <p className="text-gray-400 text-sm mt-1">Choisissez une pièce d'identité, importez le recto, le verso et un selfie avec la carte près de votre tête.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl">
        {status === "en_attente" && (
          <Card className="border-2 border-blue-200 mb-8">
            <CardContent className="p-6 flex items-start gap-4">
              <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800 mb-1">KYC en cours de vérification</p>
                <p className="text-sm text-blue-700">Votre dossier est en cours de validation par notre service. Vous serez informé(e) dès que la vérification sera terminée.</p>
                <p className="text-xs text-muted-foreground mt-3 font-bold uppercase tracking-wider">Le seuil minimum de retrait reste 10 000 FCFA.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "approuve" && (
          <Card className="border-2 border-green-200 mb-8">
            <CardContent className="p-6 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 mb-1">KYC Approuvé ✓</p>
                <p className="text-sm text-green-700">Votre identité est validée. Vous pouvez retirer dès que votre solde atteint 10 000 FCFA.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "rejete" && (
          <Card className="border-2 border-red-200 mb-8">
            <CardContent className="p-6 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 mb-1">KYC Rejeté</p>
                <p className="text-sm text-red-700">Votre dossier a été rejeté. Vérifiez les fichiers et soumettez à nouveau les photos correctes.</p>
                {kycState?.kyc?.adminNote && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">Motif : {kycState.kyc.adminNote}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {submitSuccess && (
          <Card className="border-2 border-green-200 mb-8">
            <CardContent className="p-6 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 mb-1">KYC soumis avec succès</p>
                <p className="text-sm text-green-700">Votre dossier a bien été envoyé. L'administration va vérifier vos documents.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {canShowForm && (
          <>
            <div className="flex items-center mb-8 gap-0">
              {STEPS.map((stepItem, index) => (
                <div key={stepItem.label} className="flex-1 flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0 transition-colors ${index < step ? "bg-green-500 text-white" : index === step ? "bg-primary text-foreground" : "bg-gray-200 text-gray-500"}`}>
                    {index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-1 flex-1 ${index < step ? "bg-green-500" : "bg-gray-200"} transition-colors`} />
                  )}
                </div>
              ))}
            </div>

            <Card className="border-2">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Étape {step + 1} / {STEPS.length} — {STEPS[step].label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {step === 0 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Nom complet *</Label>
                      <Input placeholder="Ex : Jean Dupont" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Date de naissance *</Label>
                        <Input type="date" value={form.birthDate} onChange={(e) => setField("birthDate", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lieu de naissance *</Label>
                        <Input placeholder="Ex : Abidjan, Côte d'Ivoire" value={form.birthPlace} onChange={(e) => setField("birthPlace", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nationalité *</Label>
                      <Input placeholder="Ex : Ivoirien" value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Type de pièce d'identité *</Label>
                      <Select value={form.documentType} onValueChange={(value) => setField("documentType", value as DocumentType)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionnez un document" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CNI">Carte Nationale d'Identité (CNI)</SelectItem>
                          <SelectItem value="Passeport">Passeport</SelectItem>
                          <SelectItem value="Permis de conduire">Permis de conduire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro du document *</Label>
                      <Input placeholder="Ex : CI0123456789" value={form.documentNumber} onChange={(e) => setField("documentNumber", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Photo recto du document *</Label>
                        <input type="file" accept="image/*" onChange={(e) => setDocumentFront(e.target.files?.[0] ?? null)} className="text-sm" />
                        {documentFront && <p className="text-xs text-muted-foreground">Fichier : {documentFront.name}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label>Photo verso du document *</Label>
                        <input type="file" accept="image/*" onChange={(e) => setDocumentBack(e.target.files?.[0] ?? null)} className="text-sm" />
                        {documentBack && <p className="text-xs text-muted-foreground">Fichier : {documentBack.name}</p>}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-primary/5 p-4 text-sm text-muted-foreground">
                      <p className="font-bold">Instruction :</p>
                      <p>Importez des photos claires et nettes. Le recto et le verso doivent être bien visibles et professionnels.</p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Selfie avec la pièce d'identité *</Label>
                      <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)} className="text-sm" />
                      {selfieFile && <p className="text-xs text-muted-foreground">Fichier : {selfieFile.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Description du selfie *</Label>
                      <Textarea placeholder="Photo prise devant votre visage avec la carte près de la tête, de face et bien lisible." value={form.selfieDesc} onChange={(e) => setField("selfieDesc", e.target.value)} rows={5} />
                    </div>
                    <div className="rounded-lg border bg-primary/5 p-4 text-sm text-muted-foreground">
                      <p className="font-bold">Conseil :</p>
                      <p>Maintenez la carte à côté de votre tête, visible, sans reflet. La photo doit être récente.</p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Adresse complète *</Label>
                      <Input placeholder="Ex : Rue 12, Quartier Cocody, Abidjan" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description du justificatif de domicile *</Label>
                      <Textarea placeholder="Ex : facture, quittance, relevé bancaire, adresse, date d'émission..." value={form.addressProofDesc} onChange={(e) => setField("addressProofDesc", e.target.value)} rows={4} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-6">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Précédent
              </Button>
              <div className="flex gap-3 flex-wrap">
                {step < STEPS.length - 1 ? (
                  <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canProceed()}>
                    Suivant
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={!canProceed() || submitting}>
                    {submitting ? "Soumission..." : "Soumettre mon KYC"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {!canShowForm && status === "approuve" && (
          <Card className="border-2 border-green-200 p-6">
            <p className="font-bold text-green-800">Votre KYC est déjà approuvé.</p>
            <p className="text-sm text-green-700 mt-2">Vous pouvez retirer une fois votre solde suffisant.</p>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
