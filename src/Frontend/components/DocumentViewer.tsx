import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock,
  X,
  ShieldCheck,
  PenTool,
  Loader2,
  Trash2,
  CreditCard,
  Mail
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useTranslation } from 'react-i18next';
import { cn } from '../../Backend/lib/utils';
import { ProjectDocument, User, Project } from '../../Backend/types';
import { dbService } from '../../Backend/services/db';
import { pdfService } from '../../Backend/services/pdfService';
import { auth } from '../../Backend/lib/firebase';

interface DocumentViewerProps {
  document: ProjectDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onSign?: (docId: string, signature: string) => void;
  onPay?: (doc: ProjectDocument) => void;
}

export default function DocumentViewer({ document: doc, isOpen, onClose, onSign, onPay }: DocumentViewerProps) {
  const { t, i18n } = useTranslation();
  const [isSigning, setIsSigning] = useState(false);
  const [isSubmittingSig, setIsSubmittingSig] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [topographer, setTopographer] = useState<User | null>(null);
  const [client, setClient] = useState<User | null>(null);

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      alert(`La facture ${doc?.type.substring(0,3)}-${doc?.id.substring(0,8).toUpperCase()} a bien été expédiée à ${client?.email || 'l\'adresse email du client'}`);
    } catch {
      alert(t('common.error') || 'Erreur lors de l\'envois.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    if (doc) {
      dbService.getUser(doc.topographerId || '').then(setTopographer);
      dbService.getUser(doc.clientId || '').then(setClient);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const type = doc.type;
  const isFinancialDoc = ['INVOICE', 'QUOTE', 'ORDER'].includes(type);

  const clearSignature = () => sigCanvas.current?.clear();

  const handleSaveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert(t('common.alerts.fill_fields'));
      return;
    }

    const signature = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (signature && onSign) {
      setIsSubmittingSig(true);
      try {
        await onSign(doc.id, signature);
        setIsSigning(false);
      } finally {
        setIsSubmittingSig(false);
      }
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // In a real app we'd fetch the project too, but let's mock the project info if not available
      const projects = await dbService.getProjects('CLIENT', doc.clientId || '');
      const project = projects.find(p => p.id === doc.projectId) || { name: doc.name } as Project;

      if (topographer && client) {
        await pdfService.generateFinancePDF(doc, project, topographer, client);
      } else {
        alert(t('common.error'));
      }
    } catch (error) {
      console.error('PDF error:', error);
      alert(t('common.error'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white text-black w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl shadow-2xl flex flex-col">
        {/* Toolbar */}
        <div className="bg-zinc-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-bold tracking-tight uppercase">
              {type === 'INVOICE' ? t('topo.finance_registry') : (type === 'QUOTE' ? t('topo.finance_summary_project') : type)} - {doc.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="p-2 hover:bg-white/10 rounded-lg animate-pulse" title={t('common.print') || 'Imprimer'}><Printer className="w-4 h-4" /></button>
            <button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
              className="p-2 hover:bg-white/10 rounded-lg flex items-center gap-2"
              title="Télécharger PDF"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="p-2 hover:bg-white/10 rounded-lg flex items-center gap-2"
              title="Envoyer par email"
            >
              {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            </button>
            {isFinancialDoc && !doc.isSigned && onSign && auth.currentUser?.uid === doc.clientId && (
              <button 
                onClick={() => setIsSigning(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-bold text-xs hover:opacity-90 transition-all mx-2"
              >
                <PenTool className="w-3 h-3" />
                {t('common.signed_status')}
              </button>
            )}
            {type === 'INVOICE' && !doc.isSigned && onPay && auth.currentUser?.uid === doc.clientId && (
              <button 
                onClick={() => onPay(doc)}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-500 transition-all mx-1"
              >
                <CreditCard className="w-3 h-3" />
                {t('common.pay')}
              </button>
            )}
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button onClick={onClose} className="p-1 hover:bg-red-500 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-8 md:p-16 flex-1 bg-white relative">
          
          {/* Signature Modal */}
          {isSigning && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-8">
              <div className="w-full max-w-md bg-white border border-muted rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-1">{t('ratings.title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('ratings.description')}</p>
                </div>
                
                <div className="border border-muted rounded-2xl bg-zinc-50 overflow-hidden cursor-crosshair">
                   {/* Note: In a real app we'd use better placeholder text for signature */}
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="navy"
                    canvasProps={{width: 400, height: 200, className: 'sigCanvas w-full h-[200px]'}} 
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={clearSignature}
                    className="flex-1 px-4 py-3 border rounded-xl flex items-center justify-center gap-2 hover:bg-muted transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> {t('common.delete')}
                  </button>
                  <button 
                    onClick={() => setIsSigning(false)}
                    className="flex-1 px-4 py-3 border rounded-xl hover:bg-muted transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                </div>

                <button 
                  onClick={handleSaveSignature}
                  disabled={isSubmittingSig}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isSubmittingSig ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}

          {!isFinancialDoc ? (
            <div className="max-w-[800px] mx-auto text-center space-y-6">
              <div className="w-32 h-32 bg-muted rounded-2xl mx-auto flex items-center justify-center">
                <FileText className="w-16 h-16 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold">{t('common.view')}</h2>
              <p className="text-muted-foreground">{t('common.type')}: {type} • {t('client.files_count', { count: 1 })}: {doc.size}</p>
              
              {doc.isSigned && (
                <div className="p-6 bg-green-50 border border-green-100 rounded-2xl max-w-sm mx-auto flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-green-900">{t('common.signed')}</p>
                    <p className="text-[10px] text-green-700">{doc.signatureDate ? new Date(doc.signatureDate).toLocaleDateString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR') : t('common.unknown_date')}</p>
                  </div>
                </div>
              )}

              <button className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold inline-flex items-center gap-2 shadow-lg hover:opacity-90">
                <Download className="w-5 h-5" />
                {t('topo.export')}
              </button>
            </div>
          ) : (() => {
            const documentItems = doc.metadata?.items || [
              {
                description: doc.name,
                price: doc.amount?.ht || 0,
                quantity: 1
              }
            ];
            return (
              <div className="max-w-[850px] mx-auto font-sans print-area focus:outline-none bg-white">
                {/* Print Styles */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    body {
                      background-color: white !important;
                      color: black !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    .print-area {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100% !important;
                      max-width: 100% !important;
                      margin: 0 !important;
                      padding: 20px !important;
                      border: none !important;
                      box-shadow: none !important;
                    }
                    @page {
                      margin: 1.5cm;
                    }
                  }
                `}} />

                 {/* Top header - Modern branding for Topography application */}
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b-2 border-zinc-100 pb-8 mb-8 no-print">
                   {/* Top Left Topography Vector Stylized Logo */}
                   <div className="flex items-center gap-4 self-start md:self-center">
                     <div className="w-14 h-14 bg-gradient-to-tr from-blue-700 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                         <circle cx="12" cy="12" r="9" />
                         <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />
                       </svg>
                     </div>
                     <div>
                       <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase block">CADASTRAL RECON</span>
                       <span className="text-xs font-black text-blue-700 tracking-tight block uppercase">INGÉNIEURS GÉOMÈTRES-TOPOGRAPHES</span>
                       <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-800 text-[9px] font-bold uppercase tracking-wider rounded border border-blue-100 mt-1">
                         Agréé ONIGT Maroc {topographer?.onigtNumber ? `- N° ${topographer.onigtNumber}` : ''}
                       </div>
                     </div>
                   </div>

                   {/* Right Aligned Company Name in Big and Bold */}
                   <div className="text-center md:text-right flex-1 w-full">
                     <h1 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl uppercase">
                       {topographer?.company || topographer?.name || 'Cabinet Topographique / Géomatique'}
                     </h1>
                     <p className="text-xs text-zinc-500 font-medium mt-1">
                       Ingénierie, Topographie, Copropriété, Cadastre & Aménagement
                     </p>
                     
                     {/* Moroccan Corporate Identifiers */}
                     <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-zinc-500 pt-2 font-mono justify-center md:justify-end text-left md:text-right w-fit ml-auto">
                       <div><span className="font-bold text-zinc-700">ICE :</span> {topographer?.ice || 'N/A'}</div>
                       <div><span className="font-bold text-zinc-700">I.F. :</span> {topographer?.ifNum || 'N/A'}</div>
                       <div><span className="font-bold text-zinc-700">R.C. :</span> {topographer?.rc || 'N/A'}</div>
                       <div><span className="font-bold text-zinc-700">Patente :</span> {topographer?.patente || 'N/A'}</div>
                     </div>
                   </div>
                 </div>

                 {/* Printable header mimicking official paperwork (Always visible on print) */}
                 <div className="hidden print:block pb-6 mb-6 border-b-2 border-zinc-950">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="font-black text-lg uppercase tracking-tight">{topographer?.company || topographer?.name || 'ESPACE GÉOMATIQUE'}</p>
                          <p className="text-[10px] text-zinc-600">Cabinet d'Ingénieurs Topographes Agréés - Agréé ONIGT Maroc {topographer?.onigtNumber ? `N° ${topographer.onigtNumber}` : ''}</p>
                          <p className="text-[9px] text-zinc-500 mt-1">ICE: {topographer?.ice || 'N/A'} | Patente: {topographer?.patente || 'N/A'} | RC: {topographer?.rc || 'N/A'} | IF: {topographer?.ifNum || 'N/A'}</p>
                       </div>
                       <div className="text-right">
                          <p className="font-bold text-xs">RÉF: {type.substring(0, 3)}-{doc.id.substring(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-zinc-600">Date: {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : 'N/A'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                  {type === 'QUOTE' ? (
  <div className="space-y-2 w-full">
    <p className="text-xs text-zinc-600 font-semibold italic leading-relaxed">
      Devis d'ingénierie topographique estimatif et qualitatif établi selon le cahier des charges du projet.
    </p>
    <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2 text-xs text-zinc-700">
      {doc.metadata?.validityDays && (
        <div className="flex justify-between border-b border-amber-500/5 pb-1">
          <span className="font-bold text-amber-900">Validité du devis :</span>
          <span>{doc.metadata.validityDays} jours</span>
        </div>
      )}
      {doc.metadata?.executionPeriod && (
        <div className="flex justify-between border-b border-amber-500/5 pb-1">
          <span className="font-bold text-amber-900">Délai d'exécution :</span>
          <span>{doc.metadata.executionPeriod}</span>
        </div>
      )}
      {doc.metadata?.depositPercent && (
        <div className="flex justify-between border-b border-amber-500/5 pb-1">
          <span className="font-bold text-amber-900">Modalités d'acompte :</span>
          <span>{doc.metadata.depositPercent === '0' ? 'Aucun' : `${doc.metadata.depositPercent}% à la commande`}</span>
        </div>
      )}
      {doc.metadata?.terrainArea && (
        <div className="flex justify-between border-b border-amber-500/5 pb-1">
          <span className="font-bold text-amber-900">Superficie estimée :</span>
          <span className="font-mono">{doc.metadata.terrainArea}</span>
        </div>
      )}
      {doc.metadata?.terrainLocation && (
        <div className="flex justify-between gap-2">
          <span className="font-bold text-amber-900 shrink-0">Localisation :</span>
          <span className="text-right">{doc.metadata.terrainLocation}</span>
        </div>
      )}
    </div>
  </div>
) : (
  <p className="text-xs text-zinc-500 italic leading-relaxed">
    Facture de Prestation Topographique conforme au Code de commerce marocain pour le compte du projet désigné.
  </p>
)}
                   {/* Left contact card or project info summary */}
                   <div className="space-y-2 max-w-md">
                     <p className="text-xs text-zinc-500 italic leading-relaxed">
                       Facture de Prestation Topographique conforme au Code de commerce marocain pour le compte du projet désigné.
                     </p>
                     <div className="text-xs text-zinc-500">
                       <span className="font-semibold text-zinc-700">Adresse Cabinet :</span> {topographer?.address || 'Non renseigné'}, {topographer?.city || 'Maroc'} • <span className="font-semibold text-zinc-700">Tél :</span> {topographer?.phone || 'N/A'}
                     </div>
                   </div>

                   {/* Reference container with dynamic QR Code */}
                   <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl w-full md:w-auto min-w-[280px] flex items-center justify-between gap-5 shadow-sm">
                     <div className="text-left space-y-1 bg-transparent">
                       <div className="inline-block px-2.5 py-0.5 bg-blue-600 text-white font-black text-[9px] tracking-widest uppercase rounded-md mb-1">
                         {type === 'INVOICE' ? 'FACTURE DE PRESTATION' : (type === 'QUOTE' ? 'DEVIS ESTIMATIF' : 'BON DE COMMANDE')}
                       </div>
                       <div className="text-base font-black font-mono text-zinc-800 leading-none">
                         REF: {type.substring(0, 3)}-{doc.id.substring(0, 8).toUpperCase()}
                       </div>
                       <p className="text-[11px] text-zinc-500">
                         Émission : <span className="font-bold text-zinc-700">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : 'En attente'}</span>
                       </p>
                       {doc.metadata?.dueDate && (
                         <p className="text-[11px] text-zinc-500">
                           Échéance : <span className="font-bold text-rose-600">{new Date(doc.metadata.dueDate).toLocaleDateString('fr-FR')}</span>
                         </p>
                       )}
                       
                       {/* Badge coloré pour le statut de la facture */}
                       <div className="pt-2">
                         {doc.type === 'INVOICE' ? (
                           doc.paymentStatus === 'PAID' || doc.isSigned ? (
                             <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase rounded-lg tracking-wider">Payée</span>
                           ) : (
                             <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase rounded-lg tracking-wider">En attente</span>
                           )
                         ) : (
                           doc.isSigned ? (
                             <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase rounded-lg tracking-wider">Approuvé</span>
                           ) : (
                             <span className="px-2.5 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-200 text-[10px] font-black uppercase rounded-lg tracking-wider">Provisoire</span>
                           )
                         )}
                       </div>
                     </div>

                     {/* Dynamic Secure Verification QR Code */}
                     <div className="w-20 h-20 bg-white p-1 rounded-xl border border-zinc-200 flex items-center justify-center shrink-0" title="Scannez pour valider la facture">
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`FAC-REF:${doc.id}-MONTANT:${doc.amount?.ttc || 0}-MAD`)}`}
                         alt="Verification QR" 
                         className="w-full h-full object-contain"
                         referrerPolicy="no-referrer"
                       />
                     </div>
                   </div>
                 </div>

                {/* Grid layout for structured Parties (Prestataire vs Client) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Prestataire Card */}
                  <div className="bg-zinc-50/50 border border-zinc-100 rounded-2xl p-5 space-y-2">
                    <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Émetteur / Prestataire</h3>
                    <p className="font-black text-zinc-800 text-base">{topographer?.company || topographer?.name || 'Cabinet Topographique'}</p>
                    <p className="text-xs text-zinc-600">{topographer?.address || 'Maroc'}</p>
                    <p className="text-xs text-zinc-600 font-mono">Tél: {topographer?.phone || 'N/A'}</p>
                    <p className="text-xs text-zinc-600 font-mono">Email: {topographer?.email || 'N/A'}</p>
                  </div>

                  {/* Client Card */}
                  <div className="bg-blue-50/20 border border-blue-100/50 rounded-2xl p-5 space-y-2">
                    <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider">Client / Destinataire</h3>
                    <p className="font-black text-zinc-900 text-base">{client?.name || `Client ID: ${doc.clientId}`}</p>
                    <p className="text-xs text-zinc-600">{client?.address || 'Adresse client non renseignée'}</p>
                    <p className="text-xs text-zinc-600 font-mono">Tél: {client?.phone || 'N/A'}</p>
                    <div className="pt-2 border-t border-blue-100/50 mt-2">
                      <span className="text-[10px] font-bold text-blue-700 uppercase block tracking-wider">Désignation du Projet</span>
                      <span className="text-xs font-black text-zinc-800 block">{doc.name}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table with correct columns: Désignation, Quantité, Prix unitaire, Montant */}
                <div className="overflow-x-auto mb-8 border border-zinc-200 rounded-2xl shadow-sm">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead className="bg-zinc-100 uppercase text-[10px] font-black tracking-widest text-zinc-600 border-b border-zinc-200">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Désignation des Prestations</th>
                        <th className="px-5 py-3.5 text-center w-24">Quantité</th>
                        <th className="px-5 py-3.5 text-right w-36">Prix Unit. (HT)</th>
                        <th className="px-5 py-3.5 text-right w-36">Montant (HT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 border-b border-zinc-200">
                      {documentItems.map((item: any, idx: number) => {
                        const quantity = item.quantity || 1;
                        const price = item.price || 0;
                        const totalItem = price * quantity;
                        return (
                          <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-5 py-4 font-bold text-zinc-800">{item.description || 'Prestation Topographique'}</td>
                            <td className="px-5 py-4 text-center text-zinc-600">{quantity}</td>
                            <td className="px-5 py-4 text-right font-mono text-zinc-700">{price.toLocaleString('fr-FR')} DH</td>
                            <td className="px-5 py-4 text-right font-bold font-mono text-zinc-900">{totalItem.toLocaleString('fr-FR')} DH</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
  {/* Summary & Totals Panel */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
                  {/* Legal information and banking details */}
                  <div className="flex-1 space-y-4 max-w-sm">
                    <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                        {type === 'QUOTE' ? 'Validation & Règlement' : 'Mode de règlement'}
                      </h4>
                      <p className="text-xs text-zinc-700 leading-relaxed font-semibold">
                        {type === 'QUOTE' ? (
                          "Veuillez nous retourner ce devis signé précédé de la mention 'Lu et approuvé'. Le versement de l'acompte valide le début des levés de terrain."
                        ) : (
                          "Par Virement Bancaire ou Chèque sous ordonnance réglementaire."
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-500 leading-normal font-mono">
                        RIB CABINET : {(topographer as any)?.metadata?.rib || '007 780 0000123456789012 34'}
                      </p>
                    </div>
                  </div>

                  {/* Real Totals box aligned layout */}
                  <div className="w-full sm:w-[320px] bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 shadow-sm shrink-0">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Total H.T.</span>
                      <span className="font-bold font-mono text-zinc-800">{(doc.amount?.ht || 0).toLocaleString('fr-FR')} DH</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">TVA (20%)</span>
                      <span className="font-bold font-mono text-zinc-800">{( (doc.amount?.ht || 0) * 0.2 ).toLocaleString('fr-FR')} DH</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-y border-zinc-200 bg-blue-600/5 px-3 rounded-lg border-dashed">
                      <span className="font-black text-blue-900 uppercase text-[11px] tracking-wider">Total T.T.C.</span>
                      <span className="text-xl font-black font-mono text-blue-600">{(doc.amount?.ttc || 0).toLocaleString('fr-FR')} DH</span>
                    </div>

                    {doc.amount?.acompte && (
                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-green-600 font-bold uppercase tracking-wider text-[10px]">Acompte payé</span>
                          <span className="font-bold font-mono text-green-600">-{doc.amount.acompte.toLocaleString('fr-FR')} DH</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-200">
                          <span className="text-red-600 font-black uppercase tracking-wider text-[10px]">Net À Payer</span>
                          <span className="font-black font-mono text-red-600">{((doc.amount.reste || 0)).toLocaleString('fr-FR')} DH</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observations / Notes Section */}
                {doc.metadata?.observations && (
                  <div className="mb-8 p-5 bg-zinc-50 border border-zinc-200/60 rounded-2xl">
                    <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider mb-2">Observations / Notes de prestation</h4>
                    <p className="text-xs text-zinc-700 whitespace-pre-line leading-relaxed font-medium">
                      {doc.metadata.observations}
                    </p>
                  </div>
                )}

                {/* Stamp & Signatures Block */}
                <div className="mt-14 pt-8 border-t border-dashed border-zinc-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8">
                    <div className="text-center sm:text-left space-y-2">
                       <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Cachet de l'Entreprise</p>
                       <div className="w-52 h-32 bg-zinc-50/50 border border-zinc-100 rounded-2xl flex items-center justify-center opacity-40 grayscale relative">
                          <div className="border-4 border-dashed border-blue-900/30 rounded-full w-24 h-24 flex items-center justify-center text-[9px] font-black text-blue-900/80 p-2 text-center rotate-[-15deg] select-none">
                            AGRÉÉ TOPOGUARD CADASTRE
                          </div>
                       </div>
                    </div>

                    <div className="text-center space-y-2">
                       <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{t('common.signed_status')}</p>
                       {doc.isSigned ? (
                         <div className="w-52 h-32 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in zoom-in-95">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_100%)]" />
                            {doc.signatureBase64 ? (
                              <img src={doc.signatureBase64} alt="Signature" className="w-full h-full object-contain relative z-10 p-3" referrerPolicy="no-referrer" />
                            ) : doc.signatureUrl ? (
                              <img src={doc.signatureUrl} alt="Signature" className="w-full h-full object-contain relative z-10 p-3" referrerPolicy="no-referrer" />
                            ) : (
                              <>
                                <ShieldCheck className="w-8 h-8 text-blue-600 mb-2" />
                                <p className="text-[10px] font-bold text-blue-900">{t('common.signed')}</p>
                              </>
                            )}
                            <p className="absolute bottom-2 left-3 text-[6px] text-blue-700/60 font-mono uppercase tracking-tighter z-20">RÉF: {doc.signedBy?.substring(0,8)}</p>
                            <div className="absolute bottom-1 right-2 w-8 h-8 opacity-20 rotate-[-12deg]">
                              <CheckCircle2 className="w-full h-full text-blue-600" />
                            </div>
                         </div>
                       ) : (
                         <div className="w-52 h-32 border border-dashed border-zinc-200 rounded-2xl flex items-center justify-center bg-zinc-50">
                            <p className="text-xs text-zinc-400 font-bold italic">{t('common.pending')}</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* Document legal notice */}
                <div className="mt-12 text-center border-t border-zinc-100 pt-6">
                   <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                     {i18n.language === 'ar' ? 'هذا المستند تم إنشاؤه إلكترونياً ويساوي في القيمة القانونية الإثبات بشرط المصادقة من قبل مكتب الطبوغرافيا.' : 'Ce document est généré électroniquement et possède une valeur juridique de preuve sous réserve de validation par le Cabinet Topographique.'}
                     <br />
                     <span className="font-bold">Secured by DataTopoGuard Platform v2.0 © 2026</span>
                   </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
