// ZAP Imóveis specific data extractor

class ZapImoveisExtractor extends CommonExtractor {
  constructor() {
    super();
    this.siteName = 'ZAP Imóveis';
  }

  /**
   * Detect if this is a property detail page on ZAP
   */
  isPropertyListingPage() {
    const url = window.location.href.toLowerCase();
    return url.includes('zapimoveis.com.br') &&
           (url.includes('/imovel/') || url.includes('/apartamento/') || url.includes('/casa/'));
  }

  /**
   * Extract price from ZAP Imóveis
   */
  extractPrice() {
    // ZAP-specific selectors
    const priceText = this.extractText([
      '[data-testid="price-info-value"]',
      '[class*="price-info__value"]',
      '[class*="price__container"]',
      'h2[class*="price"]',
      'span[class*="price-value"]'
    ]);

    if (priceText) {
      return PropertyParser.parseBRLCurrency(priceText);
    }

    // Fallback to common extraction
    return super.extractPrice();
  }

  /**
   * Extract address from ZAP Imóveis
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

    // ZAP-specific address selectors
    const fullAddress = this.extractText([
      '[data-testid="address-info"]',
      '[class*="address-info"]',
      'h2[class*="address"]',
      '[itemprop="address"]'
    ]);

    if (fullAddress) {
      address.full = fullAddress;
      const parsed = PropertyParser.parseAddress(fullAddress);
      Object.assign(address, parsed);
    }

    // Extract neighborhood separately
    if (!address.neighborhood) {
      address.neighborhood = this.extractText([
        '[data-testid="neighborhood"]',
        'span[class*="neighborhood"]',
        'span[class*="bairro"]'
      ]) || '';
    }

    // Extract city
    if (!address.city) {
      address.city = this.extractText([
        '[data-testid="city"]',
        'span[class*="city"]'
      ]) || '';
    }

    // Extract state from address or page
    if (!address.state) {
      address.state = PropertyParser.extractState(address.full || document.body.textContent) || '';
    }

    return address;
  }

  /**
   * Extract features from ZAP Imóveis
   */
  extractFeatures() {
    const features = {
      bedrooms: null,
      bathrooms: null,
      squareMeters: null,
      propertyType: ''
    };

    // ZAP uses specific data attributes and classes
    const bedroomsText = this.extractText([
      '[data-testid="amenities-bedrooms"]',
      'li[class*="bedrooms"] span',
      'span[title*="quarto"]'
    ]);
    features.bedrooms = PropertyParser.parseRoomCount(bedroomsText);

    const bathroomsText = this.extractText([
      '[data-testid="amenities-bathrooms"]',
      'li[class*="bathrooms"] span',
      'span[title*="banheiro"]'
    ]);
    features.bathrooms = PropertyParser.parseRoomCount(bathroomsText);

    const areaText = this.extractText([
      '[data-testid="amenities-area"]',
      'li[class*="area"] span',
      'span[title*="área"]',
      '[itemprop="floorSize"]'
    ]);
    features.squareMeters = PropertyParser.parseSquareMeters(areaText);

    // Property type from breadcrumb or title
    features.propertyType = this.extractText([
      '[data-testid="property-type"]',
      'nav[class*="breadcrumb"] li:nth-child(2)',
      'h1[class*="title"]'
    ]) || 'Imóvel';

    // Clean property type
    if (features.propertyType) {
      features.propertyType = features.propertyType
        .replace(/\d+/g, '')
        .replace(/quartos?|banheiros?|vagas?/gi, '')
        .trim();
    }

    return features;
  }

  /**
   * Extract financial details from ZAP
   */
  extractFinancials() {
    const financials = {
      condominiumFee: null,
      iptu: null
    };

    // Condominium fee
    const condoText = this.extractText([
      '[data-testid="condo-fee"]',
      'li:has(span[title*="Condomínio"]) strong',
      'span:has-text("Condomínio") + span',
      'div[class*="condo"] span[class*="value"]'
    ]);
    financials.condominiumFee = PropertyParser.parseBRLCurrency(condoText);

    // IPTU
    const iptuText = this.extractText([
      '[data-testid="iptu-value"]',
      'li:has(span[title*="IPTU"]) strong',
      'span:has-text("IPTU") + span',
      'div[class*="iptu"] span[class*="value"]'
    ]);
    financials.iptu = PropertyParser.parseBRLCurrency(iptuText);

    return financials;
  }

  /**
   * Extract all data with ZAP-specific logic
   */
  async extract() {
    this.isPropertyPage = this.isPropertyListingPage();

    if (!this.isPropertyPage) {
      return {
        success: false,
        isPropertyPage: false,
        siteName: this.siteName,
        message: 'Esta não é uma página de detalhes de imóvel do ZAP Imóveis'
      };
    }

    // Wait for main content to load
    await this.waitForContent('[data-testid="price-info-value"], h2[class*="price"]', 5000);

    // Extract using site-specific methods
    const price = this.extractPrice();
    const addressInfo = this.extractAddressInfo();
    const features = this.extractFeatures();
    const financials = this.extractFinancials();

    // Create property data object
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

    // Validate
    const validation = PropertyParser.validatePropertyData(this.propertyData);

    return {
      success: validation.isValid,
      isPropertyPage: true,
      siteName: this.siteName,
      data: this.propertyData,
      missingFields: validation.missingFields,
      message: validation.isValid
        ? 'Dados extraídos com sucesso do ZAP Imóveis'
        : `Campos obrigatórios faltando: ${validation.missingFields.join(', ')}`
    };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const extractor = new ZapImoveisExtractor();
    extractor.extract().then(result => {
      sendResponse(result);
    });
    return true; // Will respond asynchronously
  }

  if (request.action === 'checkPropertyPage') {
    const extractor = new ZapImoveisExtractor();
    sendResponse({
      isPropertyPage: extractor.isPropertyListingPage(),
      siteName: extractor.siteName
    });
  }
});

// Notify background script that we're on a property page
if (new ZapImoveisExtractor().isPropertyListingPage()) {
  chrome.runtime.sendMessage({
    action: 'propertyPageDetected',
    site: 'ZAP Imóveis'
  });
}
