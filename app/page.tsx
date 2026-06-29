'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Printer, 
  Trash2, 
  Settings, 
  Layers, 
  RefreshCw, 
  FileText, 
  Sparkles, 
  Plus, 
  Info, 
  Check, 
  HelpCircle,
  Undo
} from 'lucide-react';

// ==========================================
// BARCODE ENCODING TABLES & HELPERS (PURE TS)
// ==========================================

// EAN-13 Encoding Rules
const EAN_PARITY = [
  [0, 0, 0, 0, 0, 0], // 0: L L L L L L
  [0, 0, 1, 0, 1, 1], // 1: L L G L G G
  [0, 0, 1, 1, 0, 1], // 2: L L G G L G
  [0, 0, 1, 1, 1, 0], // 3: L L G G G L
  [0, 1, 0, 0, 1, 1], // 4: L G L L G G
  [0, 1, 1, 0, 0, 1], // 5: L G G L L G
  [0, 1, 1, 1, 0, 0], // 6: L G G G L L
  [0, 1, 0, 1, 0, 1], // 7: L G L G L G
  [0, 1, 0, 1, 1, 0], // 8: L G L G G L
  [0, 1, 1, 0, 1, 0], // 9: L G G L G L
];

const EAN_L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011"
];

const EAN_G = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111"
];

const EAN_R = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100"
];

// Compute EAN-13 checksum
function calculateEan13Checksum(digits12: string): number {
  if (digits12.length < 12) return 0;
  let sum1 = 0; // odd positions
  let sum2 = 0; // even positions
  for (let i = 0; i < 12; i++) {
    const val = parseInt(digits12[i], 10);
    if (isNaN(val)) continue;
    if (i % 2 === 0) {
      sum1 += val;
    } else {
      sum2 += val;
    }
  }
  const total = sum1 + sum2 * 3;
  return (10 - (total % 10)) % 10;
}

// Generate EAN-13 binary sequence
function encodeEan13(value: string): { binary: string; validatedText: string; error?: string } {
  // Strip any non-digits
  const clean = value.replace(/\D/g, '');
  
  if (clean.length < 12) {
    return { binary: "", validatedText: "", error: "En az 12 hane rakam girilmelidir." };
  }
  
  let digits = clean.slice(0, 12);
  const checkDigit = calculateEan13Checksum(digits);
  
  // If user entered 13 or more digits, let's keep the first 13 digits but ensure the 13th is the correct check digit
  if (clean.length >= 13) {
    const userCheck = parseInt(clean[12], 10);
    if (userCheck !== checkDigit) {
      // Auto correct or warn
      digits += checkDigit;
    } else {
      digits += userCheck;
    }
  } else {
    digits += checkDigit;
  }

  const firstDigit = parseInt(digits[0], 10);
  const parityPattern = EAN_PARITY[firstDigit];
  
  let binary = "101"; // Left guard
  
  // Left 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 1], 10);
    const useGCode = parityPattern[i] === 1;
    binary += useGCode ? EAN_G[digit] : EAN_L[digit];
  }
  
  binary += "01010"; // Center guard
  
  // Right 6 digits
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 7], 10);
    binary += EAN_R[digit];
  }
  
  binary += "101"; // Right guard
  
  return { binary, validatedText: digits };
}

// CODE-128 Character patterns (Index 0 to 102)
const CODE128_PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", // 0-4
  "10001001100", "10011001000", "10011000100", "10001100100", "11001101000", // 5-9
  "11001100100", "11001001100", "11010011000", "11010001100", "11000101100", // 10-14
  "11011000100", "11000110100", "11000110010", "11000110100", "11001000110", // 15-19
  "11001001100", "11010001100", "11000101100", "11011000110", "11011001100", // 20-24
  "11011000110", "11011001100", "11001100110", "11001101100", "11001100110", // 25-29
  "11001100110", "11001001100", "11010011000", "11010001100", "11000101100", // 30-34
  "10011011000", "10011000110", "10001101100", "10011000110", "10001101100", // 35-39
  "11001000110", "11001010000", "11010001100", "11000101100", "11001000110", // 40-44
  "11001010000", "11010001100", "11000101100", "11011000110", "11011001100", // 45-49
  "11001100110", "11001101100", "11001100110", "11001100110", "11001001100", // 50-54
  "11010011000", "11010001100", "11000101100", "11011000110", "11011001100", // 55-59
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100", // 60-64
  "10001001100", "10011001000", "10011000100", "10001100100", "11001101000", // 65-69
  "11001100100", "11001001100", "11010011000", "11010001100", "11000101100", // 70-74
  "10110011100", "10011011100", "10011001110", "10111001100", "10011100110", // 75-79
  "10011101100", "11101101100", "11100110110", "11100110011", "11101100110", // 80-84
  "11100110110", "11100110011", "11101100110", "11011011100", "11011001110", // 85-89
  "11011100110", "11101101100", "11101100110", "11100110110", "11100110011", // 90-94
  "11011011100", "11011001110", "11011100110", "11101101100", "11101100110", // 95-99
  "11100110110", "11100110011", "11101100110" // 100-102
];
const CODE128_START_B = "11010010000"; // Index 104
const CODE128_STOP = "1100011101011"; // Index 106

function encodeCode128(value: string): { binary: string; validatedText: string; error?: string } {
  if (!value) {
    return { binary: "", validatedText: "", error: "Barkod boş olamaz." };
  }

  // Convert to Code 128 (using subset B)
  let binary = CODE128_START_B;
  let checksum = 104; // Start B index
  
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 32 || code > 127) {
      return { binary: "", validatedText: "", error: "Geçersiz karakter tespit edildi (Yalnızca ASCII karakterler)." };
    }
    const index = code - 32;
    binary += CODE128_PATTERNS[index];
    checksum += index * (i + 1);
  }
  
  const checkIndex = checksum % 103;
  binary += CODE128_PATTERNS[checkIndex];
  binary += CODE128_STOP;
  
  return { binary, validatedText: value };
}

// React Barcode SVG Generator Component
interface BarcodeProps {
  value: string;
  type: 'ean13' | 'code128';
}

const VectorBarcode: React.FC<BarcodeProps> = ({ value, type }) => {
  const result = type === 'ean13' ? encodeEan13(value) : encodeCode128(value);
  
  if (result.error || !result.binary) {
    return (
      <div className="flex flex-col items-center justify-center border border-dashed border-red-300 bg-red-50 p-2 text-center rounded">
        <span className="text-[10px] text-red-600 font-bold font-mono">BARKOD HATA</span>
        <span className="text-[9px] text-red-500 font-mono leading-none">{result.error || "Geçersiz format"}</span>
      </div>
    );
  }

  const binary = result.binary;
  const text = result.validatedText;
  const numBars = binary.length;
  
  // Standard proportions
  const width = 140;
  const height = 45;
  const barWidth = width / numBars;

  // For EAN-13, we draw guard bars slightly longer (historically they extend below, but on shelf labels we can draw them normal or styled)
  // Let's draw regular uniform bars for simplicity and high scan rate
  return (
    <div className="flex flex-col items-center justify-center w-full mt-0.5">
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-auto max-h-[38px] block" 
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={width} height={height} fill="#ffffff" />
        <g fill="#000000">
          {binary.split("").map((bit, idx) => {
            if (bit === "1") {
              // Draw bar
              return (
                <rect
                  key={idx}
                  x={idx * barWidth}
                  y={0}
                  width={barWidth + 0.05} // slight overlap to prevent thin subpixel gaps
                  height={height}
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
      {/* Barcode text overlay */}
      <span className="text-[10px] font-mono tracking-[3px] font-bold text-black mt-0.5 select-none leading-none">
        {type === 'ean13' 
          ? `${text.slice(0, 1)} ${text.slice(1, 7)} ${text.slice(7, 13)}` 
          : text}
      </span>
    </div>
  );
};

// Quick Templates for Demo/Rapid Entry
interface ProductTemplate {
  name: string;
  barcode: string;
  barcodeType: 'ean13' | 'code128';
  price: string;
  oldPrice: string;
  isDiscounted: boolean;
  unit: string;
  unitPrice: string;
  origin: string;
  kdv: string;
}

const TEMPLATES: ProductTemplate[] = [
  {
    name: "KENT SLIMS BLACK",
    barcode: "8691234567890",
    barcodeType: "ean13",
    price: "140,00",
    oldPrice: "149,00",
    isDiscounted: true,
    unit: "Paket",
    unitPrice: "140,00 ₺ / Adet",
    origin: "Türkiye",
    kdv: "%1 KDV Dahil"
  },
  {
    name: "NUTELLA FINDIK KREMASI 400G",
    barcode: "8690504101235",
    barcodeType: "ean13",
    price: "89,90",
    oldPrice: "109,95",
    isDiscounted: true,
    unit: "kg",
    unitPrice: "224,75 ₺ / kg",
    origin: "Türkiye",
    kdv: "%10 KDV Dahil"
  },
  {
    name: "COCA-COLA SEKERSIZ 2.5 L",
    barcode: "5449000131805",
    barcodeType: "ean13",
    price: "45,00",
    oldPrice: "",
    isDiscounted: false,
    unit: "Litre",
    unitPrice: "18,00 ₺ / Litre",
    origin: "Türkiye",
    kdv: "%20 KDV Dahil"
  },
  {
    name: "SUTAS SUZME PEYNIR 500G",
    barcode: "8690954001026",
    barcodeType: "ean13",
    price: "74,50",
    oldPrice: "84,50",
    isDiscounted: false,
    unit: "kg",
    unitPrice: "149,00 ₺ / kg",
    origin: "Türkiye",
    kdv: "%1 KDV Dahil"
  },
  {
    name: "DOMESTOS CAMASIR SUYU 750ML",
    barcode: "8711200392351",
    barcodeType: "ean13",
    price: "59,95",
    oldPrice: "72,90",
    isDiscounted: true,
    unit: "Litre",
    unitPrice: "79,93 ₺ / Litre",
    origin: "Türkiye",
    kdv: "%20 KDV Dahil"
  }
];

// Helper to safely load from local storage
const getSavedData = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('shelf_label_data');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

export default function ShelfLabelPrinter() {
  const savedData = getSavedData();

  // Label values
  const [productName, setProductName] = useState(() => savedData?.productName ?? 'KENT SLIMS BLACK');
  const [barcode, setBarcode] = useState(() => savedData?.barcode ?? '8691234567890');
  const [barcodeType, setBarcodeType] = useState<'ean13' | 'code128'>(() => savedData?.barcodeType ?? 'ean13');
  const [price, setPrice] = useState(() => savedData?.price ?? '140,00');
  const [oldPrice, setOldPrice] = useState(() => savedData?.oldPrice ?? '149,00');
  const [isDiscounted, setIsDiscounted] = useState(() => savedData?.isDiscounted ?? true);
  const [unit, setUnit] = useState(() => savedData?.unit ?? 'Paket');
  const [unitPrice, setUnitPrice] = useState(() => savedData?.unitPrice ?? '140,00 ₺ / Adet');
  const [origin, setOrigin] = useState(() => savedData?.origin ?? 'Türkiye');
  const [kdv, setKdv] = useState(() => savedData?.kdv ?? '%1 KDV Dahil');
  const [showOriginBadge, setShowOriginBadge] = useState(() => savedData?.showOriginBadge ?? true);
  const [labelDate, setLabelDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  });

  // Dimensions
  const [labelSizePreset, setLabelSizePreset] = useState(() => savedData?.labelSizePreset ?? '58x40');
  const [customWidth, setCustomWidth] = useState(() => savedData?.customWidth ?? 58);
  const [customHeight, setCustomHeight] = useState(() => savedData?.customHeight ?? 40);

  // Save changes to localStorage
  const saveToLocalStorage = (updates: Record<string, any>) => {
    try {
      const current = {
        productName, barcode, barcodeType, price, oldPrice, isDiscounted, 
        unit, unitPrice, origin, kdv, showOriginBadge, labelSizePreset, 
        customWidth, customHeight, ...updates
      };
      localStorage.setItem('shelf_label_data', JSON.stringify(current));
    } catch (e) {
      console.error(e);
    }
  };

  // Determine actual dimensions
  let widthMm = 58;
  let heightMm = 40;

  if (labelSizePreset === '58x40') { widthMm = 58; heightMm = 40; }
  else if (labelSizePreset === '50x30') { widthMm = 50; heightMm = 30; }
  else if (labelSizePreset === '60x40') { widthMm = 60; heightMm = 40; }
  else if (labelSizePreset === '80x50') { widthMm = 80; heightMm = 50; }
  else {
    widthMm = customWidth;
    heightMm = customHeight;
  }

  // Handle template selection
  const loadTemplate = (tpl: ProductTemplate) => {
    setProductName(tpl.name);
    setBarcode(tpl.barcode);
    setBarcodeType(tpl.barcodeType);
    setPrice(tpl.price);
    setOldPrice(tpl.oldPrice);
    setIsDiscounted(tpl.isDiscounted);
    setUnit(tpl.unit);
    setUnitPrice(tpl.unitPrice);
    setOrigin(tpl.origin);
    setKdv(tpl.kdv);
    
    saveToLocalStorage({
      productName: tpl.name,
      barcode: tpl.barcode,
      barcodeType: tpl.barcodeType,
      price: tpl.price,
      oldPrice: tpl.oldPrice,
      isDiscounted: tpl.isDiscounted,
      unit: tpl.unit,
      unitPrice: tpl.unitPrice,
      origin: tpl.origin,
      kdv: tpl.kdv
    });
  };

  // Clear inputs
  const handleClear = () => {
    setProductName('');
    setBarcode('');
    setPrice('');
    setOldPrice('');
    setIsDiscounted(false);
    setUnit('Adet');
    setUnitPrice('');
    saveToLocalStorage({
      productName: '',
      barcode: '',
      price: '',
      oldPrice: '',
      isDiscounted: false,
      unit: 'Adet',
      unitPrice: ''
    });
  };

  // Triggers real thermal print
  const handlePrint = () => {
    window.print();
  };

  // Auto-print on enter in barcode input
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePrint();
    }
  };

  // Parse price into Integer and Decimals
  const getParsedPrice = (priceStr: string) => {
    const cleanStr = priceStr.trim().replace(/\s/g, '');
    let mainPrice = "0";
    let decimalPrice = "00";

    if (cleanStr.includes(',')) {
      const parts = cleanStr.split(',');
      mainPrice = parts[0] || "0";
      decimalPrice = (parts[1] || "").padEnd(2, '0').slice(0, 2);
    } else if (cleanStr.includes('.')) {
      const parts = cleanStr.split('.');
      mainPrice = parts[0] || "0";
      decimalPrice = (parts[1] || "").padEnd(2, '0').slice(0, 2);
    } else {
      mainPrice = cleanStr || "0";
      decimalPrice = "00";
    }
    return { mainPrice, decimalPrice };
  };

  const parsedPrice = getParsedPrice(price);
  const parsedOldPrice = oldPrice ? getParsedPrice(oldPrice) : null;

  // Auto font size for dynamic titles
  const getTitleClass = (name: string) => {
    const len = name.length;
    if (len > 35) return 'text-[9px] leading-tight tracking-tight';
    if (len > 25) return 'text-[11px] leading-snug tracking-tight';
    if (len > 18) return 'text-[13px] leading-snug';
    return 'text-[15px] font-black leading-none';
  };

  return (
    <div id="print-view-container" className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none antialiased">
      
      {/* DINAMIK PRINT CSS AYARLARI */}
      {/* Bu style bloğu, termal yazıcının tam ölçüsünde çıkmasını, boş kağıt kalmamasını sağlar */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Ekran elemanlarını gizle */
          .no-print {
            display: none !important;
          }
          
          /* Sadece etiket alanını göster ve sol üst köşeye sabitle */
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          #print-view-container {
            background: #ffffff !important;
            min-height: auto !important;
            display: block !important;
          }
          
          .print-label-wrapper {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }

          @page {
            size: ${widthMm}mm ${heightMm}mm;
            margin: 0 !important;
          }
        }
      `}} />

      {/* HEADER SECTION (NO-PRINT) */}
      <header className="no-print border-b border-neutral-800 bg-neutral-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-amber-500 p-2 rounded-lg text-white shadow-lg shadow-red-900/20">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-1.5 uppercase">
              Profesyonel Raf Etiketi <span className="text-red-500 font-mono text-[10px] px-2 py-0.5 bg-red-950/50 border border-red-900/50 rounded-full tracking-widest font-normal">PRO</span>
            </h1>
            <p className="text-xs text-neutral-400">Termal Yazıcı (58x40, 50x30, 80x50) Uyumlu Canlı Baskı Paneli</p>
          </div>
        </div>
        
        {/* Quick info / status indicator */}
        <div className="flex items-center gap-4 text-xs text-neutral-400 font-mono">
          <div className="flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>YAZICI: ENTEGRE / HAZIR</span>
          </div>
          <span className="hidden sm:inline">Tarih: {labelDate}</span>
        </div>
      </header>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SOL FORM KONTROLLERİ (NO-PRINT) */}
        <div className="no-print lg:col-span-7 flex flex-col gap-5 bg-neutral-900/30 border border-neutral-900 rounded-xl p-5 shadow-2xl">
          
          {/* SEKSIYON: SIZES & PRESETS */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5" /> 1. Şablonlar & Etiket Ölçüsü
              </span>
            </div>

            {/* Quick Presets Selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-400">Hızlı Ürün Şablonu Seç:</span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => loadTemplate(tpl)}
                    className="px-2.5 py-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white rounded transition-colors text-left font-mono truncate max-w-[180px]"
                    title={`${tpl.name} (${tpl.price} ₺)`}
                  >
                    ⚡ {tpl.name.split(' ')[0]} ({tpl.price} ₺)
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes Presets Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5 pt-3 border-t border-neutral-800">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Yazıcı Etiket Boyutu:</label>
                <select
                  value={labelSizePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLabelSizePreset(val);
                    saveToLocalStorage({ labelSizePreset: val });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none"
                >
                  <option value="58x40">58 mm x 40 mm (Standart Market)</option>
                  <option value="50x30">50 mm x 30 mm (Küçük Boyut)</option>
                  <option value="60x40">60 mm x 40 mm (Geniş Boyut)</option>
                  <option value="80x50">80 mm x 50 mm (Büyük Boyut)</option>
                  <option value="custom">Özel Boyut Girin...</option>
                </select>
              </div>

              {labelSizePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400">Genişlik (mm):</label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => {
                        const val = Math.max(10, parseInt(e.target.value) || 0);
                        setCustomWidth(val);
                        saveToLocalStorage({ customWidth: val });
                      }}
                      className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none font-mono text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-400">Yükseklik (mm):</label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => {
                        const val = Math.max(10, parseInt(e.target.value) || 0);
                        setCustomHeight(val);
                        saveToLocalStorage({ customHeight: val });
                      }}
                      className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none font-mono text-center"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEKSIYON: PRODUCT & BARCODE FORM FIELDS */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Settings className="w-3.5 h-3.5" /> 2. Ürün ve Barkod Bilgileri
            </span>

            {/* Ürün Adı */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral-400 font-medium">Ürün Adı (Büyük Harflerle):</label>
                <span className="text-[10px] text-neutral-500 font-mono">{productName.length}/50</span>
              </div>
              <input
                type="text"
                placeholder="Örn: KENT SLIMS BLACK"
                value={productName}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setProductName(val);
                  saveToLocalStorage({ productName: val });
                }}
                className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none tracking-wide"
                maxLength={50}
              />
            </div>

            {/* Barkod ve Tipi */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-neutral-400 font-medium">Barkod Numarası veya Kodu:</label>
                  <span className="text-[9px] text-amber-500 font-mono">Enter = Yazdır 🖨️</span>
                </div>
                <input
                  type="text"
                  placeholder={barcodeType === 'ean13' ? "Örn: 8691234567890 (Sadece Rakam)" : "Örn: PROD-123-X"}
                  value={barcode}
                  onKeyDown={handleBarcodeKeyDown}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (barcodeType === 'ean13') {
                      // restrict EAN-13 to numbers only
                      val = val.replace(/\D/g, '');
                    }
                    setBarcode(val);
                    saveToLocalStorage({ barcode: val });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-xs text-neutral-400 font-medium">Barkod Tipi:</label>
                <select
                  value={barcodeType}
                  onChange={(e) => {
                    const type = e.target.value as 'ean13' | 'code128';
                    setBarcodeType(type);
                    // Adjust string if mismatch
                    let newBarcode = barcode;
                    if (type === 'ean13') {
                      newBarcode = barcode.replace(/\D/g, '');
                    }
                    setBarcode(newBarcode);
                    saveToLocalStorage({ barcodeType: type, barcode: newBarcode });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none"
                >
                  <option value="ean13">EAN-13 (Standart Market)</option>
                  <option value="code128">CODE-128 (Alfanumerik)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEKSIYON: PRICING & PROMOTION */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
            <span className="text-xs font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5" /> 3. Fiyat ve Kampanya Ayarları
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Satış Fiyatı */}
              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-xs text-neutral-400 font-medium">Satış Fiyatı (₺):</label>
                <input
                  type="text"
                  placeholder="Örn: 140,00"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    saveToLocalStorage({ price: e.target.value });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none font-bold text-emerald-400 font-mono"
                />
              </div>

              {/* Eski Fiyat */}
              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-xs text-neutral-400 font-medium">Eski Fiyat (Üstü Çizili):</label>
                <input
                  type="text"
                  placeholder="Boş bırakılabilir"
                  value={oldPrice}
                  onChange={(e) => {
                    setOldPrice(e.target.value);
                    saveToLocalStorage({ oldPrice: e.target.value });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-3 py-2 text-sm text-neutral-200 outline-none font-mono"
                />
              </div>

              {/* İndirim / Kampanya Checkbox */}
              <div className="sm:col-span-4 flex items-center h-full sm:pt-5">
                <label className="relative flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDiscounted}
                    onChange={(e) => {
                      setIsDiscounted(e.target.checked);
                      saveToLocalStorage({ isDiscounted: e.target.checked });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 bg-neutral-950 border border-neutral-800 rounded peer-checked:bg-red-600 peer-checked:border-red-500 flex items-center justify-center transition-colors">
                    {isDiscounted && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                  </div>
                  <span className="text-sm text-neutral-200 font-medium">Kırmızı İndirim Teması</span>
                </label>
              </div>
            </div>

            {/* Legal requirements & extras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Birim (kg, Litre, Paket):</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    saveToLocalStorage({ unit: e.target.value });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">Kanuni Birim Fiyatı:</label>
                <input
                  type="text"
                  placeholder="Örn: 280,00 ₺ / kg"
                  value={unitPrice}
                  onChange={(e) => {
                    setUnitPrice(e.target.value);
                    saveToLocalStorage({ unitPrice: e.target.value });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-2.5 py-1.5 text-xs text-neutral-200 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-400">KDV Oranı & Tarih:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={kdv}
                    onChange={(e) => {
                      setKdv(e.target.value);
                      saveToLocalStorage({ kdv: e.target.value });
                    }}
                    className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-1.5 py-1.5 text-[11px] text-neutral-200 outline-none"
                  >
                    <option value="%1 KDV Dahil">%1 KDV</option>
                    <option value="%10 KDV Dahil">%10 KDV</option>
                    <option value="%20 KDV Dahil">%20 KDV</option>
                  </select>
                  <input
                    type="text"
                    value={labelDate}
                    onChange={(e) => setLabelDate(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-1.5 py-1.5 text-[11px] text-neutral-200 outline-none font-mono text-center"
                    placeholder="29.06.2026"
                  />
                </div>
              </div>
            </div>

            {/* Yerli Üretim Toggle */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="relative flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOriginBadge}
                  onChange={(e) => {
                    setShowOriginBadge(e.target.checked);
                    saveToLocalStorage({ showOriginBadge: e.target.checked });
                  }}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 bg-neutral-950 border border-neutral-800 rounded peer-checked:bg-red-600 peer-checked:border-red-500 flex items-center justify-center transition-colors">
                  {showOriginBadge && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                </div>
                <span className="text-xs text-neutral-300">Yerli Üretim Logosu Göster</span>
              </label>

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-neutral-400">Üretim Yeri:</span>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    saveToLocalStorage({ origin: e.target.value });
                  }}
                  className="bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded px-2 py-1 text-xs text-neutral-200 outline-none max-w-[100px]"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS (NO-PRINT) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-mono text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-neutral-400" />
              TEMİZLE
            </button>

            <button
              onClick={handlePrint}
              className="sm:col-span-2 px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm tracking-wide rounded-lg flex items-center justify-center gap-2.5 shadow-lg shadow-red-950/40 active:translate-y-0.5 transition-all cursor-pointer font-mono"
            >
              <Printer className="w-5 h-5 text-white" />
              ETİKETİ YAZDIR (window.print)
            </button>
          </div>

          {/* INFORMATION BOX */}
          <div className="bg-neutral-900/40 border border-neutral-850 rounded-lg p-3.5 text-xs text-neutral-400 flex gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-neutral-300 mb-0.5">Yazdırma Önerileri & Ayarları:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Yazdır butonuna bastığınızda tarayıcınızın yazdırma ekranı açılacaktır.</li>
                <li>Karşılaşacağınız ekranda <strong className="text-white">Kenar Boşlukları (Margins)</strong> değerini <strong className="text-white">&quot;Yok&quot; (None)</strong> olarak seçin.</li>
                <li>Arka plan grafiklerinin basılması için <strong className="text-white">&quot;Arka plan grafikleri&quot; (Background graphics)</strong> ayarını etkinleştirin.</li>
                <li>Ölçeklendirme ayarını <strong className="text-white">Varsayılan (%100)</strong> yapın. Etiket tam olarak <strong className="text-white">{widthMm}mm x {heightMm}mm</strong> boyutunda çıkacaktır.</li>
              </ul>
            </div>
          </div>

        </div>

        {/* SAĞ TARAF: CANLI ÖNİZLEME (NO-PRINT ON SCREEN, PRINT-ONLY ACCURACY) */}
        <div className="lg:col-span-5 flex flex-col items-center gap-6">
          
          {/* SCREEN ONLY SECTION FOR PREVIEW */}
          <div className="no-print w-full flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-red-500" /> CANLI ETİKET ÖNİZLEMESİ
              </span>
              <span className="text-[10px] font-mono text-amber-500 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900">
                {widthMm} x {heightMm} mm
              </span>
            </div>

            {/* VIRTUAL THERMAL ROLL VISUALIZER */}
            {/* Bu bölüm, kullanıcının ekranda nasıl bir rulo çıktısı alacağını canlandırır */}
            <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-inner bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:16px_16px]">
              
              {/* Backing paper glassine layer behind the label */}
              <div 
                className="bg-amber-100/5 border border-dashed border-amber-500/10 rounded-lg p-3 shadow-2xl relative flex items-center justify-center transition-all duration-200"
                style={{
                  width: `${(widthMm * 5.2) + 24}px`,
                  minHeight: `${(heightMm * 5.2) + 24}px`,
                }}
              >
                {/* Roll Gap Line Indicators top and bottom */}
                <div className="absolute top-0 left-0 right-0 h-px border-t border-dashed border-amber-500/20" />
                <div className="absolute bottom-0 left-0 right-0 h-px border-b border-dashed border-amber-500/20" />
                
                {/* THE ACTUAL LIVE PREVIEW LABEL BLOCK (This also serves as the layout we print) */}
                {/* We render it inside a scale wrapper for screen representation */}
                <div 
                  className="bg-white text-black p-0 overflow-hidden relative shadow-2xl print-label-wrapper select-text font-sans"
                  style={{
                    width: `${widthMm * 5}px`,
                    height: `${heightMm * 5}px`,
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                  }}
                >
                  <LabelLayout 
                    productName={productName}
                    barcode={barcode}
                    barcodeType={barcodeType}
                    price={price}
                    oldPrice={oldPrice}
                    isDiscounted={isDiscounted}
                    unit={unit}
                    unitPrice={unitPrice}
                    origin={origin}
                    kdv={kdv}
                    showOriginBadge={showOriginBadge}
                    labelDate={labelDate}
                    parsedPrice={parsedPrice}
                    parsedOldPrice={parsedOldPrice}
                    getTitleClass={getTitleClass}
                  />
                </div>
              </div>

              {/* simulated backing strip hints */}
              <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-20">
                <span className="w-6 h-1 bg-amber-500 rounded-full" />
                <span className="w-6 h-1 bg-amber-500 rounded-full" />
              </div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-20">
                <span className="w-6 h-1 bg-amber-500 rounded-full" />
                <span className="w-6 h-1 bg-amber-500 rounded-full" />
              </div>

              <span className="text-[10px] font-mono text-neutral-500 mt-4">Termal Kağıt Akış Önizlemesi (Baskı simülasyonu %100 ölçeklidir)</span>
            </div>
          </div>

          {/* REAL PRINT WRAPPER (HIDDEN ON SCREEN, SHOWN ONLY ON PRINTING) */}
          {/* This renders at true size: widthMm * heightMm */}
          <div className="hidden print:block absolute left-0 top-0 print-label-wrapper bg-white text-black overflow-hidden border-none p-0">
            <div 
              style={{
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
                boxSizing: 'border-box'
              }}
              className="relative overflow-hidden w-full h-full text-black bg-white"
            >
              <LabelLayout 
                productName={productName}
                barcode={barcode}
                barcodeType={barcodeType}
                price={price}
                oldPrice={oldPrice}
                isDiscounted={isDiscounted}
                unit={unit}
                unitPrice={unitPrice}
                origin={origin}
                kdv={kdv}
                showOriginBadge={showOriginBadge}
                labelDate={labelDate}
                parsedPrice={parsedPrice}
                parsedOldPrice={parsedOldPrice}
                getTitleClass={getTitleClass}
                isForPrint={true}
              />
            </div>
          </div>

          {/* REAL-TIME LEGAL/FORMATTING INFORMATION SUMMARY */}
          <div className="no-print w-full bg-neutral-900/40 border border-neutral-900 rounded-xl p-4 flex flex-col gap-3 text-xs text-neutral-400">
            <span className="text-xs font-mono font-bold text-neutral-200 uppercase tracking-wider">Etiket Detay Raporu</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">Etiket Ölçüsü:</span>
                <span className="text-white font-bold">{widthMm} mm x {heightMm} mm</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">Barkod Modeli:</span>
                <span className="text-white font-bold uppercase">{barcodeType}</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">KDV Oranı:</span>
                <span className="text-white font-bold">{kdv}</span>
              </div>
              <div className="bg-neutral-950 p-2 rounded border border-neutral-850">
                <span className="text-neutral-500 block">Kampanya Durumu:</span>
                <span className={`font-bold ${isDiscounted ? 'text-red-500' : 'text-neutral-400'}`}>
                  {isDiscounted ? 'KAMPANYALI FİYAT' : 'STANDART RAF'}
                </span>
              </div>
            </div>
          </div>

        </div>

      </main>
      
      {/* MINIMAL FOOTER */}
      <footer className="no-print mt-auto border-t border-neutral-900 bg-neutral-950/80 px-6 py-4 text-center text-xs text-neutral-500 font-mono">
        Profesyonel Market Raf Etiketi Baskı Paneli © 2026 | Sıfır Hata Termal Kalibrasyon
      </footer>
    </div>
  );
}

// =========================================================
// RENDER COMPONENT: DYNAMIC INTERNAL SHELF LABEL LAYOUT
// =========================================================
interface LabelLayoutProps {
  productName: string;
  barcode: string;
  barcodeType: 'ean13' | 'code128';
  price: string;
  oldPrice: string;
  isDiscounted: boolean;
  unit: string;
  unitPrice: string;
  origin: string;
  kdv: string;
  showOriginBadge: boolean;
  labelDate: string;
  parsedPrice: { mainPrice: string; decimalPrice: string };
  parsedOldPrice: { mainPrice: string; decimalPrice: string } | null;
  getTitleClass: (name: string) => string;
  isForPrint?: boolean;
}

const LabelLayout: React.FC<LabelLayoutProps> = ({
  productName,
  barcode,
  barcodeType,
  price,
  oldPrice,
  isDiscounted,
  unit,
  unitPrice,
  origin,
  kdv,
  showOriginBadge,
  labelDate,
  parsedPrice,
  parsedOldPrice,
  getTitleClass,
  isForPrint = false
}) => {
  // Use responsive scale if rendering inside screens (e.g. font-sizes scaled or exact classes)
  // For standard rendering, we define clean relative layouts.
  // We'll write clean, compact tailwind classes that translate beautifully to the print canvas.
  
  return (
    <div className={`w-full h-full flex flex-col bg-white text-black relative select-none leading-none ${isForPrint ? 'p-1' : 'p-2'} border border-black/80`}>
      
      {/* 1. KAMPANYALI VEYA REZERV HEADLINE BANNER */}
      {isDiscounted ? (
        <div className={`w-full ${isForPrint ? 'h-[25%] py-0.5' : 'h-[24%] py-1'} bg-red-600 text-white flex items-center justify-between px-2 uppercase font-black -mt-1 -mx-1 relative`}>
          <div className="flex flex-col">
            <span className={`${isForPrint ? 'text-[9px]' : 'text-[11px]'} tracking-widest font-black leading-none`}>ŞOK İNDİRİM</span>
            <span className={`${isForPrint ? 'text-[5px]' : 'text-[7px]'} font-mono leading-none tracking-normal text-amber-200`}>FIRSAT KAMPANYASI</span>
          </div>
          <span className={`${isForPrint ? 'text-[11px]' : 'text-[13px]'} font-extrabold tracking-tight bg-white text-red-600 ${isForPrint ? 'px-1 py-[1px]' : 'px-1.5 py-0.5'} rounded`}>
            İNDİRİM
          </span>
        </div>
      ) : (
        <div className="w-full h-1.5 bg-neutral-900 -mt-1 -mx-1" />
      )}

      {/* 2. PRODUCT NAME SECTION */}
      <div className={`w-full flex items-start justify-between ${isDiscounted ? 'mt-1.5' : 'mt-1'} border-b border-neutral-300 ${isForPrint ? 'pb-1' : 'pb-1.5'}`}>
        <div className="flex-1 min-w-0 pr-1">
          <h2 className={`${getTitleClass(productName)} font-black text-black break-words line-clamp-2 uppercase leading-none`}>
            {productName || "ÜRÜN ADI GİRİNİZ"}
          </h2>
        </div>
        
        {/* Dynamic VAT / Category indicators */}
        <div className="text-[6px] sm:text-[7px] font-mono font-bold text-neutral-500 flex flex-col items-end shrink-0 gap-0.5 uppercase">
          <span>{kdv}</span>
          <span>{unit || "ADET"}</span>
        </div>
      </div>

      {/* 3. PRICE SECTION (HUGE PRICE IN THE MIDDLE) */}
      <div className="flex-1 flex items-center justify-between min-h-0 py-1">
        
        {/* LEFT COLUMN: OLD PRICE OR LEGAL ORIGIN BADGE */}
        <div className="flex flex-col justify-center gap-1 shrink-0">
          {isDiscounted && parsedOldPrice ? (
            <div className="flex flex-col leading-none">
              <span className="text-[6px] sm:text-[7px] font-mono text-neutral-500 font-bold uppercase">ESKİ FİYAT</span>
              <div className="relative inline-block text-neutral-500 font-bold">
                <span className={`${isForPrint ? 'text-[10px]' : 'text-[12px]'} font-mono line-through tracking-tight decoration-[1.5px] decoration-red-600`}>
                  {oldPrice}
                </span>
                <span className="text-[8px] font-mono ml-0.5">₺</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {showOriginBadge && (
                <div className="flex items-center gap-1 border border-black/80 rounded p-0.5 leading-none shrink-0 select-none">
                  {/* Turkish Handshake / Crescent custom minimal logo representation */}
                  <div className="w-3.5 h-3.5 bg-red-600 text-white flex items-center justify-center rounded-[2px] font-mono text-[7px] font-black leading-none">
                    TR
                  </div>
                  <div className="flex flex-col text-[4px] sm:text-[5px] font-black leading-none tracking-tighter">
                    <span className="text-red-600">YERLİ</span>
                    <span>ÜRETİM</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Production place origin small detail */}
          <span className="text-[5px] sm:text-[6px] font-mono font-bold text-neutral-500 tracking-tight leading-none uppercase">
            MENŞEİ: {origin || "TÜRKİYE"}
          </span>
        </div>

        {/* RIGHT COLUMN: BIG HUGE PRICE */}
        <div className="flex items-baseline justify-end leading-none relative shrink-0">
          {/* Main Integer part of the price */}
          <span 
            className={`font-black tracking-tighter text-black select-none leading-none ${
              isDiscounted ? 'text-red-600' : 'text-black'
            }`}
            style={{
              fontSize: isForPrint ? '32px' : '38px',
              fontWeight: 950
            }}
          >
            {parsedPrice.mainPrice}
          </span>
          
          {/* Cents / Decimal part written small and offset top right */}
          <div className="flex flex-col items-start leading-none pl-0.5">
            <span 
              className={`font-extrabold select-none leading-none border-b border-black/30 ${
                isDiscounted ? 'text-red-600' : 'text-black'
              }`}
              style={{
                fontSize: isForPrint ? '11px' : '13px',
              }}
            >
              ,{parsedPrice.decimalPrice}
            </span>
            <span className={`text-[9px] sm:text-[11px] font-black select-none leading-none ${
              isDiscounted ? 'text-red-600' : 'text-neutral-700'
            }`}>
              ₺
            </span>
          </div>
        </div>

      </div>

      {/* 4. FOOTER BARCODE & LEGAL DETAILS */}
      <div className="w-full border-t border-neutral-300 pt-1 flex items-end justify-between mt-auto">
        
        {/* Crisp vector barcode on the left */}
        <div className="w-[58%] select-none shrink-0 overflow-hidden">
          <VectorBarcode value={barcode || "000000000000"} type={barcodeType} />
        </div>

        {/* Legal unit information and dynamic date on the right */}
        <div className="flex flex-col items-end text-right justify-end h-full gap-0.5 leading-none shrink-0">
          <span className="text-[5px] sm:text-[6px] font-mono font-bold text-neutral-400 uppercase leading-none">
            BİRİM FİYATI
          </span>
          <span className="text-[6.5px] sm:text-[8px] font-black text-neutral-800 leading-none truncate max-w-[100px]">
            {unitPrice || `${price} ₺ / ${unit || "Adet"}`}
          </span>
          <span className="text-[4.5px] sm:text-[5px] font-mono text-neutral-400 mt-1 leading-none tracking-normal">
            B. TARİHİ: {labelDate}
          </span>
        </div>

      </div>

    </div>
  );
};
