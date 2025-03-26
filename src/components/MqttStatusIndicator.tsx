
import React, { useState, useEffect } from 'react';
import { getConnectionStatus, getClientId, registerCallbacks } from '@/services/mqttService';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const MqttStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState(getConnectionStatus());
  const [clientId, setClientId] = useState<string | undefined>(getClientId());
  
  useEffect(() => {
    // Register for status updates
    registerCallbacks({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        setClientId(getClientId());
      }
    });
  }, []);
  
  // Choose appropriate icon and color based on connection status
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return `Connected to MQTT broker${clientId ? ` (${clientId})` : ''}`;
      case 'connecting':
        return 'Connecting to MQTT broker...';
      case 'disconnected':
        return 'Disconnected from MQTT broker';
      case 'error':
        return 'Error connecting to MQTT broker';
      default:
        return 'MQTT Status Unknown';
    }
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-help">
            {getStatusIcon()}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-background border border-border">
          <p>{getStatusText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MqttStatusIndicator;
