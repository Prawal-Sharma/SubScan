import { Shield, FileSearch, TrendingUp, Lock } from 'lucide-react';

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Lock className="w-4 h-4" />
            100% Private & Secure
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
            Find Hidden
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Subscriptions</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your bank statements and instantly discover recurring charges. 
            All processing happens in your browser - your data never leaves your device.
          </p>
          
          <div className="flex flex-wrap gap-8 justify-center mb-12">
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-medium">Bank-Grade Privacy</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <FileSearch className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Smart Detection</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Save Money</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}