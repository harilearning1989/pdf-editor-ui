export interface FontConfig {
  name: string;
  type: 'system' | 'google';
}

export const FONTS: FontConfig[] = [
  { name: 'Arial', type: 'system' },
  { name: 'Times New Roman', type: 'system' },
  { name: 'Courier New', type: 'system' },
  { name: 'Roboto', type: 'google' },
  { name: 'Poppins', type: 'google' },
  { name: 'Open Sans', type: 'google' },
  { name: 'Lato', type: 'google' },
  { name: 'Montserrat', type: 'google' },
  { name: 'Raleway', type: 'google' },
  { name: 'Nunito', type: 'google' }
];