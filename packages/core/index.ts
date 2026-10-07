import { AssetCategory, Fiqh } from '@zakaat/types';

export interface IFiqhStrategy {
    calculateGold(weight: number, pricePerGram: number): number;
    calculateCash(amount: number, exchangeRate: number): number;
}
