/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Background tokens — light stone */
        bg: {
          page:     'var(--bg-page)',
          base:     'var(--bg-base)',
          raised:   'var(--bg-raised)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
        },
        /* Text tokens */
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          faint:     'var(--text-faint)',
        },
        /* Brand — Teal */
        teal: {
          50:  'var(--teal-50)',
          100: 'var(--teal-100)',
          200: 'var(--teal-200)',
          300: 'var(--teal-300)',
          400: 'var(--teal-400)',
          500: 'var(--teal-500)',
          600: 'var(--teal-600)',
          700: 'var(--teal-700)',
          800: 'var(--teal-800)',
          900: 'var(--teal-900)',
        },
        /* Sage */
        sage: {
          50:  'var(--sage-50)',
          100: 'var(--sage-100)',
          200: 'var(--sage-200)',
          300: 'var(--sage-300)',
          400: 'var(--sage-400)',
          500: 'var(--sage-500)',
          600: 'var(--sage-600)',
        },
        /* Coral — action / CTA */
        coral: {
          50:  'var(--coral-50)',
          100: 'var(--coral-100)',
          200: 'var(--coral-200)',
          300: 'var(--coral-300)',
          400: 'var(--coral-400)',
          500: 'var(--coral-500)',
          600: 'var(--coral-600)',
        },
        /* Lavender — AI / bot */
        lavender: {
          50:  'var(--lavender-50)',
          100: 'var(--lavender-100)',
          200: 'var(--lavender-200)',
          300: 'var(--lavender-300)',
          400: 'var(--lavender-400)',
          500: 'var(--lavender-500)',
          600: 'var(--lavender-600)',
        },
        /* Warm stone neutrals */
        stone: {
          0:   'var(--stone-0)',
          25:  'var(--stone-25)',
          50:  'var(--stone-50)',
          100: 'var(--stone-100)',
          150: 'var(--stone-150)',
          200: 'var(--stone-200)',
          300: 'var(--stone-300)',
          400: 'var(--stone-400)',
          500: 'var(--stone-500)',
          600: 'var(--stone-600)',
          700: 'var(--stone-700)',
          800: 'var(--stone-800)',
          900: 'var(--stone-900)',
        },
        /* Semantic */
        success:  'var(--color-success)',
        warning:  'var(--color-warning)',
        error:    'var(--color-error)',
        info:     'var(--color-info)',
        /* Border */
        border: {
          subtle:  'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
          teal:    'var(--border-teal)',
          coral:   'var(--border-coral)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body:    ['var(--font-body)',    'sans-serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        '3xl':'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs:       'var(--shadow-xs)',
        sm:       'var(--shadow-sm)',
        md:       'var(--shadow-md)',
        lg:       'var(--shadow-lg)',
        xl:       'var(--shadow-xl)',
        teal:     'var(--shadow-teal)',
        coral:    'var(--shadow-coral)',
        lavender: 'var(--shadow-lavender)',
        'teal-ring': '0 0 0 3px rgba(20,184,166,0.15)',
      },
      animation: {
        'fade-up':      'fade-up 0.4s ease both',
        'fade-in':      'fade-in 0.3s ease both',
        'bubble-left':  'bubble-in-left  0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'bubble-right': 'bubble-in-right 0.2s ease-out both',
        'mic-pulse':    'mic-pulse 2.2s ease infinite',
        'cursor-blink': 'cursor-blink 0.8s step-end infinite',
        'pulse-dot':    'pulse-dot 2s ease infinite',
        'waveform':     'waveform-anim 0.9s ease infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'bubble-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px) scale(0.94)' },
          to:   { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'bubble-in-right': {
          from: { opacity: '0', transform: 'translateX(12px) scale(0.94)' },
          to:   { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'mic-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(20, 184, 166, 0.4)' },
          '70%':  { boxShadow: '0 0 0 22px rgba(20, 184, 166, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(20, 184, 166, 0)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.75)' },
        },
        'waveform-anim': {
          '0%, 100%': { height: '8px',  opacity: '0.35' },
          '50%':      { height: '44px', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
