import { Upload, Search, Download } from 'lucide-react';

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload Statements',
      description: 'Drag and drop your PDF bank or credit card statements. Files are processed locally.',
      color: 'blue',
    },
    {
      icon: Search,
      title: 'Automatic Detection',
      description: 'Our AI analyzes transaction patterns to identify recurring subscriptions and charges.',
      color: 'purple',
    },
    {
      icon: Download,
      title: 'Export Results',
      description: 'Review detected subscriptions and export to CSV for budgeting or cancellation.',
      color: 'green',
    },
  ];
  
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600">Three simple steps to uncover your subscriptions</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              purple: 'bg-purple-100 text-purple-600',
              green: 'bg-green-100 text-green-600',
            };
            
            return (
              <div key={index} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent"></div>
                )}
                
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl ${colorClasses[step.color as keyof typeof colorClasses]} mb-4`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-400">Step {index + 1}</span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}