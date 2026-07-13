export type LeadSource = 'mailing' | 'organic' | 'referral' | 'returning';
export type LeadStatus = 'open' | 'won' | 'lost';

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  mailing: 'רשימת תפוצה',
  organic: 'אתר',
  referral: 'הופנה ע"י ממליץ',
  returning: 'לקוח חוזר',
};

export type Lead = {
  id: number;
  name: string;
  school_name: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  referrer_name: string | null;
  status: LeadStatus;
  lost_reason: string | null;
  notes: string | null;
  converted_project_id: number | null;
  created_at: string;
  updated_at: string;
  steps?: LeadStep[];
  worker_times?: LeadWorkerTime[];
};

export type LeadStep = {
  id: number;
  lead_id: number;
  step_key: string;
  done: boolean;
  done_at: string | null;
  client_days: number | null;
  notes: string | null;
};

export type LeadWorkerTime = {
  id: number;
  lead_id: number;
  step_key: string;
  worker_id: number;
  duration_ms: number;
};

export type PipelineStepDef = {
  key: string;
  label: string;
  mandatory: boolean;
  stage: 'conversion' | 'finance';
  trackTime?: boolean;
};

export const PIPELINE_STEPS: PipelineStepDef[] = [
  { key: 'initial_contact', label: 'קבלת פנייה ראשונית', mandatory: true, stage: 'conversion', trackTime: true },
  { key: 'send_catalog', label: 'שליחת קטלוג דיגיטלי', mandatory: true, stage: 'conversion', trackTime: true },
  { key: 'followup_catalog', label: 'פולואפ אחרי קטלוג', mandatory: false, stage: 'conversion' },
  { key: 'schedule_call', label: 'תיאום שיחת ייעוץ', mandatory: false, stage: 'conversion' },
  { key: 'guidance_call', label: 'שיחת ייעוץ', mandatory: false, stage: 'conversion', trackTime: true },
  { key: 'management_approval', label: 'אישור הנהלה', mandatory: false, stage: 'conversion' },
  { key: 'followup_approval', label: 'פולואפ אחרי אישור הנהלה', mandatory: false, stage: 'conversion' },
  { key: 'closing', label: 'סגירה רשמית', mandatory: true, stage: 'conversion', trackTime: true },
  { key: 'invoice', label: 'הפקת חשבונית במורנינג', mandatory: true, stage: 'finance' },
  { key: 'payment_received', label: 'קבלת תשלום', mandatory: true, stage: 'finance' },
  { key: 'receipt', label: 'הפקת קבלה', mandatory: true, stage: 'finance' },
  { key: 'move_to_project', label: 'העברה לפרויקט פעיל', mandatory: true, stage: 'finance' },
];
