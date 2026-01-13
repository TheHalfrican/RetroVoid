import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, topBar, children }: MainLayoutProps) {
  return (
    <div className="w-full h-full flex bg-void-black overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-64 h-full flex-shrink-0 border-r border-glass-border bg-deep-purple/50 backdrop-blur-sm"
      >
        {sidebar}
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <motion.header
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className="h-14 flex-shrink-0 border-b border-glass-border bg-void-black/80 backdrop-blur-sm"
        >
          {topBar}
        </motion.header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
