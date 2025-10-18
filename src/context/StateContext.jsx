// StateContext.js
import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

const StateContext = createContext();

export const StateProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

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
  
        if (authentication) {
          try {
            const res = await api.get("/auth/profile");
            setUserRole(res.data.role);
          } catch (err) {
            console.error("Failed to fetch user profile", err);
          }
        }
      };
      fetchUserRole();
    }, []);
  

  return (
    <StateContext.Provider value={{ isAuthenticated, setIsAuthenticated, userRole, setUserRole }}>
      {children}
    </StateContext.Provider>
  );
}

export default StateContext;