export type AssessmentField = {
  id: string;
  description: string;
  type: 'File' | 'ShortAnswer' | 'LongAnswer';
  answer?: string;
  fileUrl?: string;
  fileName?: string;
};

export interface Assessment {
  id: number;
  assessment: {
    id: number;
    name: string;
    answerType: 'ShortAnswer' | 'LongAnswer' | 'File';
    assessmentType: string;
  };
  response?: {
    id: number;
    answerValue?: string;
    fileUrl?: string;
    fileName?: string;
  };
  status: 'Completed' | 'Pending';
  isApplicable: boolean;  // NEW FIELD
}

export const ASSESSMENT_TYPES = [
  'Technology',
  'Acceptance',
  'Market',
  'Regulatory',
  'Organizational',
  'Investment'
];
