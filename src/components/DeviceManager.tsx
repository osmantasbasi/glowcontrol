
import React, { useState, useEffect, useRef } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bluetooth, Plus, Power, Trash2, Save, RotateCcw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadConfiguration, saveConfiguration, deleteConfiguration, loadConfigurationFromFile } from '@/services/configService';
import { toast } from 'sonner';

interface DeviceManagerProps {
  className?: string;
}

const DeviceManager: React.FC<DeviceManagerProps> = ({ className }) => {
  const { 
    devices, 
    activeDevice, 
    addDevice, 
    removeDevice, 
    setActiveDevice,
    togglePower,
    deviceState,
    deviceInfo,
    applyConfiguration
  } = useWLED();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIp, setNewDeviceIp] = useState('');
  const [devicesWithConfig, setDevicesWithConfig] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check which devices have saved configurations
  useEffect(() => {
    const checkSavedConfigs = () => {
      const configs: Record<string, boolean> = {};
      
      devices.forEach(device => {
        const savedConfig = loadConfiguration(device.ipAddress);
        configs[device.id] = !!savedConfig;
      });
      
      setDevicesWithConfig(configs);
    };
    
    checkSavedConfigs();
  }, [devices]);

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDeviceName && newDeviceIp) {
      addDevice(newDeviceName, newDeviceIp);
      setNewDeviceName('');
      setNewDeviceIp('');
      setShowAddForm(false);
    }
  };

  const handleSaveDeviceConfig = (deviceId: string, ipAddress: string) => {
    if (deviceState && deviceInfo) {
      saveConfiguration(ipAddress, {
        segments: deviceState.segments || [],
        deviceState,
        deviceInfo
      });
      
      // Update the devices with config state
      setDevicesWithConfig(prev => ({
        ...prev,
        [deviceId]: true
      }));
      
      toast.success('Configuration saved to file successfully');
    } else {
      toast.error('No device state to save');
    }
  };

  const handleResetDeviceConfig = (deviceId: string, ipAddress: string) => {
    deleteConfiguration(ipAddress);
    
    // Update the devices with config state
    setDevicesWithConfig(prev => ({
      ...prev,
      [deviceId]: false
    }));
    
    toast.success('Configuration reset successfully');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeDevice) return;
    
    try {
      const config = await loadConfigurationFromFile(files[0]);
      
      // Apply the loaded configuration
      if (config) {
        // Save to localStorage first
        saveConfiguration(activeDevice.ipAddress, config);
        
        // Apply to the device
        if (applyConfiguration) {
          applyConfiguration(config);
          toast.success('Configuration loaded and applied successfully');
        }
        
        // Update UI state
        setDevicesWithConfig(prev => ({
          ...prev,
          [activeDevice.id]: true
        }));
      }
    } catch (error) {
      console.error('Error loading configuration from file:', error);
      toast.error('Failed to load configuration from file');
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("glass-card", className)}>
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/70">Devices</h2>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} />
          <span className="sr-only">Add Device</span>
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddDevice} className="p-4 pt-0">
          <div className="flex flex-col space-y-2 glass p-3 rounded-lg animate-fade-in">
            <Input
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="Device Name"
              className="glass-input h-8 text-sm"
            />
            <Input
              value={newDeviceIp}
              onChange={(e) => setNewDeviceIp(e.target.value)}
              placeholder="IP Address"
              className="glass-input h-8 text-sm"
            />
            <div className="flex space-x-2">
              <Button 
                type="submit" 
                size="sm" 
                className="w-full h-8"
              >
                Add
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full h-8"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="px-4 pb-4">
        {devices.length === 0 ? (
          <div className="text-sm text-white/50 py-2">
            No devices added. Add a WLED device to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map((device) => (
              <div 
                key={device.id} 
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all",
                  device.id === activeDevice?.id 
                    ? "glass bg-white/10" 
                    : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className={cn(
                      "h-2 w-2 rounded-full",
                      device.connected ? "bg-green-500" : "bg-red-500"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">{device.name}</span>
                      {devicesWithConfig[device.id] && (
                        <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-400" title="Has saved configuration" />
                      )}
                    </div>
                    <span className="text-xs text-white/50">{device.ipAddress}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {device.id === activeDevice?.id && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 save-button"
                        title="Save configuration to file"
                        onClick={() => handleSaveDeviceConfig(device.id, device.ipAddress)}
                      >
                        <Save size={15} className="text-cyan-300" />
                        <span className="sr-only">Save Config</span>
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 upload-button"
                        title="Load configuration from file"
                        onClick={triggerFileUpload}
                      >
                        <Upload size={15} className="text-indigo-300" />
                        <span className="sr-only">Upload Config</span>
                      </Button>
                      
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".json"
                        className="hidden" 
                      />
                      
                      {devicesWithConfig[device.id] && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          title="Reset configuration"
                          onClick={() => handleResetDeviceConfig(device.id, device.ipAddress)}
                        >
                          <RotateCcw size={15} className="text-amber-300" />
                          <span className="sr-only">Reset Config</span>
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => togglePower()}
                      >
                        <Power 
                          size={15}
                          className={cn(
                            "transition-colors",
                            deviceState?.on ? "text-white" : "text-white/40"
                          )}
                        />
                        <span className="sr-only">Toggle Power</span>
                      </Button>
                    </>
                  )}
                  
                  {device.id !== activeDevice?.id && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => setActiveDevice(device.id)}
                    >
                      <Bluetooth size={15} />
                      <span className="sr-only">Connect</span>
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                    onClick={() => removeDevice(device.id)}
                  >
                    <Trash2 size={15} />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceManager;
