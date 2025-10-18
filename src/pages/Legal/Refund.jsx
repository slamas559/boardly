import { DollarSign, Clock, CheckCircle2, XCircle, HelpCircle, AlertCircle } from 'lucide-react';
import Footer from '../Footer';
import Header from '../Header';

const Refund = () => {
  const policies = [
    {
      icon: Clock,
      title: 'Timing Matters',
      description: 'When you can get a refund',
      content: 'Refunds are only applicable for paid sessions canceled before the class begins. If you cancel before your tutor starts the session, you\'re eligible for a full refund. This gives you peace of mind and flexibility in choosing your learning schedule.'
    },
    {
      icon: XCircle,
      title: 'No Refunds After Start',
      description: 'Sessions in progress or completed',
      content: 'No refunds are provided once a session has started or concluded. This policy ensures tutors are fairly compensated for their time and effort. However, you can often reschedule to another session instead.'
    },
    {
      icon: DollarSign,
      title: 'Processing Timeline',
      description: 'How long refunds take',
      content: 'All approved refunds are processed within 5–7 business days. The refund will be credited back to your original payment method. You\'ll receive a confirmation email once your refund has been processed.'
    }
  ];

  const process = [
    {
      number: '1',
      title: 'Submit Request',
      description: 'Contact support with your session details and cancellation reason'
    },
    {
      number: '2',
      title: 'Review & Approval',
      description: 'Our team reviews your request and verifies eligibility'
    },
    {
      number: '3',
      title: 'Process Refund',
      description: 'Approved refunds are processed within 5-7 business days'
    },
    {
      number: '4',
      title: 'Confirmation',
      description: 'You receive an email confirming the refund completion'
    }
  ];

  const faqs = [
    {
      question: 'Can I reschedule instead of getting a refund?',
      answer: 'Yes! If you can\'t make a session, you can reschedule to another time that works better for you. Contact support to arrange this.'
    },
    {
      question: 'What if the tutor cancels?',
      answer: 'If a tutor cancels a session, you\'ll receive a full refund automatically or can reschedule at no cost.'
    },
    {
      question: 'Are there exceptions to this policy?',
      answer: 'Yes, we review each case individually. If you have extenuating circumstances, contact us at support@boardly.com and we\'ll do our best to help.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
    <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Refund Policy</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Our goal is to ensure that you have a smooth learning experience. Here's how we handle refunds.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        
        {/* Introduction */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <p className="text-gray-700 leading-relaxed text-lg">
              We want you to have the best learning experience possible. If you encounter any issues or need to cancel a session, we're here to help. This policy explains our refund process and what you need to know.
            </p>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 mb-16">
          {policies.map((policy, index) => {
            const Icon = policy.icon;
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
                        {policy.title}
                      </h2>
                      <p className="text-gray-500 text-sm mb-4">
                        {policy.description}
                      </p>
                      <p className="text-gray-700 leading-relaxed">
                        {policy.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Refund Process */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How to Request a Refund</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center h-full hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < process.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gray-300 transform -translate-y-1/2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Important Notice */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 flex items-start space-x-4">
            <AlertCircle size={24} className="text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-amber-900 mb-2">Important to Note</h3>
              <p className="text-amber-800 text-sm">
                Refund requests must be submitted within 48 hours of the scheduled session time. Requests submitted after this window may not be eligible for processing.
              </p>
            </div>
          </div>
        </div>

        {/* Quick FAQs */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Quick Questions</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start space-x-3">
                  <HelpCircle size={20} className="text-gray-900 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-700 text-sm">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Need Help with a Refund?</h3>
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">
            For refund requests or if you have any questions about this policy, contact us at <strong>support@whiteboardedu.com</strong> or use our contact form.
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

export default Refund;