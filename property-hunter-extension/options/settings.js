// Settings page controller

class SettingsController {
  constructor() {
    this.isAuthenticated = false;
    this.spreadsheetId = null;
    this.spreadsheetTitle = null;

    this.init();
  }

  async init() {
    // Check if this is first-time welcome
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === 'true') {
      document.getElementById('welcomeMessage').style.display = 'flex';
    }

    // Check authentication status
    await this.checkAuthStatus();

    // Load preferences
    await this.loadPreferences();

    // Setup event listeners
    this.setupEventListeners();
  }

  async checkAuthStatus() {
    try {
      const result = await chrome.storage.sync.get(['googleAuth', 'spreadsheetId', 'spreadsheetTitle']);

      this.isAuthenticated = !!result.googleAuth;
      this.spreadsheetId = result.spreadsheetId;
      this.spreadsheetTitle = result.spreadsheetTitle;

      this.updateConnectionStatus();

      if (this.isAuthenticated && !this.spreadsheetId) {
        // Show spreadsheet selection
        document.getElementById('spreadsheetSection').style.display = 'block';
        await this.loadSpreadsheetsList();
      }

    } catch (error) {
      console.error('Error checking auth status:', error);
      this.showAsDisconnected();
    }
  }

  updateConnectionStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const connectedInfo = document.getElementById('connectedInfo');
    const notConnectedInfo = document.getElementById('notConnectedInfo');
    const statusDot = statusIndicator.querySelector('.status-dot');

    if (this.isAuthenticated && this.spreadsheetId) {
      // Connected
      statusDot.classList.add('connected');
      statusText.textContent = 'Conectado';

      document.getElementById('spreadsheetName').textContent = this.spreadsheetTitle || 'Planilha Conectada';
      document.getElementById('lastUpdate').textContent = new Date().toLocaleDateString('pt-BR');

      connectedInfo.style.display = 'block';
      notConnectedInfo.style.display = 'none';

    } else {
      // Not connected
      this.showAsDisconnected();
    }
  }

  showAsDisconnected() {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const connectedInfo = document.getElementById('connectedInfo');
    const notConnectedInfo = document.getElementById('notConnectedInfo');
    const statusDot = statusIndicator.querySelector('.status-dot');

    statusDot.classList.remove('connected');
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Não conectado';

    connectedInfo.style.display = 'none';
    notConnectedInfo.style.display = 'block';
  }

  async loadSpreadsheetsList() {
    const select = document.getElementById('spreadsheetSelect');
    select.innerHTML = '<option value="">Carregando...</option>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'listSpreadsheets'
      });

      if (response.success) {
        select.innerHTML = '<option value="">Selecione uma planilha</option>';

        response.spreadsheets.forEach(sheet => {
          const option = document.createElement('option');
          option.value = sheet.id;
          option.textContent = sheet.name;
          select.appendChild(option);
        });

      } else {
        select.innerHTML = '<option value="">Erro ao carregar planilhas</option>';
      }

    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      select.innerHTML = '<option value="">Erro ao carregar planilhas</option>';
    }
  }

  async loadPreferences() {
    try {
      const result = await chrome.storage.sync.get(['preferences']);
      const prefs = result.preferences || {
        autoClose: true,
        showDuplicateWarning: true,
        defaultStatus: 'Interessado'
      };

      document.getElementById('autoClose').checked = prefs.autoClose;
      document.getElementById('showDuplicateWarning').checked = prefs.showDuplicateWarning;
      document.getElementById('defaultStatus').value = prefs.defaultStatus;

    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  setupEventListeners() {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', () => {
      this.handleConnect();
    });

    // Disconnect button
    document.getElementById('disconnectBtn').addEventListener('click', () => {
      this.handleDisconnect();
    });

    // Open spreadsheet button
    document.getElementById('openSpreadsheet').addEventListener('click', () => {
      if (this.spreadsheetId) {
        chrome.tabs.create({
          url: `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}`
        });
      }
    });

    // Spreadsheet selection
    const spreadsheetSelect = document.getElementById('spreadsheetSelect');
    spreadsheetSelect.addEventListener('change', async (e) => {
      if (e.target.value) {
        await this.selectSpreadsheet(e.target.value);
      }
    });

    // Create new spreadsheet
    document.getElementById('createNewSpreadsheet').addEventListener('click', () => {
      this.createNewSpreadsheet();
    });

    // Save preferences
    document.getElementById('savePreferences').addEventListener('click', () => {
      this.savePreferences();
    });

    // View docs button
    document.getElementById('viewDocs').addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://github.com/your-repo#readme'
      });
    });

    // Report bug button
    document.getElementById('reportBug').addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://github.com/your-repo/issues/new'
      });
    });
  }

  async handleConnect() {
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="btn-emoji">⏳</span><span>Conectando...</span>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'authenticate'
      });

      if (response.success) {
        this.isAuthenticated = true;
        this.spreadsheetId = response.spreadsheetId;

        // Refresh the page to show connected state
        await this.checkAuthStatus();
        this.showSuccessToast('Conectado com sucesso!');

      } else {
        alert('Erro ao conectar: ' + response.error);
      }

    } catch (error) {
      alert('Erro ao conectar: ' + error.message);
    } finally {
      connectBtn.disabled = false;
      connectBtn.innerHTML = '<span class="btn-emoji">🔗</span><span>Conectar Google Sheets</span>';
    }
  }

  async handleDisconnect() {
    if (!confirm('Tem certeza que deseja desconectar? Você precisará autenticar novamente.')) {
      return;
    }

    try {
      await chrome.storage.sync.remove(['googleAuth', 'spreadsheetId', 'spreadsheetTitle']);

      this.isAuthenticated = false;
      this.spreadsheetId = null;
      this.spreadsheetTitle = null;

      this.showAsDisconnected();
      this.showSuccessToast('Desconectado com sucesso');

    } catch (error) {
      alert('Erro ao desconectar: ' + error.message);
    }
  }

  async selectSpreadsheet(spreadsheetId) {
    try {
      // Get spreadsheet name
      const select = document.getElementById('spreadsheetSelect');
      const selectedOption = select.options[select.selectedIndex];
      const spreadsheetTitle = selectedOption.textContent;

      // Save to storage
      await chrome.storage.sync.set({
        spreadsheetId: spreadsheetId,
        spreadsheetTitle: spreadsheetTitle
      });

      this.spreadsheetId = spreadsheetId;
      this.spreadsheetTitle = spreadsheetTitle;

      this.updateConnectionStatus();
      document.getElementById('spreadsheetSection').style.display = 'none';

      this.showSuccessToast('Planilha selecionada!');

    } catch (error) {
      alert('Erro ao selecionar planilha: ' + error.message);
    }
  }

  async createNewSpreadsheet() {
    const title = prompt('Nome da nova planilha:', `Rastreador de Imóveis - ${new Date().toLocaleDateString('pt-BR')}`);

    if (!title) return;

    const createBtn = document.getElementById('createNewSpreadsheet');
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="btn-emoji">⏳</span><span>Criando...</span>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'createSpreadsheet',
        title: title
      });

      if (response.success) {
        this.spreadsheetId = response.spreadsheetId;
        this.spreadsheetTitle = title;

        this.updateConnectionStatus();
        document.getElementById('spreadsheetSection').style.display = 'none';

        this.showSuccessToast('Planilha criada com sucesso!');

        // Ask if user wants to open it
        if (confirm('Planilha criada! Deseja abri-la agora?')) {
          chrome.tabs.create({
            url: response.spreadsheetUrl
          });
        }

      } else {
        alert('Erro ao criar planilha: ' + response.error);
      }

    } catch (error) {
      alert('Erro ao criar planilha: ' + error.message);
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = '<span class="btn-emoji">➕</span><span>Criar Nova Planilha</span>';
    }
  }

  async savePreferences() {
    const preferences = {
      autoClose: document.getElementById('autoClose').checked,
      showDuplicateWarning: document.getElementById('showDuplicateWarning').checked,
      defaultStatus: document.getElementById('defaultStatus').value
    };

    try {
      await chrome.storage.sync.set({ preferences: preferences });
      this.showSuccessToast('Preferências salvas!');

    } catch (error) {
      alert('Erro ao salvar preferências: ' + error.message);
    }
  }

  showSuccessToast(message) {
    const toast = document.getElementById('successMessage');
    const textElement = document.getElementById('successText');

    textElement.textContent = message;
    toast.style.display = 'flex';

    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
