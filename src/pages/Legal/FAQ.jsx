import { ChevronDown, HelpCircle, Zap, Users, Shield, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import Footer from '../Footer';
import Header from '../Header';

const FAQ = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      question: 'What is Boardly?',
      answer: 'Boardly is a live educational platform where tutors host interactive whiteboard sessions with real-time drawing, annotations, and audio communication. It enables seamless collaboration and engagement between educators and learners in a virtual classroom environment.'
    },
    {
      question: 'How can I join a class?',
      answer: 'Tutors can share a unique room link. Students can join directly through that link, even without registration. Simply click the link shared by your tutor and start learning immediately. No complex setup required!'
    },
    {
      question: 'Is payment required?',
      answer: 'Some sessions are free, while others require payment — clearly displayed before you join. You\'ll know exactly what to expect before entering any session, giving you full transparency over costs.'
    },
    {
      question: 'Can I download session recordings?',
      answer: 'Yes, tutors can enable recording for their sessions. Recorded sessions are available for students to download and review at their own pace, making it easy to catch up on missed lessons.'
    },
    {
      question: 'What technology do I need?',
      answer: 'All you need is a device with a modern web browser, a microphone, and internet connection. We support Windows, Mac, iOS, and Android. No special software installation required.'
    },
    {
      question: 'How do I become a tutor?',
      answer: 'Click on "Become a Tutor" on our platform, complete the registration, and set up your profile. Once approved, you can start hosting sessions and connecting with students worldwide.'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Real-time Collaboration',
      description: 'Interactive whiteboard with live drawing and annotations'
    },
    {
      icon: Users,
      title: 'Easy Access',
      description: 'Join sessions with just a link — no complex setup'
    },
    {
      icon: Shield,
      title: 'Secure Sessions',
      description: 'Your data and privacy are protected with encryption'
    }
  ];

  const toggleExpanded = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      {/* Hero Section */}
      <Header />
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <HelpCircle size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Everything you need to know about Boardly. Find answers to common questions below.
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300 text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Icon size={28} className="text-gray-900" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Got Questions?</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-400 transition-all duration-300"
              >
                <button
                  onClick={() => toggleExpanded(index)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-left font-semibold text-gray-900 text-lg">
                    {faq.question}
                  </h3>
                  <ChevronDown 
                    size={24} 
                    className={`text-gray-900 flex-shrink-0 transition-transform duration-300 ${
                      expandedIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedIndex === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 animate-in fade-in">
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Didn't find your answer?</h3>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            Don't worry! Our support team is ready to help. Reach out to us anytime.
          </p>
          <a 
            href="/contact"
            className="inline-block bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors duration-300"
          >
            Contact Support
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default FAQ;