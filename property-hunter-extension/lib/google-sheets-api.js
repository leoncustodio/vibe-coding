// Google Sheets API integration with OAuth 2.0

class GoogleSheetsAPI {
  constructor() {
    this.accessToken = null;
    this.spreadsheetId = null;
    this.API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  /**
   * Authenticate with Google using OAuth 2.0
   */
  async authenticate() {
    try {
      // Get OAuth token using Chrome identity API
      const token = await chrome.identity.getAuthToken({ interactive: true });

      if (!token) {
        throw new Error('Falha na autenticação');
      }

      this.accessToken = token;

      // Store auth token
      await chrome.storage.sync.set({
        googleAuth: {
          token: token,
          timestamp: Date.now()
        }
      });

      return {
        success: true,
        token: token
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if token is still valid
   */
  async isAuthenticated() {
    try {
      const result = await chrome.storage.sync.get(['googleAuth']);

      if (!result.googleAuth || !result.googleAuth.token) {
        return false;
      }

      // Check if token is expired (tokens usually last 1 hour)
      const tokenAge = Date.now() - result.googleAuth.timestamp;
      const ONE_HOUR = 60 * 60 * 1000;

      if (tokenAge > ONE_HOUR) {
        // Try to refresh token
        return await this.refreshToken();
      }

      this.accessToken = result.googleAuth.token;
      return true;

    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  }

  /**
   * Refresh expired token
   */
  async refreshToken() {
    try {
      // Remove cached token
      await chrome.identity.removeCachedAuthToken({
        token: this.accessToken
      });

      // Get new token
      const result = await this.authenticate();
      return result.success;

    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Create a new spreadsheet with template
   */
  async createSpreadsheet(title = null) {
    if (!await this.isAuthenticated()) {
      throw new Error('Não autenticado');
    }

    const spreadsheetTitle = title || `Rastreador de Imóveis - ${new Date().toLocaleDateString('pt-BR')}`;

    const requestBody = {
      properties: {
        title: spreadsheetTitle,
        locale: 'pt_BR',
        timeZone: 'America/Sao_Paulo'
      },
      sheets: [{
        properties: {
          title: 'Imóveis',
          gridProperties: {
            rowCount: 1000,
            columnCount: 18,
            frozenRowCount: 1
          }
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Data' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'URL' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Endereço' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Bairro' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Cidade' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Estado' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'CEP' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Preço' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Quartos' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Banheiros' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Área (m²)' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Tipo' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Condomínio' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'IPTU' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Ano' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Observações' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Tags' }, userEnteredFormat: { textFormat: { bold: true } } },
              { userEnteredValue: { stringValue: 'Status' }, userEnteredFormat: { textFormat: { bold: true } } }
            ]
          }]
        }]
      }]
    };

    try {
      const response = await fetch(this.API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.spreadsheetId = data.spreadsheetId;

      // Store spreadsheet ID
      await chrome.storage.sync.set({
        spreadsheetId: data.spreadsheetId,
        spreadsheetTitle: spreadsheetTitle
      });

      return {
        success: true,
        spreadsheetId: data.spreadsheetId,
        spreadsheetUrl: data.spreadsheetUrl
      };

    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw error;
    }
  }

  /**
   * List user's spreadsheets
   */
  async listSpreadsheets() {
    if (!await this.isAuthenticated()) {
      throw new Error('Não autenticado');
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&orderBy=modifiedTime desc&pageSize=20',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.files || [];

    } catch (error) {
      console.error('Error listing spreadsheets:', error);
      throw error;
    }
  }

  /**
   * Append property data to spreadsheet
   */
  async appendProperty(propertyData, spreadsheetId = null) {
    if (!await this.isAuthenticated()) {
      throw new Error('Não autenticado');
    }

    const sheetId = spreadsheetId || this.spreadsheetId;

    if (!sheetId) {
      throw new Error('Nenhuma planilha selecionada');
    }

    // Format property data as row
    const row = [
      propertyData.dateSaved || '',
      propertyData.url || '',
      propertyData.address || '',
      propertyData.neighborhood || '',
      propertyData.city || '',
      propertyData.state || '',
      propertyData.cep || '',
      propertyData.price || '',
      propertyData.bedrooms || '',
      propertyData.bathrooms || '',
      propertyData.squareMeters || '',
      propertyData.propertyType || '',
      propertyData.condominiumFee || '',
      propertyData.iptu || '',
      propertyData.yearBuilt || '',
      propertyData.notes || '',
      propertyData.tags || '',
      propertyData.status || 'Interessado'
    ];

    try {
      const response = await fetch(
        `${this.API_BASE}/${sheetId}/values/Imóveis!A:R:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [row]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        updatedRange: data.updates.updatedRange,
        updatedRows: data.updates.updatedRows
      };

    } catch (error) {
      console.error('Error appending property:', error);
      throw error;
    }
  }

  /**
   * Check if property URL already exists (duplicate detection)
   */
  async checkDuplicate(url, spreadsheetId = null) {
    if (!await this.isAuthenticated()) {
      throw new Error('Não autenticado');
    }

    const sheetId = spreadsheetId || this.spreadsheetId;

    if (!sheetId) {
      return { isDuplicate: false };
    }

    try {
      // Get URL column (B column)
      const response = await fetch(
        `${this.API_BASE}/${sheetId}/values/Imóveis!B:B`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const urls = data.values || [];

      // Check if URL exists
      for (let i = 1; i < urls.length; i++) { // Start at 1 to skip header
        if (urls[i][0] === url) {
          // Get the date from column A for this row
          const dateResponse = await fetch(
            `${this.API_BASE}/${sheetId}/values/Imóveis!A${i + 1}`,
            {
              headers: {
                'Authorization': `Bearer ${this.accessToken}`
              }
            }
          );

          const dateData = await dateResponse.json();
          const saveDate = dateData.values?.[0]?.[0] || 'data desconhecida';

          return {
            isDuplicate: true,
            saveDate: saveDate,
            rowNumber: i + 1
          };
        }
      }

      return { isDuplicate: false };

    } catch (error) {
      console.error('Error checking duplicate:', error);
      // Don't block save if duplicate check fails
      return { isDuplicate: false };
    }
  }

  /**
   * Get spreadsheet info
   */
  async getSpreadsheetInfo(spreadsheetId) {
    if (!await this.isAuthenticated()) {
      throw new Error('Não autenticado');
    }

    try {
      const response = await fetch(
        `${this.API_BASE}/${spreadsheetId}?fields=properties`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.properties;

    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      throw error;
    }
  }
}

// Make available for import/export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleSheetsAPI;
}
