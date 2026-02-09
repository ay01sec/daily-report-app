// Re-export from context for backward compatibility
// All offline storage logic is now centralized in OfflineStorageContext
// to ensure a single NetInfo listener across the entire app

export { useOfflineStorage } from '../contexts/OfflineStorageContext';
