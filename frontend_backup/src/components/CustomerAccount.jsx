import { createContext, useContext, useState, useEffect } from 'react';

const CustomerContext = createContext();

export const useCustomer = () => useContext(CustomerContext);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  
  useEffect(() => {
    // Check if customer is logged in
    const token = localStorage.getItem('customer_token');
    const customerInfo = localStorage.getItem('customer_info');
    
    if (token && customerInfo) {
      try {
        setCustomer(JSON.parse(customerInfo));
      } catch (e) {
        setCustomer(null);
      }
    } else {
      setCustomer(null);
    }
  }, []);

  const updateCustomer = (data) => {
    setCustomer(data);
    if (data) {
      localStorage.setItem('customer_info', JSON.stringify(data));
    } else {
      localStorage.removeItem('customer_info');
      localStorage.removeItem('customer_token');
    }
  };
  
  return (
    <CustomerContext.Provider value={{ customer, setCustomer: updateCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
}

// Dummy component for compatibility
export function CustomerAccountSidebar() {
  return null;
}
