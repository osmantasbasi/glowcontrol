
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleCertificateUpload, setCertificates, connectMqtt } from '@/services/mqttService';
import { toast } from 'sonner';

interface CertificateFiles {
  ca?: string;
  cert?: string;
  key?: string;
}

const MqttCertificateUploader: React.FC = () => {
  const [files, setFiles] = useState<CertificateFiles>({});
  const [brokerAddress, setBrokerAddress] = useState('192.168.2.127');
  const [brokerPort, setBrokerPort] = useState(8883);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRefs = {
    ca: useRef<HTMLInputElement>(null),
    cert: useRef<HTMLInputElement>(null),
    key: useRef<HTMLInputElement>(null)
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'ca' | 'cert' | 'key') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await handleCertificateUpload(file, type);
      setFiles(prev => ({
        ...prev,
        [type]: content
      }));
      toast.success(`${type.toUpperCase()} file loaded`);
    } catch (error) {
      toast.error(`Failed to load ${type.toUpperCase()} file`);
      console.error(`Error loading ${type} file:`, error);
    }
  };
  
  const handleSaveAndConnect = () => {
    // Save certificates
    setCertificates(files.ca, files.cert, files.key);
    
    // Connect to MQTT broker
    connectMqtt(brokerAddress, brokerPort);
    
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          Configure MQTT Certificates
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>MQTT Secure Connection</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="broker">Broker Address</Label>
            <Input 
              id="broker" 
              value={brokerAddress} 
              onChange={(e) => setBrokerAddress(e.target.value)} 
              placeholder="192.168.2.127"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="port">Broker Port</Label>
            <Input 
              id="port" 
              type="number" 
              value={brokerPort} 
              onChange={(e) => setBrokerPort(Number(e.target.value))} 
              placeholder="8883"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="ca">CA Certificate</Label>
            <div className="flex gap-2">
              <Input 
                id="ca" 
                type="file" 
                ref={fileInputRefs.ca}
                onChange={(e) => handleFileChange(e, 'ca')} 
              />
              {files.ca && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    setFiles(prev => ({ ...prev, ca: undefined }));
                    if (fileInputRefs.ca.current) fileInputRefs.ca.current.value = '';
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="cert">Client Certificate</Label>
            <div className="flex gap-2">
              <Input 
                id="cert" 
                type="file" 
                ref={fileInputRefs.cert}
                onChange={(e) => handleFileChange(e, 'cert')} 
              />
              {files.cert && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    setFiles(prev => ({ ...prev, cert: undefined }));
                    if (fileInputRefs.cert.current) fileInputRefs.cert.current.value = '';
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="key">Client Key</Label>
            <div className="flex gap-2">
              <Input 
                id="key" 
                type="file" 
                ref={fileInputRefs.key}
                onChange={(e) => handleFileChange(e, 'key')} 
              />
              {files.key && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    setFiles(prev => ({ ...prev, key: undefined }));
                    if (fileInputRefs.key.current) fileInputRefs.key.current.value = '';
                  }}
                >
                  ✕
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAndConnect}>
            Save & Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MqttCertificateUploader;
