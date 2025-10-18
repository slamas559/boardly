import React from 'react'
import boardlyIcon from '../assets/boardly-icon.svg';
import StateContext from '../context/StateContext';
import { useContext } from 'react';
import { Link } from 'react-router-dom';


function Header() {
const { isAuthenticated, userRole } = useContext(StateContext);

return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
            <img src={boardlyIcon} alt="Boardly" className="h-7 w-7" />
            <span className="font-semibold text-xl text-gray-900">
                Boardly
            </span>
            </Link>
            
            <div className="flex items-center space-x-6">
            {isAuthenticated ? (
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
)
}

export default Header