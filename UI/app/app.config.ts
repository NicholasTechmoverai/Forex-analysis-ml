export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    }
  },
  site: {
    name: 'Forex Intelligent Lab',
    url: 'https://forexintelligentlab.tera-in.top',
    description: 'Foreign excanga market analsis',
    apiBase: 'https://api.tera-in.top',
    // apiBase: 'http://localhost:8000',
    themeColor: '#FF5733',
    defaultImage: '/logo.png',
    favicon: '/logo.png',
    projectUrl:"https://github.com/NicholasTechmoverai/Forex-analysis-ml"
  },

  links: {
    navigation: [{
      label: "Live",
      to: "/live"
    },
    {
      label: "dashboard",
      to:"/dashbaord"
    }
    ]
  },
     social: [
      {
        to: 'https://github.com/NicholasTechmoverai/Forex-analysis-ml',
        label: 'Github',
        icon: 'i-simple-icons-github',
        target: '_blank'
      },
      {
        to: 'https://www.linkedin.com/in/nicholas-kariuki-5a719326b',
        label: 'LinkedIn',
        icon: 'i-simple-icons-linkedin',
        target: '_blank'
      }
    ],
})
