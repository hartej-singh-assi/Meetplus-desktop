import { MeetingRecord, WorkRecord, UserSettings, Sprint } from '../types';
import { format, subDays, addDays } from 'date-fns';

export const defaultSettings: UserSettings = {
  defaultTargetFocusHours: 6.0,
  defaultContextLossMinutes: 20, // 20 min recovery time per meeting
  workingHoursPerDay: 8.0,
  autoCalculateLoss: true,
  dataRetentionDays: 0, // Manual / Infinite by default
  timeFormat: '12h',
};

export function generateSeedSprints(): Sprint[] {
  const today = new Date();
  const activeStart = format(subDays(today, 10), 'yyyy-MM-dd');
  const activeEnd = format(addDays(today, 4), 'yyyy-MM-dd');

  const prevStart = format(subDays(today, 25), 'yyyy-MM-dd');
  const prevEnd = format(subDays(today, 11), 'yyyy-MM-dd');

  const nextStart = format(addDays(today, 5), 'yyyy-MM-dd');
  const nextEnd = format(addDays(today, 19), 'yyyy-MM-dd');

  return [
    {
      id: 'sprint-24',
      name: 'Sprint 24 - Core Feature Delivery',
      startDate: activeStart,
      endDate: activeEnd,
      goal: 'Deliver MeetPulse desktop client and dynamic analytics dashboard',
      status: 'ACTIVE',
    },
    {
      id: 'sprint-23',
      name: 'Sprint 23 - Architecture & Setup',
      startDate: prevStart,
      endDate: prevEnd,
      goal: 'Setup Electron, React, Yarn dependencies and Excel exporter engine',
      status: 'COMPLETED',
    },
    {
      id: 'sprint-25',
      name: 'Sprint 25 - Enterprise Integrations',
      startDate: nextStart,
      endDate: nextEnd,
      goal: 'Integrate automated calendar sync and team performance reports',
      status: 'PLANNED',
    },
  ];
}

export function generateSeedData(): { meetings: MeetingRecord[]; workLogs: WorkRecord[]; sprints: Sprint[] } {
  const today = new Date();
  const sprints = generateSeedSprints();
  const activeSprintId = sprints[0].id;
  const meetings: MeetingRecord[] = [];
  const workLogs: WorkRecord[] = [];

  const meetingTemplates = [
    { title: 'Sprint Planning & Backlog Grooming', category: 'Sync', duration: 75, impact: 'HIGH', disruption: 8, participants: 6, notes: 'Reviewed user stories and story points for next sprint.' },
    { title: 'Daily Engineering Standup', category: 'Standup', duration: 25, impact: 'LOW', disruption: 3, participants: 8, notes: 'Quick round-robin updates on API integration.' },
    { title: 'Client Requirement Alignment Call', category: 'Client', duration: 60, impact: 'CRITICAL', disruption: 9, participants: 4, notes: 'Discussed scope changes for Q3 roadmap deliverables.' },
    { title: '1-on-1 Performance & Goal Review', category: '1-on-1', duration: 45, impact: 'MEDIUM', disruption: 5, participants: 2, notes: 'Career growth and feedback check-in.' },
    { title: 'Architecture & System Design Deep-Dive', category: 'Technical', duration: 90, impact: 'CRITICAL', disruption: 9, participants: 5, notes: 'Database indexing and API latency optimization strategy.' },
    { title: 'Company All-Hands Townhall', category: 'All-Hands', duration: 60, impact: 'HIGH', disruption: 7, participants: 45, notes: 'Quarterly financial updates and product milestones.' },
    { title: 'Urgent Production Incident Post-Mortem', category: 'Ad-hoc', duration: 50, impact: 'HIGH', disruption: 8, participants: 7, notes: 'Analyzed downtime root cause and preventative actions.' },
    { title: 'Design System & UI Component Sync', category: 'Technical', duration: 40, impact: 'MEDIUM', disruption: 4, participants: 3, notes: 'Standardized color palette and modal accessibility.' },
  ];

  const tasksList = [
    'Refactored authentication middleware for multi-tenant support',
    'Optimized database queries for report export',
    'Fixed high priority bug in checkout invoice generation',
    'Written unit tests for context switching tracker module',
    'Updated API documentation and OpenAPI schemas',
    'Reviewed 4 pull requests from team members',
    'Deployed staging build for user acceptance testing',
    'Setup CI/CD pipeline automation scripts',
  ];

  // Generate logs for the last 14 days
  for (let i = 0; i < 14; i++) {
    const dateObj = subDays(today, i);
    const dateStr = format(dateObj, 'yyyy-MM-dd');

    // Skip weekends for realistic work logs
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Pick 1 to 3 meetings per weekday
    const count = 1 + (i % 3);
    let totalMeetingMinutes = 0;

    for (let m = 0; m < count; m++) {
      const template = meetingTemplates[(i + m * 3) % meetingTemplates.length];
      const startHour = 9 + m * 2 + (i % 2);
      const startStr = `${startHour.toString().padStart(2, '0')}:00`;
      const endHour = startHour + Math.floor(template.duration / 60);
      const endMin = template.duration % 60;
      const endStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
      
      const contextLoss = defaultSettings.defaultContextLossMinutes;
      const totalImpact = template.duration + contextLoss;

      meetings.push({
        id: `m-seed-${i}-${m}`,
        sprintId: activeSprintId,
        title: template.title,
        category: template.category as any,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        durationMinutes: template.duration,
        contextSwitchLossMinutes: contextLoss,
        totalImpactMinutes: totalImpact,
        impactLevel: template.impact as any,
        participantsCount: template.participants,
        notes: template.notes,
        targetDisruptionScore: template.disruption,
      });

      totalMeetingMinutes += totalImpact;
    }

    // Daily work record
    const targetHours = 6.0;
    const meetingImpactHours = totalMeetingMinutes / 60;
    const maxPossibleWork = Math.max(0, 8.0 - meetingImpactHours);
    const actualHours = Number(Math.min(targetHours, Math.max(1.5, maxPossibleWork - 0.5)).toFixed(1));
    const efficiency = Math.min(100, Math.round((actualHours / targetHours) * 100));

    const dayTasks = [
      { id: `t-${i}-1`, title: tasksList[i % tasksList.length], completed: true },
      { id: `t-${i}-2`, title: tasksList[(i + 2) % tasksList.length], completed: true },
      { id: `t-${i}-3`, title: tasksList[(i + 4) % tasksList.length], completed: actualHours > 3 },
    ];

    workLogs.push({
      id: `w-seed-${i}`,
      date: dateStr,
      targetFocusHours: targetHours,
      actualWorkHours: actualHours,
      tasks: dayTasks,
      workSummary: `Focus session devoted to core sprint goals. ${count} meetings consumed ${meetingImpactHours.toFixed(1)} hours of focus bandwidth (including context switching lost time).`,
      efficiencyScore: efficiency,
    });
  }

  return { meetings, workLogs, sprints };
}
