const startupModule = {
  name: 'Startups',
  link: 'startups',
  hideSubmodule: true,
  subModule: [
    {
      name: 'Assessment',
      link: 'assessment',
      subModule: []
    },
    {
      name: 'Readiness',
      link: 'readiness-level',
      subModule: []
    },
    {
      name: 'RNA',
      link: 'rna',
      subModule: []
    },
    {
      name: 'RNS',
      link: 'rns',
      subModule: []
    },
    {
      name: 'Initiatives',
      link: 'initiatives',
      subModule: []
    },
    {
      name: 'Roadblocks',
      link: 'roadblocks',
      subModule: []
    },
    // {
    //   name: 'Progress',
    //   link: 'progress-report',
    //   subModule: []
    // },
    {
      name: 'Overview',
      link: 'overview',
      subModule: [
        {
          name: 'General',
          link: 'general'
        },
        {
          name: 'Members',
          link: 'members'
        },
        {
          name: 'Capsule Proposal',
          link: 'capsule_proposal'
        },
        {
          name: 'Elevate',
          link: 'elevate'
        }
      ]
    }
  ]
};

const settingsModule = {
  name: 'Account',
  link: 'account',
  hideSubmodule: true,
  subModule: [
    {
      name: 'Profile',
      link: 'profile',
      subModule: []
    },
    {
      name: 'Appearance',
      link: 'appearance',
      subModule: []
    }
    // {
    // 	name: 'Change Password',
    // 	link: 'password'
    // }
  ]
};

export const access = {
  roles: {
    Startup: {
      modules: [startupModule, settingsModule]
    },
    Mentor: {
      modules: [startupModule, settingsModule]
    },
    Manager: {
      modules: [
        {
          name: 'Applications',
          link: 'applications',
          subModule: []
        },
        // {
        //   name: 'Analytics',
        //   link: 'analytics',
        //   subModule: []
        // },
        // {
        // 	name: 'Cohorts',
        // 	link: 'cohorts',
        // 	subModule: []
        // },
        {
          name: 'Account',
          link: 'account',
          subModule: [
            ...settingsModule.subModule, // Spread the predefined settingsModule submodules
            {
              name: 'Role',
              link: 'role', // The link for the manager settings page or section
              subModule: []
            }
          ]
        }
      ]
    },
    'Manager as Mentor': {
      modules: [
        startupModule,
        {
          name: 'Account',
          link: 'account',
          subModule: [
            ...settingsModule.subModule, // Spread the predefined settingsModule submodules
            {
              name: 'Role',
              link: 'role', // The link for the manager settings page or section
              subModule: []
            }
          ]
        }
      ]
    }
  }
};
