import type { Config } from 'tailwindcss'

/**
 * Every design decision in the app comes from this file.
 * Change a token here and it changes everywhere — no hunting through components.
 *
 * v2 "flat": no card shadows, thin borders, a dark navigation rail, and status
 * chips built from background/foreground pairs instead of solid fills. The
 * source of truth is design/design_handoff_makeflow_flat/README.md.
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
        page: '#F6F7F9',
        card: '#FFFFFF',
        line: {
          DEFAULT: '#E7E9EF',
          // فواصل الصفوف داخل البطاقة — أفتح من حدّها الخارجي
          soft: '#F2F4F7',
        },
        // ترويسة الجدول
        head: '#FAFBFC',

        // text
        ink: {
          DEFAULT: '#101828', // primary
          muted: '#667085', // secondary
          faint: '#98A2B3', // hints, units, disabled
        },

        // the one accent — primary buttons, active nav
        accent: {
          DEFAULT: '#5B4CE0',
          hover: '#4B3ECB',
          soft: '#EFEDFC',
        },

        // الشريط الجانبي الداكن
        nav: {
          DEFAULT: '#12142B',
          raised: '#1B1E3A', // بطاقة داخل الشريط
          hover: '#20233F',
          ink: '#C9CCE0',
          muted: '#8B90AE',
          line: '#2B2F52',
        },

        // stage colors — solid pill + white bold text
        stage: {
          new: '#98A2B3',
          bot: '#3B9BE8',
          agreed: '#7B61FF',
          awaiting: '#F5A623',
          paid: '#12B76A',
          attended: '#0E9F6E',
          lost: '#F04438',
        },

        /**
         * أزواج الحالات: خلفية فاتحة + نص داكن منها.
         * الشرائح كلها تُبنى من هذه الأزواج، فلا يُخترع لون في مكوّن.
         */
        chip: {
          'success-bg': '#ECFDF3', 'success-fg': '#027A48',
          'warn-bg': '#FFFAEB', 'warn-fg': '#B54708',
          'danger-bg': '#FEE4E2', 'danger-fg': '#B42318',
          'neutral-bg': '#F2F4F7', 'neutral-fg': '#475467',
          'accent-bg': '#EFEDFC', 'accent-fg': '#4B3ECB',
          'blue-bg': '#E9F5FE', 'blue-fg': '#0B5A8A',
          'pink-bg': '#FDF2F8', 'pink-fg': '#B4257A',
        },

        // semantic — تُستعمل للنصوص والأيقونات، لا للخلفيات الفاتحة
        warn: '#B54708',
        danger: '#F04438',
        success: '#12B76A',
      },

      borderRadius: {
        card: '12px',
        input: '9px',
        chip: '8px',
        pill: '999px',
      },

      boxShadow: {
        // البطاقات بلا ظل في هذا الثيم — الظل للطبقات الطافية وحدها
        pop: '0 8px 24px rgba(16, 24, 40, .12)',
      },

      // 4 / 8 / 12 / 16 / 18 / 24 / 30
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        4.5: '18px',
        5.5: '22px',
        6: '24px',
        6.5: '26px',
        7.5: '30px',
        8: '32px',
      },

      fontSize: {
        // مقاسات الثيم، بأسماء تصف الاستعمال لا الحجم
        chip: ['11.5px', { lineHeight: '1.5' }],
        faint: ['12.5px', { lineHeight: '1.5' }],
        body: ['14px', { lineHeight: '1.6' }],
        'body-lg': ['14.5px', { lineHeight: '1.6' }],
        section: ['15.5px', { lineHeight: '1.4' }],
        stat: ['30px', { lineHeight: '1' }],
        'stat-sm': ['28px', { lineHeight: '1' }],
        title: ['27px', { lineHeight: '1.3' }],
      },

      fontFamily: {
        sans: [
          'var(--font-arabic)',
          'var(--font-arabic-fallback)',
          'system-ui',
          'sans-serif',
        ],
      },

      minHeight: {
        row: '52px',
      },

      transitionDuration: {
        DEFAULT: '130ms',
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
