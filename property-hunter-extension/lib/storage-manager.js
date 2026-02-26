// Storage Manager for extension data

class StorageManager {
  /**
   * Save authentication data
   */
  static async saveAuth(authData) {
    return await chrome.storage.sync.set({
      googleAuth: {
        token: authData.token,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Get authentication data
   */
  static async getAuth() {
    const result = await chrome.storage.sync.get(['googleAuth']);
    return result.googleAuth || null;
  }

  /**
   * Clear authentication data
   */
  static async clearAuth() {
    return await chrome.storage.sync.remove('googleAuth');
  }

  /**
   * Save spreadsheet ID
   */
  static async saveSpreadsheet(spreadsheetId, title) {
    return await chrome.storage.sync.set({
      spreadsheetId: spreadsheetId,
      spreadsheetTitle: title,
      spreadsheetTimestamp: Date.now()
    });
  }

  /**
   * Get spreadsheet info
   */
  static async getSpreadsheet() {
    const result = await chrome.storage.sync.get(['spreadsheetId', 'spreadsheetTitle']);
    return {
      id: result.spreadsheetId || null,
      title: result.spreadsheetTitle || null
    };
  }

  /**
   * Save to offline queue
   */
  static async addToQueue(propertyData) {
    const result = await chrome.storage.local.get(['offlineQueue']);
    const queue = result.offlineQueue || [];

    queue.push({
      data: propertyData,
      timestamp: Date.now(),
      id: Date.now().toString()
    });

    await chrome.storage.local.set({ offlineQueue: queue });
    return queue.length;
  }

  /**
   * Get offline queue
   */
  static async getQueue() {
    const result = await chrome.storage.local.get(['offlineQueue']);
    return result.offlineQueue || [];
  }

  /**
   * Remove item from queue
   */
  static async removeFromQueue(itemId) {
    const result = await chrome.storage.local.get(['offlineQueue']);
    const queue = result.offlineQueue || [];

    const filteredQueue = queue.filter(item => item.id !== itemId);
    await chrome.storage.local.set({ offlineQueue: filteredQueue });

    return filteredQueue.length;
  }

  /**
   * Clear offline queue
   */
  static async clearQueue() {
    return await chrome.storage.local.set({ offlineQueue: [] });
  }

  /**
   * Save user preferences
   */
  static async savePreferences(preferences) {
    return await chrome.storage.sync.set({ preferences: preferences });
  }

  /**
   * Get user preferences
   */
  static async getPreferences() {
    const result = await chrome.storage.sync.get(['preferences']);
    return result.preferences || {
      autoClose: true,
      autoCloseDelay: 5000,
      showDuplicateWarning: true,
      defaultStatus: 'Interessado'
    };
  }

  /**
   * Check if online
   */
  static isOnline() {
    return navigator.onLine;
  }

  /**
   * Get storage usage stats
   */
  static async getUsageStats() {
    const syncData = await chrome.storage.sync.get(null);
    const localData = await chrome.storage.local.get(null);

    return {
      syncKeys: Object.keys(syncData).length,
      localKeys: Object.keys(localData).length,
      queueSize: (localData.offlineQueue || []).length
    };
  }
}

// Make available for import
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
