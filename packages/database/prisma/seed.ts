import { PrismaClient, AssetCategory, Currency } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });


const prisma = new PrismaClient();

const TROY_OUNCE_TO_GRAMS = 31.1034768;

async function main() {
    const historicalDataDir = path.join(__dirname, '../historical-data');

    if (!fs.existsSync(historicalDataDir)) {
        console.error(`Directory not found: ${historicalDataDir}`);
        return;
    }

    const files = fs.readdirSync(historicalDataDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    console.log(`Found ${csvFiles.length} CSV files to process.`);

    for (const file of csvFiles) {
        const filePath = path.join(historicalDataDir, file);
        const fileName = path.parse(file).name; // e.g., "gold_usd", "usd_pkr"

        const parts = fileName.split('_');
        if (parts.length < 2) {
            console.warn(`Skipping file with invalid name format: ${file}`);
            continue;
        }

        const firstPart = parts[0].toUpperCase(); // GOLD, SILVER, USD, EUR
        const secondPart = parts[1].toUpperCase(); // USD, PKR, etc.

        let isMetal = false;
        let metal: AssetCategory | undefined;
        let sourceCurrency: Currency | undefined;

        // Check if it is a Metal Rate (starts with GOLD or SILVER)
        if (firstPart === 'GOLD') {
            metal = AssetCategory.GOLD;
            isMetal = true;
        } else if (firstPart === 'SILVER') {
            metal = AssetCategory.SILVER;
            isMetal = true;
        } else {
            // Assume it is a Forex Rate (Source Currency -> Target Currency)
            // Verify source currency
            if (!Object.values(Currency).includes(firstPart as Currency)) {
                console.warn(`Unknown source type (not metal or currency): ${firstPart} in file ${file}`);
                continue;
            }
            sourceCurrency = firstPart as Currency;
            isMetal = false;
        }

        // Verify Target/Second Currency
        // Note: Some files might be "gold_pkr_sarmaya", we take the middle part if compatible
        let targetCurrencyRaw = secondPart;
        if (!Object.values(Currency).includes(targetCurrencyRaw as Currency)) {
            console.warn(`Unknown target currency: ${targetCurrencyRaw} in file ${file}`);
            continue;
        }
        const targetCurrency = targetCurrencyRaw as Currency;

        console.log(`Processing ${isMetal ? metal : sourceCurrency} -> ${targetCurrency} from ${file}...`);

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');

        if (lines.length < 2) continue; // Empty or just header

        // Determine CSV Format based on Header
        const header = lines[0].trim();
        let dateIndex = -1;
        let priceIndex = -1;
        let isQuoted = false;

        if (header.includes('"Date"') && header.includes('"Price"')) {
            // Standard Format: "Date","Price",...
            isQuoted = true;
            // Simple detection based on known format "Date","Price"
            // In "Date","Price",... Date is 0, Price is 1
            // If header matches exactly that start
            if (header.startsWith('"Date","Price"')) {
                dateIndex = 0;
                priceIndex = 1;
            }
        } else if (header === 'price,date,symbol') {
            // Sarmaya Format: price,date,symbol
            isQuoted = false;
            dateIndex = 1;
            priceIndex = 0;
        }

        // Fallback for known standard files if simple check fails but looks standard
        if (dateIndex === -1 && header.startsWith('"Date"')) {
            isQuoted = true;
            dateIndex = 0;
            priceIndex = 1;
        }

        if (dateIndex === -1 || priceIndex === -1) {
            console.warn(`Unknown CSV header format in ${file}: ${header}`);
            continue;
        }


        // Skip header
        const dataLines = lines.slice(1);
        let count = 0;

        for (const line of dataLines) {
            if (!line.trim()) continue;

            let cols: string[] = [];

            if (isQuoted) {
                const matches = line.match(/"([^"]*)"/g);
                if (!matches) continue;
                cols = matches.map(m => m.replace(/"/g, ''));
            } else {
                cols = line.split(',');
            }

            if (cols.length <= Math.max(dateIndex, priceIndex)) continue;

            const dateStr = cols[dateIndex];
            // Remove commas from price if present (e.g. "2,804.00")
            const priceStr = cols[priceIndex].replace(/,/g, '');

            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                continue; // Skip invalid dates
            }

            const price = parseFloat(priceStr);
            if (isNaN(price)) {
                continue;
            }

            if (isMetal) {
                // Convert Troy Ounce to Grams for Metals
                // BUT wait, Sarmaya data (PKR) might be per Tola or 10 grams? 
                // Standard Investing.com data (quoted) is usually per Troy Ounce for USD, but for PKR?
                // Visual inspection of gold_pkr_sarmaya.csv: 280,400 PKR.
                // Gold price in PKR per Tola is around 280k.
                // 1 Tola = 11.66 grams. 1 Troy Ounce = 31.10 grams.
                // If it is per Tola, we need to convert to Grams.
                // Investing.com PKR data (gold_pkr.csv) -> let's check its values.

                // For now, I will assume the existing logic (Troy Ounce) for standard files 
                // and maybe Tola for Sarmaya? 
                // Actually, let's look at the price. 280,400.
                // Gold price per gram in PKR is around 24,000.
                // 280,400 / 24,000 = ~11.6. Use Tola!

                let pricePerGram = 0;

                if (file.includes('sarmaya')) {
                    // Sarmaya is likely per Tola (11.6638 grams)
                    const TOLA_TO_GRAMS = 11.6638;
                    pricePerGram = price / TOLA_TO_GRAMS;
                } else {
                    // Investing.com is usually per Troy Ounce
                    pricePerGram = price / TROY_OUNCE_TO_GRAMS;
                }

                try {
                    await prisma.dailyMetalRate.upsert({
                        where: {
                            metal_currency_date: {
                                metal: metal!,
                                currency: targetCurrency, // For metal, the currency is the pricing currency (e.g. USD)
                                date: date
                            }
                        },
                        update: { pricePerGram },
                        create: {
                            metal: metal!,
                            currency: targetCurrency,
                            date: date,
                            pricePerGram
                        }
                    });
                    count++;
                } catch (e) {
                    console.error(`Error processing metal line: ${line} in ${file}`, e);
                }
            } else {
                // Forex Rate (Direct Rate)
                try {
                    await prisma.dailyExchangeRate.upsert({
                        where: {
                            sourceCurrency_targetCurrency_date: {
                                sourceCurrency: sourceCurrency!,
                                targetCurrency: targetCurrency,
                                date: date
                            }
                        },
                        update: { rate: price }, // Price IS the rate
                        create: {
                            sourceCurrency: sourceCurrency!,
                            targetCurrency: targetCurrency,
                            date: date,
                            rate: price
                        }
                    });
                    count++;
                } catch (e) {
                    console.error(`Error processing forex line: ${line} in ${file}`, e);
                }
            }
        }
        console.log(`Seeded ${count} records for ${file}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
