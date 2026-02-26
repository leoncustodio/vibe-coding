// Common extraction logic for all real estate websites

class CommonExtractor {
  constructor() {
    this.propertyData = null;
    this.isPropertyPage = false;
  }

  /**
   * Wait for dynamic content to load
   */
  async waitForContent(selector, timeout = 10000) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        if (document.querySelector(selector)) {
          obs.disconnect();
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          obs.disconnect();
          resolve(false);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, timeout);
    });
  }

  /**
   * Extract text from element using multiple selectors
   */
  extractText(selectors) {
    if (!Array.isArray(selectors)) {
      selectors = [selectors];
    }

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return PropertyParser.cleanText(element.textContent);
      }
    }
    return null;
  }

  /**
   * Extract attribute from element
   */
  extractAttribute(selectors, attribute) {
    if (!Array.isArray(selectors)) {
      selectors = [selectors];
    }

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.hasAttribute(attribute)) {
        return element.getAttribute(attribute);
      }
    }
    return null;
  }

  /**
   * Try multiple extraction strategies
   */
  async extractWithStrategies(strategies) {
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) return result;
      } catch (e) {
        console.log('Strategy failed:', e);
      }
    }
    return null;
  }

  /**
   * Detect if current page is a property listing
   * Override this method in site-specific extractors
   */
  isPropertyListingPage() {
    // Basic detection: check URL patterns
    const url = window.location.href.toLowerCase();

    // Common patterns for property detail pages
    const detailPatterns = [
      '/imovel/',
      '/aluguel/',
      '/venda/',
      '/comprar/',
      '/apartamento/',
      '/casa/',
      '/property/',
      '/listing/'
    ];

    const isDetail = detailPatterns.some(pattern => url.includes(pattern));

    // Avoid search/list pages
    const searchPatterns = [
      '/busca',
      '/search',
      '/resultados',
      '/filtro',
      '/lista'
    ];

    const isSearch = searchPatterns.some(pattern => url.includes(pattern));

    return isDetail && !isSearch;
  }

  /**
   * Extract price with multiple attempts
   */
  extractPrice() {
    const strategies = [
      // Strategy 1: Common price selectors
      () => {
        const priceText = this.extractText([
          '[data-testid="price"]',
          '[class*="price"]',
          '[itemprop="price"]',
          '.price',
          '#price'
        ]);
        return PropertyParser.parseBRLCurrency(priceText);
      },

      // Strategy 2: Meta tags
      () => {
        const meta = PropertyParser.extractFromMetaTags();
        return meta.price ? parseFloat(meta.price) : null;
      },

      // Strategy 3: JSON-LD
      () => {
        const jsonld = PropertyParser.extractFromJSONLD();
        return jsonld?.offers?.price || null;
      }
    ];

    for (const strategy of strategies) {
      try {
        const price = strategy();
        if (price) return price;
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * Extract address components
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

    // Try to get full address first
    const fullAddress = this.extractText([
      '[data-testid="address"]',
      '[itemprop="address"]',
      '[class*="address"]',
      '.address'
    ]);

    if (fullAddress) {
      address.full = fullAddress;
      const parsed = PropertyParser.parseAddress(fullAddress);
      Object.assign(address, parsed);
    }

    // Try to extract individual components if full address not found
    if (!address.neighborhood) {
      address.neighborhood = this.extractText([
        '[data-testid="neighborhood"]',
        '[class*="neighborhood"]',
        '[class*="bairro"]'
      ]) || '';
    }

    if (!address.city) {
      address.city = this.extractText([
        '[data-testid="city"]',
        '[class*="city"]',
        '[class*="cidade"]'
      ]) || '';
    }

    if (!address.state) {
      address.state = PropertyParser.extractState(address.full || document.body.textContent);
    }

    // Look for CEP
    const cepText = this.extractText([
      '[data-testid="zipcode"]',
      '[data-testid="cep"]',
      '[class*="zipcode"]',
      '[class*="cep"]'
    ]);
    address.cep = PropertyParser.parseCEP(cepText) || '';

    return address;
  }

  /**
   * Extract property features
   */
  extractFeatures() {
    const features = {
      bedrooms: null,
      bathrooms: null,
      squareMeters: null,
      propertyType: ''
    };

    // Bedrooms
    const bedroomsText = this.extractText([
      '[data-testid="bedrooms"]',
      '[class*="bedrooms"]',
      '[class*="quartos"]',
      '[title*="quarto"]'
    ]);
    features.bedrooms = PropertyParser.parseRoomCount(bedroomsText);

    // Bathrooms
    const bathroomsText = this.extractText([
      '[data-testid="bathrooms"]',
      '[class*="bathrooms"]',
      '[class*="banheiros"]',
      '[title*="banheiro"]'
    ]);
    features.bathrooms = PropertyParser.parseRoomCount(bathroomsText);

    // Square meters
    const areaText = this.extractText([
      '[data-testid="area"]',
      '[class*="area"]',
      '[itemprop="floorSize"]'
    ]);
    features.squareMeters = PropertyParser.parseSquareMeters(areaText);

    // Property type
    features.propertyType = this.extractText([
      '[data-testid="property-type"]',
      '[class*="property-type"]',
      '[class*="tipo"]'
    ]) || '';

    return features;
  }

  /**
   * Extract financial details
   */
  extractFinancials() {
    const financials = {
      condominiumFee: null,
      iptu: null
    };

    // Condominium fee
    const condoText = this.extractText([
      '[data-testid="condo-fee"]',
      '[data-testid="condominium"]',
      '[class*="condominio"]',
      '[class*="condominium"]'
    ]);
    financials.condominiumFee = PropertyParser.parseBRLCurrency(condoText);

    // IPTU
    const iptuText = this.extractText([
      '[data-testid="iptu"]',
      '[class*="iptu"]',
      '[title*="iptu"]'
    ]);
    financials.iptu = PropertyParser.parseBRLCurrency(iptuText);

    return financials;
  }

  /**
   * Extract all property data
   * Override this method in site-specific extractors for custom logic
   */
  async extract() {
    // Check if this is a property listing page
    this.isPropertyPage = this.isPropertyListingPage();

    if (!this.isPropertyPage) {
      return {
        success: false,
        isPropertyPage: false,
        message: 'Esta não é uma página de detalhes de imóvel'
      };
    }

    // Extract all data
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

    // Validate data
    const validation = PropertyParser.validatePropertyData(this.propertyData);

    return {
      success: validation.isValid,
      isPropertyPage: true,
      data: this.propertyData,
      missingFields: validation.missingFields,
      message: validation.isValid
        ? 'Dados extraídos com sucesso'
        : `Campos obrigatórios faltando: ${validation.missingFields.join(', ')}`
    };
  }
}

// Make available globally
window.CommonExtractor = CommonExtractor;
