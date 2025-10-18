import { Shield, Lock, Eye, FileText, AlertCircle, CheckCircle2, CheckCircle } from 'lucide-react';
import Footer from '../Footer';
import Header from '../Header';

const Privacy = () => {
  const sections = [
    {
      icon: Eye,
      title: 'Data Collection',
      description: 'What information we gather',
      content: 'We collect only necessary user data for account creation and sessions. This includes your name, email address, and any information you voluntarily provide in your profile. Session data such as recordings and whiteboard content are also stored securely.'
    },
    {
      icon: Lock,
      title: 'Data Security',
      description: 'How we protect your information',
      content: 'Payment data is handled securely by our certified payment provider. All data transmitted between your device and our servers is encrypted using industry-standard protocols. We regularly audit our security practices to ensure your information remains safe.'
    },
    {
      icon: Shield,
      title: 'Data Sharing',
      description: 'Who has access to your data',
      content: 'We never sell or share personal data with third parties. Your information is only accessible to you and authorized Boardly staff. Session data is only shared with other participants in the same session as needed for the learning experience.'
    },
    {
      icon: FileText,
      title: 'Your Rights',
      description: 'Control over your information',
      content: 'You have the right to access, modify, or delete your personal data at any time. You can download a copy of your information or request permanent deletion of your account. These options are available in your account settings.'
    }
  ];

  const commitments = [
    {
      icon: CheckCircle2,
      text: 'We conduct regular security audits and vulnerability assessments'
    },
    {
      icon: CheckCircle2,
      text: 'We maintain transparent communication about data practices'
    },
    {
      icon: CheckCircle2,
      text: 'We respond to privacy inquiries within 48 hours'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
    <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Shield size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Your privacy is important to us. We're committed to transparency about how we handle your data.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Introduction */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <p className="text-gray-700 leading-relaxed text-lg">
              We respect your privacy. This policy describes how WhiteboardEdu collects, uses, and protects your information. By using our platform, you agree to the terms outlined below.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
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

        {/* Commitments Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Our Privacy Commitments</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
            {commitments.map((commitment, index) => (
              <div key={index} className="flex items-start space-x-4">
                <CheckCircle2 size={24} className="text-gray-900 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">{commitment.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Important Notice */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 flex items-start space-x-4">
            <AlertCircle size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Updates to This Policy</h3>
              <p className="text-blue-800 text-sm">
                We may update this privacy policy from time to time. When we do, we'll notify you via email and update the "Last Modified" date below. Please review this policy periodically to stay informed about how we protect your data.
              </p>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Questions About Your Privacy?</h3>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            For any privacy-related questions or concerns, contact us at support@boardly.com or use our contact form.
          </p>
          <a 
            href="/contact"
            className="inline-block bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
          >
            Contact Us
          </a>
        </div>

        {/* Footer Info */}
        <div className="max-w-3xl mx-auto mt-12 text-center text-gray-500 text-sm border-t border-gray-200 pt-8">
          <p>Last Modified: January 2025</p>
          <p className="mt-2">Effective Date: January 1, 2025</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy;