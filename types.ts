
export enum Side {
  BRIDE = 'BRIDE',
  GROOM = 'GROOM'
}

export enum Confidence {
  HIGH = 'HIGH',
  POSSIBLE = 'POSSIBLE'
}

export interface GuestDetails {
  fullName: string;
  side: Side;
  relation: string;
  phoneNumber?: string;
}

export interface Photo {
  id: string;
  url: string;
  confidence: Confidence;
  timestamp: number;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  location: string;
}
