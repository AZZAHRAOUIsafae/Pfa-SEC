import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectDocument, Project, User } from '../types';

export const pdfService = {
  async generateFinancePDF(doc: ProjectDocument, project: Project, topographer: User, client: User) {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;

    // Header - Company Info (Topographer)
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 41, 59); // Charcoal for main company name
    pdf.text((topographer.company || topographer.name || 'Cabinet de Topographie').toUpperCase(), 20, 25);
    
    // Aesthetic Topography Accent bar
    pdf.setFillColor(37, 99, 235); // Blue Accent
    pdf.rect(20, 28, 50, 1.5, 'F');

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(topographer.address || 'Adresse d\'exercice non spécifiée', 20, 35);
    
    // ONIGT Approval Status
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(37, 99, 235); // Blue color
    const onigtStr = `Agrée ONIGT Maroc ${topographer.onigtNumber ? ` - N° ${topographer.onigtNumber}` : ''}`;
    pdf.text(onigtStr, 20, 39);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Tel: ${topographer.phone || 'N/A'} | Email: ${topographer.email || 'N/A'}`, 20, 44);
    
    // Moroccan Corporate Numbers
    const lineICE = `ICE: ${topographer.ice || 'N/A'}  |  I.F: ${topographer.ifNum || 'N/A'}  |  R.C: ${topographer.rc || 'N/A'}  |  Patente: ${topographer.patente || 'N/A'}`;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text(lineICE, 20, 49);

    // Document Type & Number
    pdf.setFontSize(18);
    pdf.setTextColor(37, 99, 235); // Blue
    const typeLabel = doc.type === 'QUOTE' ? 'DEVIS' : doc.type === 'INVOICE' ? 'FACTURE' : 'BON DE COMMANDE';
    pdf.text(typeLabel, pageWidth - 20, 25, { align: 'right' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(`N° Référence: ${doc.type.substring(0, 3)}-${doc.id.substring(0, 8).toUpperCase()}`, pageWidth - 20, 31, { align: 'right' });
    
    // Parse Dates safely
    let dateStr = 'En attente';
    if (doc.createdAt) {
      const parsedDate = doc.createdAt.seconds 
        ? new Date(doc.createdAt.seconds * 1000) 
        : new Date(doc.createdAt);
      if (!isNaN(parsedDate.getTime())) {
        dateStr = parsedDate.toLocaleDateString();
      }
    }
    pdf.text(`Date d'émission: ${dateStr}`, pageWidth - 20, 36, { align: 'right' });
    
    const isPaye = doc.paymentStatus === 'PAID' || doc.isSigned;
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(isPaye ? 22 : 220, isPaye ? 163 : 38, isPaye ? 74 : 38); // green or red
    pdf.text(`Statut: ${doc.type === 'INVOICE' ? (isPaye ? 'REGLEE' : 'NON PAYEE') : (doc.isSigned ? 'APPROUVE' : 'PROVISOIRE')}`, pageWidth - 20, 42, { align: 'right' });

    // Client Info Section (Structured dedicated panel)
    pdf.setDrawColor(226, 232, 240); // elegant soft border
    pdf.setFillColor(248, 250, 252); // soft off-white/blue tint
    pdf.rect(20, 56, pageWidth - 40, 40, 'FD'); // Width, Height, Fill and Stroke
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(148, 163, 184); // Slate grey
    pdf.text('CLIENT / DESTINATAIRE', 26, 64);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42); // slate 900
    pdf.text(client.name || 'N/A', 26, 72);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Adresse: ${client.address || 'Adresse client non spécifiée'}`, 26, 79);
    pdf.text(`Téléphone: ${client.phone || 'N/A'}  |  Email: ${client.email || 'N/A'}`, 26, 85);
    pdf.text(`Projet: ${project.name || doc.name}`, 26, 91);

    // Prestataions dynamic table list (from metadata.items)
    const items = doc.metadata?.items || [
      { description: doc.name, quantity: 1, price: doc.amount?.ht || 0 }
    ];

    const tableData = items.map((item: any) => [
      item.description,
      String(item.quantity || 1),
      `${(item.price || 0).toLocaleString('fr-FR')} DH`,
      `${((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} DH`
    ]);

    autoTable(pdf, {
      startY: 104,
      head: [['Désignation des Prestations', 'Op. Qté', 'Prix Unitaire (HT)', 'Montant (HT)']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontSize: 9, 
        fontStyle: 'bold', 
        halign: 'left' 
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 }
      },
      styles: { fontSize: 9, cellPadding: 4.5, font: 'helvetica' }
    });

    // Totals Panel
    const finalY = (pdf as any).lastAutoTable.finalY + 8;
    const totalsX = pageWidth - 90;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Total Hors Taxe (HT) :', totalsX, finalY);
    pdf.text(`${(doc.amount?.ht || 0).toLocaleString('fr-FR')} DH`, pageWidth - 20, finalY, { align: 'right' });

    pdf.text('TVA (20%) :', totalsX, finalY + 7);
    pdf.text(`${((doc.amount?.ht || 0) * 0.2).toLocaleString('fr-FR')} DH`, pageWidth - 20, finalY + 7, { align: 'right' });

    // Accent fill for TOTAL TTC
    pdf.setFillColor(239, 246, 255); // soft blue background
    pdf.rect(totalsX - 2, finalY + 11, pageWidth - totalsX - 16, 11, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('TOTAL TTC :', totalsX, finalY + 18);
    pdf.text(`${(doc.amount?.ttc || 0).toLocaleString('fr-FR')} DH`, pageWidth - 20, finalY + 18, { align: 'right' });

    // Remains / Acompte tracking if exists
    let sigStartY = finalY + 30;
    if (doc.amount?.acompte) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(22, 163, 74);
      pdf.text('Acompte payé :', totalsX, finalY + 27);
      pdf.text(`-${doc.amount.acompte.toLocaleString('fr-FR')} DH`, pageWidth - 20, finalY + 27, { align: 'right' });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(220, 38, 38);
      pdf.text('NET À PAYER (RESTE) :', totalsX, finalY + 35);
      pdf.text(`${((doc.amount.reste || 0)).toLocaleString('fr-FR')} DH`, pageWidth - 20, finalY + 35, { align: 'right' });
      
      sigStartY = finalY + 45;
    }

    // Signatures Segment
    const maxSigY = Math.max(sigStartY + 10, 195);
    pdf.setDrawColor(241, 245, 249);
    pdf.line(20, maxSigY, pageWidth - 20, maxSigY);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Cachet et Signature du Prestataire', 20, maxSigY + 8);
    pdf.text('Bon pour accord (Signature Client)', pageWidth - 80, maxSigY + 8);

    if (doc.signatureBase64) {
      try {
        pdf.addImage(doc.signatureBase64, 'PNG', pageWidth - 85, maxSigY + 12, 55, 22);
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7.5);
        pdf.setTextColor(100);
        let signDateStr = 'Date non spécifiée';
        if (doc.signatureDate) {
          const sDate = doc.signatureDate.seconds 
            ? new Date(doc.signatureDate.seconds * 1000) 
            : new Date(doc.signatureDate);
          if (!isNaN(sDate.getTime())) {
            signDateStr = sDate.toLocaleDateString();
          }
        }
        pdf.text(`Approuvé numériquement le : ${signDateStr}`, pageWidth - 80, maxSigY + 38);
      } catch (e) {
        console.error('Pdf signature display error:', e);
      }
    }

    // Modern Legal footer
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(148, 163, 184);
    const printedDateStr = new Date().toLocaleString();
    pdf.text(`Edité via la Plateforme Sécurisée DataTopoGuard le ${printedDateStr}`, pageWidth / 2, 282, { align: 'center' });
    pdf.text('Ce document électronique fait foi de preuve de facturation de prestation topographique conformèment aux réglementations.', pageWidth / 2, 287, { align: 'center' });

    pdf.save(`${doc.type}_${doc.id.substring(0, 8).toUpperCase()}.pdf`);
  }
};
