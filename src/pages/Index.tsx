
import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import SegmentEditor from '@/components/SegmentEditor';

const Index = () => {
  const isMobile = useIsMobile();
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);

  const MobileLayout = () => {
    return (
      <>
        <div className="sticky top-0 z-20 w-full backdrop-blur-md bg-black/40 border-b border-white/10 p-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium gradient-text">GlowControl</h1>
            
            <Drawer open={isControlPanelOpen} onOpenChange={setIsControlPanelOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-white/10">
                  {isControlPanelOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronUp className="h-5 w-5" />
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="glass-card p-2 max-h-[80vh] overflow-y-auto">
                <div className="mb-2 flex justify-between items-center">
                  <h2 className="text-lg font-medium gradient-text">Device Manager</h2>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={() => setIsControlPanelOpen(false)}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
                <div className="pb-4">
                  <ControlPanel />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
        
        <div className="w-full px-1 pb-4 pt-3">
          <SegmentEditor />
        </div>
      </>
    );
  };

  const DesktopLayout = () => {
    return (
      <>
        <ControlPanel />
        <div className="w-full max-w-5xl mx-auto px-4 pb-8">
          <SegmentEditor />
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-purple-800 to-blue-900">
      <div className="absolute top-[-10%] right-0 w-[80%] h-[500px] rounded-3xl opacity-50 bg-indigo-600/30 blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-0 w-[80%] h-[500px] rounded-3xl opacity-30 bg-cyan-500/30 blur-[100px] -z-10" />
      
      <WLEDProvider>
        {isMobile ? <MobileLayout /> : <DesktopLayout />}
      </WLEDProvider>
    </div>
  );
};

export default Index;
