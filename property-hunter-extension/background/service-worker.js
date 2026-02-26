// Background service worker for Property Hunter Extension

// Import API classes (note: in service worker, we need to import differently)
importScripts('../lib/google-sheets-api.js', '../lib/storage-manager.js');

const sheetsAPI = new GoogleSheetsAPI();

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);

  switch (request.action) {
    case 'authenticate':
      handleAuthentication(sendResponse);
      return true; // Will respond asynchronously

    case 'saveProperty':
      handleSaveProperty(request.data, request.spreadsheetId, sendResponse);
      return true;

    case 'checkDuplicate':
      handleCheckDuplicate(request.url, request.spreadsheetId, sendResponse);
      return true;

    case 'createSpreadsheet':
      handleCreateSpreadsheet(request.title, sendResponse);
      return true;

    case 'listSpreadsheets':
      handleListSpreadsheets(sendResponse);
      return true;

    case 'propertyPageDetected':
      handlePropertyPageDetected(sender.tab, request.site);
      break;

    default:
      console.warn('Unknown action:', request.action);
  }
});

/**
 * Handle Google authentication
 */
async function handleAuthentication(sendResponse) {
  try {
    const authResult = await sheetsAPI.authenticate();

    if (!authResult.success) {
      sendResponse({
        success: false,
        error: authResult.error
      });
      return;
    }

    // Check if user has a spreadsheet configured
    const spreadsheet = await StorageManager.getSpreadsheet();

    if (!spreadsheet.id) {
      // Create a new spreadsheet
      const createResult = await sheetsAPI.createSpreadsheet();

      if (createResult.success) {
        sendResponse({
          success: true,
          spreadsheetId: createResult.spreadsheetId,
          spreadsheetUrl: createResult.spreadsheetUrl
        });
      } else {
        sendResponse({
          success: false,
          error: 'Falha ao criar planilha'
        });
      }
    } else {
      sendResponse({
        success: true,
        spreadsheetId: spreadsheet.id
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle saving property to Google Sheets
 */
async function handleSaveProperty(propertyData, spreadsheetId, sendResponse) {
  try {
    // Check if online
    if (!navigator.onLine) {
      // Add to offline queue
      await StorageManager.addToQueue(propertyData);
      sendResponse({
        success: true,
        offline: true,
        message: 'Salvo na fila offline. Será sincronizado quando conectar.'
      });
      return;
    }

    // Save to Google Sheets
    const result = await sheetsAPI.appendProperty(propertyData, spreadsheetId);

    if (result.success) {
      sendResponse({
        success: true,
        updatedRange: result.updatedRange,
        updatedRows: result.updatedRows
      });

      // Try to process offline queue
      processOfflineQueue();

    } else {
      throw new Error('Falha ao salvar na planilha');
    }

  } catch (error) {
    console.error('Save property error:', error);

    // If it's an auth error, try to re-authenticate
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      sendResponse({
        success: false,
        error: 'Sessão expirada. Por favor, reconecte sua conta Google.',
        needsAuth: true
      });
    } else {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
}

/**
 * Check for duplicate property
 */
async function handleCheckDuplicate(url, spreadsheetId, sendResponse) {
  try {
    const result = await sheetsAPI.checkDuplicate(url, spreadsheetId);
    sendResponse(result);

  } catch (error) {
    console.error('Duplicate check error:', error);
    sendResponse({
      isDuplicate: false,
      error: error.message
    });
  }
}

/**
 * Create new spreadsheet
 */
async function handleCreateSpreadsheet(title, sendResponse) {
  try {
    const result = await sheetsAPI.createSpreadsheet(title);
    sendResponse(result);

  } catch (error) {
    console.error('Create spreadsheet error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * List user's spreadsheets
 */
async function handleListSpreadsheets(sendResponse) {
  try {
    const spreadsheets = await sheetsAPI.listSpreadsheets();
    sendResponse({
      success: true,
      spreadsheets: spreadsheets
    });

  } catch (error) {
    console.error('List spreadsheets error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle property page detection
 */
function handlePropertyPageDetected(tab, siteName) {
  // Update extension icon badge to show we're on a property page
  chrome.action.setBadgeText({
    text: '✓',
    tabId: tab.id
  });

  chrome.action.setBadgeBackgroundColor({
    color: '#10b981', // Green
    tabId: tab.id
  });

  console.log(`Property page detected on ${siteName}`);
}

/**
 * Process offline queue when online
 */
async function processOfflineQueue() {
  try {
    const queue = await StorageManager.getQueue();

    if (queue.length === 0) return;

    console.log(`Processing ${queue.length} items from offline queue`);

    for (const item of queue) {
      try {
        const spreadsheet = await StorageManager.getSpreadsheet();
        await sheetsAPI.appendProperty(item.data, spreadsheet.id);

        // Remove from queue after successful save
        await StorageManager.removeFromQueue(item.id);

        console.log('Processed queue item:', item.id);

      } catch (error) {
        console.error('Failed to process queue item:', error);
        // Keep in queue and try again later
        break;
      }
    }

  } catch (error) {
    console.error('Error processing offline queue:', error);
  }
}

/**
 * Check for online status changes
 */
window.addEventListener('online', () => {
  console.log('Back online - processing queue');
  processOfflineQueue();
});

/**
 * Listen for tab updates to detect property pages
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL matches supported sites
    const supportedSites = [
      'zapimoveis.com.br',
      'vivareal.com.br',
      'imovelweb.com.br',
      'olx.com.br',
      'quintoandar.com.br',
      'loft.com.br'
    ];

    const isSupported = supportedSites.some(site => tab.url.includes(site));

    if (isSupported) {
      // Content script will detect if it's actually a property page
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  }
});

/**
 * Install event - show welcome message
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed - showing welcome page');

    chrome.tabs.create({
      url: 'options/settings.html?welcome=true'
    });
  }
});

/**
 * Keep service worker alive with periodic alarm
 */
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Service worker keepalive ping');
  }
});

console.log('Property Hunter service worker loaded');
