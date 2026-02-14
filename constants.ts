
import { Side } from './types';

export const EVENT_DATA = {
  id: 'wedding-2024-arjun-meera',
  name: 'Arjun & Meera Wedding',
  date: 'June 24, 2024',
  location: 'The Grand Palace, Udaipur'
};

export const RELATION_OPTIONS: Record<Side, string[]> = {
  [Side.BRIDE]: [
    "Bride's Mother", "Bride's Father", "Bride's Sister", "Bride's Brother",
    "Bride's Grandmother", "Bride's Grandfather", "Bride's Aunt", "Bride's Uncle",
    "Bride's Cousin", "Bride's Sister-in-law", "Bride's Brother-in-law",
    "Bride's Niece", "Bride's Nephew", "Bride's Best Friend", "Bride's Friend",
    "Bride's Colleague", "Bride's Guest"
  ],
  [Side.GROOM]: [
    "Groom's Mother", "Groom's Father", "Groom's Sister", "Groom's Brother",
    "Groom's Grandmother", "Groom's Grandfather", "Groom's Aunt", "Groom's Uncle",
    "Groom's Cousin", "Groom's Sister-in-law", "Groom's Brother-in-law",
    "Groom's Niece", "Groom's Nephew", "Groom's Best Friend", "Groom's Friend",
    "Groom's Colleague", "Groom's Guest"
  ]
};

export const COMMON_RELATIONS = [
  "Neighbor", "Family Friend", "General Guest"
];
