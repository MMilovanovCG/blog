import Typography from 'typography';

const typography = new Typography({
  baseFontSize: '18px',
  baseLineHeight: 1.75,
  bodyWeight: 400,
  boldWeight: 700,
  headerFontFamily: ['Lato', 'Tacoma', 'sans-serif'],
  bodyFontFamily: ['Lato', 'Tacoma', 'sans-serif'],
  googleFonts: [
    {
      name: 'Lato',
      styles: ['400', '700'],
    },
  ],
});

// Hot reload typography in development.
if (process.env.NODE_ENV !== 'production') {
  typography.injectStyles();
}

export default typography;
