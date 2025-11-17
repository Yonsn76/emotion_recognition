import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const HomeNavbar: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-red-900/80 backdrop-blur-sm border-b border-red-800 fixed top-0 left-0 right-0 z-[99999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center" onClick={closeMobileMenu}>
              <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="ml-2 text-white font-bold text-lg hidden sm:block">EmotionAI</span>
              <span className="ml-2 text-white font-bold text-sm sm:hidden">EA</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>
            
            <Link
              to="/sessions"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                isActive('/sessions') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Classroom
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>

            <Link
              to="/reports"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/reports') 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Reports
            </Link>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="text-white text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200">
              Create Account
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-300 hover:text-white p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isMobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800/90 backdrop-blur-sm rounded-lg mt-2 border border-gray-700">
              <Link
                to="/"
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/') 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              
              <Link
                to="/sessions"
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/sessions') 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={closeMobileMenu}
              >
                Classroom
              </Link>

              <Link
                to="/reports"
                className={`block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                  isActive('/reports') 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={closeMobileMenu}
              >
                Reports
              </Link>

              {/* Mobile User Menu */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between px-4 py-3">
                  <button className="text-white text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200">
                    Create Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default HomeNavbar;
