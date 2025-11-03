import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isLoggedIn } from "../utils/auth";
import api from "../utils/api";
import Footer from './Footer';
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
  FaSearch,
  FaMoneyBillWave,
  FaChartLine,
  FaReceipt,
  FaCreditCard,
  FaWallet,
  FaPiggyBank,
  FaCalculator,
  FaShieldAlt,
  FaHandHoldingUsd,
  FaClock,
  FaTrophy,
  FaHeart,
  FaBookOpen,
  FaBrain,
  FaLightbulb,
  FaMobileAlt,
  FaMicrophone
} from "react-icons/fa";
import whiteboardFace from '../assets/whiteboard-face.png';
import pdfFace from '../assets/pdf-face.png';
import boardlyIcon from '../assets/boardly-icon.svg';
import { useContext } from 'react';
import StateContext from '../context/StateContext';
import Header from './Header';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, userRole } = useContext(StateContext);
  
  const getHeroContent = () => {
    if (!isAuthenticated) {
      return {
        title: "Professional Online Learning Platform",
        subtitle: "Connect, teach, and learn through real-time collaboration tools, interactive whiteboards, and seamless document sharing. Create free sessions to help others or offer paid sessions to share your expertise.",
        primaryCTA: "Start Free Trial",
        primaryLink: "/register",
        secondaryCTA: "Sign In",
        secondaryLink: "/login"
      };
    }

    if (userRole === 'tutor') {
      return {
        title: "Ready to Teach?",
        subtitle: "Create engaging learning experiences with professional teaching tools. Choose to offer free sessions to help students or create paid sessions to monetize your expertise.",
        primaryCTA: "Create Session",
        primaryLink: "/create",
        secondaryCTA: "View Dashboard",
        secondaryLink: "/dashboard"
      };
    }

    return {
      title: "Ready to Learn?",
      subtitle: "Join interactive learning sessions, collaborate with instructors, and enhance your knowledge. Access both free community sessions and premium paid courses from expert tutors.",
      primaryCTA: "View Dashboard", 
      primaryLink: "/dashboard",
      secondaryCTA: "Browse Sessions",
      secondaryLink: "/dashboard"
    };
  };

  const heroContent = getHeroContent();
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <Header />
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

      {/* UI Showcase Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Experience Powerful Collaboration Tools
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our intuitive interface makes it easy to teach and learn in real-time
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Whiteboard Showcase */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <img 
                  src={whiteboardFace} 
                  alt="Interactive Whiteboard Interface"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Interactive Whiteboard
                </h3>
                <p className="text-gray-600 mb-6">
                  Draw, write, and collaborate in real-time. Perfect for explaining complex concepts, solving problems, and creating visual content together.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Real-time synchronized drawing
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Multiple colors and brush sizes
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Undo/Redo functionality
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Session recordings
                  </li>
                </ul>
              </div>
            </div>

            {/* PDF Showcase */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
                <img 
                  src={pdfFace} 
                  alt="PDF Collaboration Interface"
                  className="w-full h-auto object-cover"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  PDF Annotation & Sharing
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload and annotate documents with your students. Highlight, mark up, and discuss documents together in real-time.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Multi-page document support
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Annotation tools
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Synchronized page navigation
                  </li>
                  <li className="flex items-center text-gray-700">
                    <FaCheck className="w-5 h-5 text-gray-900 mr-3" />
                    Cloud storage integration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teaching & Learning Options Section */}
      <section className="py-24 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              Flexible Teaching & Learning Options
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you want to share knowledge freely or build a teaching business, 
              our platform supports both community learning and professional instruction.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Free Sessions Section */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <FaHeart className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-2xl font-bold">Community Learning</h3>
              </div>
              
              <div className="space-y-6">
                <p className="text-gray-300">
                  Share your knowledge with the community through free sessions. Help fellow learners, 
                  build your teaching reputation, and contribute to the learning ecosystem.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FaUsers className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Free Access for All</h4>
                      <p className="text-gray-300 text-sm">Create sessions accessible to any student without payment barriers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FaBookOpen className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Build Your Profile</h4>
                      <p className="text-gray-300 text-sm">Establish credibility and showcase your teaching skills to the community</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FaBrain className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Knowledge Sharing</h4>
                      <p className="text-gray-300 text-sm">Contribute to collaborative learning and help students discover new topics</p>
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="pt-6 border-t border-white/20">
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-md hover:bg-gray-100 transition-colors font-semibold"
                    >
                      <FaHeart className="w-4 h-4" />
                      Start Teaching for Free
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Paid Sessions Section */}
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg border border-white/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <FaLightbulb className="w-6 h-6 text-gray-900" />
                </div>
                <h3 className="text-2xl font-bold">Professional Teaching</h3>
              </div>
              
              <div className="space-y-6">
                <p className="text-gray-300">
                  Monetize your expertise by creating paid sessions. Set your own prices, 
                  track your progress, and build a sustainable teaching practice.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FaMoneyBillWave className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Set Your Own Prices</h4>
                      <p className="text-gray-300 text-sm">Choose what your expertise is worth and earn from your teaching sessions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FaChartLine className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Track Your Progress</h4>
                      <p className="text-gray-300 text-sm">Monitor your teaching activity and earnings through detailed analytics</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <FaShieldAlt className="w-5 h-5 text-white mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold mb-1">Secure Payments</h4>
                      <p className="text-gray-300 text-sm">Reliable payment processing with transparent fee structure</p>
                    </div>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div className="pt-6 border-t border-white/20">
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-md hover:bg-gray-100 transition-colors font-semibold"
                    >
                      <FaLightbulb className="w-4 h-4" />
                      Start Professional Teaching
                    </Link>
                  </div>
                )}
              </div>
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
                <FaMicrophone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                AI Live Voice Captioning
              </h3>
              <p className="text-gray-600 mb-6">
                Experience real-time voice captioning during your sessions, making it easier to follow along and participate.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  AI voice transcription for all
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Supports multiple languages
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Real-time transcription
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <FaMobileAlt className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Mobile Friendly Collaboration
              </h3>
              <p className="text-gray-600 mb-6">
                Seamlessly collaborate on whiteboards and documents from any device. 
                Our platform is optimized for both desktop and mobile.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Cross-device compatibility
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Touch-friendly interface
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Full feature set on mobile
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center mb-6">
                <FaSearch className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Session Discovery & Management
              </h3>
              <p className="text-gray-600 mb-6">
                Easily find learning opportunities or manage your teaching sessions. 
                Access both free community sessions and premium courses.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Browse free & paid sessions
                </li>
                <li className="flex items-center text-gray-600">
                  <FaCheck className="w-4 h-4 text-gray-400 mr-3" />
                  Simple payment tracking
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
                <h3 className="text-xl font-semibold text-gray-900">Start Teaching or Learning</h3>
              </div>
              <p className="text-gray-600 pl-14">
                Instructors can create free or paid sessions while students discover and 
                join learning opportunities that match their interests.
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
                Learn together and achieve your educational goals.
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
            Ready to Start Learning or Teaching?
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of instructors and students who use our platform for 
            collaborative learning experiences. Choose your path: share knowledge freely or build your teaching business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              userRole === 'tutor' && (
                <>
                  <Link
                    to="/create"
                    className="bg-gray-900 text-white px-8 py-4 rounded-md hover:bg-gray-800 transition-colors font-semibold text-lg"
                  >
                    Create Your First Session
                  </Link>
                  <Link
                    to="/dashboard"
                    className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-md hover:border-gray-400 hover:text-gray-900 transition-colors font-semibold text-lg"
                  >
                    View Dashboard
                  </Link>
                </>
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
      <Footer userRole={userRole} isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default Home;