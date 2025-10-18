import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import { useState } from 'react';
import Footer from '../Footer';
import Header from '../Header';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email',
      content: 'support@boardly.com',
      description: 'We\'ll respond within 24 hours'
    },
    {
      icon: Phone,
      title: 'Phone',
      content: '+234 810 059 6007',
      description: 'Mon-Fri, 9AM-6PM WAT'
    },
    {
      icon: MapPin,
      title: 'Address',
      content: 'Lagos, Nigeria',
      description: 'Our main office location'
    },
    {
      icon: Clock,
      title: 'Support Hours',
      content: '24/7 Available',
      description: 'Always here to help'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
    <Header />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get In Touch</h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Have questions or need support? We're here to help. Reach out to us anytime and we'll get back to you as soon as possible.
          </p>
        </div>
      </div>

      {/* Contact Methods Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, index) => {
            const Icon = method.icon;
            return (
              <div 
                key={index} 
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Icon size={24} className="text-gray-900" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{method.title}</h3>
                <p className="text-gray-900 font-medium mb-1">{method.content}</p>
                <p className="text-sm text-gray-500">{method.description}</p>
              </div>
            );
          })}
        </div>

        {/* Contact Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                  placeholder="Tell us more about your inquiry..."
                ></textarea>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2 group"
              >
                <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                <span>Send Message</span>
              </button>

              {submitted && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm animate-pulse">
                  ✓ Message sent successfully! We'll be in touch soon.
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Contact Us?</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start space-x-3">
                  <span className="text-gray-900 font-bold mt-1">•</span>
                  <span>Get support for technical issues or account problems</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-gray-900 font-bold mt-1">•</span>
                  <span>Inquire about partnerships and collaborations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-gray-900 font-bold mt-1">•</span>
                  <span>Share feedback and suggestions for improvement</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-gray-900 font-bold mt-1">•</span>
                  <span>Report bugs or security concerns</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Response Time</h3>
              <p className="text-gray-600 text-sm">
                We aim to respond to all inquiries within 24 hours. For urgent matters, please call us directly.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;