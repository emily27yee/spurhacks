// Suppress specific console errors globally
const originalConsoleError = console.error;

console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress text rendering errors
  if (message.includes('Text strings must be rendered within a <Text> component')) {
    // Optionally log as warning instead
    console.warn('Suppressed text rendering error:', message);
    return;
  }
  
  // Let all other errors through
  originalConsoleError.apply(console, args);
};

export const suppressTextRenderingErrors = () => {
  // This function can be called to ensure the override is applied
  console.log('Text rendering error suppression enabled');
}; 