import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bluetooth, Plus, Power, Trash2, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadConfiguration, saveConfiguration, deleteConfiguration } from '@/services/configService';
import { toast } from 'sonner';
import mqttService from '@/services/mqttService';

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
    deviceInfo
  } = useWLED();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceClientId, setNewDeviceClientId] = useState('');
  const [devicesWithConfig, setDevicesWithConfig] = useState<Record<string, boolean>>({});
  const [showMqttConnect, setShowMqttConnect] = useState(false);

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
    if (newDeviceName && newDeviceClientId) {
      addDevice(newDeviceName, newDeviceClientId);
      setNewDeviceName('');
      setNewDeviceClientId('');
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
      
      toast.success('Configuration saved successfully');
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
  
  const handleConnectMqtt = async () => {
    if (!newDeviceClientId) {
      toast.error('Please enter a client ID');
      return;
    }
    
    const connected = await mqttService.connect(undefined, newDeviceClientId);
    if (connected) {
      toast.success(`Connected to MQTT broker with client ID: ${newDeviceClientId}`);
      
      // Subscribe to client_id/api/# topics
      mqttService.subscribe(`${newDeviceClientId}/api/#`, (message) => {
        console.log('Received message:', message);
        // Handle message as needed
      });
    }
  };
  
  const handlePublishTest = () => {
    if (mqttService.isConnected()) {
      mqttService.publishToApi({
        action: 'test',
        timestamp: new Date().toISOString(),
        data: {
          test: true
        }
      });
      toast.success('Test message published');
    } else {
      toast.error('Not connected to MQTT broker');
    }
  };

  return (
    <div className={cn("glass-card", className)}>
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/70">Devices</h2>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0"
            onClick={() => setShowMqttConnect(!showMqttConnect)}
            title="MQTT Settings"
          >
            <Bluetooth size={16} />
            <span className="sr-only">MQTT Settings</span>
          </Button>
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
      </div>

      {showMqttConnect && (
        <div className="p-4 pt-0">
          <div className="flex flex-col space-y-2 glass p-3 rounded-lg animate-fade-in">
            <Input
              value={newDeviceClientId}
              onChange={(e) => setNewDeviceClientId(e.target.value)}
              placeholder="Client ID"
              className="glass-input h-8 text-sm"
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleConnectMqtt} 
                size="sm" 
                className="w-full h-8"
              >
                Connect
              </Button>
              {mqttService.isConnected() && (
                <Button 
                  onClick={handlePublishTest} 
                  size="sm" 
                  variant="outline" 
                  className="w-full h-8"
                >
                  Test Publish
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
              value={newDeviceClientId}
              onChange={(e) => setNewDeviceClientId(e.target.value)}
              placeholder="Client ID"
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
                        title="Save configuration"
                        onClick={() => handleSaveDeviceConfig(device.id, device.ipAddress)}
                      >
                        <Save size={15} className="text-cyan-300" />
                        <span className="sr-only">Save Config</span>
                      </Button>
                      
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
