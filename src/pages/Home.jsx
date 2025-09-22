import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn, getToken } from "../utils/auth";
import api from "../utils/api";
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
  FaSignInAlt,
  FaCheck,
  FaSearch
} from "react-icons/fa";

const Home = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isLoggedIn()) {
        try {
          const res = await api.get("/auth/profile");
          setUserRole(res.data.role);
        } catch (err) {
          console.error("Failed to fetch user profile", err);
        }
      }
      setLoading(false);
    };
    
    fetchUserRole();
  }, []);

  const getHeroContent = () => {
    if (!isLoggedIn()) {
      return {
        title: "Professional Online Learning Platform",
        subtitle: "Whether you're teaching or learning, connect through real-time collaboration tools, interactive whiteboards, and seamless document sharing.",
        primaryCTA: "Start Free Trial",
        primaryLink: "/register",
        secondaryCTA: "Sign In",
        secondaryLink: "/login"
      };
    }

    if (userRole === 'tutor') {
      return {
        title: "Ready to Teach?",
        subtitle: "Create engaging learning experiences with your professional teaching tools and start your next session.",
        primaryCTA: "Create Session",
        primaryLink: "/create",
        secondaryCTA: "View Dashboard",
        secondaryLink: "/dashboard"
      };
    }

    return {
      title: "Ready to Learn?",
      subtitle: "Join interactive learning sessions, collaborate with instructors, and enhance your knowledge with professional teaching tools.",
      // primaryCTA: "Browse Sessions",
      // primaryLink: "/browse-sessions",
      primaryCTA: "View Dashboard", 
      primaryLink: "/dashboard"
    };
  };

  const heroContent = getHeroContent();
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <FaGraduationCap className="h-7 w-7 text-gray-900" />
              <span className="font-semibold text-xl text-gray-900">
                Boardly
              </span>
            </Link>
            
            <div className="flex items-center space-x-6">
              {isLoggedIn() ? (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    Dashboard
                  </Link>
                  {userRole === "tutor" && (
                    <Link
                      to="/create"
                      className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium"
                    >
                      New Room
                    </Link>
                    )}
                  
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium"
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
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-8 leading-tight">
              {heroContent.title}
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl">
              {heroContent.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to={heroContent.primaryLink}
                className="inline-flex items-center justify-center bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 transition-colors font-semibold text-lg"
              >
                {heroContent.primaryCTA}
                <FaArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                to={heroContent.secondaryLink}
                className="inline-flex items-center justify-center border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-md hover:border-gray-400 hover:text-gray-900 transition-colors font-semibold text-lg"
              >
                {heroContent.secondaryCTA}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Built for Modern Learning
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive tools for both instructors and students to create 
              and participate in professional online learning experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <FaChalkboardTeacher className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Interactive Whiteboard
              </h3>
              <p className="text-gray-600 mb-6">
                Advanced drawing tools with real-time synchronization across all participants. 
                Perfect for mathematical equations, diagrams, and visual explanations.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Real-time collaboration
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Professional drawing tools
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Auto-save functionality
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <FaFilePdf className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                PDF Collaboration
              </h3>
              <p className="text-gray-600 mb-6">
                Upload and annotate documents together with comprehensive markup tools. 
                Ideal for reviewing materials and collaborative document analysis.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Multi-page document support
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Advanced annotation tools
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Synchronized navigation
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <FaSearch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Session Discovery
              </h3>
              <p className="text-gray-600 mb-6">
                Students can easily find and join learning sessions. Browse available 
                sessions, view instructor profiles, and connect with the right learning opportunities.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Browse available sessions
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Instructor profiles & ratings
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Instant session access
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Simple Setup Process
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes with our streamlined onboarding process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-left">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Create Account</h3>
              </div>
              <p className="text-gray-600 pl-14">
                Choose your role as an instructor or student. Set up your profile 
                with your learning goals or teaching expertise in minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-left">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Start Learning</h3>
              </div>
              <p className="text-gray-600 pl-14">
                Instructors create interactive sessions while students discover and 
                join learning opportunities that match their interests and goals.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-left">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Collaborate & Learn</h3>
              </div>
              <p className="text-gray-600 pl-14">
                Engage in real-time collaboration with professional tools. 
                Learn together, share knowledge, and achieve your educational goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">50K+</div>
              <div className="text-gray-600">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">1M+</div>
              <div className="text-gray-600">Sessions Hosted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of instructors and students who use our platform for 
            professional online learning and collaborative educational experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn() ? (
              userRole === 'tutor' && (
                <Link
                  to="/create"
                  className="bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 transition-colors font-semibold text-lg"
                >
                  Create Your First Session
                </Link>
              )
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 transition-colors font-semibold text-lg"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-md hover:border-gray-400 hover:text-gray-900 transition-colors font-semibold text-lg"
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
              <FaGraduationCap className="h-7 w-7 text-white" />
              <span className="font-semibold text-xl">Boardly</span>
            </div>
            <div className="flex space-x-8">
              <Link to="/" className="text-gray-400 hover:text-white transition-colors">
                Home
              </Link>
              {isLoggedIn() ? (
                <>
                  <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  {userRole === 'tutor' && (
                    <Link to="/create" className="text-gray-400 hover:text-white transition-colors">
                      New Session
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                    Get Started
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
    </div>
  );
};

export default Home;