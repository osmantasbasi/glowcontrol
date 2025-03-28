
interface SavedConfiguration {
  segments: any[];
  deviceState: any;
  deviceInfo: any;
}

export interface ConfigStorage {
  [clientId: string]: SavedConfiguration;
}

export const saveConfiguration = (clientId: string, configuration: SavedConfiguration): void => {
  try {
    // Get existing configurations
    const existingConfig = localStorage.getItem('wledConfigurations');
    const configs: ConfigStorage = existingConfig ? JSON.parse(existingConfig) : {};
    
    // Update the configuration for this client ID
    configs[clientId] = configuration;
    
    // Save back to localStorage
    localStorage.setItem('wledConfigurations', JSON.stringify(configs));
    console.log(`Configuration for ${clientId} saved successfully`);
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
};

export const loadConfiguration = (clientId: string): SavedConfiguration | null => {
  try {
    const existingConfig = localStorage.getItem('wledConfigurations');
    if (!existingConfig) return null;
    
    const configs: ConfigStorage = JSON.parse(existingConfig);
    return configs[clientId] || null;
  } catch (error) {
    console.error('Error loading configuration:', error);
    return null;
  }
};

export const deleteConfiguration = (clientId: string): void => {
  try {
    const existingConfig = localStorage.getItem('wledConfigurations');
    if (!existingConfig) return;
    
    const configs: ConfigStorage = JSON.parse(existingConfig);
    if (configs[clientId]) {
      delete configs[clientId];
      localStorage.setItem('wledConfigurations', JSON.stringify(configs));
      console.log(`Configuration for ${clientId} deleted successfully`);
    }
  } catch (error) {
    console.error('Error deleting configuration:', error);
  }
};
