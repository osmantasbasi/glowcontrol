
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
  
  useEffect(() => {
    // Initial check
    setIsConnected(mqttService.isConnected());
    setClientId(mqttService.getClientId());
    
    // Set up an interval to periodically check connection status
    const checkInterval = setInterval(() => {
      setIsConnected(mqttService.isConnected());
      setClientId(mqttService.getClientId());
    }, 2000);
    
    return () => clearInterval(checkInterval);
  }, []);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-full transition-all duration-300",
            isConnected ? "bg-green-500/20" : "bg-red-500/20",
            className
          )}>
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
              : "Not connected to MQTT broker"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default MqttStatusIndicator;
