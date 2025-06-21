/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#4ECDC4'; // Changed from white to a teal color for better visibility

export const Colors = {
  orange: '#F26F3F',
  cream: '#F5EFE6',
  yellow: '#FFC700',
  dark_text: '#333333',
  red: '#FF5A5A',
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    buttonText: '#fff', // White text for buttons with tint background
    border: '#E5E5E7',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    buttonText: '#fff', // White text for buttons with tint background  
    border: '#38383A',
  },
};
