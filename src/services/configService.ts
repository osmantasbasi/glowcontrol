
interface SavedConfiguration {
  segments: any[];
  deviceState: any;
  deviceInfo: any;
}

export interface ConfigStorage {
  [ipAddress: string]: SavedConfiguration;
}

export const saveConfiguration = (ipAddress: string, configuration: SavedConfiguration): void => {
  try {
    // Get existing configurations
    const existingConfig = localStorage.getItem('wledConfigurations');
    const configs: ConfigStorage = existingConfig ? JSON.parse(existingConfig) : {};
    
    // Update the configuration for this IP
    configs[ipAddress] = configuration;
    
    // Save back to localStorage
    localStorage.setItem('wledConfigurations', JSON.stringify(configs));
    
    // Create a blob and download it as a file
    const blob = new Blob([JSON.stringify(configuration, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wled-config-${ipAddress.replace(/\./g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`Configuration for ${ipAddress} saved successfully`);
  } catch (error) {
    console.error('Error saving configuration:', error);
  }
};

export const loadConfiguration = (ipAddress: string): SavedConfiguration | null => {
  try {
    const existingConfig = localStorage.getItem('wledConfigurations');
    if (!existingConfig) return null;
    
    const configs: ConfigStorage = JSON.parse(existingConfig);
    return configs[ipAddress] || null;
  } catch (error) {
    console.error('Error loading configuration:', error);
    return null;
  }
};

export const loadConfigurationFromFile = (file: File): Promise<SavedConfiguration> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        if (event.target?.result) {
          const config = JSON.parse(event.target.result as string);
          resolve(config);
        } else {
          reject(new Error('Failed to read file content'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};

export const deleteConfiguration = (ipAddress: string): void => {
  try {
    const existingConfig = localStorage.getItem('wledConfigurations');
    if (!existingConfig) return;
    
    const configs: ConfigStorage = JSON.parse(existingConfig);
    if (configs[ipAddress]) {
      delete configs[ipAddress];
      localStorage.setItem('wledConfigurations', JSON.stringify(configs));
      console.log(`Configuration for ${ipAddress} deleted successfully`);
    }
  } catch (error) {
    console.error('Error deleting configuration:', error);
  }
};
