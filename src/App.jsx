import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Room from "./pages/Room";
import { isLoggedIn } from "./utils/auth";
import Register from "./pages/Auth/Register";
import Login from "./pages/Auth/Login";
import './App.css'
import { pdfjs } from "react-pdf";
import Lobby from "./pages/Lobby";
import Dashboard from "./pages/DashBoard";
import Profile from "./pages/Profile";
import PaymentSuccess from "./components/payment/PaymentSuccess";
import BankAccountSetup from "./pages/BankAccountSetup";
import EmailVerification from "./pages/EmailVerificationComponents/EmailVerification";
import ProtectedRoute from "./pages/ProtectedRoutes";
import Contact from "./pages/Legal/Contact";
import Terms from "./pages/Legal/Terms";
import Privacy from "./pages/Legal/Privacy";
import Refund from "./pages/Legal/Refund";
import FAQ from "./pages/Legal/Faq";
import { StateProvider } from "./context/StateContext";


function App() {
  return (
    <StateProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={<ProtectedRoute><CreateRoom /></ProtectedRoute>} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/bank-setup" element={<ProtectedRoute><BankAccountSetup /></ProtectedRoute>} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        {/* legal routes can be added here */}
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/refund" element={<Refund />} />
      </Routes>
    </Router>
    </StateProvider>
  )
}

export default App
