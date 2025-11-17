import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-purple-200 ${className}`}>
      <div className="pt-0">
        {children}
      </div>
    </div>
  );
};

export default Layout;
