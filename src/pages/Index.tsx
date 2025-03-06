
import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';

const Index = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-purple-800 to-blue-900">
      <div className="absolute top-[-10%] right-0 w-[80%] h-[500px] rounded-3xl opacity-50 bg-indigo-600/30 blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-0 w-[80%] h-[500px] rounded-3xl opacity-30 bg-cyan-500/30 blur-[100px] -z-10" />
      
      <WLEDProvider>
        <ControlPanel />
      </WLEDProvider>
    </div>
  );
};

export default Index;
