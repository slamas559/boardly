import { BookOpen, AlertTriangle, Lock, Users, Zap, Gavel, CheckCircle2, XCircle } from 'lucide-react';
import Footer from '../Footer';
import Header from '../Header';

const Terms = () => {
  const sections = [
    {
      icon: BookOpen,
      title: 'Acceptance of Terms',
      description: 'When you use our platform',
      content: 'By accessing and using Boardly, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our platform. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of the updated terms.'
    },
    {
      icon: Users,
      title: 'User Conduct',
      description: 'How you must behave on our platform',
      content: 'You must not misuse or disrupt any class sessions, transmit harmful content, or violate intellectual property rights. This includes harassment, bullying, spam, or any illegal activities. Respect all users on the platform and follow the classroom guidelines set by tutors.'
    },
    {
      icon: Lock,
      title: 'Payment & Billing',
      description: 'How transactions are handled',
      content: 'All paid sessions are managed securely via third-party payment gateways. You are responsible for providing accurate billing information. Charges are non-refundable except as outlined in our Refund Policy. You agree to pay all charges incurred under your account.'
    },
    {
      icon: Gavel,
      title: 'Account Suspension',
      description: 'Policy violations and enforcement',
      content: 'Boardly reserves the right to suspend or terminate accounts for misconduct, non-compliance with our policies, or any illegal activities. We will attempt to notify you before suspension, but immediate action may be taken for serious violations.'
    }
  ];

  const dos = [
    'Engage respectfully with tutors and fellow students',
    'Follow all classroom rules and guidelines',
    'Protect your account credentials',
    'Report inappropriate behavior',
    'Use content only for personal educational purposes'
  ];

  const donts = [
    'Disrupt or interfere with sessions',
    'Share hateful, offensive, or illegal content',
    'Harass or bully other users',
    'Violate copyright or intellectual property',
    'Attempt to hack or abuse the platform'
  ];

  const liabilities = [
    {
      icon: AlertTriangle,
      title: 'Limitation of Liability',
      description: 'Boardly is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from platform use.'
    },
    {
      icon: Zap,
      title: 'Service Interruptions',
      description: 'We do not guarantee uninterrupted service. We are not liable for temporary outages, technical issues, or data loss due to circumstances beyond our control.'
    },
    {
      icon: Lock,
      title: 'Intellectual Property',
      description: 'All content on Boardly, including code, graphics, and designs, is our intellectual property. You may not reproduce, distribute, or create derivative works without permission.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
        <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Please read these terms carefully. By using Boardly, you agree to abide by these policies.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Introduction */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <p className="text-gray-700 leading-relaxed text-lg">
              Welcome to Boardly. These Terms and Conditions govern your use of our platform and services. Please read them thoroughly to understand your rights and responsibilities as a user.
            </p>
          </div>
        </div>

        {/* Main Terms Sections */}
        <div className="space-y-8 mb-16">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div 
                key={index}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <Icon size={28} className="text-gray-900" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {section.title}
                      </h2>
                      <p className="text-gray-500 text-sm mb-4">
                        {section.description}
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Do's and Don'ts */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">User Responsibilities</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Do's */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <CheckCircle2 size={28} className="text-green-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Do's</h3>
              </div>
              <ul className="space-y-4">
                {dos.map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center mb-6">
                <XCircle size={28} className="text-red-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Don'ts</h3>
              </div>
              <ul className="space-y-4">
                {donts.map((item, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Important Liabilities */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Important Legal Notice</h2>
          
          <div className="space-y-6">
            {liabilities.map((liability, index) => {
              const Icon = liability.icon;
              return (
                <div 
                  key={index}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Icon size={24} className="text-gray-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{liability.title}</h3>
                      <p className="text-gray-700 text-sm">{liability.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Notice */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex items-start space-x-4">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Account Termination</h3>
              <p className="text-red-800 text-sm">
                Violation of these terms may result in immediate account suspension or termination. We investigate all reports of misconduct. Repeat violations or serious offenses will result in permanent bans from our platform.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Questions About Our Terms?</h3>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            If you have any questions or concerns about these terms, please reach out to our legal team or support staff.
          </p>
          <a 
            href="/contact"
            className="inline-block bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
          >
            Get in Touch
          </a>
        </div>

        {/* Last Updated */}
        <div className="max-w-3xl mx-auto mt-12 text-center text-gray-500 text-sm border-t border-gray-200 pt-8">
          <p>Last Updated: January 2025</p>
          <p className="mt-2">Effective Date: January 1, 2025</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Terms;