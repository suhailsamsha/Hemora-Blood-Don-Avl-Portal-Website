export type Language = 'en' | 'ta' | 'hi' | 'kn';

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  kn: 'ಕನ್ನಡ',
};

interface TranslationBundle {
  brand: string;
  navFindDonors: string;
  navRequests: string;
  navBecomeDonor: string;
  navDonorLogin: string;
  navAwareness: string;
  navPartners: string;
  navAdmin: string;
  navQrPosters: string;
  ctaRequestBlood: string;
  emergencyFooter: string;
  medicalDisclaimer: string;
  searchBloodGroup: string;
  searchAllGroups: string;
  searchCity: string;
  searchAllCities: string;
  searchAreaPlaceholder: string;
  searchAvailableOnly: string;
  searchVerifiedOnly: string;
  searchButton: string;
  shortageHeading: string;
  availabilityByGroup: string;
  verifiedLabel: string;
  unverifiedLabel: string;
  availableLabel: string;
  cooldownLabel: string;
  pausedLabel: string;
  lastDonationLabel: string;
  noRecentDonation: string;
  requestContactBtn: string;
  reportBtn: string;
  iCanDonateBtn: string;
  urgencyCritical: string;
  urgencyUrgent: string;
  urgencyStandard: string;
  loadingText: string;
  noDonorsFound: string;
  unitsUnit: string;
  unitsUnits: string;
  themeLight: string;
  themeDark: string;
  homeSubnote: string;
}

export const TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {
    brand: 'Blood Donation Portal',
    navFindDonors: 'Find Donors',
    navRequests: 'Requests',
    navBecomeDonor: 'Become a Donor',
    navDonorLogin: 'Donor Login',
    navAwareness: 'Awareness',
    navPartners: 'Partners',
    navAdmin: 'Admin',
    navQrPosters: 'QR Posters',
    ctaRequestBlood: 'Request Blood',
    emergencyFooter:
      'In an emergency, contact your local ambulance (108) or hospital blood bank first.',
    medicalDisclaimer:
      'Final medical eligibility (haemoglobin, blood pressure, and screening) is decided by the blood bank.',
    searchBloodGroup: 'Blood group',
    searchAllGroups: 'All groups',
    searchCity: 'City',
    searchAllCities: 'All cities',
    searchAreaPlaceholder: 'Enter locality or area',
    searchAvailableOnly: 'Available only',
    searchVerifiedOnly: 'Verified only',
    searchButton: 'Search donors',
    shortageHeading: 'Current local shortages',
    availabilityByGroup: 'Available donors by blood group',
    verifiedLabel: 'Verified',
    unverifiedLabel: 'Pending verification',
    availableLabel: 'Available',
    cooldownLabel: '90-day cooldown',
    pausedLabel: 'Paused',
    lastDonationLabel: 'Last donation',
    noRecentDonation: 'No donation recorded',
    requestContactBtn: 'Request contact',
    reportBtn: 'Report',
    iCanDonateBtn: 'I can donate',
    urgencyCritical: 'Critical',
    urgencyUrgent: 'Urgent',
    urgencyStandard: 'Standard',
    loadingText: 'Loading records...',
    noDonorsFound: 'No matching donors found for this filter.',
    unitsUnit: 'unit',
    unitsUnits: 'units',
    themeLight: 'Light',
    themeDark: 'Dark',
    homeSubnote:
      'Phone numbers are never listed publicly. A donor sees your request first and shares contact details only when they accept.',
  },
  ta: {
    brand: 'இரத்த தான போர்டல்',
    navFindDonors: 'தானம் செய்வோர்',
    navRequests: 'கோரிக்கைகள்',
    navBecomeDonor: 'தானம் செய்ய பதிவு',
    navDonorLogin: 'தானியாளர் உள்நுழைவு',
    navAwareness: 'விழிப்புணர்வு',
    navPartners: 'கூட்டாளர்கள்',
    navAdmin: 'நிர்வாகம்',
    navQrPosters: 'QR சுவரொட்டி',
    ctaRequestBlood: 'இரத்தம் கோர',
    emergencyFooter:
      'அவசர நிலையில் முதலில் உங்கள் உள்ளூர் ஆம்புலன்ஸ் (108) அல்லது மருத்துவமனை இரத்த வங்கியைத் தொடர்பு கொள்ளவும்.',
    medicalDisclaimer:
      'இறுதி மருத்துவத் தகுதி (ஹீமோகுளோபின், இரத்த அழுத்தம் மற்றும் பரிசோதனை) இரத்த வங்கியால் தீர்மானிக்கப்படுகிறது.',
    searchBloodGroup: 'இரத்த வகை',
    searchAllGroups: 'அனைத்து வகைகளும்',
    searchCity: 'நகரம்',
    searchAllCities: 'அனைத்து நகரங்களும்',
    searchAreaPlaceholder: 'பகுதி அல்லது இடத்தை உள்ளிடவும்',
    searchAvailableOnly: 'தயாராக உள்ளவர்கள் மட்டும்',
    searchVerifiedOnly: 'சரிபார்க்கப்பட்டவர்கள் மட்டும்',
    searchButton: 'தேடுக',
    shortageHeading: 'தற்போதைய உள்ளூர் பற்றாக்குறை',
    availabilityByGroup: 'இரத்த வகை வாரியாக தயாராக உள்ளவர்கள்',
    verifiedLabel: 'சரிபார்க்கப்பட்டது',
    unverifiedLabel: 'சரிபார்ப்பு நிலுவையில்',
    availableLabel: 'தயார்',
    cooldownLabel: '90 நாள் இடைவெளி',
    pausedLabel: 'நிறுத்தப்பட்டது',
    lastDonationLabel: 'கடைசி தானம்',
    noRecentDonation: 'முந்தைய தானம் இல்லை',
    requestContactBtn: 'தொடர்பு கோர',
    reportBtn: 'புகார்',
    iCanDonateBtn: 'நான் தானம் செய்ய முடியும்',
    urgencyCritical: 'அவசரம் (Critical)',
    urgencyUrgent: 'விரைவு (Urgent)',
    urgencyStandard: 'வழக்கமான (Standard)',
    loadingText: 'தகவல்கள் ஏற்றப்படுகின்றன...',
    noDonorsFound: 'இந்தத் தேடலுக்குப் பொருந்தும் தானியாளர்கள் இல்லை.',
    unitsUnit: 'யூனிட்',
    unitsUnits: 'யூனிட்கள்',
    themeLight: 'பகல்',
    themeDark: 'இரவு',
    homeSubnote:
      'தொலைபேசி எண்கள் பொதுவில் காட்டப்படாது. தானியாளர் உங்கள் கோரிக்கையை ஏற்ற பிறகே தொடர்பு எண் பகிரப்படும்.',
  },
  hi: {
    brand: 'रक्तदान पोर्टल',
    navFindDonors: 'रक्तदाता खोजें',
    navRequests: 'अनुरोध बोर्ड',
    navBecomeDonor: 'रक्तदाता बनें',
    navDonorLogin: 'दाता लॉगिन',
    navAwareness: 'जानकारी',
    navPartners: 'सहयोगी',
    navAdmin: 'एडमिन',
    navQrPosters: 'QR पोस्टर',
    ctaRequestBlood: 'रक्त अनुरोध करें',
    emergencyFooter:
      'आपात स्थिति में पहले अपने नजदीकी एम्बुलेंस (108) या अस्पताल के ब्लड बैंक से संपर्क करें।',
    medicalDisclaimer:
      'अंतिम चिकित्सा पात्रता (हीमोग्लोबिन, रक्तचाप और जांच) ब्लड बैंक द्वारा तय की जाती है।',
    searchBloodGroup: 'ब्लड ग्रुप',
    searchAllGroups: 'सभी ग्रुप',
    searchCity: 'शहर',
    searchAllCities: 'सभी शहर',
    searchAreaPlaceholder: 'अपना इलाका या क्षेत्र दर्ज करें',
    searchAvailableOnly: 'केवल उपलब्ध दाता',
    searchVerifiedOnly: 'केवल सत्यापित',
    searchButton: 'खोजें',
    shortageHeading: 'स्थानीय कमी वाले ब्लड ग्रुप',
    availabilityByGroup: 'ब्लड ग्रुप के अनुसार उपलब्ध दाता',
    verifiedLabel: 'सत्यापित',
    unverifiedLabel: 'सत्यापन लंबित',
    availableLabel: 'उपलब्ध',
    cooldownLabel: '90-दिन प्रतीक्षा',
    pausedLabel: 'रोका गया',
    lastDonationLabel: 'पिछला रक्तदान',
    noRecentDonation: 'कोई पिछला रिकॉर्ड नहीं',
    requestContactBtn: 'संपर्क अनुरोध',
    reportBtn: 'रिपोर्ट',
    iCanDonateBtn: 'मैं रक्तदान कर सकता हूँ',
    urgencyCritical: 'अति आवश्यक (Critical)',
    urgencyUrgent: 'शीघ्र (Urgent)',
    urgencyStandard: 'सामान्य (Standard)',
    loadingText: 'डेटा लोड हो रहा है...',
    noDonorsFound: 'इस फ़िल्टर के लिए कोई दाता नहीं मिला।',
    unitsUnit: 'यूनिट',
    unitsUnits: 'यूनिट',
    themeLight: 'लाइट',
    themeDark: 'डार्क',
    homeSubnote:
      'रक्तदाताओं के फ़ोन नंबर सार्वजनिक नहीं दिखते। दाता द्वारा अनुरोध स्वीकार करने पर ही नंबर साझा होता है।',
  },
  kn: {
    brand: 'ರಕ್ತದಾನ ಪೋರ್ಟಲ್',
    navFindDonors: 'ರಕ್ತದಾತರನ್ನು ಹುಡುಕಿ',
    navRequests: 'ರಕ್ತದ ವಿನಂತಿಗಳು',
    navBecomeDonor: 'ರಕ್ತದಾತರಾಗಿ',
    navDonorLogin: 'ದಾತರ ಲಾಗಿನ್',
    navAwareness: 'ಮಾಹಿತಿ',
    navPartners: 'ಪಾಲುದಾರರು',
    navAdmin: 'ನಿರ್ವಾಹಕ',
    navQrPosters: 'QR ಪೋಸ್ಟರ್',
    ctaRequestBlood: 'ರಕ್ತಕ್ಕಾಗಿ ವಿನಂತಿಸಿ',
    emergencyFooter:
      'ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ಮೊದಲು ನಿಮ್ಮ ಸ್ಥಳೀಯ ಆಂಬ್ಯುಲೆನ್ಸ್ (108) ಅಥವಾ ಆಸ್ಪತ್ರೆಯ ರಕ್ತನಿಧಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    medicalDisclaimer:
      'ಅಂತಿಮ ವೈದ್ಯಕೀಯ ಅರ್ಹತೆಯನ್ನು (ಹಿಮೋಗ್ಲೋಬಿನ್, ರಕ್ತದೊತ್ತಡ ಮತ್ತು ತಪಾಸಣೆ) ರಕ್ತನಿಧಿಯವರು ನಿರ್ಧರಿಸುತ್ತಾರೆ.',
    searchBloodGroup: 'ರಕ್ತದ ಗುಂಪು',
    searchAllGroups: 'ಎಲ್ಲಾ ಗುಂಪುಗಳು',
    searchCity: 'ನಗರ',
    searchAllCities: 'ಎಲ್ಲಾ ನಗರಗಳು',
    searchAreaPlaceholder: 'ನಿಮ್ಮ ಪ್ರದೇಶ ಅಥವಾ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ',
    searchAvailableOnly: 'ಲಭ್ಯವಿರುವವರು ಮಾತ್ರ',
    searchVerifiedOnly: 'ಪರಿಶೀಲಿಸಿದವರು ಮಾತ್ರ',
    searchButton: 'ದಾತರನ್ನು ಹುಡುಕಿ',
    shortageHeading: 'ಪ್ರಸ್ತುತ ಸ್ಥಳೀಯ ಕೊರತೆಗಳು',
    availabilityByGroup: 'ರಕ್ತದ ಗುಂಪಿನ ಪ್ರಕಾರ ಲಭ್ಯವಿರುವ ದಾತರು',
    verifiedLabel: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ',
    unverifiedLabel: 'ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ',
    availableLabel: 'ಲಭ್ಯವಿದ್ದಾರೆ',
    cooldownLabel: '90 ದಿನಗಳ ವಿರಾಮ',
    pausedLabel: 'ವಿರಾಮದಲ್ಲಿದೆ',
    lastDonationLabel: 'ಕೊನೆಯ ರಕ್ತದಾನ',
    noRecentDonation: 'ಹಿಂದಿನ ದಾಖಲೆ ಇಲ್ಲ',
    requestContactBtn: 'ಸಂಪರ್ಕ ಕೋರಿ',
    reportBtn: 'ವರದಿ ಮಾಡಿ',
    iCanDonateBtn: 'ನಾನು ರಕ್ತದಾನ ಮಾಡಬಲ್ಲೆ',
    urgencyCritical: 'ಅತಿ ತುರ್ತು (Critical)',
    urgencyUrgent: 'ತುರ್ತು (Urgent)',
    urgencyStandard: 'ಸಾಮಾನ್ಯ (Standard)',
    loadingText: 'ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    noDonorsFound: 'ಈ ಫಿಲ್ಟರ್‌ಗೆ ಹೊಂದುವ ರಕ್ತದಾತರು ಕಂಡುಬಂದಿಲ್ಲ.',
    unitsUnit: 'ಯೂನಿಟ್',
    unitsUnits: 'ಯೂನಿಟ್‌ಗಳು',
    themeLight: 'ಬೆಳಕು',
    themeDark: 'ಕತ್ತಲೆ',
    homeSubnote:
      'ದಾತರ ಫೋನ್ ಸಂಖ್ಯೆಗಳನ್ನು ಸಾರ್ವಜನಿಕವಾಗಿ ತೋರಿಸಲಾಗುವುದಿಲ್ಲ. ದಾತರು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಒಪ್ಪಿಕೊಂಡ ನಂತರವೇ ಸಂಪರ್ಕ ಸಂಖ್ಯೆ ಹಂಚಲಾಗುತ್ತದೆ.',
  },
};
