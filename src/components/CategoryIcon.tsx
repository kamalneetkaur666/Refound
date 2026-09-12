import React from 'react';
import {
  Laptop,
  Headphones,
  CreditCard,
  Key,
  BookOpen,
  Briefcase,
  Shirt,
  Watch,
  Coffee,
  Dumbbell,
  Package,
} from 'lucide-react';
import { ItemCategory } from '../types';

interface CategoryIconProps {
  category: ItemCategory;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-5 h-5' }) => {
  switch (category) {
    case 'Electronics':
      return <Laptop className={className} />;
    case 'Audio & Headphones':
      return <Headphones className={className} />;
    case 'Wallets & IDs':
      return <CreditCard className={className} />;
    case 'Keys':
      return <Key className={className} />;
    case 'Books & Notebooks':
      return <BookOpen className={className} />;
    case 'Bags & Backpacks':
      return <Briefcase className={className} />;
    case 'Clothing & Accessories':
      return <Shirt className={className} />;
    case 'Jewelry & Watches':
      return <Watch className={className} />;
    case 'Bottles & Containers':
      return <Coffee className={className} />;
    case 'Sports & Gym':
      return <Dumbbell className={className} />;
    case 'Other':
    default:
      return <Package className={className} />;
  }
};
