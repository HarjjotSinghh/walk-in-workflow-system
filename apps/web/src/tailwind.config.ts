import type { Config } from 'tailwindcss';

import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette';
import tailwindAnimate from 'tailwindcss-animate';

function addVariablesForColors({
  addBase,
  theme
}: {
    // eslint-disable-next-line 
  addBase: Function;
  // eslint-disable-next-line
  theme: Function;
}) {
  const allColors = flattenColorPalette(theme('colors'));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ':root': newVars
  });
}

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './layouts/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    // path.join(path.dirname(require.resolve('@signvault/ui-lib')), '**/*.tsx'),
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1920px',
        '3xl': '2560px'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        accent2: {
          DEFAULT: 'hsl(var(--accent2))',
          foreground: 'hsl(var(--accent2-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        line: 'hsl(var(--line))',
        outline: 'hsl(var(--outline))',
        gradient: {
          1: 'hsl(var(--gradient-1))',
          2: 'hsl(var(--gradient-2))',
          3: 'hsl(var(--gradient-3))',
          4: 'hsl(var(--gradient-4))'
        },
        color: {
          1: 'hsl(var(--color-1))',
          2: 'hsl(var(--color-2))',
          3: 'hsl(var(--color-3))',
          4: 'hsl(var(--color-4))',
          5: 'hsl(var(--color-5))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))'
        },
        sidebar: {
          'DEFAULT': 'hsl(var(--sidebar-background))',
          'foreground': 'hsl(var(--sidebar-foreground))',
          'primary': 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          'accent': 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          'border': 'hsl(var(--sidebar-border))',
          'ring-3': 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        'sora': ['var(--font-sora)'],
        'geistMono': ['var(--font-geist-mono)'],
        'tik-tok-sans': ['var(--font-tik-tok-sans)']
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'rainbow': {
          '0%': {
            'background-position': '0%'
          },
          '100%': {
            'background-position': '200%'
          }
        },
        'star-movement-bottom': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(-100%, 0%)', opacity: '0' }
        },
        'star-movement-top': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(100%, 0%)', opacity: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'rainbow': 'rainbow var(--speed, 2s) infinite linear',
        'star-movement-bottom':
          'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate'
      },
      maxWidth: {
        '5xl': '70rem'
      },
      fontSize: {
        '4xl': '2.5rem',
        '3xl': '2rem'
      }
    }
  },
  plugins: [addVariablesForColors, tailwindAnimate]
};
export default config;
