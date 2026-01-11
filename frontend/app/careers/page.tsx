'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Sample job data - in production this would come from an API
const jobListings = [
  {
    id: 'senior-full-stack-engineer',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Join our engineering team to build the next generation of AI-powered voice agents for the home services industry.',
  },
  {
    id: 'machine-learning-engineer',
    title: 'Machine Learning Engineer',
    department: 'Engineering',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Help us develop and optimize our AI models that power intelligent customer interactions.',
  },
  {
    id: 'product-designer',
    title: 'Product Designer',
    department: 'Design',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Shape the user experience of our platform and create beautiful, intuitive interfaces.',
  },
  {
    id: 'account-executive',
    title: 'Account Executive',
    department: 'Growth › Sales',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Drive revenue growth by connecting home services businesses with our AI solutions.',
  },
  {
    id: 'customer-success-manager',
    title: 'Customer Success Manager',
    department: 'Growth › Customer Success',
    location: 'Remote (US)',
    employmentType: 'Full-time',
    description: 'Ensure our customers achieve exceptional results with RevCenter\'s platform.',
  },
];

export default function CareersPage() {
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');

  // Get unique filter options with counts
  const departments = useMemo(() => {
    const deptCounts = jobListings.reduce((acc, job) => {
      const baseDept = job.department.split(' › ')[0];
      acc[baseDept] = (acc[baseDept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(deptCounts).map(([name, count]) => ({ name, count }));
  }, []);

  const locations = useMemo(() => {
    return [...new Set(jobListings.map(job => job.location))];
  }, []);

  const employmentTypes = useMemo(() => {
    return [...new Set(jobListings.map(job => job.employmentType))];
  }, []);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobListings.filter(job => {
      const matchesDepartment = !departmentFilter || job.department.startsWith(departmentFilter);
      const matchesLocation = !locationFilter || job.location === locationFilter;
      const matchesType = !employmentTypeFilter || job.employmentType === employmentTypeFilter;
      return matchesDepartment && matchesLocation && matchesType;
    });
  }, [departmentFilter, locationFilter, employmentTypeFilter]);

  // Group jobs by department
  const groupedJobs = useMemo(() => {
    const groups: Record<string, typeof jobListings> = {};
    filteredJobs.forEach(job => {
      if (!groups[job.department]) {
        groups[job.department] = [];
      }
      groups[job.department].push(job);
    });
    return groups;
  }, [filteredJobs]);

  const hasActiveFilters = departmentFilter || locationFilter || employmentTypeFilter;

  const resetFilters = () => {
    setDepartmentFilter('');
    setLocationFilter('');
    setEmploymentTypeFilter('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header>
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-1 flex justify-center">
          <Link href="/">
            <img 
              src="/revcenter-logo.svg" 
              alt="RevCenter" 
              className="h-5 sm:h-5 md:h-[20px] w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Page Title */}
        <h1 className="text-xl font-semibold text-[#1b191a] mb-8">
          Open Positions
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2.5 text-sm text-[#373e4d] bg-white border-2 border-[#d7dae0] rounded-[10px] focus:outline-none focus:border-[#1b191a] cursor-pointer min-w-[160px]"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.name} value={dept.name}>
                {dept.name} ({dept.count})
              </option>
            ))}
          </select>

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2.5 text-sm text-[#373e4d] bg-white border-2 border-[#d7dae0] rounded-[10px] focus:outline-none focus:border-[#1b191a] cursor-pointer min-w-[160px]"
          >
            <option value="">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="px-4 py-2.5 text-sm text-[#373e4d] bg-white border-2 border-[#d7dae0] rounded-[10px] focus:outline-none focus:border-[#1b191a] cursor-pointer min-w-[160px]"
          >
            <option value="">All Types</option>
            {employmentTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2.5 text-sm text-[#1b191a] hover:text-[#373e4d] transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Job Listings */}
        <div className="space-y-10">
          {Object.entries(groupedJobs).map(([department, jobs]) => (
            <div key={department}>
              {/* Department Heading */}
              <h2 className="text-lg font-semibold text-[#1b191a] mb-4 pb-2 border-b border-gray-100">
                {department}
              </h2>

              {/* Jobs in this department */}
              <div className="space-y-1">
                {jobs.map(job => (
                  <Link
                    key={job.id}
                    href={`/careers/${job.id}`}
                    className="block py-4 px-4 -mx-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <h3 className="text-base font-semibold text-[#1b191a] group-hover:text-[#2563eb] transition-colors mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-[#373e4d]">
                      {job.department} <span className="mx-2">•</span> {job.location} <span className="mx-2">•</span> {job.employmentType}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#373e4d]">No positions match your filters.</p>
              <button
                onClick={resetFilters}
                className="mt-4 text-[#1b191a] font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#373e4d]">
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

