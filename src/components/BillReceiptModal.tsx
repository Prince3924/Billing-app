import React, { useState, useEffect, useRef } from 'react';
import {
  X, Printer, MessageCircle, Check, Edit,
  Loader2, QrCode, Maximize2, Image as ImageIcon, FileDown, AlertTriangle
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Bill } from '../types';
import { useShop } from '../context/ShopContext';
import { getBillFooterMessage } from '../utils/billNumber';
import { ShopLogo } from './ShopLogo';

interface BillReceiptModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  isNewBill?: boolean;
}

export const BillReceiptModal: React.FC<BillReceiptModalProps> = ({
  bill: billProp,
  isOpen,
  onClose,
  isNewBill = false,
}) => {
  const { bills, updateBill, shopInfo, t, language } = useShop();
  const bill = billProp ? bills.find((b) => b.id === billProp.id) || billProp : null;

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<'share' | 'image' | 'pdf' | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [lastBlobName, setLastBlobName] = useState<string>('Bill');
  const [lastError, setLastError] = useState<string | null>(null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isEnlargedQrOpen, setIsEnlargedQrOpen] = useState(false);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const billContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bill) {
      setIsEditingNote(false);
      setNoteDraft(bill.notes || '');
    }
  }, [isOpen, bill?.id, bill?.notes]);

  const showUpiQr = Boolean(
    !bill?.isEstimate &&
    shopInfo.showUpiQrOnBill !== false &&
    shopInfo.upiId &&
    shopInfo.upiId.trim().length > 0
  );

  useEffect(() => {
    if (!bill || !showUpiQr || !shopInfo.upiId) {
      setQrDataUrl(null);
      return;
    }

    const payeeVpa = shopInfo.upiId.trim();
    const payeeName = (shopInfo.payeeName || shopInfo.name).trim();
    const amount = bill.grandTotal.toFixed(2);
    const note = `Bill ${bill.billNumber}`;

    const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate UPI QR Code:', err);
        setQrDataUrl(null);
      });
  }, [bill, shopInfo.upiId, shopInfo.payeeName, shopInfo.name, showUpiQr]);

  if (!isOpen || !bill) return null;

  const dateLocale = language === 'hindi' ? 'hi-IN' : 'en-IN';
  const formattedDate = new Date(bill.date).toLocaleString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const billFooterMsg = getBillFooterMessage(
    shopInfo.billFooterTemplates,
    language,
    bill.customerName,
    shopInfo.name
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    setLastBlobUrl(blobUrl);
    setLastBlobName(filename);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      } catch {
        // Ignore cleanup errors
      }
    }, 400);

    return blobUrl;
  };

  const generateBillPngDataUrl = async (): Promise<string> => {
    const printBillEl = document.getElementById('print-bill');
    if (!printBillEl) {
      throw new Error('Receipt container not found.');
    }

    await new Promise((resolve) => setTimeout(resolve, 150));

    const dataUrl = await toPng(printBillEl, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (domNode) => {
        if (domNode instanceof HTMLElement) {
          return !domNode.classList.contains('no-print');
        }
        return true;
      },
    });

    if (!dataUrl || dataUrl.length < 100) {
      throw new Error('Failed to generate image');
    }

    return dataUrl;
  };

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleWhatsAppShare = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('share');
    setLastError(null);

    try {
      const dataUrl = await generateBillPngDataUrl();
      const blob = await dataUrlToBlob(dataUrl);
      const safeBillNum = bill.billNumber.replace(/[\/\s:]+/g, '_');
      const filename = `Bill_${safeBillNum}.png`;
      const file = new File([blob], filename, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      const canShareFiles =
        typeof navigator !== 'undefined' &&
        !!navigator.share &&
        !!navigator.canShare &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: `${bill.billNumber} - ${shopInfo.name}`,
          });
          showToast(t('billSharedSuccess'));
          setIsProcessing(false);
          setProcessingAction(null);
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            setIsProcessing(false);
            setProcessingAction(null);
            return;
          }
        }
      }

      downloadBlob(blob, filename);

      const targetPhone = bill.customerMobile ? bill.customerMobile.replace(/\D/g, '') : '';
      const waUrl =
        targetPhone.length >= 10
          ? `https://wa.me/91${targetPhone.slice(-10)}`
          : `https://wa.me/`;

      window.open(waUrl, '_blank');
      showToast(t('whatsAppImageReadyNote'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`${t('imageShareFailedMsg')} ${msg}`);
      showToast(t('shareFailedToast'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleDownloadImage = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('image');
    setLastError(null);

    try {
      const dataUrl = await generateBillPngDataUrl();
      const blob = await dataUrlToBlob(dataUrl);
      const safeBillNum = bill.billNumber.replace(/[\/\s:]+/g, '_');
      const filename = `Bill_${safeBillNum}.png`;
      downloadBlob(blob, filename);

      showToast(t('imageDownloadedToast'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`${t('imageDownloadFailedMsg')} ${msg}`);
      showToast(t('imageFailedToast'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessingAction('pdf');
    setLastError(null);

    try {
      const dataUrl = await generateBillPngDataUrl();
      const pdfWidth = 80;
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(t('pdfDownloadFailedMsg')));
      });

      const pdfHeight = (img.naturalHeight * pdfWidth) / img.naturalWidth;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight + 4],
      });

      pdf.addImage(dataUrl, 'PNG', 0, 2, pdfWidth, pdfHeight, undefined, 'FAST');
      const pdfBlob = pdf.output('blob');
      const safeBillNum = bill.billNumber.replace(/[\/\s:]+/g, '_');
      const filename = `Bill_${safeBillNum}.pdf`;
      downloadBlob(pdfBlob, filename);

      showToast(t('billDownloadedToast'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`${t('pdfDownloadFailedMsg')} ${msg}`);
      showToast(t('pdfFailedToast'));
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    setLastError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const printBillEl = document.getElementById('print-bill');
      if (!printBillEl) {
        window.print();
        return;
      }

      try {
        let iframe = document.getElementById('bill-print-iframe') as HTMLIFrameElement;
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'bill-print-iframe';
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          document.body.appendChild(iframe);
        }

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>${bill.billNumber}</title>
                <style>
                  @page { margin: 0; size: auto; }
                  body {
                    margin: 0;
                    padding: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #ffffff;
                    color: #000000;
                  }
                  * { box-sizing: border-box; }
                  .no-print { display: none !important; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { padding: 4px 0; }
                </style>
              </head>
              <body>
                ${printBillEl.outerHTML}
              </body>
            </html>
          `);
          doc.close();

          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch {
              window.print();
            }
          }, 300);
        } else {
          window.print();
        }
      } catch {
        window.print();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLastError(`${t('printFailedMsg')} ${msg}`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-2 sm:p-4 backdrop-blur-xs flex justify-center items-start min-h-screen py-4 sm:py-6">
        <div className="relative w-full max-w-lg rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden my-auto">
          {/* Top Control Bar */}
          <div className="no-print bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10b981] text-white font-black text-sm">
                ✓
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#34d399]">
                  {isNewBill ? t('billGeneratedTitle') : t('receiptHeading')}
                </span>
                <p className="text-xs text-[#cbd5e1] font-mono font-bold">{bill.billNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                title={t('printBillBtn')}
                className="rounded-lg p-2 text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white transition cursor-pointer"
              >
                {isPrinting ? <Loader2 className="h-4 w-4 animate-spin text-[#fbbf24]" /> : <Printer className="h-4 w-4" />}
              </button>
              <button
                onClick={onClose}
                aria-label={t('close')}
                className="rounded-lg p-2 text-[#cbd5e1] hover:bg-[#1e293b] hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {toastMessage && (
            <div className="no-print bg-[#059669] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{toastMessage}</span>
              </div>
              {lastBlobUrl && (
                <a
                  href={lastBlobUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={lastBlobName}
                  className="underline text-[11px] text-[#d1fae5] hover:text-white font-mono"
                >
                  {t('openFileLink')}
                </a>
              )}
            </div>
          )}

          {lastError && (
            <div className="no-print mx-3 my-2 p-3 rounded-xl bg-[#fef2f2] border-2 border-[#ef4444] text-[#991b1b] text-xs">
              <div className="flex items-center gap-2 font-black text-[#b91c1c]">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#dc2626]" />
                <span>⚠️ {t('errorDetailsPrefix')}</span>
              </div>
              <p className="font-mono mt-1 text-[11px] bg-white p-2 rounded border border-[#fecaca] break-words text-[#7f1d1d]">
                {lastError}
              </p>
              <p className="mt-1 text-[10px] text-[#b91c1c] font-medium">
                {t('printFallbackAdvice')}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="no-print grid grid-cols-4 gap-1.5 p-3 bg-[#f1f5f9] border-b border-[#e2e8f0]">
            <button
              onClick={handleWhatsAppShare}
              disabled={isProcessing || isPrinting}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#059669] hover:bg-[#047857] disabled:opacity-60 px-1 py-2 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title={t('shareWhatsAppBtn')}
            >
              {isProcessing && processingAction === 'share' ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <MessageCircle className="h-4 w-4 text-white" />
              )}
              <span className="text-[10px] font-black leading-tight text-center">
                {isProcessing && processingAction === 'share' ? t('waitShort') : t('whatsAppBtnShort')}
              </span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isProcessing || isPrinting}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-60 px-1 py-2 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title={t('downloadImageBtn')}
            >
              {isProcessing && processingAction === 'image' ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <ImageIcon className="h-4 w-4 text-white" />
              )}
              <span className="text-[10px] font-black leading-tight text-center">
                {isProcessing && processingAction === 'image' ? t('waitShort') : t('imageBtnShort')}
              </span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isProcessing || isPrinting}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 px-1 py-2 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title={t('downloadPdfBtn')}
            >
              {isProcessing && processingAction === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <FileDown className="h-4 w-4 text-white" />
              )}
              <span className="text-[10px] font-black leading-tight text-center">
                {isProcessing && processingAction === 'pdf' ? t('waitShort') : t('pdfBtnShort')}
              </span>
            </button>

            <button
              onClick={handlePrint}
              disabled={isProcessing || isPrinting}
              className="flex flex-col items-center justify-center gap-1 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-60 px-1 py-2 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title={t('printBillBtn')}
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#fbbf24]" />
              ) : (
                <Printer className="h-4 w-4 text-[#fbbf24]" />
              )}
              <span className="text-[10px] font-black leading-tight text-center">
                {isPrinting ? t('waitShort') : t('printBtnShort')}
              </span>
            </button>
          </div>

          {/* PRINTABLE RECEIPT CONTAINER (Always pure white HEX colors) */}
          <div
            id="print-bill"
            ref={billContentRef}
            className="w-full"
            style={{
              height: 'auto',
              maxHeight: 'none',
              overflow: 'visible',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              padding: '20px 24px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            {/* Shop Header */}
            <div
              style={{
                textAlign: 'center',
                paddingBottom: '12px',
                borderBottom: '2px dashed #94a3b8',
              }}
            >
              {bill.isEstimate && (
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    border: '2px dashed #d97706',
                    color: '#92400e',
                    fontWeight: 900,
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  ⚠️ {t('estimateBadgeHeader')}
                </div>
              )}
              {shopInfo.showLogoOnBill && (
                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <ShopLogo shopInfo={shopInfo} size={80} forceShow={true} />
                </div>
              )}
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  letterSpacing: '-0.025em',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                ⚡ {shopInfo.name}
              </h1>
              {shopInfo.address && (
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginTop: '4px',
                    marginBottom: '4px',
                    maxWidth: '380px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    lineHeight: 1.35,
                  }}
                >
                  {shopInfo.address}
                </p>
              )}
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginTop: '6px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {shopInfo.mobile && (
                  <span>📞 {t('mobileColon')} {shopInfo.mobile}</span>
                )}
                {shopInfo.gstin && (
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569' }}>
                    GSTIN: {shopInfo.gstin}
                  </span>
                )}
              </div>
              {shopInfo.tagline && (
                <p
                  style={{
                    fontSize: '11px',
                    color: '#78350f',
                    fontWeight: 500,
                    fontStyle: 'italic',
                    marginTop: '4px',
                    marginBottom: 0,
                  }}
                >
                  "{shopInfo.tagline}"
                </p>
              )}
            </div>

            {/* Bill Meta Details */}
            <div
              style={{
                paddingTop: '10px',
                paddingBottom: '10px',
                borderBottom: '1px dashed #cbd5e1',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <p style={{ color: '#64748b', fontWeight: 500, margin: 0 }}>{t('billNoColon')}</p>
                <p style={{ fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', fontSize: '14px', margin: 0 }}>
                  {bill.billNumber}
                </p>
                {bill.customerName && (
                  <p style={{ marginTop: '4px', marginBottom: 0, color: '#1e293b' }}>
                    <span style={{ color: '#64748b' }}>{t('customer')}:</span>{' '}
                    <strong style={{ fontWeight: 700 }}>{bill.customerName}</strong>
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748b', fontWeight: 500, margin: 0 }}>
                  {t('date')} & {t('time')}:
                </p>
                <p style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  {formattedDate}
                </p>
                {bill.customerMobile && (
                  <p style={{ marginTop: '4px', marginBottom: 0, fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
                    📱 {bill.customerMobile}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <table style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #94a3b8', color: '#475569', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '6px 0', textAlign: 'left' }}>{t('itemTableDesc')}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>{t('qty')}</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>{t('rate')}</th>
                    <th style={{ padding: '6px 0', textAlign: 'right' }}>{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 4px 8px 0' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>{item.productName}</div>
                        {item.company && (
                          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>{item.company}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap' }}>
                        {item.quantity} <span style={{ fontSize: '10px', fontWeight: 400, color: '#64748b' }}>{item.unit}</span>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'monospace', color: '#334155', whiteSpace: 'nowrap' }}>
                        ₹{item.sellPrice}
                      </td>
                      <td style={{ padding: '8px 0 8px 4px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        ₹{Number(item.total).toFixed(2).replace(/\.00$/, '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bill-level Serial Numbers / Note (Only shown if typed) */}
            {bill.notes && bill.notes.trim().length > 0 && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  lineHeight: 1.45,
                  color: '#0f172a',
                  height: 'auto',
                  overflow: 'visible',
                }}
              >
                <div style={{ fontWeight: 900, color: '#0f172a', marginBottom: '2px' }}>
                  {t('noteSerialNoLabel')}
                </div>
                <div
                  style={{
                    color: '#1e293b',
                    fontWeight: 500,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {bill.notes}
                </div>
              </div>
            )}

            {/* Totals Section */}
            <div style={{ borderTop: '2px dashed #94a3b8', paddingTop: '12px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontWeight: 500, marginBottom: '6px' }}>
                <span>{t('subtotalLabel')}</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>₹{bill.subtotal.toFixed(2)}</span>
              </div>

              {bill.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700, marginBottom: '6px' }}>
                  <span>{t('discountLabel')}</span>
                  <span style={{ fontFamily: 'monospace' }}>-₹{bill.discount.toFixed(2)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: 900, color: '#0f172a', paddingTop: '6px', borderTop: '1px solid #e2e8f0', marginBottom: '8px' }}>
                <span>{t('grandTotalLabel')}</span>
                <span style={{ fontFamily: 'monospace', color: '#d97706', fontWeight: 900, fontSize: '18px' }}>
                  ₹{bill.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Mode: Hidden on Estimate receipts (Part 5C) */}
              {!bill.isEstimate && (
                <div style={{ paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{t('paymentModeLabel')}</span>
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      fontWeight: 900,
                      fontSize: '11px',
                      backgroundColor: bill.paymentMode === 'Cash' ? '#dcfce7' : bill.paymentMode === 'UPI' ? '#dbeafe' : '#ffe4e6',
                      color: bill.paymentMode === 'Cash' ? '#166534' : bill.paymentMode === 'UPI' ? '#1e40af' : '#9f1239',
                      border: `1px solid ${bill.paymentMode === 'Cash' ? '#86efac' : bill.paymentMode === 'UPI' ? '#93c5fd' : '#fda4af'}`,
                    }}
                  >
                    {bill.paymentMode === 'Cash' && t('payCash')}
                    {bill.paymentMode === 'UPI' && t('payUpi')}
                    {bill.paymentMode === 'Udhar' && t('payUdhar')}
                  </span>
                </div>
              )}
            </div>

            {/* OPTIONAL UPI PAYMENT QR CODE */}
            {showUpiQr && qrDataUrl && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  borderTop: '2px dashed #94a3b8',
                  borderBottom: '2px dashed #94a3b8',
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  <QrCode style={{ height: '16px', width: '16px', color: '#d97706' }} />
                  <span>{t('scanAndPayText')}</span>
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', marginBottom: '8px' }}>
                  PhonePe • Google Pay • Paytm • BHIM
                </p>

                <div style={{ margin: '8px auto', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', display: 'inline-block' }}>
                    <img
                      src={qrDataUrl}
                      alt={`UPI QR ₹${bill.grandTotal}`}
                      style={{ width: '112px', height: '112px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                    ₹{bill.grandTotal.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>•</span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                    {shopInfo.upiId}
                  </span>
                </div>

                <div className="no-print" style={{ marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEnlargedQrOpen(true)}
                    className="cursor-pointer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      backgroundColor: '#f59e0b',
                      color: '#0f172a',
                      fontWeight: 900,
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
                    }}
                  >
                    <Maximize2 style={{ height: '14px', width: '14px' }} />
                    <span>{t('enlargeQrBtn')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer Thank You */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px dashed #cbd5e1',
                textAlign: 'center',
                color: '#475569',
                fontSize: '12px',
              }}
            >
              <p style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>🙏 {billFooterMsg}</p>
              {shopInfo.address ? (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px', marginBottom: 0 }}>
                  {shopInfo.name ? `${shopInfo.name} • ` : ''}{shopInfo.address}
                </p>
              ) : shopInfo.name ? (
                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px', marginBottom: 0 }}>
                  {shopInfo.name}
                </p>
              ) : null}
            </div>
          </div>

          {/* Non-printing Quick Note / Serial No. Editor */}
          {isEditingNote && (
            <div className="no-print bg-[#fffbeb] border-t border-[#fde68a] px-4 py-3 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#92400e]">
                {t('serialNoteSectionTitle')}
              </label>
              <textarea
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={t('serialNotePlaceholder')}
                className="w-full rounded-xl border border-[#fcd34d] bg-white px-3 py-2 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#d97706] outline-none resize-y"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNoteDraft(bill.notes || '');
                    setIsEditingNote(false);
                  }}
                  className="rounded-lg bg-white border border-[#cbd5e1] px-3 py-1.5 text-xs font-bold text-[#475569] hover:bg-[#f1f5f9] cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateBill(bill.id, { notes: noteDraft.trim() || undefined });
                    setIsEditingNote(false);
                  }}
                  className="rounded-lg bg-[#059669] hover:bg-[#047857] px-3.5 py-1.5 text-xs font-black text-white cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          )}

          <div className="no-print bg-[#f8fafc] px-4 py-3 border-t border-[#e2e8f0] flex flex-wrap justify-between items-center gap-2">
            <p className="text-[11px] text-[#64748b] font-mono">
              {t('invoiceHashLabel')}{bill.billNumber}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNoteDraft(bill.notes || '');
                  setIsEditingNote((v) => !v);
                }}
                className="flex items-center gap-1 rounded-xl bg-white hover:bg-[#fef3c7] border border-[#cbd5e1] px-3 py-2 text-xs font-bold text-[#0f172a] transition cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-[#d97706]" />
                <span>{t('editNoteBtn')}</span>
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-[#0f172a] hover:bg-[#1e293b] px-5 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ENLARGED FULLSCREEN QR MODAL */}
      {isEnlargedQrOpen && qrDataUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white text-slate-900 p-6 shadow-2xl border border-slate-200 text-center">
            <button
              onClick={() => setIsEnlargedQrOpen(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center">
                ⚡
              </span>
              <h3 className="font-black text-slate-900 text-base uppercase">
                {shopInfo.payeeName || shopInfo.name}
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              {t('scanQrToPaySub')}
            </p>

            <div className="my-4 p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-md inline-block">
              <img
                src={qrDataUrl}
                alt={t('enlargeQrBtn')}
                className="w-56 h-56 object-contain mx-auto"
              />
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {t('totalBillAmountLabel')}
              </span>
              <span className="text-2xl font-black text-slate-950 font-mono">
                ₹{bill.grandTotal.toFixed(2)}
              </span>
              <p className="text-[11px] font-mono font-semibold text-slate-600 mt-0.5">
                {t('upiIdPrefix')} {shopInfo.upiId}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] text-slate-500 mb-4 font-bold">
              <span className="bg-slate-100 px-2 py-0.5 rounded">PhonePe</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">GPay</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">Paytm</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">BHIM</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">{t('anyUpiAppNote')}</span>
            </div>

            <button
              onClick={() => setIsEnlargedQrOpen(false)}
              className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-black transition active:scale-95 cursor-pointer"
            >
              {t('closeBtnFull')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
