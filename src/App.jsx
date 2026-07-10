import { useState, useEffect, useContext } from 'react';
import Navigation from './components/Navigation';
import Overview from './components/Overview';
import Department from './components/Department';
import DataEntry from './components/DataEntry';
import { KpiContext } from './store/kpiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const { model } = useContext(KpiContext);

  useEffect(() => {
    // Artificial delay to show off a nice loading spinner
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="loading-container"
        >
          <Loader2 className="spinner" size={48} />
          <p>Loading Dashboard...</p>
        </motion.div>
      );
    }
    if (activeTab === 'overview') {
      return <Overview key="overview" />;
    }
    if (activeTab === 'data') {
      return <DataEntry key="data" />;
    }
    const dept = model.departments.find(d => d.id === activeTab);
    if (dept) {
      return <Department key={dept.id} department={dept} />;
    }
    return null;
  };

  return (
    <>
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}

export default AppContent;
