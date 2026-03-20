export interface RevcenterWizardOption {
  value: string
  label: string
  description?: string
}

export const REVCENTER_WIZARD_INDUSTRY_OPTIONS: RevcenterWizardOption[] = [
  { value: 'hvac', label: 'HVAC' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'garage_doors', label: 'Garage Doors' },
  { value: 'cleaning_services', label: 'Cleaning Services' },
]

export const REVCENTER_WIZARD_SERVICE_PRESETS: Record<string, string[]> = {
  hvac: [
    'AC repair',
    'Heating repair',
    'Seasonal maintenance',
    'Ductless mini split',
  ],
  pest_control: [
    'Termite treatment',
    'Rodent removal',
    'General pest control',
    'Wildlife removal',
  ],
  plumbing: [
    'Drain cleaning',
    'Water heater repair',
    'Leak detection and repair',
    'Fixture installation',
  ],
  electrical: [
    'Panel upgrade',
    'Outlet and lighting install',
    'EV charger install',
    'Electrical troubleshooting',
  ],
  roofing: [
    'Leak repair',
    'Roof inspection',
    'Shingle replacement',
    'Storm damage assessment',
  ],
  fire_safety: [
    'Fire alarm inspection',
    'Sprinkler system service',
    'Extinguisher maintenance',
    'Code compliance testing',
  ],
  garage_doors: [
    'Spring replacement',
    'Opener repair',
    'Track alignment',
    'New door installation',
  ],
  cleaning_services: [
    'Deep cleaning',
    'Move in and move out cleaning',
    'Recurring home cleaning',
    'Office cleaning',
  ],
}

export const REVCENTER_WIZARD_DISCOVERY_PRESETS: Record<string, string[]> = {
  hvac: [
    'What type of unit do you have and how old is it?',
    'Is the system not turning on, or is airflow weak?',
    'When did you first notice the issue?',
  ],
  pest_control: [
    'What pests are you seeing and where are they located?',
    'How long has this been happening?',
    'Have you tried any treatment already?',
  ],
  plumbing: [
    'What issue are you experiencing (leak, clog, no hot water)?',
    'Is this causing active water damage right now?',
    'Where in the property is the issue located?',
  ],
  electrical: [
    'What specifically stopped working?',
    'Are there safety concerns like sparking or burning smell?',
    'Is this residential or commercial?',
  ],
  roofing: [
    'Where is the leak or damage located?',
    'Was this caused by a recent storm?',
    'When was the roof last repaired or replaced?',
  ],
  fire_safety: [
    'Which system needs service (alarm, sprinkler, extinguisher)?',
    'Is this routine maintenance or a failed inspection issue?',
    'What is the property type and occupancy?',
  ],
  garage_doors: [
    'Is the door stuck open, closed, or moving unevenly?',
    'Do you hear grinding, snapping, or unusual noises?',
    'Is this residential or commercial?',
  ],
  cleaning_services: [
    'How many bedrooms and bathrooms need cleaning?',
    'Is this a one-time clean or recurring service?',
    'Are there pets or special cleaning requests?',
  ],
}

export const REVCENTER_WIZARD_USE_CASE_OPTIONS: RevcenterWizardOption[] = [
  {
    value: 'customer_support',
    label: 'Customer Support',
    description: 'Handle inbound calls, answer FAQs, and resolve issues',
  },
  {
    value: 'outbound_sales',
    label: 'Outbound Sales',
    description: 'Make outbound calls to leads and prospects',
  },
  {
    value: 'scheduling',
    label: 'Scheduling',
    description: 'Book, reschedule, and manage appointments',
  },
  {
    value: 'lead_qualification',
    label: 'Lead Qualification',
    description: 'Qualify leads by gathering info and scoring urgency',
  },
  {
    value: 'answering_service',
    label: 'Answering Service',
    description: 'After-hours call handling and message taking',
  },
]

export const findWizardOption = (
  options: RevcenterWizardOption[],
  value: string,
) => options.find((option) => option.value === value)

export const formatWizardOptionList = (options: RevcenterWizardOption[]) =>
  options
    .map((option, index) => {
      const prefix = `[${String(index + 1).padStart(2, '0')}]`
      return option.description
        ? `${prefix} ${option.label} [${option.value}]\n     ${option.description}`
        : `${prefix} ${option.label} [${option.value}]`
    })
    .join('\n')
