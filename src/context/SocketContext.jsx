import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();
const socket = io("http://localhost:5000"); // Replace with backend URL

export const SocketProvider = ({ children }) => {
  const [user, setUser] = useState(null); // for tutor or guest

  useEffect(() => {
    console.log("Socket connected:", socket.id);
  }, []);

  return (
    <SocketContext.Provider value={{ socket, user, setUser }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);