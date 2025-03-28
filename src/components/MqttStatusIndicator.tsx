
import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudLightning } from 'lucide-react';
import { MqttConnectionStatus, onConnectionStatusChange } from '@/services/mqttClient';
import { cn } from '@/lib/utils';

interface MqttStatusIndicatorProps {
  className?: string;
}

const MqttStatusIndicator: React.FC<MqttStatusIndicatorProps> = ({ className }) => {
  const [status, setStatus] = useState<MqttConnectionStatus>(MqttConnectionStatus.DISCONNECTED);

  useEffect(() => {
    // Register for MQTT connection status updates
    const unsubscribe = onConnectionStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case MqttConnectionStatus.CONNECTED:
        return <Cloud size={16} className="text-green-400" />;
      case MqttConnectionStatus.CONNECTING:
        return <Cloud size={16} className="text-amber-400 animate-pulse" />;
      case MqttConnectionStatus.ERROR:
        return <CloudLightning size={16} className="text-red-400" />;
      case MqttConnectionStatus.DISCONNECTED:
      default:
        return <CloudOff size={16} className="text-gray-400" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case MqttConnectionStatus.CONNECTED:
        return 'MQTT Connected';
      case MqttConnectionStatus.CONNECTING:
        return 'MQTT Connecting...';
      case MqttConnectionStatus.ERROR:
        return 'MQTT Connection Error';
      case MqttConnectionStatus.DISCONNECTED:
      default:
        return 'MQTT Disconnected';
    }
  };

  return (
    <div 
      className={cn("flex items-center", className)} 
      title={getStatusTitle()}
    >
      {getStatusIcon()}
    </div>
  );
};

export default MqttStatusIndicator;
