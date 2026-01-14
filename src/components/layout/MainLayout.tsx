import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  sidebar: ReactNode;
  topBar: ReactNode;
  children: ReactNode;
}

export function MainLayout({ sidebar, topBar, children }: MainLayoutProps) {
  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Sidebar - semi-transparent to show 3D background */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-64 h-full flex-shrink-0 border-r border-glass-border bg-deep-purple/70 backdrop-blur-md"
      >
        {sidebar}
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar - semi-transparent */}
        <motion.header
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
          className="h-14 flex-shrink-0 border-b border-glass-border bg-void-black/70 backdrop-blur-md"
        >
          {topBar}
        </motion.header>

        {/* Content - transparent background to show 3D scene */}
        <main className="flex-1 overflow-auto bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
