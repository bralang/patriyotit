export type Worker = {
  id: number;
  name: string;
  email: string | null;
  user_id: string | null;
  sort_order: number;
};

export type Status = {
  id: number;
  name: string;
  sort_order: number;
};

export type ProjectType = {
  id: number;
  name: string;
  sort_order: number;
};

export type Package = {
  id: number;
  name: string;
  sort_order: number;
};

export type Client = {
  id: number;
  school_name: string;
  city: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  institution_type: string | null;
  notes: string | null;
  created_at: string;
};

export type ProjectStage = {
  id: number;
  project_id: number;
  stage_index: number;
  name: string;
  client_days: number | null;
  done: boolean;
  notes: string | null;
  target_hours: number | null;
  worker_times?: StageWorkerTime[];
};

export type StageWorkerTime = {
  id: number;
  stage_id: number;
  worker_id: number;
  duration_ms: number;
  worker?: Worker;
};

export type Project = {
  id: number;
  name: string;
  client_id: number | null;
  contact2: string | null;
  drive_url: string | null;
  local_folder_path: string | null;
  instructions_url: string | null;
  template_url: string | null;
  notes: string | null;
  event_date: string | null;
  status_id: number | null;
  type_id: number | null;
  package_id: number | null;
  locked_at: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  client?: Client;
  status?: Status;
  type?: ProjectType;
  package?: Package;
  workers?: Worker[];
  stages?: ProjectStage[];
};

export type ActivityLogEntry = {
  id: number;
  worker_id: number | null;
  action: string;
  project_name: string | null;
  created_at: string;
  worker?: Worker;
};

export type Settings = {
  statuses: Status[];
  types: ProjectType[];
  workers: Worker[];
  packages: Package[];
};

// Urgency levels for event dates
export type UrgencyLevel = 'danger' | 'warn';
export type Urgency = {
  level: UrgencyLevel;
  days: number;
  label: string;
};

// Work stages definition (fixed 7 stages)
export type WorkStageDef = {
  name: string;
  intermediate: boolean;
};

export const WORK_STAGES: WorkStageDef[] = [
  { name: 'העברת תשלום', intermediate: false },
  { name: 'שיחת פיצוח קונספט', intermediate: false },
  { name: 'איסוף תכנים', intermediate: false },
  { name: 'פרוטוטיפ', intermediate: false },
  { name: 'אישור לקוח', intermediate: true },
  { name: 'מאסטרטיפ', intermediate: false },
  { name: 'אישור לקוח', intermediate: true },
];

export const MAILING_TYPE_NAME = 'דיוור';

export const MAILING_STAGES: WorkStageDef[] = [
  { name: 'יצירת הדמיות', intermediate: false },
  { name: 'כתיבה', intermediate: false },
  { name: 'בדיקה', intermediate: false },
  { name: 'תזמון', intermediate: false },
];

export const MAILING_SUBTYPES = [
  'שיתוף',
  'פטריוטיפ',
  'הרהורים',
  'אחר',
  'הקבצה א׳- מועדון השותפות של פטריוטית',
];

export const MAILING_SUBTYPE_COLORS: Record<string, { banner: string; badgeBg: string; badgeText: string; icon: string }> = {
  'שיתוף':   { banner: '#32FF9D', badgeBg: '#B8FFE5', badgeText: '#006B3A', icon: '#00994D' },
  'פטריוטיפ': { banner: '#FF3232', badgeBg: '#FFD0D0', badgeText: '#990000', icon: '#CC0000' },
  'הרהורים':  { banner: '#4A7DFF', badgeBg: '#D0DCFF', badgeText: '#1A3EAA', icon: '#1A3EAA' },
  'אחר':     { banner: '#EF32FF', badgeBg: '#FFD6FF', badgeText: '#880099', icon: '#880099' },
  'הקבצה א׳- מועדון השותפות של פטריוטית': { banner: '#FFEA32', badgeBg: '#FFF5A0', badgeText: '#7A6500', icon: '#7A6500' },
};
