import React from 'react';
import { Zap, ArrowRight, DollarSign, Users, TrendingUp } from 'lucide-react';

interface OptimizationCTAProps {
  potentialSavings: number;
  unusedLicenses: number;
  onOptimizeClick: () => void;
}

export const OptimizationCTA: React.FC<OptimizationCTAProps> = ({ 
  potentialSavings, 
  unusedLicenses, 
  onOptimizeClick 
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">License Optimization Opportunity</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-300" />
              <div>
                <p className="text-sm opacity-90">Potential Monthly Savings</p>
                <p className="text-2xl font-bold">${potentialSavings.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-yellow-300" />
              <div>
                <p className="text-sm opacity-90">Unused Licenses</p>
                <p className="text-2xl font-bold">{unusedLicenses}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-blue-300" />
              <div>
                <p className="text-sm opacity-90">Annual Savings</p>
                <p className="text-2xl font-bold">${(potentialSavings * 12).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <p className="text-lg opacity-90 mb-6">
            Our analysis shows significant opportunities to optimize your Salesforce license allocation. 
            Let us help you right-size your licenses and maximize ROI.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOptimizeClick}
              className="flex items-center space-x-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <span>Optimize My Licenses</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button className="flex items-center space-x-2 border border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              <span>Download Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};