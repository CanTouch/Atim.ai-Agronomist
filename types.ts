
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppMode {
  VOICE = 'VOICE',
  TEXT = 'TEXT'
}

export interface TranscriptionEntry {
  role: 'user' | 'model';
  text: string;
}
