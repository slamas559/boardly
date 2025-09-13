import React from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from "../utils/auth";
import {
  FaChalkboardTeacher,
  FaUsers,
  FaFilePdf,
  FaPenNib,
  FaRocket,
  FaGraduationCap,
  FaArrowRight,
  FaPlayCircle,
  FaUserPlus,
  FaSignInAlt
} from "react-icons/fa";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/30 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <FaGraduationCap className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Boardly
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              {isLoggedIn() ? (
                <>
                  <Link
                    to="/lobby"
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    My Rooms
                  </Link>
                  <Link
                    to="/create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Create Room
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Learning with
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {" "}Real-Time Collaboration
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Empower your teaching experience with interactive whiteboards, PDF annotations, 
              and seamless real-time collaboration for modern classrooms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isLoggedIn() ? (
                <Link
                  to="/create"
                  className="group bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold text-lg flex items-center gap-2"
                >
                  Start Teaching Now
                  <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="group bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold text-lg flex items-center gap-2"
                  >
                    Get Started Free
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="group border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl hover:border-blue-600 hover:text-blue-600 transition-all duration-300 font-semibold text-lg"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Hero Illustration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Modern Teaching
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful tools designed to make online teaching engaging and effective
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <FaChalkboardTeacher className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Whiteboard</h3>
              <p className="text-gray-600 mb-4">
                Draw, write, and collaborate in real-time with a powerful digital whiteboard.
                Perfect for explanations and brainstorming sessions.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Real-time drawing synchronization
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Multiple tools and colors
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                  Auto-save functionality
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <FaFilePdf className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">PDF Collaboration</h3>
              <p className="text-gray-600 mb-4">
                Upload and annotate PDF documents together. Highlight text, make notes, 
                and discuss content in real-time.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Multi-page PDF support
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Highlight and annotation tools
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-3"></div>
                  Synchronized page navigation
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <FaUsers className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Live Collaboration</h3>
              <p className="text-gray-600 mb-4">
                Work together with students in real-time. See changes instantly and 
                communicate effectively during sessions.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  Real-time updates
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  Multi-user support
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                  Session persistence
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes with our simple process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Account</h3>
              <p className="text-gray-600">
                Sign up as a tutor and set up your profile in seconds. 
                No credit card required to get started.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Room</h3>
              <p className="text-gray-600">
                Set up a virtual classroom with a unique code. 
                Choose between whiteboard or PDF-based sessions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Start Teaching</h3>
              <p className="text-gray-600">
                Share the room code with students and begin your interactive 
                teaching session immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Teaching?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of educators who are already using our platform to create 
            engaging and interactive learning experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn() ? (
              <Link
                to="/create"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-300 font-semibold text-lg"
              >
                Create Your First Room
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all duration-300 font-semibold text-lg"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:text-blue-600 transition-all duration-300 font-semibold text-lg"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <FaGraduationCap className="h-8 w-8 text-blue-400" />
              <span className="font-bold text-xl">Boardly</span>
            </div>
            <div className="flex space-x-6">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                Home
              </Link>
              {isLoggedIn() ? (
                <>
                  <Link to="/lobby" className="text-gray-400 hover:text-white transition-colors">
                    My Rooms
                  </Link>
                  <Link to="/create" className="text-gray-400 hover:text-white transition-colors">
                    Create Room
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                    Login
                  </Link>
                  <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Boardly. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default Home;