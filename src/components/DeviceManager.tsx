
import React, { useState } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bluetooth, Plus, Power, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    deviceState
  } = useWLED();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceIp, setNewDeviceIp] = useState('');

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDeviceName && newDeviceIp) {
      addDevice(newDeviceName, newDeviceIp);
      setNewDeviceName('');
      setNewDeviceIp('');
      setShowAddForm(false);
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
                    <span className="text-sm font-medium">{device.name}</span>
                    <span className="text-xs text-white/50">{device.ipAddress}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1">
                  {device.id === activeDevice?.id && (
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
