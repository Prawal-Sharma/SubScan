export function SupportedBanks() {
  const banks = [
    { name: 'Wells Fargo', status: 'active' },
    { name: 'Bank of America', status: 'coming' },
    { name: 'Chase', status: 'coming' },
    { name: 'Capital One', status: 'coming' },
    { name: 'Discover', status: 'coming' },
    { name: 'Citi', status: 'planned' },
    { name: 'US Bank', status: 'planned' },
    { name: 'PNC', status: 'planned' },
  ];
  
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Supported Banks</h2>
          <p className="text-gray-600">We're constantly adding support for more financial institutions</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {banks.map((bank) => (
            <div
              key={bank.name}
              className={`
                relative px-4 py-3 rounded-lg border text-center transition-all
                ${bank.status === 'active' 
                  ? 'bg-white border-green-200 shadow-sm' 
                  : bank.status === 'coming'
                  ? 'bg-white border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              <div className="font-medium text-gray-900">{bank.name}</div>
              {bank.status === 'active' && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                  Live
                </span>
              )}
              {bank.status === 'coming' && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                  Soon
                </span>
              )}
            </div>
          ))}
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't see your bank? Upload your statement anyway - we'll do our best to parse it!
        </p>
      </div>
    </div>
  );
}