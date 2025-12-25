'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Sample job data - in production this would come from an API
const jobListings = [
  {
    id: 'senior-full-stack-engineer',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Join our engineering team to build the next generation of AI-powered voice agents for the home services industry.',
    responsibilities: [
      'Design, develop, and maintain full-stack applications using React, Node.js, and TypeScript',
      'Build and optimize real-time voice AI systems and integrations',
      'Collaborate with product and design teams to deliver exceptional user experiences',
      'Mentor junior engineers and contribute to technical architecture decisions',
      'Implement and maintain CI/CD pipelines and infrastructure',
    ],
    qualifications: [
      '5+ years of experience in full-stack web development',
      'Strong proficiency in TypeScript, React, and Node.js',
      'Experience with real-time systems, WebSockets, or voice/telephony APIs',
      'Familiarity with cloud platforms (AWS, GCP, or Azure)',
      'Excellent problem-solving skills and attention to detail',
    ],
    niceToHave: [
      'Experience with AI/ML systems or conversational AI',
      'Background in the home services or field service management industry',
      'Experience with ServiceTitan or similar FSM platforms',
    ],
  },
  {
    id: 'machine-learning-engineer',
    title: 'Machine Learning Engineer',
    department: 'Engineering',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Help us develop and optimize our AI models that power intelligent customer interactions.',
    responsibilities: [
      'Design and implement machine learning models for voice AI and NLP applications',
      'Optimize model performance, latency, and accuracy for production systems',
      'Build data pipelines and infrastructure for model training and evaluation',
      'Collaborate with engineering teams to integrate ML models into production',
      'Stay current with the latest research in conversational AI and LLMs',
    ],
    qualifications: [
      '3+ years of experience in machine learning engineering',
      'Strong background in NLP, speech recognition, or conversational AI',
      'Proficiency in Python and ML frameworks (PyTorch, TensorFlow)',
      'Experience deploying and monitoring ML models in production',
      'Strong foundation in statistics and mathematics',
    ],
    niceToHave: [
      'Experience with large language models (LLMs) and prompt engineering',
      'Background in real-time inference systems',
      'Publications or contributions to open-source ML projects',
    ],
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Shape the user experience of our platform and create beautiful, intuitive interfaces.',
    responsibilities: [
      'Lead end-to-end design for new product features and improvements',
      'Conduct user research and usability testing to inform design decisions',
      'Create wireframes, prototypes, and high-fidelity designs',
      'Collaborate closely with engineering and product teams',
      'Establish and maintain design systems and guidelines',
    ],
    qualifications: [
      '4+ years of experience in product design for SaaS or B2B products',
      'Strong portfolio demonstrating UX/UI design skills',
      'Proficiency in Figma and modern design tools',
      'Experience with user research methodologies',
      'Excellent communication and collaboration skills',
    ],
    niceToHave: [
      'Experience designing for AI or voice-first products',
      'Background in dashboard or data visualization design',
      'Familiarity with front-end development',
    ],
  },
  {
    id: 'account-executive',
    title: 'Account Executive',
    department: 'Growth › Sales',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Drive revenue growth by connecting home services businesses with our AI solutions.',
    responsibilities: [
      'Manage the full sales cycle from prospecting to close',
      'Build and maintain relationships with key decision-makers',
      'Conduct product demonstrations and presentations',
      'Collaborate with marketing and customer success teams',
      'Consistently meet or exceed quarterly sales targets',
    ],
    qualifications: [
      '3+ years of B2B SaaS sales experience',
      'Track record of meeting or exceeding sales quotas',
      'Experience with CRM tools (Salesforce, HubSpot)',
      'Excellent communication and presentation skills',
      'Self-motivated with strong organizational skills',
    ],
    niceToHave: [
      'Experience selling to the home services industry',
      'Background in AI or automation solutions',
      'Existing network in HVAC, plumbing, or electrical industries',
    ],
  },
  {
    id: 'customer-success-manager',
    title: 'Customer Success Manager',
    department: 'Growth › Customer Success',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Ensure our customers achieve exceptional results with RevCenter\'s platform.',
    responsibilities: [
      'Manage a portfolio of customer accounts and drive product adoption',
      'Conduct regular business reviews and success planning sessions',
      'Identify upsell and expansion opportunities',
      'Serve as the voice of the customer internally',
      'Develop and document best practices and playbooks',
    ],
    qualifications: [
      '3+ years of customer success experience in B2B SaaS',
      'Strong analytical skills and data-driven approach',
      'Excellent communication and relationship-building skills',
      'Experience with customer success tools and CRMs',
      'Ability to manage multiple priorities simultaneously',
    ],
    niceToHave: [
      'Experience in the home services or field service industry',
      'Technical background or familiarity with AI products',
      'Experience with ServiceTitan or similar platforms',
    ],
  },
];

export default function JobDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'application'>('overview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedin: '',
    resume: null as File | null,
    coverLetter: '',
  });

  const job = useMemo(() => {
    return jobListings.find(j => j.id === params.id);
  }, [params.id]);

  if (!job) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#1b191a] mb-4">Position Not Found</h1>
          <p className="text-[#373e4d] mb-6">The job you&apos;re looking for doesn&apos;t exist or has been filled.</p>
          <Link 
            href="/careers"
            className="inline-flex items-center gap-2 text-[#1b191a] font-medium hover:underline"
          >
            ← Back to all positions
          </Link>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, resume: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Convert resume file to base64 if present
      let resumeBase64: string | undefined;
      let resumeFileName: string | undefined;
      
      if (formData.resume) {
        resumeFileName = formData.resume.name;
        const arrayBuffer = await formData.resume.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resumeBase64 = btoa(binary);
      }

      // Use local API route to avoid CORS issues
      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          linkedin: formData.linkedin,
          coverLetter: formData.coverLetter,
          resumeFileName,
          resumeBase64,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 pt-1 pb-1 flex justify-center">
          <Link href="/">
            <img 
              src="/revcenter-logo.svg" 
              alt="RevCenter" 
              className="h-[140px] sm:h-[180px] md:h-[220px] w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Back Button */}
        <Link 
          href="/careers"
          className="inline-flex items-center gap-2 text-[#373e4d] hover:text-[#1b191a] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to all positions
        </Link>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <h1 className="text-2xl font-semibold text-[#1b191a] mb-6">{job.title}</h1>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-[#373e4d]">Location</span>
                <p className="font-medium text-[#1b191a]">{job.location}</p>
              </div>
              <div>
                <span className="text-[#373e4d]">Employment Type</span>
                <p className="font-medium text-[#1b191a]">{job.employmentType}</p>
              </div>
              <div>
                <span className="text-[#373e4d]">Department</span>
                <p className="font-medium text-[#1b191a]">{job.department}</p>
              </div>
            </div>

            {/* Apply Button - Desktop */}
            <button
              onClick={() => setActiveTab('application')}
              className="hidden lg:block w-full mt-8 px-6 py-3 bg-[#1b191a] text-white font-medium rounded-lg hover:bg-[#2d2a2b] transition-colors"
            >
              Apply for this Job
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Tabs */}
            <div className="flex gap-8 border-b border-gray-200 mb-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === 'overview' 
                    ? 'text-[#1b191a]' 
                    : 'text-[#373e4d] hover:text-[#1b191a]'
                }`}
              >
                Overview
                {activeTab === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b191a]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('application')}
                className={`pb-4 text-sm font-medium transition-colors relative ${
                  activeTab === 'application' 
                    ? 'text-[#1b191a]' 
                    : 'text-[#373e4d] hover:text-[#1b191a]'
                }`}
              >
                Application
                {activeTab === 'application' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1b191a]" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' ? (
              <div className="prose prose-gray max-w-none">
                <p className="text-[#373e4d] text-lg mb-8">{job.description}</p>

                <h2 className="text-lg font-semibold text-[#1b191a] mt-8 mb-4">Responsibilities</h2>
                <ul className="space-y-2 text-[#373e4d]">
                  {job.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-[#1b191a] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <h2 className="text-lg font-semibold text-[#1b191a] mt-8 mb-4">Qualifications</h2>
                <ul className="space-y-2 text-[#373e4d]">
                  {job.qualifications.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-[#1b191a] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <h2 className="text-lg font-semibold text-[#1b191a] mt-8 mb-4">Nice to Have</h2>
                <ul className="space-y-2 text-[#373e4d]">
                  {job.niceToHave.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-[#1b191a] mt-1.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Apply Button - Bottom of Overview */}
                <button
                  onClick={() => setActiveTab('application')}
                  className="mt-12 px-8 py-3 bg-[#1b191a] text-white font-medium rounded-lg hover:bg-[#2d2a2b] transition-colors"
                >
                  Apply for this Job
                </button>
              </div>
            ) : (
              <div>
                {submitSuccess ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-[#1b191a] mb-4">Application Submitted!</h2>
                    <p className="text-[#373e4d] mb-8">
                      Thank you for your interest in joining RevCenter. We&apos;ll review your application and get back to you soon.
                    </p>
                    <Link 
                      href="/careers"
                      className="text-[#1b191a] font-medium hover:underline"
                    >
                      View other positions
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Resume Upload with Autofill */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                      <label className="block text-sm font-medium text-[#1b191a] mb-3">
                        Resume <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#1b191a] transition-colors">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-sm text-[#373e4d]">
                            {formData.resume ? formData.resume.name : 'Upload resume (PDF, DOC, DOCX)'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                      <p className="text-xs text-[#373e4d] mt-2">Upload your resume to autofill form fields</p>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1b191a] mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1b191a] mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a]"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-[#1b191a] mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a]"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-[#1b191a] mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a]"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div>
                      <label className="block text-sm font-medium text-[#1b191a] mb-2">
                        LinkedIn Profile <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a]"
                      />
                    </div>

                    {/* Cover Letter */}
                    <div>
                      <label className="block text-sm font-medium text-[#1b191a] mb-2">
                        Why do you want to join RevCenter?
                      </label>
                      <textarea
                        name="coverLetter"
                        value={formData.coverLetter}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2.5 border-2 border-[#d7dae0] rounded-lg focus:outline-none focus:border-[#1b191a] text-[#1b191a] resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-[#1b191a] text-white font-medium rounded-lg hover:bg-[#2d2a2b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#373e4d]">
          <span>© {new Date().getFullYear()} RevCenter Inc.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#1b191a] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#1b191a] transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

