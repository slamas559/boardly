// StateContext.js
import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

const StateContext = createContext();

export const StateProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
      const fetchUserRole = async () => {
        let authentication = false;
        try {
          const res = await api.get('/auth/check-auth');
          setIsAuthenticated(true);
          authentication = true;
        } catch (err) {
          setIsAuthenticated(false);
          authentication = false;
        }
  
      };
      fetchUserRole();
    }, []);
  

  return (
    <StateContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </StateContext.Provider>
  );
}

export default StateContext;
