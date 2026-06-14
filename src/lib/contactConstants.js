export const CONTACT_TOPICS = [
  { value: 'general', label: 'General enquiry' },
  { value: 'account', label: 'Account help' },
  { value: 'billing', label: 'Billing & subscriptions' },
  { value: 'technical', label: 'Technical issue' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
]

export function getContactTopicLabel(value) {
  return CONTACT_TOPICS.find((topic) => topic.value === value)?.label ?? 'General enquiry'
}
