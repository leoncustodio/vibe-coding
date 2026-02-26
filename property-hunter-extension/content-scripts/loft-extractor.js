// Viva Real specific data extractor

class VivaRealExtractor extends CommonExtractor {
  constructor() {
    super();
    this.siteName = 'Viva Real';
  }

  /**
   * Detect if this is a property detail page on Viva Real
   */
  isPropertyListingPage() {
    const url = window.location.href.toLowerCase();
    return url.includes('vivareal.com.br') &&
           (url.includes('/imovel/') || url.includes('/apartamento/') || url.includes('/casa/'));
  }

  /**
   * Extract price from Viva Real
   */
  extractPrice() {
    const priceText = this.extractText([
      '[data-testid="price-info-value"]',
      '[class*="price-info__value"]',
      'div[class*="price__container"] span',
      'h2[class*="price"]'
    ]);

    if (priceText) {
      return PropertyParser.parseBRLCurrency(priceText);
    }

    return super.extractPrice();
  }

  /**
   * Extract address from Viva Real
   */
  extractAddressInfo() {
    const address = {
      full: '',
      street: '',
      neighborhood: '',
      city: '',
      state: '',
      cep: ''
    };

    const fullAddress = this.extractText([
      '[data-testid="address-info"]',
      '[class*="address-info"]',
      'h1[class*="title"]',
      'section[class*="location"] h2'
    ]);

    if (fullAddress) {
      address.full = fullAddress;
      const parsed = PropertyParser.parseAddress(fullAddress);
      Object.assign(address, parsed);
    }

    if (!address.neighborhood) {
      address.neighborhood = this.extractText([
        '[data-testid="neighborhood"]',
        'span[class*="neighborhood"]'
      ]) || '';
    }

    if (!address.city) {
      address.city = this.extractText([
        '[data-testid="city"]',
        'span[class*="city"]'
      ]) || '';
    }

    if (!address.state) {
      address.state = PropertyParser.extractState(address.full || document.body.textContent) || '';
    }

    return address;
  }

  /**
   * Extract features from Viva Real
   */
  extractFeatures() {
    const features = {
      bedrooms: null,
      bathrooms: null,
      squareMeters: null,
      propertyType: ''
    };

    const bedroomsText = this.extractText([
      '[data-testid="amenities-bedrooms"]',
      'li[class*="feature"]:has(span[title*="quarto"])',
      'span[title*="quarto"]'
    ]);
    features.bedrooms = PropertyParser.parseRoomCount(bedroomsText);

    const bathroomsText = this.extractText([
      '[data-testid="amenities-bathrooms"]',
      'li[class*="feature"]:has(span[title*="banheiro"])',
      'span[title*="banheiro"]'
    ]);
    features.bathrooms = PropertyParser.parseRoomCount(bathroomsText);

    const areaText = this.extractText([
      '[data-testid="amenities-area"]',
      'li[class*="feature"]:has(span[title*="área"])',
      'span[title*="útil"]'
    ]);
    features.squareMeters = PropertyParser.parseSquareMeters(areaText);

    features.propertyType = this.extractText([
      '[data-testid="property-type"]',
      'nav ol li:nth-child(3)'
    ]) || 'Imóvel';

    if (features.propertyType) {
      features.propertyType = features.propertyType
        .replace(/\d+/g, '')
        .replace(/quartos?|banheiros?|vagas?/gi, '')
        .trim();
    }

    return features;
  }

  /**
   * Extract financial details from Viva Real
   */
  extractFinancials() {
    const financials = {
      condominiumFee: null,
      iptu: null
    };

    const condoText = this.extractText([
      '[data-testid="condo-fee"]',
      'li:has-text("Condomínio") span[class*="value"]'
    ]);
    financials.condominiumFee = PropertyParser.parseBRLCurrency(condoText);

    const iptuText = this.extractText([
      '[data-testid="iptu-value"]',
      'li:has-text("IPTU") span[class*="value"]'
    ]);
    financials.iptu = PropertyParser.parseBRLCurrency(iptuText);

    return financials;
  }

  /**
   * Extract all data with Viva Real-specific logic
   */
  async extract() {
    this.isPropertyPage = this.isPropertyListingPage();

    if (!this.isPropertyPage) {
      return {
        success: false,
        isPropertyPage: false,
        siteName: this.siteName,
        message: 'Esta não é uma página de detalhes de imóvel do Viva Real'
      };
    }

    await this.waitForContent('[data-testid="price-info-value"], h2[class*="price"]', 5000);

    const price = this.extractPrice();
    const addressInfo = this.extractAddressInfo();
    const features = this.extractFeatures();
    const financials = this.extractFinancials();

    this.propertyData = PropertyParser.createPropertyData({
      url: window.location.href,
      price: price,
      address: addressInfo.full,
      neighborhood: addressInfo.neighborhood,
      city: addressInfo.city,
      state: addressInfo.state,
      cep: addressInfo.cep,
      bedrooms: features.bedrooms,
      bathrooms: features.bathrooms,
      squareMeters: features.squareMeters,
      propertyType: features.propertyType,
      condominiumFee: financials.condominiumFee,
      iptu: financials.iptu
    });

    const validation = PropertyParser.validatePropertyData(this.propertyData);

    return {
      success: validation.isValid,
      isPropertyPage: true,
      siteName: this.siteName,
      data: this.propertyData,
      missingFields: validation.missingFields,
      message: validation.isValid
        ? 'Dados extraídos com sucesso do Viva Real'
        : `Campos obrigatórios faltando: ${validation.missingFields.join(', ')}`
    };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const extractor = new VivaRealExtractor();
    extractor.extract().then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'checkPropertyPage') {
    const extractor = new VivaRealExtractor();
    sendResponse({
      isPropertyPage: extractor.isPropertyListingPage(),
      siteName: extractor.siteName
    });
  }
});

// Notify background script
if (new VivaRealExtractor().isPropertyListingPage()) {
  chrome.runtime.sendMessage({
    action: 'propertyPageDetected',
    site: 'Viva Real'
  });
}
