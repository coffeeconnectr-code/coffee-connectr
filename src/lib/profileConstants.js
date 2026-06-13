export const CATEGORIES = [
  'Green Coffee/Origin',
  'Roasting',
  'Equipment & Machinery',
  'Roastery Technical Support',
  'Café & Retail',
  'Education & Training',
  'Quality & Certification',
  'Consulting & Business',
  'Creative & Marketing',
  'Supplies & Ancillary',
  'Logistics & Trade',
  'Events & Media',
  'People/Recruitment',
]

export const OPEN_TO_OPTIONS = [
  { value: 'employment', label: 'Employment' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'consulting', label: 'Consulting' },
]

export function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function joinList(values) {
  return (values ?? []).join(', ')
}
