// Popup logic for Property Hunter Extension

class PopupController {
  constructor() {
    this.propertyData = null;
    this.isDuplicate = false;
    this.spreadsheetId = null;
    this.isAuthenticated = false;

    this.init();
  }

  async init() {
    // Check authentication status
    await this.checkAuthentication();

    if (!this.isAuthenticated) {
      this.showScreen('notAuthScreen');
      this.setupAuthListeners();
      return;
    }

    // Check if we're on a property page and extract data
    await this.extractPropertyData();

    // Setup event listeners
    this.setupEventListeners();
  }

  async checkAuthentication() {
    try {
      const result = await chrome.storage.sync.get(['googleAuth', 'spreadsheetId']);
      this.isAuthenticated = !!result.googleAuth;
      this.spreadsheetId = result.spreadsheetId;
    } catch (error) {
      console.error('Error checking auth:', error);
      this.isAuthenticated = false;
    }
  }

  async extractPropertyData() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Request data extraction from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractData'
      });

      if (!response.isPropertyPage) {
        this.showScreen('notPropertyScreen');
        return;
      }

      if (!response.success) {
        this.showError('Não foi possível extrair todos os dados necessários', response.message);
        return;
      }

      this.propertyData = response.data;
      document.getElementById('siteDetected').textContent = response.siteName || 'Site detectado';

      // Check for duplicates
      await this.checkDuplicates();

      // Show preview screen with data
      this.showPreviewScreen();

    } catch (error) {
      console.error('Error extracting data:', error);
      this.showError('Erro ao extrair dados', error.message);
    }
  }

  async checkDuplicates() {
    if (!this.propertyData || !this.spreadsheetId) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkDuplicate',
        url: this.propertyData.url,
        spreadsheetId: this.spreadsheetId
      });

      if (response.isDuplicate) {
        this.isDuplicate = true;
        this.showDuplicateWarning(response.saveDate);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      // Don't block save if duplicate check fails
    }
  }

  showDuplicateWarning(saveDate) {
    const warning = document.getElementById('duplicateWarning');
    const message = document.getElementById('duplicateMessage');

    message.textContent = `Você já salvou este imóvel em ${saveDate}. Você pode atualizar os dados ou salvar como novo.`;
    warning.style.display = 'flex';
  }

  showPreviewScreen() {
    this.hideAllScreens();
    document.getElementById('previewScreen').style.display = 'block';

    // Populate form fields
    this.populateForm();
  }

  populateForm() {
    if (!this.propertyData) return;

    // Set all form values
    const fields = [
      'address', 'neighborhood', 'city', 'state', 'cep',
      'price', 'condominiumFee', 'iptu',
      'bedrooms', 'bathrooms', 'squareMeters',
      'propertyType', 'notes', 'status'
    ];

    fields.forEach(field => {
      const element = document.getElementById(field);
      if (element && this.propertyData[field] !== null && this.propertyData[field] !== undefined) {
        // Format currency fields
        if (['price', 'condominiumFee', 'iptu'].includes(field) && typeof this.propertyData[field] === 'number') {
          element.value = this.formatCurrency(this.propertyData[field]);
        } else {
          element.value = this.propertyData[field];
        }
      }
    });
  }

  formatCurrency(number) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }

  parseCurrency(text) {
    if (!text) return null;
    const cleaned = text.replace(/\./g, '').replace(',', '.').trim();
    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
  }

  setupEventListeners() {
    // Form submission
    const form = document.getElementById('propertyForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveProperty();
    });

    // Cancel button
    document.getElementById('cancelButton').addEventListener('click', () => {
      window.close();
    });

    // Open settings
    const settingsBtn = document.getElementById('openSettings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    // Success screen actions
    document.getElementById('viewInSheets')?.addEventListener('click', () => {
      if (this.spreadsheetId) {
        chrome.tabs.create({
          url: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
        });
      }
    });

    document.getElementById('saveAnother')?.addEventListener('click', () => {
      window.close();
    });

    // Error screen retry
    document.getElementById('retryButton')?.addEventListener('click', () => {
      this.init();
    });

    document.getElementById('reportIssue')?.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://github.com/your-repo/issues/new'
      });
    });
  }

  setupAuthListeners() {
    document.getElementById('connectGoogle').addEventListener('click', async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'authenticate'
        });

        if (response.success) {
          this.isAuthenticated = true;
          this.spreadsheetId = response.spreadsheetId;
          await this.init();
        } else {
          this.showError('Erro na autenticação', response.error);
        }
      } catch (error) {
        this.showError('Erro na autenticação', error.message);
      }
    });
  }

  async saveProperty() {
    const saveButton = document.getElementById('saveButton');
    saveButton.disabled = true;
    saveButton.innerHTML = '<span class="btn-emoji">⏳</span><span>Salvando...</span>';

    try {
      // Get form values
      const formData = this.getFormData();

      // Send to background script to save to Google Sheets
      const response = await chrome.runtime.sendMessage({
        action: 'saveProperty',
        data: formData,
        spreadsheetId: this.spreadsheetId
      });

      if (response.success) {
        this.showSuccess(formData.address);
      } else {
        this.showError('Erro ao salvar', response.error);
      }

    } catch (error) {
      console.error('Save error:', error);
      this.showError('Erro ao salvar no Google Sheets', error.message);
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = '<span class="btn-emoji">✨</span><span>Salvar no Sheets</span>';
    }
  }

  getFormData() {
    return {
      dateSaved: new Date().toLocaleDateString('pt-BR'),
      url: this.propertyData?.url || window.location.href,
      address: document.getElementById('address').value,
      neighborhood: document.getElementById('neighborhood').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value.toUpperCase(),
      cep: document.getElementById('cep').value,
      price: this.parseCurrency(document.getElementById('price').value),
      condominiumFee: this.parseCurrency(document.getElementById('condominiumFee').value),
      iptu: this.parseCurrency(document.getElementById('iptu').value),
      bedrooms: parseInt(document.getElementById('bedrooms').value) || null,
      bathrooms: parseInt(document.getElementById('bathrooms').value) || null,
      squareMeters: parseFloat(document.getElementById('squareMeters').value) || null,
      propertyType: document.getElementById('propertyType').value,
      notes: document.getElementById('notes').value,
      status: document.getElementById('status').value
    };
  }

  showSuccess(address) {
    this.hideAllScreens();
    document.getElementById('successScreen').style.display = 'block';

    const message = document.getElementById('successMessage');
    message.textContent = `O imóvel em ${address} foi salvo com sucesso na sua planilha!`;

    // Auto-close after 5 seconds
    setTimeout(() => {
      window.close();
    }, 5000);
  }

  showError(title, message) {
    this.hideAllScreens();
    document.getElementById('errorScreen').style.display = 'block';

    const errorMessage = document.getElementById('errorMessage');
    errorMessage.innerHTML = `
      <strong>${title}</strong>
      <p>${message}</p>
    `;
  }

  showScreen(screenId) {
    this.hideAllScreens();
    document.getElementById(screenId).style.display = 'block';
  }

  hideAllScreens() {
    const screens = [
      'loadingScreen',
      'notPropertyScreen',
      'notAuthScreen',
      'previewScreen',
      'successScreen',
      'errorScreen'
    ];

    screens.forEach(screenId => {
      const screen = document.getElementById(screenId);
      if (screen) screen.style.display = 'none';
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
