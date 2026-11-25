import { AlertTriangle, Clock, Info } from 'lucide-react';
import type { Urgency } from '../shared/types.ts';
import { TRANSLATIONS, type Language } from '../i18n/translations.ts';

interface UrgencyLabelProps {
  urgency: Urgency;
  lang: Language;
}

export function UrgencyLabel({ urgency, lang }: UrgencyLabelProps) {
  const t = TRANSLATIONS[lang];

  if (urgency === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B3261E] dark:text-[#F28B82]">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t.urgencyCritical}</span>
      </span>
    );
  }

  if (urgency === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#92400E] dark:text-[#FBBF24]">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t.urgencyUrgent}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] dark:text-[#A8A29E]">
      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t.urgencyStandard}</span>
    </span>
  );
}
