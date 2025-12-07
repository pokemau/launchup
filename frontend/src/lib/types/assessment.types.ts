export type AssessmentField = {
  id: string;
  description: string;
  type: 'File' | 'ShortAnswer' | 'LongAnswer';
  answer?: string;
  fileUrl?: string;
  fileName?: string;
};

export type Assessment = {
  id: number;
  name: string;
  assessmentType: string;
  assessmentStatus: 'Pending' | 'Completed';
  assessmentFields: AssessmentField[];
};

export const ASSESSMENT_TYPES = [
  'Technology',
  'Acceptance',
  'Market',
  'Regulatory',
  'Organizational',
  'Investment'
];
