import * as XLSX from 'xlsx';
import { MeetingRecord, WorkRecord, ExportConfig, DailyKPISummary, Sprint } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';

export function filterRecordsByDateRange<T extends { date: string }>(
  items: T[],
  config: ExportConfig
): T[] {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  
  if (config.dateRange === 'today') {
    return items.filter(item => item.date === todayStr);
  }

  if (config.dateRange === 'this_week') {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    return items.filter(item => {
      const d = parseISO(item.date);
      return d >= sevenDaysAgo && d <= now;
    });
  }

  if (config.dateRange === 'this_month') {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return items.filter(item => {
      const d = parseISO(item.date);
      return d >= thirtyDaysAgo && d <= now;
    });
  }

  if (config.dateRange === 'custom' && config.startDate && config.endDate) {
    const start = parseISO(config.startDate);
    const end = parseISO(config.endDate);
    return items.filter(item => {
      const d = parseISO(item.date);
      return d >= start && d <= end;
    });
  }

  return items; // 'all'
}

export function exportRecordsToFormat(
  meetings: MeetingRecord[],
  workLogs: WorkRecord[],
  summaries: DailyKPISummary[],
  config: ExportConfig,
  sprints: Sprint[] = [],
  trackContextLoss: boolean = true
) {
  const filteredMeetings = filterRecordsByDateRange(meetings, config);
  const filteredWorkLogs = filterRecordsByDateRange(workLogs, config);
  const filteredSummaries = filterRecordsByDateRange(summaries, config);

  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  if (config.includeSummary) {
    const summaryData = filteredSummaries.map(s => {
      const row: Record<string, any> = {
        'Date': s.date,
        'Total Meetings': s.totalMeetingsCount,
        'Direct Meeting Time (Hrs)': s.totalDirectMeetingHours,
      };
      if (trackContextLoss) {
        row['Time Lost / Context Overhead (Hrs)'] = s.totalTimeLostHours;
        row['Total Meeting Impact (Hrs)'] = s.totalMeetingImpactHours;
      }
      row['Target Focus Target (Hrs)'] = s.targetFocusHours;
      row['Actual Focus Achieved (Hrs)'] = s.actualWorkHours;
      row['Target Achievement %'] = `${s.targetAchievementPercentage}%`;
      row['Productivity Disruption Index'] = `${s.disruptionIndex}/100`;
      return row;
    });

    const summarySheet = XLSX.utils.json_to_sheet(
      summaryData.length > 0 ? summaryData : [{ 'Status': 'No records found for selected range' }]
    );

    // Auto width
    summarySheet['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 25 }, { wch: 30 },
      { wch: 25 }, { wch: 22 }, { wch: 25 }, { wch: 22 }, { wch: 26 }
    ];

    XLSX.utils.book_append_sheet(wb, summarySheet, 'Executive Summary');
  }

  // 2. Detailed Meetings Sheet
  if (config.includeMeetingLogs) {
    const meetingData = filteredMeetings.map(m => {
      const sprintObj = m.sprintId ? sprints.find(s => s.id === m.sprintId) : null;
      const row: Record<string, any> = {
        'ID': m.id,
        'Date': m.date,
        'Sprint': sprintObj ? sprintObj.name : 'No Sprint / Unassigned',
        'Meeting Title': m.title,
        'Category': m.category,
        'Start Time': m.startTime,
        'End Time': m.endTime,
        'Direct Duration (Mins)': m.durationMinutes,
        'Direct Duration (Hrs)': (m.durationMinutes / 60).toFixed(2),
      };
      if (trackContextLoss) {
        row['Context Loss Overhead (Mins)'] = m.contextSwitchLossMinutes;
        row['Total Focus Time Lost (Mins)'] = m.totalImpactMinutes;
      }
      row['Target Impact Rating'] = m.impactLevel;
      row['Target Disruption Score (1-10)'] = m.targetDisruptionScore;
      row['Participants'] = m.participantsCount;
      row['Notes & Agenda'] = m.notes;
      return row;
    });

    const meetingSheet = XLSX.utils.json_to_sheet(
      meetingData.length > 0 ? meetingData : [{ 'Status': 'No meeting records' }]
    );

    meetingSheet['!cols'] = [
      { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 32 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 20 },
      { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 26 },
      { wch: 14 }, { wch: 45 }
    ];

    XLSX.utils.book_append_sheet(wb, meetingSheet, 'Meeting Log');
  }

  // 3. Work Logs Sheet
  if (config.includeWorkLogs) {
    const workData = filteredWorkLogs.map(w => ({
      'Date': w.date,
      'Target Focus Hours': w.targetFocusHours,
      'Actual Focus Achieved Hours': w.actualWorkHours,
      'Target Efficiency %': `${w.efficiencyScore}%`,
      'Completed Tasks': w.tasks.filter(t => t.completed).map(t => t.title).join(' | '),
      'Pending Tasks': w.tasks.filter(t => !t.completed).map(t => t.title).join(' | '),
      'Daily Work Summary': w.workSummary,
    }));

    const workSheet = XLSX.utils.json_to_sheet(
      workData.length > 0 ? workData : [{ 'Status': 'No work log records' }]
    );

    workSheet['!cols'] = [
      { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 20 },
      { wch: 45 }, { wch: 35 }, { wch: 50 }
    ];

    XLSX.utils.book_append_sheet(wb, workSheet, 'Daily Work Log');
  }

  // Determine extension and save
  const ext = config.format.toLowerCase();
  const cleanFilename = config.filename.endsWith(`.${ext}`)
    ? config.filename
    : `${config.filename.replace(/\.[^/.]+$/, '')}.${ext}`;

  if (ext === 'csv') {
    // Write primary sheet as CSV
    const firstSheetName = wb.SheetNames[0] || 'Executive Summary';
    const csvContent = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
    downloadBlob(csvContent, cleanFilename, 'text/csv;charset=utf-8;');
  } else if (ext === 'tsv') {
    const firstSheetName = wb.SheetNames[0] || 'Executive Summary';
    const tsvContent = XLSX.utils.sheet_to_txt(wb.Sheets[firstSheetName]);
    downloadBlob(tsvContent, cleanFilename, 'text/tab-separated-values;charset=utf-8;');
  } else if (ext === 'xls') {
    const wbout = XLSX.write(wb, { bookType: 'biff8', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, cleanFilename, 'application/vnd.ms-excel');
  } else {
    // .xlsx default
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    downloadBlob(blob, cleanFilename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

function downloadBlob(content: Blob | string | ArrayBuffer, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
