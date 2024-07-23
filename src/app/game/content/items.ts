import { Item, Backpack, Shoes } from '../interfaces/interfaces';

export const defaultBackpack: Backpack = {
  name: 'default backpack',
  id: 'default_backpack',
  description: 'Default Backpack',
  price: 0,
  weight: 2,
  volume: 0,
  capacity: 10,
};

export const defaultShoes: Shoes = {
  name: 'default shoes',
  id: 'default_shoes',
  description: 'Default Shoes',
  price: 0,
  weight: 0,
  volume: 0,
  speedMultiplier: 1,
};

export const items: Item[] = [
  {
    name: 'Paper map',
    id: 'gps_0',
    description: 'A basic map so that you can find your current location.',
    price: 5,
    weight: 0.1,
    volume: 1,
  },
  {
    name: 'GPS',
    id: 'gps_1',
    description:
      'A basic GPS device that will allow you to optimize your route and move faster.',
    price: 100,
    weight: 1,
    volume: 2,
  },
];

export const backpacks: Backpack[] = [defaultBackpack];

export const shoes: Shoes[] = [defaultShoes];
