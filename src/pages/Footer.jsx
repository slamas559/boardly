import { Mail, Linkedin, Twitter, Github } from 'lucide-react';
import boardlyIcon from '../assets/boardly-icon.svg';
import StateContext from '../context/StateContext';
import { useContext } from 'react';


const Footer = () => {
  const { isAuthenticated, userRole } = useContext(StateContext);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-16 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gray-700 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-gray-800 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <a href="/" className="flex items-center space-x-2 group w-fit">
              <img src={boardlyIcon} alt="Boardly" className="h-8 w-8 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Boardly
              </span>
            </a>
            <p className="text-gray-400 text-sm leading-relaxed">
              Empowering students and tutors through interactive learning experiences.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors p-2 hover:bg-gray-800 rounded-lg">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors p-2 hover:bg-gray-800 rounded-lg">
                <Linkedin size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors p-2 hover:bg-gray-800 rounded-lg">
                <Github size={18} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-white">Navigation</h3>
            <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">Home</a>
            {isAuthenticated ? (
              <>
                <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Dashboard
                </a>
                {userRole === 'tutor' && (
                  <a href="/create" className="text-gray-400 hover:text-white transition-colors text-sm">
                    New Session
                  </a>
                )}
              </>
            ) : (
              <>
                <a href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sign In
                </a>
                <a href="/register" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Get Started
                </a>
              </>
            )}
          </div>

          {/* Resources */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-white">Resources</h3>
            <a href="/faq" className="text-gray-400 hover:text-white transition-colors text-sm">FAQs</a>
            <a href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</a>
            <a href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms</a>
            <a href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy</a>
          </div>

          {/* Support */}
          <div className="flex flex-col space-y-4">
            <h3 className="font-semibold text-white">Support</h3>
            <a href="/refund" className="text-gray-400 hover:text-white transition-colors text-sm">Refund Policy</a>
            <a href="mailto:support@boardly.com" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center space-x-2">
              <Mail size={16} />
              <span>Get Help</span>
            </a>
            <p className="text-gray-500 text-xs pt-4">
              Have questions? We're here to help 24/7
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8"></div>

        {/* Bottom section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} Boardly. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 text-xs">
            <span className="text-gray-500">Made with <span className="text-red-500">❤️</span></span>
            <span className="text-gray-600">v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;