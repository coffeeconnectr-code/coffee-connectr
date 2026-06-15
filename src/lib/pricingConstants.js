export const PRICING_LAUNCH_NOTE =
  'Your first month on Coffee Connectr is free. After that, Individual members pay US$5 per month and Business members pay US$10 per month — billed monthly until you cancel.'

export const PRICING_TRIAL_NOTE =
  'Every new member gets one free month with full access. When your trial ends, your chosen plan is charged monthly until you cancel.'

export const PRICING_PLANS = [
  {
    id: 'trial',
    name: 'Free trial',
    audience: 'New members',
    price: 'Free',
    period: 'for your first month',
    description:
      'Try Coffee Connectr with full access for 30 days. Pick Individual or Business billing before your trial ends, or cancel anytime.',
    status: 'available',
    highlighted: true,
    features: [
      'Full platform access for 30 days',
      'Profile on the global map',
      'Discover, message, and connect',
      'Noticeboard browsing and posting',
      'No charge during your first month',
    ],
  },
  {
    id: 'individual',
    name: 'Individual',
    audience: 'Coffee professionals',
    price: 'US$5',
    period: 'per month',
    description:
      'For solo professionals after your free month. Billed monthly until you cancel.',
    status: 'available',
    highlighted: false,
    features: [
      '1-month free trial included',
      'Profile on the global map',
      'Discover and search members',
      'Direct messaging',
      'Member dashboard',
      'Cancel anytime',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    audience: 'Companies & teams',
    price: 'US$10',
    period: 'per month',
    description:
      'For roasteries, suppliers, cafés and coffee businesses after your free month. Billed monthly until you cancel.',
    status: 'available',
    highlighted: false,
    features: [
      '1-month free trial included',
      'Business profile fields',
      'Roaster equipment listings',
      'Enhanced business visibility',
      'Verified badge application',
      'Featured profile application',
      'Cancel anytime',
    ],
  },
]

export const PRICING_FAQ = [
  {
    question: 'Is the first month really free?',
    answer:
      'Yes. Every new member gets one full month of access at no cost. You can explore the platform, build your profile, and connect with the industry before any monthly charge begins.',
  },
  {
    question: 'When does billing start?',
    answer:
      'After your first free month. Individual members are then billed US$5 per month. Business members are billed US$10 per month.',
  },
  {
    question: 'Can I cancel?',
    answer:
      'Yes. Subscriptions are billed monthly and you can cancel anytime. Once canceled, you will not be charged again.',
  },
  {
    question: 'What is the difference between Individual and Business?',
    answer:
      'Individual is for solo professionals — trainers, technicians, consultants and freelancers. Business is for companies that need richer profile fields, equipment listings, and business-focused visibility.',
  },
  {
    question: 'Can I browse the map without an account?',
    answer:
      'Yes. Anyone can explore the map and discover members. Creating your own profile requires signing up and starts your one-month free trial.',
  },
  {
    question: 'How do I get started?',
    answer:
      'Sign up with email or Google, build your profile, drop your pin on the map, and start connecting. See our How to Use guide for a full walkthrough.',
  },
]
