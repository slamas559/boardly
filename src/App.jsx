import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Room from "./pages/Room";
import { isLoggedIn } from "./utils/auth";
import Register from "./pages/Register";
import Login from "./pages/Login";
import './App.css'
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create" element={isLoggedIn() ? <CreateRoom /> : <Login />} />
        <Route path="/room/:code" element={<Room />} />
      </Routes>
    </Router>
  )
}

export default App
