import React, { useState } from 'react';
import { X, Plus, Trash2, Calculator, Receipt, FileText } from 'lucide-react';
import { Project, User, ProjectDocument } from '../../Backend/types';
import { cn } from '../../Backend/lib/utils';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (doc: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  projects: Project[];
  clients: User[];
  topographerId: string;
}

export default function DocumentGeneratorModal({ isOpen, onClose, onSubmit, projects, clients, topographerId }: DocumentGeneratorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<'QUOTE' | 'INVOICE' | 'ORDER'>('QUOTE');
  const [projectId, setProjectId] = useState('');
  const [items, setItems] = useState([{ id: Math.random().toString(36), description: '', price: 0, quantity: 1 }]);
  const [observations, setObservations] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Default to 30 days
    return d.toISOString().split('T')[0];
  });
  
  if (!isOpen) return null;

  const addItem = () => setItems([...items, { id: Math.random().toString(36), description: '', price: 0, quantity: 1 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const ht = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tva = ht * 0.20;
    const ttc = ht + tva;
    return { ht, tva, ttc };
  };

  const { ht, tva, ttc } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: `${type === 'QUOTE' ? 'Devis' : type === 'INVOICE' ? 'Facture' : 'BC'} - ${selectedProject.name}`,
        type,
        projectId,
        clientId: selectedProject.clientId,
        topographerId,
        url: '', // Default empty for generated documents
        size: '0 KB', // Default for generated documents
        isSigned: false,
        amount: {
          ht,
          ttc,
          tva: 20
        },
        metadata: {
          items: items.map(item => ({
            description: item.description,
            price: item.price,
            quantity: item.quantity,
          })),
          observations: observations || '',
          dueDate: dueDate || ''
        }
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white text-black w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              {type === 'QUOTE' ? <FileText /> : <Receipt />}
            </div>
            <div>
              <h2 className="text-2xl font-black">Nouveau Document Financier</h2>
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Générateur intelligent v2.0</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Type de Document</label>
              <div className="flex bg-zinc-100 p-1 rounded-2xl">
                {(['QUOTE', 'INVOICE'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                      type === t ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === 'QUOTE' ? 'Devis' : 'Facture'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Lier au Projet</label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Sélectionner un projet...</option>
                {projects.map((p, i) => (
                  <option key={`${p.id || 'project'}-${i}`} value={p.id}>{p.name} ({p.clientName})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Lignes du Document</label>
              <button 
                type="button" 
                onClick={addItem}
                className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" /> Ajouter une ligne
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`doc-item-${item.id || 'item'}-${index}`} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end group bg-zinc-50 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border border-zinc-200 sm:border-none relative">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-black uppercase text-muted-foreground sm:hidden">Désignation</label>
                    <input
                      placeholder="Désignation (ex: Levé Topographique)"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full bg-white sm:bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 sm:w-24 space-y-1">
                      <label className="text-[9px] font-black uppercase text-muted-foreground sm:hidden">Qté</label>
                      <input
                        type="number"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full bg-white sm:bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-center"
                        required
                      />
                    </div>
                    <div className="flex-2 sm:w-32 space-y-1">
                      <label className="text-[9px] font-black uppercase text-muted-foreground sm:hidden">Prix HT</label>
                      <input
                        type="number"
                        placeholder="Prix HT"
                        value={item.price}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                        className="w-full bg-white sm:bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-right font-mono"
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)}
                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors mb-0.5 self-end"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Date d'Échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Observations / Notes (ex: RIB, conditions)</label>
              <textarea
                placeholder="Ex. Livraison sous quinzaine, acompte de 30% requis à la commande."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary h-[54px] resize-none"
              />
            </div>
          </div>

          <div className="bg-zinc-900 text-white rounded-3xl p-8 flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <Calculator className="w-3 h-3" />
                <span>Total HT: {ht.toLocaleString()} DH</span>
              </div>
              <div className="text-zinc-400 text-xs">TVA (20%): {tva.toLocaleString()} DH</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">Net à Payer (TTC)</div>
              <div className="text-3xl font-black">{ttc.toLocaleString()} <span className="text-sm font-bold">DH</span></div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !projectId}
            className={cn(
              "w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
              "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90 active:scale-[0.98]",
              isSubmitting && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Receipt className="w-6 h-6" />
                Générer le {type === 'QUOTE' ? 'Devis' : 'Facture'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
