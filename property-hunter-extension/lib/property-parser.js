// Brazilian property data parsing utilities

class PropertyParser {
  /**
   * Parse Brazilian currency (R$) to number
   * Examples: "R$ 1.500.000" -> 1500000, "R$ 850,00" -> 850
   */
  static parseBRLCurrency(text) {
    if (!text) return null;

    // Remove R$, spaces, and convert Brazilian format to number
    const cleaned = text
      .replace(/R\$\s*/gi, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.') // Convert decimal comma to dot
      .trim();

    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
  }

  /**
   * Format number as Brazilian currency
   * Example: 1500000 -> "R$ 1.500.000,00"
   */
  static formatBRLCurrency(number) {
    if (number === null || number === undefined || isNaN(number)) return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  }

  /**
   * Parse square meters from text
   * Examples: "150 m²", "150m2", "150 metros" -> 150
   */
  static parseSquareMeters(text) {
    if (!text) return null;

    const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|metros?)/i);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  /**
   * Parse number of rooms (bedrooms/bathrooms)
   * Examples: "3 quartos", "2 banheiros", "3" -> 3
   */
  static parseRoomCount(text) {
    if (!text) return null;

    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Parse Brazilian CEP (postal code)
   * Examples: "01310-100", "01310100" -> "01310-100"
   */
  static parseCEP(text) {
    if (!text) return null;

    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    return null;
  }

  /**
   * Format date as DD/MM/YYYY (Brazilian format)
   */
  static formatBrazilianDate(date = new Date()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Parse Brazilian address components
   */
  static parseAddress(fullAddress) {
    if (!fullAddress) return {};

    const parts = fullAddress.split(',').map(p => p.trim());

    return {
      street: parts[0] || '',
      neighborhood: parts[1] || '',
      city: parts[2] || '',
      state: this.extractState(fullAddress) || '',
      full: fullAddress
    };
  }

  /**
   * Extract Brazilian state code (UF)
   * Examples: "São Paulo, SP" -> "SP"
   */
  static extractState(text) {
    if (!text) return null;

    const states = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    for (const state of states) {
      const regex = new RegExp(`\\b${state}\\b`, 'i');
      if (regex.test(text)) return state.toUpperCase();
    }

    return null;
  }

  /**
   * Clean and normalize text (remove extra spaces, line breaks)
   */
  static cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Validate required fields for property data
   */
  static validatePropertyData(data) {
    const required = ['url', 'address', 'price'];
    const missing = [];

    for (const field of required) {
      if (!data[field] || data[field] === '') {
        missing.push(field);
      }
    }

    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  }

  /**
   * Create property data object with all fields
   */
  static createPropertyData(rawData = {}) {
    return {
      dateSaved: this.formatBrazilianDate(),
      url: rawData.url || window.location.href,
      address: rawData.address || '',
      neighborhood: rawData.neighborhood || '',
      city: rawData.city || '',
      state: rawData.state || '',
      cep: rawData.cep || '',
      price: rawData.price || null,
      bedrooms: rawData.bedrooms || null,
      bathrooms: rawData.bathrooms || null,
      squareMeters: rawData.squareMeters || null,
      propertyType: rawData.propertyType || '',
      condominiumFee: rawData.condominiumFee || null,
      iptu: rawData.iptu || null,
      yearBuilt: rawData.yearBuilt || null,
      notes: rawData.notes || '',
      tags: rawData.tags || '',
      status: rawData.status || 'Interessado'
    };
  }

  /**
   * Extract data from JSON-LD schema
   */
  static extractFromJSONLD() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'RealEstateListing' || data['@type'] === 'Product') {
          return data;
        }
      }
    } catch (e) {
      console.log('No JSON-LD data found:', e);
    }
    return null;
  }

  /**
   * Extract data from meta tags
   */
  static extractFromMetaTags() {
    const data = {};

    const metaTags = {
      price: ['og:price:amount', 'product:price:amount'],
      currency: ['og:price:currency', 'product:price:currency'],
      title: ['og:title', 'twitter:title'],
      description: ['og:description', 'twitter:description'],
      image: ['og:image', 'twitter:image']
    };

    for (const [key, names] of Object.entries(metaTags)) {
      for (const name of names) {
        const meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        if (meta) {
          data[key] = meta.content;
          break;
        }
      }
    }

    return data;
  }
}

// Make available globally for content scripts
window.PropertyParser = PropertyParser;
