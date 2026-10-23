export type Citation = { id: string; source: string; ref: string; url: string; quote?: string };

export const FIXED_OPTIONS = [
  'MONEY_FULL_VALUE',
  'OTHER_ASSET_FULL_VALUE',
  'MENS_GOLD_ZAKATABLE',
  'METAL_HELD_AS_WEALTH',
  'STOCK_TRADING_FULL_VALUE',
  'HOME_EXEMPT',
  'LAND_RESALE_INTENT',
  'LAND_NO_RESALE_INTENT',
  'HAWL_LATE_CLOSE',
  'DEDUCTIONS_CAPPED_AT_GROSS',
  'RATE_LUNAR_2_5',
  'ROUND_UP_FINAL_MINOR_UNIT',
] as const;

const c = (
  key: string,
  n: number,
  source: string,
  ref: string,
  url: string,
  quote?: string,
): Citation => ({
  id: `${key.replace(':', '.')}.${n}`,
  source,
  ref,
  url,
  ...(quote ? { quote } : {}),
});

const SPEC = 'Zakaat App design spec';
const SPEC_URL =
  'https://github.com/WaleedAli070/zakaat-app/blob/main/docs/superpowers/specs/2026-10-07-zakaat-app-design.md';

/** keyed `${ruleId}:${option}`; FIXED rules use `FIXED:${option}` */
export const CITATIONS: Record<string, Citation[]> = {
  'NISAB_METAL:SILVER': [
    c(
      'NISAB_METAL:SILVER',
      1,
      'National Zakat Foundation UK',
      'Nisab',
      'https://nzf.org.uk/nisab/',
      'using silver is safer and more beneficial for the recipients',
    ),
    c(
      'NISAB_METAL:SILVER',
      2,
      'IslamQA.info',
      'Answer 2795',
      'https://islamqa.info/en/answers/2795',
    ),
    c(
      'NISAB_METAL:SILVER',
      3,
      'Askimam (Mufti Ebrahim Desai)',
      'Fatwa 1346',
      'https://islamqa.org/hanafi/askimam/1346/',
    ),
  ],
  'NISAB_METAL:GOLD': [
    c(
      'NISAB_METAL:GOLD',
      1,
      'Zakat Foundation of America',
      'Nisab and zakat calculation in a nutshell',
      'https://www.zakat.org/nisab-and-zakat-calculation-in-a-nutshell',
    ),
    c(
      'NISAB_METAL:GOLD',
      2,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 p. 131',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
  ],
  'NISAB_GRAMS:STD_85_595': [
    c(
      'NISAB_GRAMS:STD_85_595',
      1,
      'IslamQA.info',
      'Answer 370380',
      'https://islamqa.info/en/answers/370380',
    ),
    c(
      'NISAB_GRAMS:STD_85_595',
      2,
      'AMJA',
      'Fatwa 79050',
      'https://www.amjaonline.org/fatwa/en/79050/how-much-is-the-nisab-for-zakat-now',
    ),
    c(
      'NISAB_GRAMS:STD_85_595',
      3,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 p. 130',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
  ],
  'NISAB_GRAMS:STD_87_612': [
    c(
      'NISAB_GRAMS:STD_87_612',
      1,
      'National Zakat Foundation UK',
      'Nisab',
      'https://nzf.org.uk/nisab/',
      '87.48 grams of gold and 612.36 grams of silver',
    ),
    c(
      'NISAB_GRAMS:STD_87_612',
      2,
      'Qibla / Shaykh Ilyas Patel',
      'The minimum zakatable amount (nisab)',
      'https://islamqa.org/hanafi/qibla-hanafi/34746/the-minimum-zakatable-amount-nisab/',
    ),
  ],
  'NISAB_GRAMS:LOWER_VALUE': [
    c(
      'NISAB_GRAMS:LOWER_VALUE',
      1,
      'IslamQA.info',
      'Answer 64 (most conservative threshold)',
      'https://islamqa.info/en/answers/64',
    ),
  ],
  'NISAB_COMBINE_METALS:COMBINE': [
    c(
      'NISAB_COMBINE_METALS:COMBINE',
      1,
      'Darul Ifta Birmingham',
      'Combining the value of gold and silver for zakat',
      'https://islamqa.org/hanafi/daruliftaa-birmingham/171143/combining-the-value-of-gold-and-silver-for-zakat/',
    ),
    c(
      'NISAB_COMBINE_METALS:COMBINE',
      2,
      'IslamQA.info quoting al-Mughni',
      'Answer 144734',
      'https://islamqa.info/en/answers/144734',
    ),
  ],
  'NISAB_COMBINE_METALS:SEPARATE': [
    c(
      'NISAB_COMBINE_METALS:SEPARATE',
      1,
      'IslamQA.info quoting al-Nawawi',
      'Answer 144734',
      'https://islamqa.info/en/answers/144734',
      'Gold cannot be added to silver or vice versa',
    ),
    c(
      'NISAB_COMBINE_METALS:SEPARATE',
      2,
      'IslamQA.info',
      'Answer 201807',
      'https://islamqa.info/en/answers/201807',
    ),
  ],
  'HAWL_MODEL:START_END': [
    c(
      'HAWL_MODEL:START_END',
      1,
      'National Zakat Foundation UK',
      'Is it necessary to own zakatable assets above nisab for the entire year?',
      'https://nzf.org.uk/knowledge/is-it-necessary-to-own-zakatable-assets-above-the-nisab-threshold-for-the-entire-year/',
    ),
    c(
      'HAWL_MODEL:START_END',
      2,
      'SeekersGuidance (Hanafi)',
      'Do I pay zakat only on money I have had for over a year?',
      'https://seekersguidance.org/answers/hanafi-fiqh/do-i-pay-zakat-only-on-money-ive-had-for-over-a-year/',
    ),
  ],
  'HAWL_MODEL:CONTINUOUS': [
    c(
      'HAWL_MODEL:CONTINUOUS',
      1,
      'IslamQA.info quoting al-Nawawi and al-Buhuti',
      'Answer 99381',
      'https://islamqa.info/en/answers/99381',
      'it is essential that the nisaab be present throughout the year',
    ),
    c(
      'HAWL_MODEL:CONTINUOUS',
      2,
      'IslamQA.info',
      'Answer 128168',
      'https://islamqa.info/en/answers/128168',
    ),
  ],
  'HAWL_NEW_WEALTH:ANNEX': [
    c(
      'HAWL_NEW_WEALTH:ANNEX',
      1,
      'Darul Ifta Birmingham',
      'Zakat on goods and merchandise',
      'https://islamqa.org/hanafi/daruliftaa-birmingham/77184/zakat-on-goods-and-merchandise-2/',
    ),
  ],
  'HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE': [
    c(
      'HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE',
      1,
      "Darul Iftaa Jordan (Shafi'i)",
      'Ruling on money earned during hawl',
      'https://islamqa.org/shafii/darul-iftaa-jordan/227971/ruling-on-money-earned-during-hawl/',
    ),
    c(
      'HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE',
      2,
      'IslamQA.info (Ibn Uthaymin)',
      'Answer 50801: choose a month and pay on all of it',
      'https://islamqa.info/en/answers/50801',
    ),
    c(
      'HAWL_NEW_WEALTH:ANNEX_LABEL_ADVANCE',
      3,
      'IslamQA.info',
      'Answer 93414',
      'https://islamqa.info/en/answers/93414/zakaah-on-wealth-earned-during-the-year',
    ),
  ],
  'JEWELLERY_PERSONAL:ZAKATABLE': [
    c(
      'JEWELLERY_PERSONAL:ZAKATABLE',
      1,
      'Askimam',
      'Zakat on gold jewellery',
      'https://islamqa.org/hanafi/askimam/124146/zakat-on-gold-jewellery-2/',
    ),
    c(
      'JEWELLERY_PERSONAL:ZAKATABLE',
      2,
      'IslamQA.info',
      'Answer 19901',
      'https://islamqa.info/en/answers/19901',
    ),
  ],
  'JEWELLERY_PERSONAL:EXEMPT_IF_WORN': [
    c(
      'JEWELLERY_PERSONAL:EXEMPT_IF_WORN',
      1,
      "SeekersGuidance (Shafi'i)",
      'What constitutes jewellery wearing that obviates zakat',
      'https://seekersguidance.org/answers/zakat-shafii-fiqh/what-constitutes-the-type-of-jewellery-wearing-that-obviates-the-need-to-pay-zakat-thereon/',
    ),
    c(
      'JEWELLERY_PERSONAL:EXEMPT_IF_WORN',
      2,
      "Shaykh Taha Karaan (Shafi'i)",
      'Zakah on extravagant jewelry',
      'https://islamqa.org/shafii/shafiifiqh/30157/questions-regarding-zakah-on-extravagant-jewelry/',
    ),
    c(
      'JEWELLERY_PERSONAL:EXEMPT_IF_WORN',
      3,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 pp. 147-148 (Maliki and Hanbali positions)',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
  ],
  'DEBT_DEDUCTION_SCOPE:NONE': [
    c(
      'DEBT_DEDUCTION_SCOPE:NONE',
      1,
      "Qibla / Hamza Karamali (Shafi'i)",
      'Zakat, debts, and sadaqa',
      'https://islamqa.org/shafii/qibla-shafii/33932/zakat-debts-zakat-and-sadaqa/',
      'being in debt does not exempt one from paying zakat',
    ),
    c(
      'DEBT_DEDUCTION_SCOPE:NONE',
      2,
      'IslamQA.info (Ibn Uthaymin)',
      'Answer 22426',
      'https://islamqa.info/en/answers/22426',
    ),
  ],
  'DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT': [
    c(
      'DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT',
      1,
      'Darul Iftaa Leicester',
      'Zakat on long and short term loans',
      'https://islamqa.org/hanafi/daruliftaa/8395/zakat-on-long-and-short-term-loans/',
    ),
    c(
      'DEBT_DEDUCTION_SCOPE:DUE_INSTALMENT',
      2,
      'AMJA / Dr Main Al-Qudah',
      'Fatwa 21598',
      'https://www.amjaonline.org/fatwa/en/21598/how-to-pay-zakat-while-still-paying-off-a-mortgage',
    ),
  ],
  'DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS': [
    c(
      'DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS',
      1,
      'National Zakat Foundation UK',
      'Deductible liabilities',
      'https://nzf.org.uk/knowledge/payment-of-zakat-deductible-liabilities/',
      'Up to 12 lunar months of instalments of longer-term debts',
    ),
    c(
      'DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS',
      2,
      'Askimam',
      'Zakaat on debt',
      'https://islamqa.org/hanafi/askimam/124321/zakaat-on-debt/',
    ),
    c(
      'DEBT_DEDUCTION_SCOPE:TWELVE_MONTHS',
      3,
      'SeekersGuidance (Hanafi)',
      'Calculating zakat with long-term debts',
      'https://seekersguidance.org/answers/hanafi-fiqh/calculating-zakat-with-long-term-debts/',
    ),
  ],
  'DEBT_DEDUCTION_SCOPE:FULL': [
    c(
      'DEBT_DEDUCTION_SCOPE:FULL',
      1,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 p. 70',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
      'all debts, immediate and deferred are deductible',
    ),
    c(
      'DEBT_DEDUCTION_SCOPE:FULL',
      2,
      'FatwaCentre',
      'Zakat on mortgage payments',
      'https://islamqa.org/hanafi/fatwacentre/179105/zakat-on-mortgage-payments/',
    ),
  ],
  'DEBT_SURPLUS_OFFSET:OFF': [
    c(
      'DEBT_SURPLUS_OFFSET:OFF',
      1,
      'Darul Iftaa Leicester',
      'Zakat and the subtraction of loans',
      'https://islamqa.org/hanafi/daruliftaa/8382/zakat-and-the-subtraction-of-loans/',
    ),
  ],
  'DEBT_SURPLUS_OFFSET:ON': [
    c(
      'DEBT_SURPLUS_OFFSET:ON',
      1,
      'Islamweb (Maliki)',
      'Fatwa 324727',
      'https://www.islamweb.net/en/fatwa/324727/calculating-zakah-when-one-is-creditor-and-debtor',
    ),
    c(
      'DEBT_SURPLUS_OFFSET:ON',
      2,
      'Islamweb quoting Ibn Qudamah (Hanbali)',
      'Fatwa 426541',
      'https://www.islamweb.net/en/fatwa/426541/deducting-the-value-of-debt-from-the-nisaab-when-paying-zakaah',
    ),
  ],
  'RECEIVABLE_TIMING:YEARLY_IF_STRONG': [
    c(
      'RECEIVABLE_TIMING:YEARLY_IF_STRONG',
      1,
      'Darul Ifta Birmingham',
      "Zakah on debts (qawi / da'if)",
      'https://islamqa.org/hanafi/daruliftaa-birmingham/87011/zakah-on-debts/',
    ),
    c(
      'RECEIVABLE_TIMING:YEARLY_IF_STRONG',
      2,
      "SeekersGuidance (Shafi'i)",
      'Zakat on debts not expected to be repaid',
      'https://seekersguidance.org/answers/shafii-fiqh/is-zakat-obligatory-on-debts-that-are-not-expected-to-be-repaid/',
    ),
  ],
  'RECEIVABLE_TIMING:YEARLY_ALL': [
    c(
      'RECEIVABLE_TIMING:YEARLY_ALL',
      1,
      'Joe Bradford',
      'How to calculate your zakat (include receivables expected back)',
      'https://joebradford.substack.com/p/how-to-calculate-your-zakat',
    ),
  ],
  'RECEIVABLE_TIMING:ON_RECEIPT': [
    c(
      'RECEIVABLE_TIMING:ON_RECEIPT',
      1,
      'IslamQA.info',
      'Answer 125854 (bad debt: pay once on receipt)',
      'https://islamqa.info/en/answers/125854/scholarly-views-concerning-zakah-on-debts-and-the-most-correct-view',
    ),
    c(
      'RECEIVABLE_TIMING:ON_RECEIPT',
      2,
      'IslamQA.info',
      'Answer 1817 (Islamic Fiqh Council)',
      'https://islamqa.info/en/answers/1817/paying-zakaah-on-loans',
    ),
  ],
  'RETIREMENT_METHOD:FULL_VESTED': [
    c(
      'RETIREMENT_METHOD:FULL_VESTED',
      1,
      'SeekersGuidance / Faraz A. Khan',
      'Zakat on 401k retirement plans',
      'https://seekersguidance.org/answers/hanafi-fiqh/zakat-on-401kretirement-plans/',
    ),
  ],
  'RETIREMENT_METHOD:NET_WITHDRAWABLE': [
    c(
      'RETIREMENT_METHOD:NET_WITHDRAWABLE',
      1,
      'AMJA / Dr Main Al-Qudah',
      'Zakat and the 401k retirement plan',
      'https://www.amjaonline.org/fatwa/en/23284/zakat-and-the-401k-retirement-plan',
    ),
    c(
      'RETIREMENT_METHOD:NET_WITHDRAWABLE',
      2,
      'Fiqh Council of North America',
      'Zakat on retirement accounts (Feb 2024)',
      'https://fiqhcouncil.org/wp-content/uploads/2024/02/Zakat-on-Retirement-Accounts.pdf',
    ),
  ],
  'RETIREMENT_METHOD:ZAKATABLE_PROPORTION': [
    c(
      'RETIREMENT_METHOD:ZAKATABLE_PROPORTION',
      1,
      'Fiqh Council of North America',
      'Zakah on retirement funds (Feb 2026)',
      'https://fiqhcouncil.org/zakah-on-retirement-funds/',
    ),
    c(
      'RETIREMENT_METHOD:ZAKATABLE_PROPORTION',
      2,
      'National Zakat Foundation UK',
      'Pensions',
      'https://nzf.org.uk/knowledge/pensions/',
    ),
  ],
  'RETIREMENT_METHOD:NONE_UNTIL_ACCESS': [
    c(
      'RETIREMENT_METHOD:NONE_UNTIL_ACCESS',
      1,
      'Joe Bradford',
      'Pay zakat on 401k?',
      'https://joebradford.net/pay-zakat-on-401k/',
    ),
    c(
      'RETIREMENT_METHOD:NONE_UNTIL_ACCESS',
      2,
      'IslamQA.info',
      'Answer 97442',
      'https://islamqa.info/en/answers/97442',
    ),
    c(
      'RETIREMENT_METHOD:NONE_UNTIL_ACCESS',
      3,
      "Darul Iftaa Jordan (Shafi'i)",
      'Fatwa 228649',
      'https://islamqa.org/shafii/darul-iftaa-jordan/228649/',
    ),
  ],
  'RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY': [
    c(
      'RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY',
      1,
      'Darul Ifta Deoband',
      'Fatwa 26346',
      'https://islamqa.org/hanafi/darulifta-deoband/26346/',
    ),
    c(
      'RETIREMENT_METHOD:COMPULSORY_DEFERRED_VOLUNTARY_YEARLY',
      2,
      'Askimam',
      'Fatwa 102466',
      'https://islamqa.org/hanafi/askimam/102466/',
    ),
  ],
  'STOCK_PASSIVE_METHOD:PROXY_25': [
    c(
      'STOCK_PASSIVE_METHOD:PROXY_25',
      1,
      'National Zakat Foundation UK',
      'Determining a proxy for share investments',
      'https://nzf.org.uk/knowledge/zakat-on-share-investments-determining-a-proxy-for-calculation/',
    ),
  ],
  'STOCK_PASSIVE_METHOD:PROXY_30': [
    c(
      'STOCK_PASSIVE_METHOD:PROXY_30',
      1,
      'Fiqh Council of North America',
      'Zakah on stocks (Nov 2025)',
      'https://fiqhcouncil.org/zakah-on-stocks/',
    ),
    c(
      'STOCK_PASSIVE_METHOD:PROXY_30',
      2,
      'Joe Bradford',
      'How we calculate zakat on stocks',
      'https://joebradford.net/how-we-calculate-zakat-on-stocks/',
    ),
    c(
      'STOCK_PASSIVE_METHOD:PROXY_30',
      3,
      'National Zakat Foundation Canada',
      'Zakat calculator',
      'https://www.nzfcanada.com/zakat-calculator',
    ),
  ],
  'STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE': [
    c(
      'STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE',
      1,
      'Zaytuna College',
      'Zakat calculator',
      'https://zakatcalculator.zaytuna.edu/',
    ),
    c(
      'STOCK_PASSIVE_METHOD:FULL_MARKET_VALUE',
      2,
      'IslamQA.info',
      'Answer 69912',
      'https://islamqa.info/en/answers/69912',
    ),
  ],
  'STOCK_PASSIVE_METHOD:DIVIDENDS_ONLY': [
    c(
      'STOCK_PASSIVE_METHOD:DIVIDENDS_ONLY',
      1,
      'AMJA / Dr Main Al-Qudah',
      'Fatwa 82475',
      'https://www.amjaonline.org/fatwa/en/82475/zakat-on-401k-shares',
    ),
  ],
  'RENTAL_METHOD:SAVED_RENT': [
    c(
      'RENTAL_METHOD:SAVED_RENT',
      1,
      'IslamQA.info',
      'Answer 231858',
      'https://islamqa.info/en/answers/231858/how-to-pay-zakah-on-real-estate',
    ),
    c(
      'RENTAL_METHOD:SAVED_RENT',
      2,
      'National Zakat Foundation UK',
      'Zakat on property',
      'https://nzf.org.uk/knowledge/zakat-on-property/',
    ),
  ],
  'RENTAL_METHOD:QARADAWI_NET_RENT_10': [
    c(
      'RENTAL_METHOD:QARADAWI_NET_RENT_10',
      1,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 ch. 8 pp. 245-247',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
  ],
  'RENTAL_METHOD:HIGHER': [
    c(
      'RENTAL_METHOD:HIGHER',
      1,
      'IslamQA.info',
      'Answer 128168 (giving zakat to avoid scholarly difference is better)',
      'https://islamqa.info/en/answers/128168',
    ),
  ],
  'PLOT_FILE:FROM_PURCHASE': [
    c(
      'PLOT_FILE:FROM_PURCHASE',
      1,
      'Jamia Banuri Town',
      'Fatwa 144109201332',
      'https://www.banuri.edu.pk/readquestion/qisto-par-kharede-gay-pilot-main-zakat-ka-hukum-144109201332/06-05-2020',
    ),
    c(
      'PLOT_FILE:FROM_PURCHASE',
      2,
      'Jamia tur Rasheed',
      'Fatwa mRq',
      'https://darulifta.info/d/jamiaturrasheed/fatwa/mRq/x',
    ),
    c(
      'PLOT_FILE:FROM_PURCHASE',
      3,
      'Jamia Binoria',
      'Fatwa csHz (pure file = receivable)',
      'https://darulifta.info/d/onlinefatawa/fatwa/csHz/',
    ),
  ],
  'PLOT_FILE:FROM_POSSESSION': [
    c(
      'PLOT_FILE:FROM_POSSESSION',
      1,
      'Jamia tur Rasheed citing Ahsan al-Fatawa 4/294',
      'Fatwa 3nv',
      'https://www.darulifta.info/d/jamiaturrasheed/fatwa/3nv/',
    ),
  ],
  'ADVANCE_PAYMENT:ALLOWED': [
    c(
      'ADVANCE_PAYMENT:ALLOWED',
      1,
      'Askimam',
      'Fatwa 85041',
      'https://islamqa.org/hanafi/askimam/85041/',
    ),
  ],
  'ADVANCE_PAYMENT:ALLOWED_ONE_YEAR': [
    c(
      'ADVANCE_PAYMENT:ALLOWED_ONE_YEAR',
      1,
      "SeekersGuidance (Shafi'i)",
      "Is advance payment of zakat permissible in the Shafi'i school?",
      'https://seekersguidance.org/answers/shafii-fiqh/is-advance-payment-of-zakat-permissible-in-the-shafii-school/',
    ),
  ],
  'ADVANCE_PAYMENT:ALLOWED_TWO_YEARS': [
    c(
      'ADVANCE_PAYMENT:ALLOWED_TWO_YEARS',
      1,
      'Islamweb quoting al-Mardawi',
      'Fatwa 51830',
      'https://www.islamweb.net/en/fatwa/51830/',
    ),
  ],
  'ADVANCE_PAYMENT:RESTRICTED': [
    c(
      'ADVANCE_PAYMENT:RESTRICTED',
      1,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 2 p. 152 (Malik does not allow pre-payment)',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol2.pdf',
    ),
    c(
      'ADVANCE_PAYMENT:RESTRICTED',
      2,
      'Islamweb',
      'Fatwa 51830',
      'https://www.islamweb.net/en/fatwa/51830/',
    ),
  ],
  'QADA_PRIOR_UNPAID:DEDUCT': [
    c(
      'QADA_PRIOR_UNPAID:DEDUCT',
      1,
      'SeekersGuidance (Hanafi)',
      'How do I pay zakat from previous years?',
      'https://seekersguidance.org/answers/hanafi-fiqh/how-do-i-pay-zakat-from-previous-years/',
    ),
    c(
      'QADA_PRIOR_UNPAID:DEDUCT',
      2,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 p. 70',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
  ],
  'QADA_PRIOR_UNPAID:NO_DEDUCT': [
    c(
      'QADA_PRIOR_UNPAID:NO_DEDUCT',
      1,
      'IslamQA.info',
      'Answer 26119',
      'https://islamqa.info/en/answers/26119/making-up-zakaah-from-past-years',
    ),
  ],
  'FIXED:MONEY_FULL_VALUE': [
    c(
      'FIXED:MONEY_FULL_VALUE',
      1,
      'IslamQA.info',
      'Answer 145600 (2.5% on money)',
      'https://islamqa.info/en/answers/145600',
    ),
  ],
  'FIXED:OTHER_ASSET_FULL_VALUE': [
    c('FIXED:OTHER_ASSET_FULL_VALUE', 1, SPEC, 'Section 2.1, Other zakatable asset', SPEC_URL),
    c(
      'FIXED:OTHER_ASSET_FULL_VALUE',
      2,
      'National Zakat Foundation UK',
      'Is zakat due on Bitcoin? (full value)',
      'https://nzf.org.uk/knowledge/is-zakat-due-on-bitcoin/',
    ),
  ],
  'FIXED:MENS_GOLD_ZAKATABLE': [
    c(
      'FIXED:MENS_GOLD_ZAKATABLE',
      1,
      'IslamQA.info',
      'Answer 59866',
      'https://islamqa.info/en/answers/59866/zakaah-on-jewellery-that-has-been-prepared-for-use',
      'zakah is obligatory on gold and silver jewellery if it is a kind of adornment that it is prohibited to use',
    ),
  ],
  'FIXED:METAL_HELD_AS_WEALTH': [
    c(
      'FIXED:METAL_HELD_AS_WEALTH',
      1,
      'Yusuf al-Qaradawi',
      'Fiqh al-Zakah vol. 1 pp. 147-148 (unworn or hoarded jewellery)',
      'https://www.islamicstudies.info/literature/fiqhalzakah_vol1.pdf',
    ),
    c(
      'FIXED:METAL_HELD_AS_WEALTH',
      2,
      'IslamQA.info',
      'Answer 59866',
      'https://islamqa.info/en/answers/59866/zakaah-on-jewellery-that-has-been-prepared-for-use',
    ),
  ],
  'FIXED:STOCK_TRADING_FULL_VALUE': [
    c(
      'FIXED:STOCK_TRADING_FULL_VALUE',
      1,
      'Mufti Taqi Usmani',
      'How to pay zakat',
      'https://muftitaqiusmani.com/en/how-to-pay-zakat/',
    ),
    c(
      'FIXED:STOCK_TRADING_FULL_VALUE',
      2,
      'Fiqh Council of North America',
      'Zakah on stocks',
      'https://fiqhcouncil.org/zakah-on-stocks/',
    ),
  ],
  'FIXED:HOME_EXEMPT': [
    c(
      'FIXED:HOME_EXEMPT',
      1,
      'IslamQA.info',
      'Answer 231858',
      'https://islamqa.info/en/answers/231858/how-to-pay-zakah-on-real-estate',
    ),
  ],
  'FIXED:LAND_RESALE_INTENT': [
    c(
      'FIXED:LAND_RESALE_INTENT',
      1,
      'Mufti Taqi Usmani',
      'How to pay zakat',
      'https://muftitaqiusmani.com/en/how-to-pay-zakat/',
    ),
    c(
      'FIXED:LAND_RESALE_INTENT',
      2,
      "SeekersGuidance (Shafi'i)",
      'Do I have to pay zakat on land?',
      'https://seekersguidance.org/answers/shafii-fiqh/do-i-have-to-pay-zakat-on-land/',
    ),
  ],
  'FIXED:LAND_NO_RESALE_INTENT': [
    c(
      'FIXED:LAND_NO_RESALE_INTENT',
      1,
      'IslamQA.info quoting Ibn Qudamah',
      'Answer 249774',
      'https://islamqa.info/en/answers/249774',
    ),
    c(
      'FIXED:LAND_NO_RESALE_INTENT',
      2,
      'Jamia Banuri Town',
      'Plot bought without firm intention of trade',
      'https://www.banuri.edu.pk/readquestion/پلاٹ-کے-خریدتے-وقت-تجارت-کی-حتمی-نیت-نہ-ہو-تو-اس-پر-زکو-ۃ-کا-حکم/27-12-2018',
    ),
  ],
  'FIXED:HAWL_LATE_CLOSE': [
    c(
      'FIXED:HAWL_LATE_CLOSE',
      1,
      'IslamQA.info',
      'Answer 169899 (delaying zakat past its due date is not permitted)',
      'https://islamqa.info/en/answers/169899',
    ),
  ],
  'FIXED:DEDUCTIONS_CAPPED_AT_GROSS': [
    c(
      'FIXED:DEDUCTIONS_CAPPED_AT_GROSS',
      1,
      SPEC,
      'Section 6, pipeline (net floors at zero)',
      SPEC_URL,
    ),
  ],
  'FIXED:RATE_LUNAR_2_5': [
    c(
      'FIXED:RATE_LUNAR_2_5',
      1,
      'IslamQA.info',
      'Answer 145600',
      'https://islamqa.info/en/answers/145600',
    ),
    c(
      'FIXED:RATE_LUNAR_2_5',
      2,
      'National Zakat Foundation UK',
      'Can a solar year be used? (lunar advised)',
      'https://nzf.org.uk/knowledge/can-a-solar-year-be-used-for-zakat-calculation/',
    ),
  ],
  'FIXED:ROUND_UP_FINAL_MINOR_UNIT': [
    c('FIXED:ROUND_UP_FINAL_MINOR_UNIT', 1, SPEC, 'Section 3.1, ROUNDING', SPEC_URL),
    c(
      'FIXED:ROUND_UP_FINAL_MINOR_UNIT',
      2,
      'IslamQA.info',
      'Answer 128168 (pay to avoid the difference of scholars)',
      'https://islamqa.info/en/answers/128168',
    ),
  ],
};

export function citationIdsFor(ruleId: string, option: string): string[] {
  return (CITATIONS[`${ruleId}:${option}`] ?? []).map((c) => c.id);
}
