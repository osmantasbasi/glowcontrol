
import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import mqttService from '@/services/mqttService';

interface MqttStatusIndicatorProps {
  className?: string;
}

const MqttStatusIndicator: React.FC<MqttStatusIndicatorProps> = ({ className }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  useEffect(() => {
    // Initial check
    setIsConnected(mqttService.isConnected());
    setClientId(mqttService.getClientId());
    setConnectionError(mqttService.getLastError());
    
    // Set up status listener
    const statusListener = (connected: boolean) => {
      setIsConnected(connected);
      setClientId(mqttService.getClientId());
      setConnectionError(mqttService.getLastError());
    };
    
    mqttService.addConnectionStatusListener(statusListener);
    
    // Set up an interval to periodically check connection status
    const checkInterval = setInterval(() => {
      setIsConnected(mqttService.isConnected());
      setClientId(mqttService.getClientId());
      setConnectionError(mqttService.getLastError());
    }, 2000);
    
    return () => {
      clearInterval(checkInterval);
      mqttService.removeConnectionStatusListener(statusListener);
    };
  }, []);
  
  const handleReconnect = () => {
    mqttService.reconnect();
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-full transition-all duration-300 cursor-pointer",
            isConnected ? "bg-green-500/20" : "bg-red-500/20",
            className
          )}
          onClick={handleReconnect}
          >
            {isConnected ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            {clientId && isConnected && (
              <span className="text-xs font-medium">{clientId}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {isConnected 
              ? `Connected to MQTT broker (${clientId})` 
              : connectionError 
                ? `MQTT error: ${connectionError}. Click to reconnect.`
                : "Not connected to MQTT broker. Click to reconnect."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MqttStatusIndicator;
