import type { Config } from 'tailwindcss'

/**
 * Every design decision in the app comes from this file.
 * Change a token here and it changes everywhere — no hunting through components.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // surfaces
        page: '#F6F7FB',
        card: '#FFFFFF',
        line: '#E6E9F0',

        // text
        ink: {
          DEFAULT: '#1B2437', // primary
          muted: '#6B7280', // secondary
        },

        // the one accent — primary buttons, active nav
        accent: {
          DEFAULT: '#5B4CE0',
          hover: '#4C3FCB',
          soft: '#EFEDFC',
        },

        // stage colors, Monday-style: solid pill + white bold text
        stage: {
          new: '#9AA4B2',
          bot: '#3B9BE8',
          agreed: '#7B61FF',
          awaiting: '#F5A623',
          paid: '#22C55E',
          attended: '#0EA47A',
          lost: '#E5484D',
        },

        // semantic
        warn: '#F5A623',
        danger: '#E5484D',
        success: '#22C55E',
      },

      borderRadius: {
        card: '12px',
        input: '8px',
        pill: '999px',
      },

      boxShadow: {
        card: '0 1px 3px rgba(16, 24, 40, .06)',
        pop: '0 8px 24px rgba(16, 24, 40, .12)',
      },

      // 4 / 8 / 12 / 16 / 24 / 32
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      },

      fontFamily: {
        sans: ['var(--font-arabic)', 'Tajawal', 'system-ui', 'sans-serif'],
      },

      minHeight: {
        // table rows breathe — never compress below this
        row: '56px',
      },

      transitionDuration: {
        DEFAULT: '150ms',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
