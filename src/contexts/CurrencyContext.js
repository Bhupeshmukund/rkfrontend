import React, { createContext, useContext, useState, useEffect } from 'react';
import { detectUserCountry, fetchUSDToINR } from '../utils/currency';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD'); // Default to USD
  const [exchangeRate, setExchangeRate] = useState(83); // Default fallback rate
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState(null);

  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        setLoading(true);
        
        // Fetch user country and exchange rate in parallel
        const [country, rate] = await Promise.all([
          detectUserCountry(),
          fetchUSDToINR()
        ]);
        
        setUserCountry(country);
        setExchangeRate(rate);
        
        // Set currency based on country
        if (country === 'IN') {
          setCurrency('INR');
        } else {
          setCurrency('USD');
        }
      } catch (error) {
        console.error('Error initializing currency:', error);
        // Default to USD on error
        setCurrency('USD');
      } finally {
        setLoading(false);
      }
    };

    initializeCurrency();
  }, []);

  const value = {
    currency,
    exchangeRate,
    loading,
    userCountry,
    setCurrency // Allow manual override if needed
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
