// Tiny labelled corpus that the local classifier trains on at cold start (about 1 ms).
// To improve accuracy, add examples here. Keys must match TOPICS in app/topics.js.
export const trainingData = {
  finance: [
    'Invoice overdue payment due amount balance outstanding please pay',
    'Your invoice is attached, payment terms net 30, bank transfer details',
    'Budget approval expense report reimbursement accounting quarter revenue',
    'Refund processed to your credit card, billing statement and receipt',
    'Late fee will be applied if the outstanding balance is not paid',
    'Payroll tax audit financial report profit loss forecast cost',
  ],
  technical: [
    'Engineering sync agenda sprint review deployment pipeline backlog',
    'Production incident outage database latency, rollback the release',
    'Code review pull request merge branch tests failing build server',
    'API migration to new architecture, Kubernetes cluster upgrade',
    'Bug fix hotfix deployed, monitoring alerts and logs, infrastructure',
    'Engineering team will discuss technical debt, roadmap and on-call rotation',
  ],
  hr: [
    'Company retreat announcement, team building activities for all employees',
    'Vacation leave policy, holidays, benefits enrollment and health insurance',
    'New hire onboarding, welcome to the team, employee handbook',
    'Performance review, promotion, salary and career development',
    'Hiring interview schedule for the candidate, recruitment and job offer',
    'Office relocation, wellbeing program, staff event and travel arrangements',
  ],
  marketing: [
    'Marketing campaign launch, social media content and brand awareness',
    'Newsletter, webinar promotion, SEO and website traffic analytics',
    'Photos and video from the event will be shared on social media',
    'Press release, influencer partnership, advertising budget for ads',
    'Brand guidelines, logo, product launch announcement to customers',
  ],
  sales: [
    'Sales proposal pricing quote for your company, discount offer',
    'Demo call with the prospect, deal pipeline, contract renewal',
    'Lead follow up, CRM opportunity, closing the deal this quarter',
    'Upgrade your plan to premium subscription, special offer today',
    'Purchase order received, order confirmation and shipping',
  ],
  support: [
    'Support ticket opened, customer issue, password reset not working',
    'I cannot log in to my account, error message, please help',
    'Help desk request, troubleshooting steps, the app keeps crashing',
    'Your support case has been resolved, customer service feedback',
    'Problem with my order, the product arrived broken, complaint',
  ],
  legal: [
    'Contract agreement terms and conditions, signature required',
    'NDA non-disclosure agreement, confidentiality and legal review',
    'GDPR compliance privacy policy, data protection regulation',
    'Lawsuit, attorney, legal notice, intellectual property, liability',
    'Please review the clause in the master service agreement',
  ],
};
