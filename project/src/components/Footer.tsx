import React from 'react';
import { Server, Mail, MessageCircle, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="backdrop-blur-xl bg-white/5 border-t border-white/20 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-2xl shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">SatisfactoryHost</h3>
                <p className="text-white/70 text-sm">Professional Server Hosting</p>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              The most reliable and user-friendly platform for hosting Satisfactory servers. 
              Built by gamers, for gamers.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Server Configurator</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Pricing Plans</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Performance Monitoring</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Mod Support</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">API Access</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Documentation</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Quick Start Guide</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Community Forum</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Contact Support</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Status Page</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Blog</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Careers</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="text-white/70 hover:text-white transition-colors text-sm">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Contact & Social */}
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <a href="#" className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <Mail className="w-4 h-4" />
                <span className="text-sm">support@satisfactoryhost.com</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">Discord</span>
              </a>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-white/70">
              <span>© {currentYear} SatisfactoryHost. All rights reserved.</span>
              <div className="flex items-center space-x-1 backdrop-blur-xl bg-white/5 px-3 py-1 rounded-full border border-white/10">
                <Shield className="w-4 h-4 text-green-400" />
                <span>SOC 2 Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};