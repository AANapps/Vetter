import React, { useEffect } from 'react';
import { Award, Printer, X } from 'lucide-react';

/**
 * A certificate for passing a piece of training: who, what, for which company, when and with what score. Printing it
 * (or saving it as a PDF from the print dialog) prints only the certificate.
 */
export interface CertificateDetails {
  id: string;
  name: string;
  trainingTitle: string;
  companyName: string;
  skills: string[];
  score: number;
  certifiedAt: string;
}

export const CertificateDialog: React.FC<{ cert: CertificateDetails; onClose: () => void }> = ({ cert, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const date = new Date(cert.certifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const ref = `VT-C-${cert.id.replace(/[^a-z0-9]/gi, '').slice(-10).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 print:bg-white print:p-0">
      <div role="dialog" aria-modal="true" aria-label="Certificate" className="w-full max-w-3xl space-y-3">
        <div className="flex justify-end gap-2 print:hidden">
          <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print or save as PDF
          </button>
          <button onClick={onClose} aria-label="Close" className="p-2 text-white/80 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="vetter-certificate theme-light bg-white rounded-2xl shadow-2xl p-3 print:shadow-none print:rounded-none">
          <div className="border-4 border-double border-indigo-200 rounded-xl px-6 sm:px-12 py-10 text-center space-y-5">
            <div className="flex items-center justify-center gap-2 text-indigo-700">
              <Award className="w-8 h-8" />
              <span className="text-xs font-bold uppercase tracking-[0.25em]">Certificate of completion</span>
            </div>
            <p className="text-sm text-slate-500">This certifies that</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{cert.name}</h2>
            <p className="text-sm text-slate-500">has completed and passed the training</p>
            <h3 className="text-xl sm:text-2xl font-semibold text-indigo-800">{cert.trainingTitle}</h3>
            {cert.skills.length > 0 && (
              <p className="text-sm text-slate-600 max-w-xl mx-auto">
                Covering {cert.skills.slice(0, 5).join(', ')}
                {cert.skills.length > 5 ? ' and more' : ''}.
              </p>
            )}
            <div className="grid grid-cols-3 gap-4 pt-6 text-left sm:text-center border-t border-slate-200 max-w-xl mx-auto">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Issued by</div>
                <div className="text-sm font-semibold text-slate-900">{cert.companyName}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</div>
                <div className="text-sm font-semibold text-slate-900">{date}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Score</div>
                <div className="text-sm font-semibold text-slate-900">{cert.score}/100</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Vetter · {ref}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
