
import { User, ActivityLog, Task, AppSettings, Report, AppNotification, PricingPlan } from './types';

export const MOTIVATIONAL_QUOTES = [
  { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
  { text: "Volume x Time = Skill.", author: "Alex Hormozi" },
  { text: "Sales cures all.", author: "Mark Cuban" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" }
];

export const DEFAULT_PRICING: PricingPlan[] = [
  {
    id: 'p1',
    name: 'Standard Pro',
    price: '49',
    interval: 'month',
    features: ['Unlimited Agents', 'Advanced Auditing', 'Custom Branding'],
    platform: 'STRIPE',
    checkoutUrl: 'https://stripe.com'
  }
];

export const INITIAL_SETTINGS: AppSettings = {
  accountName: 'KPI Master',
  themeColor: '#6b05e8',
  quoteEnabled: true,
  quoteType: 'RANDOM',
  customQuote: "",
  customQuoteAuthor: "",
  csvQuotes: [],
  defaultFilter: 'today',
  topPerformerMetric: 'revenue',
  defaultChartMetrics: ['closedDeals', 'appointments'], 
  defaultUserGoal: 10000,
  companyRevenueGoal: 500000,
  defaultNotificationReminder: {
    value: 24,
    unit: 'hours',
    direction: 'before'
  },
  revenueVisibility: 'EVERYONE',
  paymentsEnabled: false,
  billingStatus: 'ACTIVE',
  nextPaymentDue: Date.now() + 30 * 24 * 60 * 60 * 1000,
  subscriptionPrice: 49.99,
  autoPay: true,
  subscriptionCancelled: false,
  factoryResetDate: null,
  globalPricingEnabled: false,
  activePricingPlans: DEFAULT_PRICING,
  stripeIntegration: { apiKey: '', webhookSecret: '', active: false },
  paypalIntegration: { clientId: '', active: false },
  whopIntegration: { apiKey: '', active: false }
};

export const INITIAL_USERS: User[] = [
  {
    id: 'owner-1',
    name: 'Admin Demo',
    email: 'admin@kpimaster.pro',
    password: 'password',
    role: 'OWNER',
    revenueGoal: 50000,
    status: 'active',
    agencyId: 'agency-001',
    taskNotificationsEnabled: true,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: false,
    taskReminderOffset: { value: 24, unit: 'hours', direction: 'before' }
  },
  {
    id: 'agent-1',
    name: 'John Agent',
    email: 'john@agent.com',
    password: 'password',
    role: 'USER',
    revenueGoal: 15000,
    status: 'active',
    agencyId: 'agency-001',
    taskNotificationsEnabled: true,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: false,
    taskReminderOffset: { value: 1, unit: 'hours', direction: 'before' }
  },
  {
    id: 'agent-2',
    name: 'Sarah Closer',
    email: 'sarah@agent.com',
    password: 'password',
    role: 'USER',
    revenueGoal: 20000,
    status: 'active',
    agencyId: 'agency-001',
    taskNotificationsEnabled: true
  },
  {
    id: 'agent-3',
    name: 'Mike Sales',
    email: 'mike@agent.com',
    password: 'password',
    role: 'USER',
    revenueGoal: 12000,
    status: 'active',
    agencyId: 'agency-001',
    taskNotificationsEnabled: true
  },
  {
    id: 'agent-4',
    name: 'Elena Pierce',
    email: 'elena@agent.com',
    password: 'password',
    role: 'USER',
    revenueGoal: 25000,
    status: 'active',
    agencyId: 'agency-001',
    taskNotificationsEnabled: true
  }
];

// Helper to generate dates for stats
const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Generate a rich set of logs
const generateLogs = () => {
  const allLogs: ActivityLog[] = [];
  const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'owner-1'];
  
  // Last 7 days
  for (let d = 0; d < 7; d++) {
    const date = getPastDate(d);
    agents.forEach(uid => {
      // Randomize production values
      const isOwner = uid === 'owner-1';
      const multiplier = isOwner ? 1.5 : 1.0;
      
      allLogs.push({
        id: `l-${uid}-${d}`,
        userId: uid,
        agencyId: 'agency-001',
        date,
        revenue: Math.floor((Math.random() * 2000 + 500) * multiplier),
        calls: Math.floor(Math.random() * 60 + 20),
        appointments: Math.floor(Math.random() * 5 + 1),
        followUps: Math.floor(Math.random() * 15 + 5),
        noShows: Math.floor(Math.random() * 2),
        closedDeals: Math.floor(Math.random() * 3),
        notes: d === 0 ? "Daily goal achieved. Great momentum." : undefined
      });
    });
  }
  return allLogs;
};

export const INITIAL_LOGS: ActivityLog[] = generateLogs();

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep-demo-1',
    name: 'Q1 Performance Audit',
    userId: 'team',
    metrics: ['revenue', 'closedDeals', 'appointments'],
    dateRange: 'month',
    createdAt: Date.now() - 86400000
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    userId: 'agent-1',
    agencyId: 'agency-001',
    title: 'Follow up: Sarah Jenkins',
    description: 'Hot lead from yesterday. Ready to buy.',
    dueDate: getPastDate(-1), 
    priority: 'high',
    completed: false
  },
  {
    id: 't2',
    userId: 'agent-2',
    agencyId: 'agency-001',
    title: 'Review New Contract Terms',
    description: 'Legal needs signoff on the Enterprise bundle.',
    dueDate: getPastDate(0), 
    priority: 'medium',
    completed: false
  },
  {
    id: 't3',
    userId: 'owner-1',
    agencyId: 'agency-001',
    title: 'Weekly Team Huddle',
    description: 'Reviewing Q2 targets and Sarah\'s promotion.',
    dueDate: getPastDate(-2),
    priority: 'high',
    completed: true
  },
  {
    id: 't4',
    userId: 'agent-4',
    agencyId: 'agency-001',
    title: 'CRM Data Cleanup',
    description: 'Fix duplicate leads from Facebook campaign.',
    dueDate: getPastDate(1), 
    priority: 'low',
    completed: false
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1',
    userId: 'owner-1',
    title: 'Goal Milestone Reached',
    message: 'The team has surpassed 50% of the weekly revenue goal!',
    timestamp: Date.now() - 3600000,
    read: false,
    type: 'system',
    targetTab: 'Home'
  },
  {
    id: 'n2',
    userId: 'agent-1',
    title: 'New Task: Elena Pierce',
    message: 'Elena reassigned a high-value lead to you.',
    timestamp: Date.now() - 7200000,
    read: false,
    type: 'task',
    targetTab: 'Tasks'
  },
  {
    id: 'n3',
    userId: 'owner-1',
    title: 'System Security Alert',
    message: 'New login detected from IP 192.168.1.45',
    timestamp: Date.now() - 86400000,
    read: true,
    type: 'system',
    targetTab: 'Settings'
  }
];
