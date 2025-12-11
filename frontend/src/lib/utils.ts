import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { browser } from '$app/environment';
import axiosInstance from './axios';
import { PUBLIC_API_URL } from '$env/static/public';
import type { RNSItem } from './types/rns.types';
import type { Role } from './types/user.types';
import { mode } from 'mode-watcher';
import { get } from 'svelte/store';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export enum CalculatorCategory {
  Technology = 'Technology',
  Product_Development = 'Product Development',
  Product_Definition = 'Product Definition',
  Competitive_Landscape = 'Competitive Landscape',
  Team = 'Team',
  Go_To_Market = 'Go-To-Market',
  Supply_Chain = 'Supply Chain'
}

export enum ReadinessType {
  Technology = 'Technology',
  Market = 'Market',
  Acceptance = 'Acceptance',
  Regulatory = 'Regulatory',
  Organizational = 'Organizational',
  Investment = 'Investment'
}

// export enum Role {
//   Manager = 'Manager',
//   Mentor = 'Mentor',
//   Startup = 'Startup',
//   ManagerAsMentor = 'Manager as Mentor'
// }

// export const getRole = (
//   role: Role
// ) => {
//   const roles = {
//     Manager: 'Manager',
//     Mentor: 'Mentor',
//     Startup: 'Startup',
//     ManagerAsMentor: 'Manager as Mentor'
//   };
//
//   return roles[`${role}`];
// };

export const setLocal = (name: string, value: any) => {
  if (browser) {
    localStorage.setItem(name, value);
  }
};

export const getLocal = (name: string) => {
  if (browser) {
    return localStorage.getItem(name);
  }
};

export const getColumns = (): Array<{
  name: string;
  items: RNSItem[];
  show: boolean;
  value: number;
}> => {
  return [
    {
      name: 'New',
      items: [],
      show: true,
      value: 1
    },
    {
      name: 'Scheduled',
      items: [],
      show: true,
      value: 2
    },
    {
      name: 'On Track',
      items: [],
      show: true,
      value: 3
    },
    {
      name: 'Completed',
      items: [],
      show: true,
      value: 4
    },
    {
      name: 'Delayed',
      items: [],
      show: true,
      value: 5
    },
    {
      name: 'Discontinued',
      items: [],
      show: true,
      value: 6
    },
    {
      name: 'Long Term',
      items: [],
      show: true,
      value: 7
    }
  ];

  // return [
  //   {
  //     name: 'Discontinued',
  //     value: 2,
  //     items: [],
  //     show: true
  //   },
  //   {
  //     name: 'Scheduled',
  //     value: 3,
  //     items: [],
  //     show: true
  //   },
  //   {
  //     name: 'Track',
  //     value: 4,
  //     items: [],
  //     show: true
  //   },
  //   {
  //     name: 'Delayed',
  //     value: 5,
  //     items: [],
  //     show: true
  //   },
  //   {
  //     name: 'Completed',
  //     value: 6,
  //     items: [],
  //     show: true
  //   }
  // ];
};

export const getStartupMemberCount = (startup: any) => {
  if (!startup?.capsuleProposal) {
    return 1;
  }

  if (
    startup.capsuleProposal.members &&
    Array.isArray(startup.capsuleProposal.members)
  ) {
    return startup.capsuleProposal.members.length + 1;
  }
  return 1;
};

export const getReadiness = () => {
  return [
    {
      name: 'Technology',
      show: true
    },
    {
      name: 'Investment',
      show: true
    },
    {
      name: 'Regulatory',
      show: true
    },
    {
      name: 'Acceptance',
      show: true
    },
    {
      name: 'Organizational',
      show: true
    },
    {
      name: 'Market',
      show: true
    }
  ];
};

export const updateTab = (name: string, tab: string) => {
  if (getAllowedTabs(name).includes(tab)) {
    setLocal(name, tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);

    return tab;
  } else {
    return getAllowedTabs(name)[0];
  }
};

export const getAllowedTabs = (name: string) => {
  return [name, `ai-${name}`];
};

export const isMentor = (role: Role) => {
  return ['Mentor', 'Manager as Mentor'].includes(role);
};

export const getSelectedTab = (name: string): string => {
  if (getAllowedTabs(name).includes(getLocal(name) ?? ''))
    return getLocal(name)!;
  return name;
};

export const getSavedTab = (name: string, searchParam: any) => {
  const savedTab = getLocal('initiatives');
  let selectedTab;

  if (searchParam && getAllowedTabs(name).includes(searchParam)) {
    selectedTab = searchParam;
    setLocal(name, searchParam);
  } else if (savedTab && getAllowedTabs(name).includes(savedTab)) {
    selectedTab = savedTab;

    const url = new URL(window.location.href);
    url.searchParams.set('tab', savedTab);
    window.history.replaceState({}, '', url);
  } else {
    selectedTab = name;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', name);
    window.history.replaceState({}, '', url);
    setLocal(name, name);
  }

  return selectedTab;
};

export const getData = async (url: string, access: string) => {
  const URL = `${PUBLIC_API_URL}${url}`;
  const response = await axiosInstance.get(URL, {
    headers: {
      Authorization: `Bearer ${access}`
    }
  });
  return response.data;
};

export const zIndex = ['z-50', 'z-40', 'z-30', 'z-20', 'z-10', 'z-0'];

export const getBadgeColorObject = (
  label: 'Pending' | 'Waitlisted' | 'Qualified' | 'Completed'
) => {
  const isDark = get(mode) === 'dark';

  switch (label) {
    case 'Qualified':
      return isDark
        ? {
            bg: 'bg-green-900',
            text: 'text-green-100',
            border: 'border-green-100'
          }
        : {
            bg: 'bg-green-100',
            text: 'text-green-800',
            border: 'border-green-200'
          };
    case 'Pending':
      return isDark
        ? {
            bg: 'bg-yellow-900',
            text: 'text-yellow-100',
            border: 'border-yellow-100'
          }
        : {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            border: 'border-yellow-200'
          };
    case 'Waitlisted':
      return isDark
        ? {
            bg: 'bg-orange-900',
            text: 'text-orange-100',
            border: 'border-orange-100'
          }
        : {
            bg: 'bg-orange-100',
            text: 'text-orange-800',
            border: 'border-orange-200'
          };
    case 'Completed':
      return isDark
        ? {
            bg: 'bg-blue-900',
            text: 'text-blue-100',
            border: 'border-blue-100'
          }
        : {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            border: 'border-blue-200'
          };
    default:
      return isDark
        ? {
            bg: 'bg-gray-800',
            text: 'text-gray-100',
            border: 'border-gray-100'
          }
        : {
            bg: 'bg-gray-50',
            text: 'text-gray-800',
            border: 'border-gray-100'
          };
  }
};

export const getBadgeColor = (
  label: 'Pending' | 'Waitlisted' | 'Qualified' | 'Completed'
) => {
  switch (label) {
    case 'Qualified':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'Waitlisted':
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'Completed':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    default:
      return 'bg-gray-50 text-gray-800 border border-gray-100';
  }
};

export const profileColor = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-gray-500',
  'bg-slate-500',
  'bg-zinc-500',
  'bg-stone-500'
];

export const getPriorityStyles = (
  priority: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
) => {
  const priorityClasses = {
    1: 'bg-red-700 hover:bg-red-800',
    2: 'bg-orange-700 hover:bg-orange-800',
    3: 'bg-yellow-700 hover:bg-yellow-800',
    4: 'bg-lime-700 hover:bg-lime-800',
    5: 'bg-green-700 hover:bg-green-800',
    6: 'bg-teal-700 hover:bg-teal-800',
    7: 'bg-blue-700 hover:bg-blue-800',
    8: 'bg-indigo-700 hover:bg-indigo-800',
    9: 'bg-purple-700 hover:bg-purple-800',
    10: 'bg-pink-700 hover:bg-pink-800'
  };

  return priorityClasses[priority] || 'bg-gray-500 hover:bg-gray-600';
};

export const getReadinessStyles = (
  type:
    | 'Technology'
    | 'Market'
    | 'Acceptance'
    | 'Regulatory'
    | 'Organizational'
    | 'Investment'
) => {
  const readinessClasses = {
    Technology:
      'text-violet-100 bg-violet-600/90 hover:bg-violet-700 border border-violet-500/30',
    Market:
      'text-blue-100 bg-blue-600/90 hover:bg-blue-700 border border-blue-500/30',
    Acceptance:
      'text-emerald-100 bg-emerald-600/90 hover:bg-emerald-700 border border-emerald-500/30',
    Regulatory:
      'text-rose-100 bg-rose-600/90 hover:bg-rose-700 border border-rose-500/30',
    Organizational:
      'text-indigo-100 bg-indigo-600/90 hover:bg-indigo-700 border border-indigo-500/30',
    Investment:
      'text-amber-100 bg-amber-600/90 hover:bg-amber-700 border border-amber-500/30'
  };
  return (
    readinessClasses[type] ||
    'text-zinc-100 bg-zinc-600/90 hover:bg-zinc-700 border border-zinc-500/30'
  );
};

export function getProfileColor(firstName: string) {
  if (!firstName || typeof firstName !== 'string') {
    return 'bg-gray-500'; // Default color if no valid name is provided
  }

  // Get the ASCII value of the first letter, convert it to uppercase for consistency
  const firstChar = firstName[0].toUpperCase();
  const asciiValue = firstChar.charCodeAt(0);

  // Map the ASCII value to an index in the profileColor array
  const colorIndex = asciiValue % profileColor.length;

  return profileColor[colorIndex];
}

export const getReadinessTypes = () => {
  return [
    {
      id: 2,
      name: 'Technology'
    },
    {
      id: 3,
      name: 'Market'
    },
    {
      id: 4,
      name: 'Acceptance'
    },
    {
      id: 5,
      name: 'Organizational'
    },
    {
      id: 6,
      name: 'Regulatory'
    },
    {
      id: 7,
      name: 'Investment'
    }
  ];
};

export const getReadinessLevels = (
  readiness:
    | 'Technology'
    | 'Market'
    | 'Acceptance'
    | 'Organizational'
    | 'Regulatory'
    | 'Investment'
) => {
  const levels = {
    Technology: [
      { id: 1, level: 1 },
      { id: 2, level: 2 },
      { id: 3, level: 3 },
      { id: 4, level: 4 },
      { id: 5, level: 5 },
      { id: 6, level: 6 },
      { id: 7, level: 7 },
      { id: 8, level: 8 },
      { id: 9, level: 9 }
    ],
    Market: [
      { id: 10, level: 1 },
      { id: 11, level: 2 },
      { id: 12, level: 3 },
      { id: 13, level: 4 },
      { id: 14, level: 5 },
      { id: 15, level: 6 },
      { id: 16, level: 7 },
      { id: 17, level: 8 },
      { id: 18, level: 9 }
    ],
    Acceptance: [
      { id: 19, level: 1 },
      { id: 20, level: 2 },
      { id: 21, level: 3 },
      { id: 22, level: 4 },
      { id: 23, level: 5 },
      { id: 24, level: 6 },
      { id: 25, level: 7 },
      { id: 26, level: 8 },
      { id: 27, level: 9 }
    ],
    Organizational: [
      { id: 28, level: 1 },
      { id: 29, level: 2 },
      { id: 30, level: 3 },
      { id: 31, level: 4 },
      { id: 32, level: 5 },
      { id: 33, level: 6 },
      { id: 34, level: 7 },
      { id: 35, level: 8 },
      { id: 36, level: 9 }
    ],
    Regulatory: [
      { id: 37, level: 1 },
      { id: 38, level: 2 },
      { id: 39, level: 3 },
      { id: 40, level: 4 },
      { id: 41, level: 5 },
      { id: 42, level: 6 },
      { id: 42, level: 7 },
      { id: 44, level: 8 },
      { id: 45, level: 9 }
    ],
    Investment: [
      { id: 46, level: 1 },
      { id: 47, level: 2 },
      { id: 48, level: 3 },
      { id: 49, level: 4 },
      { id: 50, level: 5 },
      { id: 51, level: 6 },
      { id: 52, level: 7 },
      { id: 53, level: 8 },
      { id: 54, level: 9 }
    ]
  };

  return levels[readiness];
};

export const getStatusName = (s: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
  const status = {
    1: 'New',
    2: 'Scheduled',
    3: 'On Track',
    4: 'Completed',
    5: 'Delayed',
    6: 'Discontinued',
    7: 'Long Term'
  };

  return status[s];
};

export const getAssessmentFieldType = (s: 1 | 2 | 3) => {
  const fieldTypes = {
    1: 'Short Answer',
    2: 'Long Answer',
    3: 'File Upload'
  };
  return fieldTypes[s];
};

